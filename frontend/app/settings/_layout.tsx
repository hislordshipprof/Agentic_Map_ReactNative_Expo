/**
 * Settings Layout - Agentic Mobile Map
 */

import { Stack } from 'expo-router';

export default function SettingsLayout(): JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
