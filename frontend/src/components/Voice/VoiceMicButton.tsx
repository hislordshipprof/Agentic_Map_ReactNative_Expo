/**
 * VoiceMicButton - Main microphone button for voice mode
 *
 * Per FINAL_REQUIREMENTS.md - Voice Mode Specification:
 * - Large circular button with state-based appearance
 * - IDLE: Subtle gray with mic icon
 * - LISTENING: Pulsing teal glow with animated ring
 * - PROCESSING: Spinner with thinking indicator
 * - SPEAKING: Speaker icon with waveform ring
 * - CONFIRMING: Check/X icons for confirmation
 *
 * Design: Dark glassmorphism with teal accents, smooth animations
 */

import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/theme';
import type { VoiceStatus } from '@/redux/slices/voiceSlice';

/**
 * Props for VoiceMicButton
 */
interface VoiceMicButtonProps {
  /** Current voice status */
  status: VoiceStatus;
  /** Called when button is pressed */
  onPress: () => void;
  /** Called when confirm button is pressed (in confirming state) */
  onConfirm?: () => void;
  /** Called when reject button is pressed (in confirming state) */
  onReject?: () => void;
  /** Custom button size (default 72) */
  size?: number;
  /** Custom style */
  style?: ViewStyle;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * Animated pressable component
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Get icon for current status
 */
function getIconForStatus(status: VoiceStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'listening':
      return 'mic';
    case 'processing':
      return 'ellipsis-horizontal';
    case 'speaking':
      return 'volume-high';
    case 'confirming':
      return 'checkmark-circle';
    case 'error':
      return 'alert-circle';
    default:
      return 'mic-outline';
  }
}

/**
 * Get colors for current status
 */
function getColorsForStatus(status: VoiceStatus) {
  switch (status) {
    case 'listening':
      return {
        gradient: [Colors.primary.tealDark, Colors.primary.teal] as [string, string],
        icon: Colors.dark.text.primary,
        glow: Colors.effects.glowTeal,
        ring: Colors.primary.tealLight,
      };
    case 'processing':
      return {
        gradient: [Colors.dark.elevated, Colors.dark.overlay] as [string, string],
        icon: Colors.primary.tealLight,
        glow: 'transparent',
        ring: Colors.primary.teal,
      };
    case 'speaking':
      return {
        gradient: [Colors.primary.emerald, Colors.status.success] as [string, string],
        icon: Colors.dark.text.primary,
        glow: Colors.effects.glowEmerald,
        ring: Colors.status.minimal,
      };
    case 'confirming':
      return {
        gradient: [Colors.primary.teal, Colors.primary.tealLight] as [string, string],
        icon: Colors.dark.text.primary,
        glow: Colors.effects.glowTeal,
        ring: Colors.primary.tealLight,
      };
    case 'error':
      return {
        gradient: [Colors.status.error, '#B91C1C'] as [string, string],
        icon: Colors.dark.text.primary,
        glow: Colors.status.errorBg,
        ring: Colors.status.error,
      };
    default:
      return {
        gradient: [Colors.dark.elevated, Colors.dark.overlay] as [string, string],
        icon: Colors.dark.text.secondary,
        glow: 'transparent',
        ring: Colors.dark.border,
      };
  }
}

/**
 * VoiceMicButton Component
 */
export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  status,
  onPress,
  onConfirm,
  onReject,
  size = 72,
  style,
  disabled = false,
}) => {
  const colors = getColorsForStatus(status);
  const icon = getIconForStatus(status);

  // Animation values
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const ringRotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const spinnerRotation = useSharedValue(0);

  // Handle status changes
  useEffect(() => {
    // Reset animations
    cancelAnimation(pulseScale);
    cancelAnimation(ringRotation);
    cancelAnimation(glowOpacity);
    cancelAnimation(spinnerRotation);

    switch (status) {
      case 'listening':
        // Pulsing effect
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
        // Glow effect
        glowOpacity.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 800 }),
            withTiming(0.4, { duration: 800 })
          ),
          -1,
          true
        );
        break;

      case 'processing':
        // Spinner rotation
        spinnerRotation.value = withRepeat(
          withTiming(360, { duration: 1000, easing: Easing.linear }),
          -1,
          false
        );
        // Subtle pulse
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 600 }),
            withTiming(1, { duration: 600 })
          ),
          -1,
          true
        );
        break;

      case 'speaking':
        // Speaking pulse (synced with audio)
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 300 }),
            withTiming(1, { duration: 300 })
          ),
          -1,
          true
        );
        glowOpacity.value = withTiming(0.6, { duration: 300 });
        break;

      case 'confirming':
        // Gentle breathing
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.03, { duration: 1000 }),
            withTiming(1, { duration: 1000 })
          ),
          -1,
          true
        );
        glowOpacity.value = withTiming(0.5, { duration: 300 });
        break;

      default:
        // Reset to idle
        pulseScale.value = withTiming(1, { duration: 200 });
        glowOpacity.value = withTiming(0, { duration: 200 });
        spinnerRotation.value = 0;
        break;
    }
  }, [status, pulseScale, glowOpacity, ringRotation, spinnerRotation]);

  // Animated styles
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: interpolate(pulseScale.value, [1, 1.15], [0.6, 0]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinnerRotation.value}deg` }],
  }));

  // Press handlers
  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  // Render confirmation buttons
  if (status === 'confirming') {
    return (
      <View style={[styles.confirmContainer, style]}>
        {/* Reject button */}
        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            styles.rejectButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onReject}
        >
          <Ionicons name="close" size={28} color={Colors.status.error} />
        </Pressable>

        {/* Confirm button */}
        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            styles.acceptButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onConfirm}
        >
          <Ionicons name="checkmark" size={28} color={Colors.status.success} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size + 40, height: size + 40 }, style]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glowEffect,
          {
            width: size + 30,
            height: size + 30,
            borderRadius: (size + 30) / 2,
            backgroundColor: colors.glow,
          },
          glowStyle,
        ]}
      />

      {/* Pulse ring */}
      {(status === 'listening' || status === 'speaking') && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              borderColor: colors.ring,
            },
            pulseRingStyle,
          ]}
        />
      )}

      {/* Main button */}
      <AnimatedPressable
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          buttonAnimatedStyle,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <LinearGradient
          colors={colors.gradient}
          style={[styles.gradient, { borderRadius: size / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Glass overlay */}
          <View style={[styles.glassOverlay, { borderRadius: size / 2 }]} />

          {/* Icon or spinner */}
          {status === 'processing' ? (
            <Animated.View style={spinnerStyle}>
              <Ionicons
                name="reload"
                size={size * 0.4}
                color={colors.icon}
              />
            </Animated.View>
          ) : (
            <Ionicons
              name={icon}
              size={size * 0.4}
              color={colors.icon}
            />
          )}
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  button: {
    shadowColor: Colors.primary.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.effects.glassDarkLight,
    opacity: 0.3,
  },
  confirmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl, // 24px
  },
  confirmButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.elevated,
    borderWidth: 2,
  },
  rejectButton: {
    borderColor: Colors.status.error,
  },
  acceptButton: {
    borderColor: Colors.status.success,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});

export default VoiceMicButton;
