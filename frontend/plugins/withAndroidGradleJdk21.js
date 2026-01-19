/** Pins AGP 8.4.2 and Gradle 8.6 so Android builds work with JDK 21. Re-applied on `expo prebuild`. */

const { withProjectBuildGradle, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withAndroidGradleJdk21(config) {
  config = withProjectBuildGradle(config, async (cfg) => {
    if (cfg.modResults && typeof cfg.modResults === "string") {
      cfg.modResults = cfg.modResults.replace(
        /classpath\s*\(\s*['"]com\.android\.tools\.build:gradle['"]\s*\)/,
        "classpath('com.android.tools.build:gradle:8.4.2')"
      );
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest?.projectRoot ?? process.cwd();
      const gp = path.join(
        projectRoot,
        "android",
        "gradle",
        "wrapper",
        "gradle-wrapper.properties"
      );
      if (fs.existsSync(gp)) {
        let c = fs.readFileSync(gp, "utf8");
        c = c.replace(/gradle-8\.3-all\.zip/, "gradle-8.6-all.zip");
        fs.writeFileSync(gp, c);
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withAndroidGradleJdk21;
