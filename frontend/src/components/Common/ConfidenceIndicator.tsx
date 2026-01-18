/**
 * ConfidenceIndicator Component - Agentic Mobile Map
 * 
 * Visual indicator for NLU confidence levels.
 * Per systemPrompt.md Line 49-53:
 * - HIGH (≥0.80): Green, no animation
 * - MEDIUM (0.60-0.79): Orange, subtle pulse
 * - LOW (<0.60): Red, prominent pulse
 * 
 * Uses ColorUtils.getConfidenceColor() and pulse animation from theme.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Colors, ColorUtils, TextStyles, Spacing, Layout } from '@/theme';

/**
 * Confidence level type
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * ConfidenceIndicator Props
 */
export interface ConfidenceIndicatorProps {
  /** Confidence score (0-1) */
  confidence: number;
  /** Show numeric value */
  showValue?: boolean;
  /** Show label */
  showLabel?: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Custom style */
  style?: ViewStyle;
}

/**
 * ConfidenceIndicator Component
 * 
 * Displays confidence level with:
 * - Color-coded indicator (green/orange/red)
 * - Pulsing animation for medium/low confidence
 * - Optional percentage display
 * - Optional "Confidence" label
 */
export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  showValue = false,
  showLabel = false,
  size = 'medium',
  style,
}) => {
  // Get confidence level
  const getLevel = (score: number): ConfidenceLevel => {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  };

  const level = getLevel(confidence);
  const color = ColorUtils.getConfidenceColor(confidence);

  // Animated values for pulse effect
  const scale = useSharedValue(1);

  // Start pulse animation for medium/low confidence
  useEffect(() => {
    if (level === 'high') {
      // No animation for high confidence
      scale.value = 1;
      cancelAnimation(scale);
    } else if (level === 'medium') {
      // Subtle pulse for medium confidence
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 750 }),
          withTiming(1, { duration: 750 })
        ),
        -1, // Infinite
        false
      );
    } else {
      // Prominent pulse for low confidence
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      );
    }

    return () => {
      cancelAnimation(scale);
    };
  }, [level, confidence]);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Size variants
  const sizeStyles = {
    small: {
      dot: styles.dotSmall,
      text: TextStyles.caption,
    },
    medium: {
      dot: styles.dotMedium,
      text: TextStyles.bodySmall,
    },
    large: {
      dot: styles.dotLarge,
      text: TextStyles.body,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.dot,
          currentSize.dot,
          { backgroundColor: color },
          animatedStyle,
        ]}
      />

      {showLabel && (
        <Text style={[styles.label, currentSize.text]}>
          Confidence
        </Text>
      )}

      {showValue && (
        <Text style={[styles.value, currentSize.text, { color }]}>
          {Math.round(confidence * 100)}%
        </Text>
      )}
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    borderRadius: Layout.radiusFull,
    ...styles.shadow,
  },
  dotSmall: {
    width: 8,
    height: 8,
  },
  dotMedium: {
    width: 12,
    height: 12,
  },
  dotLarge: {
    width: 16,
    height: 16,
  },
  label: {
    color: Colors.ui.text.secondary,
  },
  value: {
    fontWeight: '600',
  },
  shadow: {
    shadowColor: Colors.effects.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default ConfidenceIndicator;
