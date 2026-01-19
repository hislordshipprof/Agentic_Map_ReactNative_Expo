/**
 * Keeps the Google Maps API key out of git. (1) File-backed replace of any real key
 * in AndroidManifest. (2) Patches app/build.gradle to read GOOGLE_MAPS_API_KEY
 * from local.properties or env. app.config.android.config.googleMaps.apiKey must
 * be "${GOOGLE_MAPS_API_KEY}" (literal) so the key is never baked in at prebuild.
 */

const { withAppBuildGradle, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PLACEHOLDER = "${GOOGLE_MAPS_API_KEY}";
const RE = /(android:name="com\.google\.android\.geo\.API_KEY"\s*android:value=")[^"]*(")/g;

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
  config = withDangerousMod(config, ["android", async (cfg) => {
    const root = cfg.modRequest?.projectRoot ?? process.cwd();
    const p = path.join(root, "android", "app", "src", "main", "AndroidManifest.xml");
    if (!fs.existsSync(p)) return cfg;
    const s = fs.readFileSync(p, "utf8");
    const next = s.replace(RE, `$1${PLACEHOLDER}$2`);
    if (next !== s) fs.writeFileSync(p, next);
    return cfg;
  }]);

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
