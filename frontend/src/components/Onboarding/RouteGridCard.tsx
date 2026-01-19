/** Central onboarding card: grid + path + 4 markers with step simulation and brief info. */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
  interpolate,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { Colors, ColorUtils, FontFamily, FontSize, Layout, Spacing } from '@/theme';

const STEP_LABELS = [
  'Start — You set your destination',
  'First stop — Quick errand on the way',
  'Next stop — Minimal detour',
  "Done — You've arrived",
];

const MARKERS = [
  { n: 1, color: '#5EEAD4', icon: 'paper-plane' as const },
  { n: 2, color: Colors.semantic.success },
  { n: 3, color: Colors.semantic.warning },
  { n: 4, color: '#A855F7' },
];

const GRID_SIZE = 10;
const CELL = 14;
const MARKER_SIZE = 38;
const ICON_SIZE = 18;
const STEP_DURATION_MS = 2200;
const TRANSITION_MS = 500;

function MarkerNode({
  marker,
  index,
  activeIndex,
}: {
  marker: (typeof MARKERS)[0];
  index: number;
  activeIndex: SharedValue<number>;
}) {
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          activeIndex.value,
          [index - 0.5, index, Math.min(index + 0.5, 3.5)],
          [1, 1.2, 1]
        ),
      },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(350).delay(320 + index * 80)}
      style={[
        styles.marker,
        scaleStyle,
        {
          backgroundColor: marker.color,
          left: `${12 + index * 24}%`,
          top: '40%',
          width: MARKER_SIZE,
          height: MARKER_SIZE,
          borderRadius: MARKER_SIZE / 2,
          marginLeft: -MARKER_SIZE / 2,
          marginTop: -MARKER_SIZE / 2,
        },
      ]}
    >
      {marker.icon ? (
        <Ionicons name={marker.icon} size={ICON_SIZE} color="#FFF" />
      ) : (
        <Text style={styles.markerNum}>{marker.n}</Text>
      )}
    </Animated.View>
  );
}

export const RouteGridCard: React.FC = () => {
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i);
  const activeIndex = useSharedValue(0);
  const [stepLabel, setStepLabel] = useState(STEP_LABELS[0]);

  const updateLabel = useCallback((v: number) => {
    setStepLabel(STEP_LABELS[v] ?? STEP_LABELS[0]);
  }, []);

  useAnimatedReaction(
    () => Math.round(activeIndex.value),
    (v) => {
      runOnJS(updateLabel)(v);
    }
  );

  useEffect(() => {
    const t = setInterval(() => {
      const next = (Math.round(activeIndex.value) + 1) % 4;
      activeIndex.value = withTiming(next, {
        duration: TRANSITION_MS,
        easing: Easing.inOut(Easing.ease),
      });
    }, STEP_DURATION_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(500).delay(220)}
      style={styles.card}
    >
      <View style={styles.grid}>
        {cells.map((i) => (
          <View
            key={i}
            style={[
              styles.cell,
              {
                width: CELL - 1,
                height: CELL - 1,
                borderRightWidth: (i + 1) % GRID_SIZE !== 0 ? 1 : 0,
                borderBottomWidth: i < GRID_SIZE * (GRID_SIZE - 1) ? 1 : 0,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.path}>
        <View style={styles.pathLine} />
        {MARKERS.map((m, i) => (
          <MarkerNode key={m.n} marker={m} index={i} activeIndex={activeIndex} />
        ))}
      </View>

      <Animated.View
        entering={FadeIn.duration(400).delay(600)}
        style={styles.stepInfo}
      >
        <Animated.Text
          key={stepLabel}
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(200)}
          style={styles.stepLabel}
        >
          {stepLabel}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.1,
    maxHeight: 280,
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderRadius: Layout.radiusLarge,
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    borderColor: ColorUtils.withAlpha(Colors.dark.border, 0.4),
  },
  path: {
    ...StyleSheet.absoluteFillObject,
  },
  pathLine: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '42%',
    height: 4,
    backgroundColor: Colors.primary.teal,
    borderRadius: 2,
  },
  marker: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  markerNum: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#FFF',
  },
  stepInfo: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
  },
});
