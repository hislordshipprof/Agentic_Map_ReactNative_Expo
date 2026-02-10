/**
 * ProcessingTimeline - Animated multi-phase processing indicator
 *
 * Shows a live, progressively-revealed sequence of backend processing phases
 * inside a single system-style chat bubble. Each completed phase shows a
 * teal checkmark; the active phase shows a spinning ring; upcoming phases
 * remain hidden until their estimated time arrives.
 *
 * Timings are derived from measured backend pipeline durations:
 *   NLU → Resolve → Corridor → Search → Optimize → Directions
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
  FadeIn,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, FontFamily, FontSize, Layout } from '@/theme';
import type { ThemePalette } from '@/theme/palettes';

/** A single processing step definition */
interface PhaseStep {
  key: string;
  label: string;
  /** Delay in ms from component mount before this phase activates */
  delay: number;
}

/** Ordered phases mirroring backend pipeline (cumulative delays) */
const PHASES: PhaseStep[] = [
  { key: 'nlu',        label: 'Understanding your request',         delay: 0 },
  { key: 'resolve',    label: 'Resolving destination',              delay: 800 },
  { key: 'corridor',   label: 'Mapping your route',                 delay: 1800 },
  { key: 'search',     label: 'Finding nearby stops',               delay: 2800 },
  { key: 'optimize',   label: 'Optimizing route order',             delay: 5500 },
  { key: 'directions', label: 'Building turn-by-turn directions',   delay: 7200 },
];

/** Simple understanding-only phase set (no route planning) */
const UNDERSTANDING_PHASES: PhaseStep[] = [
  { key: 'nlu', label: 'Understanding your request', delay: 0 },
];

// ─── Mini Spinner ────────────────────────────────────────────────────────────

const MiniSpinner: React.FC<{ color: string }> = ({ color }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1, false,
    );
    return () => cancelAnimation(rotation);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[spinnerStyles.wrap, style]}>
      <LinearGradient
        colors={[color, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={spinnerStyles.ring}
      />
    </Animated.View>
  );
};

const SPINNER_SIZE = 16;
const spinnerStyles = StyleSheet.create({
  wrap: { width: SPINNER_SIZE, height: SPINNER_SIZE },
  ring: {
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    borderRadius: SPINNER_SIZE / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: 'rgba(20,184,166,0.9)',
    borderRightColor: 'rgba(20,184,166,0.4)',
  },
});

// ─── Phase Row ───────────────────────────────────────────────────────────────

interface PhaseRowProps {
  step: PhaseStep;
  isActive: boolean;
  isComplete: boolean;
  teal: string;
  secondaryText: string;
}

const PhaseRow: React.FC<PhaseRowProps> = ({
  step, isActive, isComplete, teal, secondaryText,
}) => (
  <Animated.View
    entering={FadeInDown.duration(280).delay(60)}
    style={rowStyles.row}
  >
    {/* Icon: spinner or check */}
    <View style={rowStyles.iconWrap}>
      {isActive && <MiniSpinner color={teal} />}
      {isComplete && (
        <Ionicons name="checkmark-circle" size={SPINNER_SIZE} color={teal} />
      )}
    </View>

    {/* Label */}
    <Text
      style={[
        rowStyles.label,
        { color: isActive ? teal : secondaryText },
        isComplete && rowStyles.labelDone,
      ]}
    >
      {step.label}
      {isActive ? '...' : ''}
    </Text>
  </Animated.View>
);

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 22,
  },
  iconWrap: {
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: FontFamily.primary,
    fontWeight: '500',
    flexShrink: 1,
  },
  labelDone: {
    fontWeight: '400',
  },
});

// ─── ProcessingTimeline (main export) ────────────────────────────────────────

export type ProcessingMode = 'understanding' | 'planning_route';

export interface ProcessingTimelineProps {
  /** Which macro-phase we're in — controls which phase set to show */
  mode: ProcessingMode;
  /** Theme palette */
  colors: ThemePalette;
  /** Custom outer style */
  style?: ViewStyle;
}

export const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({
  mode,
  colors,
  style,
}) => {
  const phaseSet = mode === 'planning_route' ? PHASES : UNDERSTANDING_PHASES;
  const [activeIndex, setActiveIndex] = useState(0);
  const mountTimeRef = useRef(Date.now());

  // Progress through phases on a timer
  useEffect(() => {
    mountTimeRef.current = Date.now();
    setActiveIndex(0);

    if (phaseSet.length <= 1) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    phaseSet.forEach((step, i) => {
      if (i === 0) return; // already active
      timers.push(
        setTimeout(() => setActiveIndex(i), step.delay),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [mode]);

  // Visible phases = everything up to and including activeIndex
  const visiblePhases = useMemo(
    () => phaseSet.slice(0, activeIndex + 1),
    [activeIndex, phaseSet],
  );

  const teal = colors.primary.teal;
  const secondaryText = colors.text.secondary;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      layout={LinearTransition.springify().damping(18).stiffness(140)}
      style={[
        timelineStyles.outer,
        style,
      ]}
    >
      <Animated.View
        layout={LinearTransition.springify().damping(18).stiffness(140)}
        style={[
          timelineStyles.bubble,
          {
            backgroundColor: colors.message.system,
            borderColor: colors.message.systemBorder,
            shadowColor: colors.effects.shadow,
          },
        ]}
      >
        {visiblePhases.map((step, i) => {
          const isLast = i === visiblePhases.length - 1;
          return (
            <PhaseRow
              key={step.key}
              step={step}
              isActive={isLast}
              isComplete={!isLast}
              teal={teal}
              secondaryText={secondaryText}
            />
          );
        })}
      </Animated.View>
    </Animated.View>
  );
};

const timelineStyles = StyleSheet.create({
  outer: {
    width: '100%',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Layout.radiusLarge,
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
});

export default ProcessingTimeline;
