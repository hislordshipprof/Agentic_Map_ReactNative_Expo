/** Stack layout for onboarding: pastel gradient background (matches reference UI), slide transition. */

import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/theme/useThemeColors';

export default function OnboardingLayout() {
  const colors = useThemeColors();
  const pastel = colors.gradients.pastelScreen;

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[...pastel.colors]}
        locations={[...pastel.locations]}
        start={pastel.start}
        end={pastel.end}
        style={StyleSheet.absoluteFill}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen name="features" />
        <Stack.Screen name="ready" />
      </Stack>
    </View>
  );
}
