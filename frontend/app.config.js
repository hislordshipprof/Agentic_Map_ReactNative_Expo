require("dotenv").config();

module.exports = {
  expo: {
    name: "Agentic Mobile Map",
    slug: "agentic-mobile-map",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "agentic-map",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1a1a2e",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.agenticmap.mobile",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "This app needs access to your location to plan routes and find nearby stops.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "This app needs access to your location to provide navigation and route suggestions.",
        NSMicrophoneUsageDescription:
          "This app uses the microphone for voice input so you can say your destination and stops.",
        NSSpeechRecognitionUsageDescription:
          "This app uses speech recognition to turn your voice into text for planning routes.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1a1a2e",
      },
      package: "com.agenticmap.mobile",
      config: {
        googleMaps: {
          apiKey: "${GOOGLE_MAPS_API_KEY}",
        },
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "RECORD_AUDIO",
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-location",
      "expo-secure-store",
      [
        "@react-native-voice/voice",
        {
          microphonePermission: "This app uses the microphone for voice input so you can say your destination and stops.",
          speechRecognitionPermission: "This app uses speech recognition to turn your voice into text for planning routes.",
        },
      ],
      "@siteed/expo-audio-studio",
      "./plugins/withAndroidGradleJdk21",
      "./plugins/withGoogleMapsApiKeyPlaceholder",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "your-project-id",
      },
    },
  },
};
