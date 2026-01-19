/** Thin onboarding progress bar: 33% / 66% / 100% by step. */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing } from '@/theme';

export interface OnboardingProgressBarProps {
  /** 1, 2, or 3 */
  step: 1 | 2 | 3;
}

const WIDTHS = [0.333, 0.666, 1] as const;

export const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({ step }) => {
  const width = useSharedValue(0);
  const target = WIDTHS[step - 1];

  useEffect(() => {
    width.value = withTiming(target, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, target]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 4,
    width: '100%',
    backgroundColor: Colors.dark.elevated,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary.teal,
    borderRadius: 2,
  },
});
