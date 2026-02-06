/** Thin onboarding progress bar with gradient fill: 33% / 66% / 100% by step. */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Spacing } from '@/theme';

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
      <Animated.View style={[styles.fillWrap, fillStyle]}>
        <LinearGradient
          colors={['#E8B4CB', '#D4BEE4', '#B8D4E8', '#A8E0E8']}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.fill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 4,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  fillWrap: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    borderRadius: 2,
  },
});
