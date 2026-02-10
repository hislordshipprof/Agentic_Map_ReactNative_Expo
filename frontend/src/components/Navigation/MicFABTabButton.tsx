/**
 * MicFABTabButton - Center tab bar FAB
 *
 * Elevated teal circle (64px) that navigates to /voice-assistant.
 */

import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';

export const MicFABTabButton: React.FC = () => {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            shadowColor: colors.primary.teal,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
        onPress={() => router.push('/voice-assistant')}
        accessibilityLabel="Voice Assistant"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[colors.primary.teal, colors.primary.tealDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Ionicons name="mic" size={28} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
