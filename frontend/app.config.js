require("dotenv").config();

module.exports = {
  expo: {
    name: "Agentic Mobile Map",
    slug: "agentic-mobile-map",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/App_logo.png",
    scheme: "agentic-map",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/App_logo.png",
      resizeMode: "contain",
      backgroundColor: "#FAFBFD",
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
        foregroundImage: "./assets/App_logo.png",
        backgroundColor: "#FAFBFD",
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
        "ACCESS_NETWORK_STATE",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "WAKE_LOCK",
        "BLUETOOTH",
        "FOREGROUND_SERVICE_LOCATION",
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
      "expo-font",
      "@siteed/expo-audio-studio",
      "@livekit/react-native-expo-plugin",
      "@config-plugins/react-native-webrtc",
      "./plugins/withGoogleMapsApiKeyPlaceholder",
      "./plugins/withGoogleNavSdk",
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
