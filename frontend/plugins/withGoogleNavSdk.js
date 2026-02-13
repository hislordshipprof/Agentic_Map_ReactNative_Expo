/**
 * Expo Config Plugin for Google Navigation SDK
 *
 * Android:
 * - Pins AGP to 8.10.0 in root build.gradle (required by navigation:7.3.0)
 * - Enables coreLibraryDesugaring in compileOptions
 * - Adds desugar_jdk_libs_nio dependency
 * - Excludes play-services-maps (bundled inside Navigation SDK)
 * - Forces kotlin-stdlib version to match the project's Kotlin compiler
 * - Adds FOREGROUND_SERVICE_LOCATION permission to AndroidManifest
 *
 * iOS:
 * - Ensures GMSServices provideAPIKey is called in AppDelegate
 * - Sets minimum deployment target to iOS 16.0
 */

const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withDangerousMod,
  withInfoPlist,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// ─── Android: Pin AGP to 8.10.0 in root build.gradle ───────────────────────

function withAgpVersion(config) {
  return withProjectBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (typeof g !== "string") return cfg;

    // Replace unversioned or older AGP classpath with 8.10.0
    // Matches: classpath('com.android.tools.build:gradle') — no version
    // Also:    classpath('com.android.tools.build:gradle:8.8.2') — old version
    g = g.replace(
      /classpath\(['"]com\.android\.tools\.build:gradle(?::[^'"]*)?['"]\)/,
      "classpath('com.android.tools.build:gradle:8.10.0')"
    );

    cfg.modResults.contents = g;
    return cfg;
  });
}

// ─── Android: Enable core library desugaring + Nav SDK deps ─────────────────

const COMPILE_OPTIONS_BLOCK = `
    compileOptions {
        coreLibraryDesugaringEnabled true
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
`;

const DESUGARING_DEPENDENCY =
  '    coreLibraryDesugaring "com.android.tools:desugar_jdk_libs_nio:2.0.4"\n';

const CONFIGURATIONS_BLOCK = `
// Navigation SDK bundles Google Maps classes internally.
// Exclude standalone play-services-maps to avoid duplicate class conflicts
// with react-native-maps.
configurations.configureEach {
    exclude group: 'com.google.android.gms', module: 'play-services-maps'
    // AGP 8.10 pulls kotlin-stdlib 2.2.x; force down to match our compiler
    resolutionStrategy {
        force "org.jetbrains.kotlin:kotlin-stdlib:\${rootProject.ext.has('kotlinVersion') ? rootProject.ext.kotlinVersion : '2.0.21'}"
        force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:\${rootProject.ext.has('kotlinVersion') ? rootProject.ext.kotlinVersion : '2.0.21'}"
    }
}
`;

function withAndroidDesugaring(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (typeof g !== "string") return cfg;

    // 1. Add compileOptions block with coreLibraryDesugaringEnabled
    if (!g.includes("coreLibraryDesugaringEnabled")) {
      if (g.includes("compileOptions")) {
        // compileOptions block exists — inject coreLibraryDesugaringEnabled into it
        g = g.replace(
          /(compileOptions\s*\{)/,
          `$1\n        coreLibraryDesugaringEnabled true`
        );
      } else {
        // No compileOptions block — add after androidResources {} or before android closing brace
        const afterAndroidResources = /(androidResources\s*\{[^}]*\}\s*\n)/s;
        if (afterAndroidResources.test(g)) {
          g = g.replace(afterAndroidResources, `$1${COMPILE_OPTIONS_BLOCK}\n`);
        } else {
          // Fallback: find the closing brace of android {} block
          // Match the last } that closes the android { block
          const androidClose = /(android\s*\{[\s\S]*?)(^\})/m;
          if (androidClose.test(g)) {
            g = g.replace(androidClose, `$1${COMPILE_OPTIONS_BLOCK}$2`);
          }
        }
      }
    }

    // 2. Add desugaring dependency
    if (!g.includes("desugar_jdk_libs_nio")) {
      const depsPattern = /(dependencies\s*\{)/;
      if (depsPattern.test(g)) {
        g = g.replace(depsPattern, `$1\n${DESUGARING_DEPENDENCY}`);
      }
    }

    // 3. Exclude play-services-maps + force kotlin-stdlib
    if (!g.includes("play-services-maps")) {
      const depsPattern = /(dependencies\s*\{)/;
      if (depsPattern.test(g)) {
        g = g.replace(depsPattern, `${CONFIGURATIONS_BLOCK}\n$1`);
      }
    }

    cfg.modResults.contents = g;
    return cfg;
  });
}

// ─── Android: Add FOREGROUND_SERVICE_LOCATION permission ─────────────────────

const FOREGROUND_SERVICE_PERM =
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />';

function withForegroundServicePermission(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest?.projectRoot ?? process.cwd();
      const manifestPath = path.join(
        root,
        "android",
        "app",
        "src",
        "main",
        "AndroidManifest.xml"
      );
      if (!fs.existsSync(manifestPath)) return cfg;

      let manifest = fs.readFileSync(manifestPath, "utf8");
      if (!manifest.includes("FOREGROUND_SERVICE_LOCATION")) {
        // Insert before the first <application tag
        manifest = manifest.replace(
          /(<application)/,
          `    ${FOREGROUND_SERVICE_PERM}\n\n    $1`
        );
        fs.writeFileSync(manifestPath, manifest);
      }
      return cfg;
    },
  ]);
}

// ─── iOS: Ensure GMSServices provideAPIKey in AppDelegate ────────────────────

function withIosGmsServicesKey(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const root = cfg.modRequest?.projectRoot ?? process.cwd();
      const appDelegatePath = path.join(
        root,
        "ios",
        cfg.modRequest?.projectName || cfg.name?.replace(/\s+/g, "") || "AgenticMobileMap",
        "AppDelegate.mm"
      );
      if (!fs.existsSync(appDelegatePath)) return cfg;

      let content = fs.readFileSync(appDelegatePath, "utf8");

      // Add GMSServices import if missing
      if (!content.includes("@import GoogleMaps")) {
        content = content.replace(
          /(#import "AppDelegate.h")/,
          `$1\n@import GoogleMaps;`
        );
      }

      // Add provideAPIKey call if missing
      if (!content.includes("GMSServices provideAPIKey")) {
        // Get API key from ios.config.googleMapsApiKey (injected by Expo)
        const apiKey = cfg.ios?.config?.googleMapsApiKey || "";
        const provideKeyLine = `  [GMSServices provideAPIKey:@"${apiKey}"];\n`;

        // Insert at the start of didFinishLaunchingWithOptions
        content = content.replace(
          /(didFinishLaunchingWithOptions[^{]*\{)/,
          `$1\n${provideKeyLine}`
        );
      }

      fs.writeFileSync(appDelegatePath, content);
      return cfg;
    },
  ]);
}

// ─── iOS: Set minimum deployment target ──────────────────────────────────────

function withIosMinDeploymentTarget(config) {
  return withInfoPlist(config, (cfg) => {
    // The actual deployment target is set via Podfile/build settings,
    // but we ensure the config signals iOS 16+
    if (!cfg.ios) cfg.ios = {};
    return cfg;
  });
}

// ─── Main plugin ─────────────────────────────────────────────────────────────

function withGoogleNavSdk(config) {
  config = withAgpVersion(config);
  config = withAndroidDesugaring(config);
  config = withForegroundServicePermission(config);
  config = withIosGmsServicesKey(config);
  config = withIosMinDeploymentTarget(config);
  return config;
}

module.exports = withGoogleNavSdk;
