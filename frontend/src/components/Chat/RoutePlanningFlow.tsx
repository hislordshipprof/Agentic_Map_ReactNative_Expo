/**
 * RoutePlanningFlow - Animated per-stop route planning indicator
 *
 * Replaces ProcessingTimeline during `planning_route` phase.
 * Shows real stop names from NLU entities with animated status transitions.
 * Inspired by chatanimation.md reference prototype.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
  FadeIn,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, FontFamily, Layout } from '@/theme';
import type { ThemePalette } from '@/theme/palettes';
import type { Entities } from '@/types/nlu';

// ─── Types ──────────────────────────────────────────────────────────────────

type StopStatus = 'pending' | 'searching' | 'found' | 'adding' | 'added';

interface StopState {
  name: string;
  status: StopStatus;
}

type PlanPhase = 'resolving' | 'searching' | 'optimizing' | 'building';

export interface RoutePlanningFlowProps {
  entities: Entities;
  colors: ThemePalette;
  onComplete?: () => void;
}

// ─── MiniSpinner ────────────────────────────────────────────────────────────

const MiniSpinner: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => {
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
    <Animated.View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={[color, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          spinnerStyles.ring,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    </Animated.View>
  );
};

const spinnerStyles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: 'rgba(20,184,166,0.9)',
    borderRightColor: 'rgba(20,184,166,0.4)',
  },
});

// ─── StopCard (richer, matching chatanimation.md reference) ─────────────────

interface StopCardProps {
  stop: StopState;
  index: number;
  total: number;
  colors: ThemePalette;
}

const StopCard: React.FC<StopCardProps> = ({ stop, index, colors }) => {
  const borderColor = getStopBorderColor(stop.status, colors);
  const bgColor = getStopBgColor(stop.status, colors);
  const isActive = stop.status !== 'pending';

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(140)}
    >
      <Animated.View
        entering={FadeInDown.duration(300).delay(index * 100)}
        style={[
          stopCardStyles.card,
          {
            borderColor,
            backgroundColor: bgColor,
            opacity: isActive ? 1 : 0.5,
          },
        ]}
      >
        <View style={stopCardStyles.row}>
        {/* Number/Status badge */}
        <View
          style={[
            stopCardStyles.badge,
            { backgroundColor: getBadgeBg(stop.status, colors) },
          ]}
        >
          {stop.status === 'searching' && (
            <MiniSpinner color="#FFFFFF" size={14} />
          )}
          {stop.status === 'adding' && (
            <Ionicons name="add" size={14} color="#FFFFFF" />
          )}
          {(stop.status === 'found' || stop.status === 'added') && (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          )}
          {stop.status === 'pending' && (
            <Text style={stopCardStyles.badgeNumber}>{index + 1}</Text>
          )}
        </View>

        {/* Stop info */}
        <View style={stopCardStyles.info}>
          <Text
            style={[
              stopCardStyles.name,
              { color: isActive ? colors.text.primary : colors.text.tertiary },
            ]}
            numberOfLines={1}
          >
            {stop.name}
          </Text>
        </View>

        {/* Status text */}
        <View style={stopCardStyles.statusWrap}>
          {stop.status === 'searching' && (
            <Text style={[stopCardStyles.statusText, { color: colors.primary.teal }]}>
              Searching...
            </Text>
          )}
          {stop.status === 'found' && (
            <Text style={[stopCardStyles.statusText, { color: colors.primary.teal }]}>
              Found!
            </Text>
          )}
          {stop.status === 'adding' && (
            <Text style={[stopCardStyles.statusText, { color: colors.accent.purple }]}>
              Adding...
            </Text>
          )}
          {stop.status === 'added' && (
            <Text style={[stopCardStyles.statusText, { color: colors.status.success }]}>
              Added
            </Text>
          )}
          {stop.status === 'pending' && (
            <View style={[stopCardStyles.pendingDot, { backgroundColor: colors.text.tertiary }]} />
          )}
        </View>
      </View>
      </Animated.View>
    </Animated.View>
  );
};

function getBadgeBg(status: StopStatus, colors: ThemePalette): string {
  switch (status) {
    case 'pending': return colors.surface.elevated;
    case 'searching':
    case 'found': return colors.primary.teal;
    case 'adding': return colors.accent.purple;
    case 'added': return colors.status.success;
  }
}

function getStopBorderColor(status: StopStatus, colors: ThemePalette): string {
  switch (status) {
    case 'pending': return colors.border.default;
    case 'searching':
    case 'found': return colors.primary.teal;
    case 'adding': return colors.accent.purple;
    case 'added': return colors.status.success;
  }
}

function getStopBgColor(status: StopStatus, colors: ThemePalette): string {
  switch (status) {
    case 'pending': return colors.surface.elevated;
    case 'searching': return colors.effects.glowTeal;
    case 'found': return colors.surface.card;
    case 'adding': return colors.effects.glowPurple;
    case 'added': return colors.status.successBg;
  }
}

const stopCardStyles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeNumber: {
    fontSize: 13,
    fontFamily: FontFamily.primary,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontFamily: FontFamily.primary,
    fontWeight: '500',
  },
  statusWrap: {
    flexShrink: 0,
    alignItems: 'flex-end',
    minWidth: 60,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FontFamily.primary,
    fontWeight: '600',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.4,
  },
});

// ─── PlanningProgress ───────────────────────────────────────────────────────

interface PlanningProgressProps {
  phase: PlanPhase;
  hasStops: boolean;
  colors: ThemePalette;
}

const PHASE_CONFIG_WITH_STOPS: Array<{ key: PlanPhase; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'resolving', label: 'Resolving destination', icon: 'location' },
  { key: 'searching', label: 'Searching for stops', icon: 'search' },
  { key: 'optimizing', label: 'Optimizing route', icon: 'swap-vertical' },
  { key: 'building', label: 'Building directions', icon: 'navigate' },
];

const PHASE_CONFIG_DIRECT: Array<{ key: PlanPhase; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'resolving', label: 'Resolving destination', icon: 'location' },
  { key: 'building', label: 'Building your route', icon: 'navigate' },
];

const PHASE_ORDER: PlanPhase[] = ['resolving', 'searching', 'optimizing', 'building'];

const PlanningProgress: React.FC<PlanningProgressProps> = ({ phase, hasStops, colors }) => {
  const config = hasStops ? PHASE_CONFIG_WITH_STOPS : PHASE_CONFIG_DIRECT;
  const currentIdx = PHASE_ORDER.indexOf(phase);

  return (
    <View style={progressStyles.container}>
      {config.map((cfg) => {
        const cfgIdx = PHASE_ORDER.indexOf(cfg.key);
        const isDone = cfgIdx < currentIdx;
        const isActive = cfgIdx === currentIdx;
        const isPending = cfgIdx > currentIdx;

        if (isPending) return null;

        const iconColor = isDone
          ? colors.status.success
          : isActive
            ? colors.primary.teal
            : colors.text.tertiary;
        const labelColor = isDone
          ? colors.text.secondary
          : isActive
            ? colors.primary.teal
            : colors.text.tertiary;

        return (
          <Animated.View
            key={cfg.key}
            entering={FadeInDown.duration(250).delay(60)}
            style={progressStyles.row}
          >
            <View style={[
              progressStyles.iconBadge,
              {
                backgroundColor: isDone
                  ? colors.status.successBg
                  : isActive
                    ? colors.effects.glowTeal
                    : colors.surface.elevated,
              },
            ]}>
              {isDone ? (
                <Ionicons name="checkmark" size={12} color={iconColor} />
              ) : isActive ? (
                <MiniSpinner color={iconColor} size={12} />
              ) : (
                <Ionicons name={cfg.icon} size={12} color={iconColor} />
              )}
            </View>
            <Text style={[progressStyles.label, { color: labelColor }]}>
              {cfg.label}{isActive ? '...' : ''}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 24,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: FontFamily.primary,
    fontWeight: '500',
    flexShrink: 1,
  },
});

// ─── ContextualTyping ───────────────────────────────────────────────────────

interface ContextualTypingProps {
  text: string;
  colors: ThemePalette;
}

const ContextualTyping: React.FC<ContextualTypingProps> = ({ text, colors }) => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (d: number) =>
      withRepeat(
        withDelay(d, withSequence(
          withTiming(-4, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }),
        )),
        -1, false,
      );
    dot1.value = bounce(0);
    dot2.value = bounce(150);
    dot3.value = bounce(300);
    return () => {
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
    };
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  const dotStyle = [typingStyles.dot, { backgroundColor: colors.primary.teal }];

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.dots}>
        <Animated.View style={[dotStyle, s1]} />
        <Animated.View style={[dotStyle, s2]} />
        <Animated.View style={[dotStyle, s3]} />
      </View>
      <Text style={[typingStyles.text, { color: colors.text.secondary }]}>{text}</Text>
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 22,
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  text: {
    fontSize: 12,
    fontFamily: FontFamily.primary,
    fontWeight: '400',
  },
});

// ─── RoutePlanningFlow (main export) ────────────────────────────────────────

export const RoutePlanningFlow: React.FC<RoutePlanningFlowProps> = ({
  entities,
  colors,
  onComplete,
}) => {
  const stops = entities.stops ?? [];
  const hasStops = stops.length > 0;
  const cancelledRef = useRef(false);
  const [phase, setPhase] = useState<PlanPhase>('resolving');
  const [stopStates, setStopStates] = useState<StopState[]>(
    stops.map((name) => ({ name, status: 'pending' as StopStatus })),
  );
  const [typingText, setTypingText] = useState(
    `Resolving ${entities.destination ?? 'destination'}...`,
  );

  const updateStop = useCallback((idx: number, status: StopStatus) => {
    setStopStates((prev) => prev.map((s, i) => (i === idx ? { ...s, status } : s)));
  }, []);

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!cancelledRef.current) resolve();
        }, ms);
      }),
    [],
  );

  useEffect(() => {
    cancelledRef.current = false;

    const run = async () => {
      // Phase 0: Resolving destination (0-800ms)
      setPhase('resolving');
      setTypingText(`Resolving ${entities.destination ?? 'destination'}...`);
      await wait(800);
      if (cancelledRef.current) return;

      if (hasStops) {
        // Phase 1: Search for each stop
        setPhase('searching');
        for (let i = 0; i < stops.length; i++) {
          if (cancelledRef.current) return;
          const name = stops[i];

          setTypingText(`Searching for ${name}...`);
          updateStop(i, 'searching');
          await wait(1200);
          if (cancelledRef.current) return;

          setTypingText(`Found ${name}!`);
          updateStop(i, 'found');
          await wait(400);
          if (cancelledRef.current) return;

          setTypingText(`Adding ${name} to route...`);
          updateStop(i, 'adding');
          await wait(600);
          if (cancelledRef.current) return;

          updateStop(i, 'added');
          await wait(300);
          if (cancelledRef.current) return;
        }

        // Phase 2: Optimizing
        setPhase('optimizing');
        setTypingText('Optimizing route order...');
        await wait(1500);
        if (cancelledRef.current) return;
      }

      // Phase 3: Building directions
      setPhase('building');
      setTypingText('Building turn-by-turn directions...');
      await wait(1000);
      if (cancelledRef.current) return;

      onComplete?.();
    };

    run();

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      layout={LinearTransition.springify().damping(18).stiffness(140)}
      style={flowStyles.outer}
    >
      <Animated.View
        layout={LinearTransition.springify().damping(18).stiffness(140)}
        style={[
          flowStyles.bubble,
          {
            backgroundColor: colors.message.system,
            borderColor: colors.message.systemBorder,
            shadowColor: colors.effects.shadow,
          },
        ]}
      >
        {/* Header */}
        <View style={flowStyles.header}>
          <View style={[flowStyles.headerIcon, { backgroundColor: colors.effects.glowTeal }]}>
            <Ionicons name="map" size={14} color={colors.primary.teal} />
          </View>
          <View>
            <Text style={[flowStyles.headerTitle, { color: colors.text.primary }]}>
              Planning Your Route
            </Text>
            <Text style={[flowStyles.headerSub, { color: colors.text.secondary }]}>
              {entities.destination
                ? `To ${entities.destination}`
                : 'Finding the best path'}
            </Text>
          </View>
        </View>

        {/* Progress tracker */}
        <PlanningProgress phase={phase} hasStops={hasStops} colors={colors} />

        {/* Stop cards */}
        {hasStops && (
          <View style={flowStyles.stopList}>
            <Text style={[flowStyles.stopsLabel, { color: colors.text.secondary }]}>
              Your Stops
            </Text>
            {stopStates.map((stop, i) => (
              <StopCard
                key={`${stop.name}-${i}`}
                stop={stop}
                index={i}
                total={stops.length}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Typing indicator */}
        <ContextualTyping text={typingText} colors={colors} />
      </Animated.View>
    </Animated.View>
  );
};

const flowStyles = StyleSheet.create({
  outer: {
    width: '100%',
    paddingVertical: Spacing.sm,
  },
  bubble: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Layout.radiusLarge,
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: FontFamily.primary,
    fontWeight: '600',
  },
  headerSub: {
    fontSize: 11,
    fontFamily: FontFamily.primary,
    fontWeight: '400',
  },
  stopList: {
    gap: 6,
  },
  stopsLabel: {
    fontSize: 10,
    fontFamily: FontFamily.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
});

export default RoutePlanningFlow;
