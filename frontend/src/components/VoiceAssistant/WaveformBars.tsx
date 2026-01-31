/**
 * WaveformBars - Animated vertical bars visualizing audio input
 *
 * Shows ~20 teal bars that animate height based on audio level.
 * Used in the Voice Assistant when listening.
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '@/theme/useThemeColors';

const BAR_COUNT = 20;
const BAR_WIDTH = 3;
const BAR_GAP = 3;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 32;

interface WaveformBarsProps {
  isActive: boolean;
  audioLevel?: number;
}

function WaveformBar({ index, isActive }: { index: number; isActive: boolean }) {
  const colors = useThemeColors();
  const height = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    if (isActive) {
      // Each bar gets a unique random-ish pattern
      const baseHeight = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT) * 0.3;
      const peakHeight = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);
      const duration = 300 + Math.random() * 400;
      const delay = index * 30;

      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(peakHeight, { duration, easing: Easing.out(Easing.quad) }),
            withTiming(baseHeight, { duration: duration * 0.8, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          true,
        ),
      );
    } else {
      height.value = withTiming(MIN_HEIGHT, { duration: 300 });
    }
  }, [isActive, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: colors.primary.teal },
        animatedStyle,
      ]}
    />
  );
}

export const WaveformBars: React.FC<WaveformBarsProps> = ({ isActive, audioLevel = 0 }) => {
  const bars = useMemo(() => Array.from({ length: BAR_COUNT }, (_, i) => i), []);

  return (
    <View style={styles.container}>
      {bars.map((i) => (
        <WaveformBar key={i} index={i} isActive={isActive} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BAR_GAP,
    height: MAX_HEIGHT + 8,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    minHeight: MIN_HEIGHT,
  },
});
