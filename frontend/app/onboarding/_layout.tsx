/**
 * Stack layout for onboarding: light theme with soft pink gradient + cyan top overlay.
 * Matches the reference UI from auth/welcome.tsx.
 */

import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function OnboardingLayout() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Main background: white → soft pink */}
      <LinearGradient
        colors={['#FFFFFF', '#FAFBFC', '#F8F4F6', '#F8EEF2', '#FCE8EE']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Top cyan/mint gradient overlay */}
      <LinearGradient
        colors={['#E0F7FA', '#E8F5F7', 'transparent']}
        locations={[0, 0.4, 1]}
        style={styles.topGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
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

const styles = StyleSheet.create({
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
});
