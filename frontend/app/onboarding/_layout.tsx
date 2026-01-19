/** Stack layout for onboarding: dark background, slide transition. */

import { Stack } from 'expo-router';
import { Colors } from '@/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.dark.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="features" />
      <Stack.Screen name="ready" />
    </Stack>
  );
}
