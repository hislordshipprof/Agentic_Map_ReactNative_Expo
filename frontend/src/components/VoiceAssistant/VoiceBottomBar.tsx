/**
 * VoiceBottomBar - Large gradient mic (80px) with animated outer glow,
 * waveform bars, and "Tap to speak" / "Listening..." label.
 * Uses pink → lavender → light blue → cyan gradient to match design.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import { WaveformBars } from './WaveformBars';

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'confirming';

interface VoiceBottomBarProps {
  status: VoiceStatus;
  onMicPress: () => void;
  audioLevel?: number;
}

export const VoiceBottomBar: React.FC<VoiceBottomBarProps> = ({
  status,
  onMicPress,
  audioLevel = 0,
}) => {
  const colors = useThemeColors();
  const isActive = status === 'listening';
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      glowOpacity.value = withTiming(0.4, { duration: 300 });
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000, easing: Easing.out(Easing.cubic) }),
          withTiming(1.05, { duration: 1000, easing: Easing.in(Easing.cubic) }),
        ),
        -1,
        true,
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
      glowScale.value = withTiming(1, { duration: 300 });
    }
  }, [isActive]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const label = (() => {
    switch (status) {
      case 'idle': return 'Tap to speak';
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'Speaking...';
      case 'confirming': return 'Confirm your route';
      default: return 'Tap to speak';
    }
  })();

  return (
    <View style={styles.container}>
      {/* Waveform - only visible when listening */}
      {isActive && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
          <WaveformBars isActive={isActive} audioLevel={audioLevel} />
        </Animated.View>
      )}

      {/* Mic button with glow */}
      <View style={styles.micArea}>
        {/* Outer glow ring - using pink-cyan colors */}
        <Animated.View
          style={[
            styles.outerGlow,
            { backgroundColor: 'rgba(184, 212, 232, 0.4)' },
            glowStyle,
          ]}
        />
        <Pressable
          onPress={onMicPress}
          style={({ pressed }) => [
            styles.micWrapper,
            pressed && { transform: [{ scale: 0.93 }] },
          ]}
        >
          <LinearGradient
            colors={['#E8B4CB', '#D4BEE4', '#B8D4E8', '#A8E0E8']}
            locations={[0, 0.35, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.micButton}
          >
            <Ionicons
              name={isActive ? 'stop' : 'mic'}
              size={32}
              color="#4A4A5A"
            />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  micArea: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  micWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
