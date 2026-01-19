/** Pulsating concentric rings around a centered child (e.g. chat icon). */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ColorUtils } from '@/theme';

const RING_COLORS = [
  ColorUtils.withAlpha('#14B8A6', 0.35),
  ColorUtils.withAlpha('#14B8A6', 0.2),
  ColorUtils.withAlpha('#14B8A6', 0.1),
];

export interface PulsatingRingsProps {
  children: React.ReactNode;
  size?: number;
}

export const PulsatingRings: React.FC<PulsatingRingsProps> = ({
  children,
  size = 140,
}) => {
  const s1 = useSharedValue(1);
  const o1 = useSharedValue(0.35);
  const s2 = useSharedValue(1);
  const o2 = useSharedValue(0.2);
  const s3 = useSharedValue(1);
  const o3 = useSharedValue(0.1);

  useEffect(() => {
    const duration = 1800;
    const outEasing = Easing.out(Easing.cubic);

    s1.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: duration / 2, easing: outEasing }),
        withTiming(1, { duration: duration / 2, easing: outEasing })
      ),
      -1,
      false
    );
    o1.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: duration / 2, easing: outEasing }),
        withTiming(0.35, { duration: duration / 2, easing: outEasing })
      ),
      -1,
      false
    );

    s2.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: duration / 2, easing: outEasing }),
          withTiming(1, { duration: duration / 2, easing: outEasing })
        ),
        -1,
        false
      )
    );
    o2.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(0.08, { duration: duration / 2, easing: outEasing }),
          withTiming(0.2, { duration: duration / 2, easing: outEasing })
        ),
        -1,
        false
      )
    );

    s3.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.25, { duration: duration / 2, easing: outEasing }),
          withTiming(1, { duration: duration / 2, easing: outEasing })
        ),
        -1,
        false
      )
    );
    o3.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(0.04, { duration: duration / 2, easing: outEasing }),
          withTiming(0.1, { duration: duration / 2, easing: outEasing })
        ),
        -1,
        false
      )
    );
  }, []);

  const r = size / 2;
  const ring1 = useAnimatedStyle(() => ({
    transform: [{ scale: s1.value }],
    opacity: o1.value,
  }));
  const ring2 = useAnimatedStyle(() => ({
    transform: [{ scale: s2.value }],
    opacity: o2.value,
  }));
  const ring3 = useAnimatedStyle(() => ({
    transform: [{ scale: s3.value }],
    opacity: o3.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: r, borderColor: RING_COLORS[0] },
          ring1,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: r, borderColor: RING_COLORS[1] },
          ring2,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: r, borderColor: RING_COLORS[2] },
          ring3,
        ]}
      />
      <View style={styles.center}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
