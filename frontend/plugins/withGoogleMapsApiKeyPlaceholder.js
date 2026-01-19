/**
 * Ensures the Google Maps API key is never committed. Replaces any value in
 * AndroidManifest with ${GOOGLE_MAPS_API_KEY} and patches app/build.gradle to
 * read from local.properties or GOOGLE_MAPS_API_KEY env at build time.
 */

const { withAndroidManifest, withAppBuildGradle } = require("@expo/config-plugins");

const API_KEY_NAME = "com.google.android.geo.API_KEY";
const PLACEHOLDER = "${GOOGLE_MAPS_API_KEY}";

const GRADLE_KEY_BLOCK = `def googleMapsKey = ""
try {
    def loc = rootProject.file("local.properties")
    if (loc.exists()) {
        def p = new Properties()
        p.load(loc.newDataInputStream())
        googleMapsKey = p.getProperty("GOOGLE_MAPS_API_KEY", "") ?: ""
    }
} catch (e) { /* ignore */ }
if (googleMapsKey == null || googleMapsKey == "")
    googleMapsKey = System.getenv("GOOGLE_MAPS_API_KEY") ?: ""

`;

const MANIFEST_PLACEHOLDERS_LINE = "        manifestPlaceholders = [GOOGLE_MAPS_API_KEY: googleMapsKey]\n";

function withGoogleMapsApiKeyPlaceholder(config) {
  config = withAndroidManifest(config, (cfg) => {
    const m = cfg.modResults;
    if (typeof m === "string") {
      cfg.modResults = m.replace(
        new RegExp(`(android:name="${API_KEY_NAME.replace(/\./g, "\\.")}"\\s*android:value=")[^"]*(")`, "g"),
        `$1${PLACEHOLDER}$2`
      );
    }
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults;
    if (typeof g !== "string") return cfg;

    if (!g.includes("def googleMapsKey")) {
      g = g.replace(
        /(def projectRoot = rootDir\.getAbsoluteFile\(\)\.getParentFile\(\)\.getAbsolutePath\(\)\r?\n)/,
        `$1\n${GRADLE_KEY_BLOCK}`
      );
    }
    if (!g.includes("manifestPlaceholders")) {
      g = g.replace(
        /(buildConfigField\("boolean", "REACT_NATIVE_UNSTABLE_USE_RUNTIME_SCHEDULER_ALWAYS", .+?\.toString\(\)\))\r?\n(\s+\})/,
        `$1\n${MANIFEST_PLACEHOLDERS_LINE}$2`
      );
    }
    cfg.modResults = g;
    return cfg;
  });

  return config;
}

module.exports = withGoogleMapsApiKeyPlaceholder;
