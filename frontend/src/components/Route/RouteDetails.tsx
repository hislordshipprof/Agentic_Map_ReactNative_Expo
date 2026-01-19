/** Route summary: distance, duration, stops, detour budget, and Accept/Adjust/Cancel actions. */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassCard } from '@/components/Common';
import {
  Colors,
  Spacing,
  FontFamily,
  FontSize,
  ColorUtils,
} from '@/theme';
import type { Route } from '@/types/route';
import { formatDistance, formatDuration } from '@/types/route';

export interface RouteDetailsProps {
  route: Route;
  canNavigate?: boolean;
  isOptimizing?: boolean;
  onStartNavigation?: () => void;
  onEditRoute?: () => void;
  onCancel?: () => void;
  style?: ViewStyle;
}

const StatItem: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
}> = ({ icon, label, value, color = Colors.primary.teal }) => (
  <View style={styles.statItem}>
    <View style={[styles.statIcon, { backgroundColor: ColorUtils.withAlpha(color, 0.15) }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const BudgetProgress: React.FC<{
  used: number;
  total: number;
}> = ({ used, total }) => {
  const progress = Math.min(used / total, 1);
  const percentage = Math.round(progress * 100);

  const getProgressColor = () => {
    if (progress <= 0.5) return Colors.semantic.success;
    if (progress <= 0.75) return Colors.semantic.warning;
    return Colors.semantic.error;
  };

  const progressColor = getProgressColor();

  return (
    <View style={styles.budgetContainer}>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetLabel}>Detour budget</Text>
        <Text style={[styles.budgetPercent, { color: progressColor }]}>
          {percentage}% used
        </Text>
      </View>
      <View style={styles.budgetTrack}>
        <Animated.View
          style={[
            styles.budgetProgress,
            {
              width: `${percentage}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>
      <View style={styles.budgetInfo}>
        <Text style={styles.budgetText}>
          {formatDistance(used / 1609.34)} of {formatDistance(total / 1609.34)}
        </Text>
        <Text style={styles.budgetRemaining}>
          {formatDistance((total - used) / 1609.34)} remaining
        </Text>
      </View>
    </View>
  );
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AcceptButton: React.FC<{
  onPress?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}> = ({ onPress, disabled, isLoading }) => {
  const scale = useSharedValue(1);
  const bgProgress = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    bgProgress.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    bgProgress.value = withTiming(0, { duration: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [Colors.primary.teal, Colors.primary.tealDark]
    ),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isLoading}
      style={[
        styles.acceptButton,
        animatedStyle,
        disabled && styles.acceptButtonDisabled,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.acceptButtonBg, bgAnimatedStyle]} />
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
      />
      <View style={styles.acceptButtonContent}>
        {isLoading ? (
          <Text style={styles.acceptButtonText}>Optimizing...</Text>
        ) : (
          <>
            <Ionicons name="navigate" size={22} color={Colors.dark.text.primary} />
            <Text style={styles.acceptButtonText}>Accept & Navigate</Text>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
};

export const RouteDetails: React.FC<RouteDetailsProps> = ({
  route,
  canNavigate = true,
  isOptimizing = false,
  onStartNavigation,
  onEditRoute,
  onCancel,
  style,
}) => {
  const { totalDistance, totalTime, stops, detourBudget } = route;

  return (
    <Animated.View entering={FadeInUp.duration(500)} style={style}>
      <GlassCard variant="elevated" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="map" size={20} color={Colors.primary.teal} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Route Summary</Text>
              <Text style={styles.headerSubtitle}>
                {route.origin.name} → {route.destination.name}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatItem
            icon="speedometer-outline"
            label="Distance"
            value={formatDistance(totalDistance)}
          />
          <View style={styles.statDivider} />
          <StatItem
            icon="time-outline"
            label="Duration"
            value={formatDuration(totalTime)}
          />
          <View style={styles.statDivider} />
          <StatItem
            icon="location-outline"
            label="Stops"
            value={stops.length.toString()}
            color={Colors.semantic.info}
          />
        </View>

        <BudgetProgress
          used={detourBudget.used}
          total={detourBudget.total}
        />

        <AcceptButton
          onPress={onStartNavigation}
          disabled={!canNavigate}
          isLoading={isOptimizing}
        />

        <View style={styles.actionsRow}>
          {onEditRoute && (
            <Pressable
              onPress={onEditRoute}
              style={({ pressed }) => [styles.adjustButton, pressed && styles.adjustButtonPressed]}
            >
              <Ionicons name="create-outline" size={18} color={Colors.primary.teal} />
              <Text style={styles.adjustButtonText}>Adjust</Text>
            </Pressable>
          )}
          {onCancel && (
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.qualityBadge}>
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={Colors.semantic.success}
          />
          <Text style={styles.qualityText}>Optimized route</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  headerSubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.effects.glassDark,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.dark.text.primary,
  },
  statLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.dark.border,
    marginHorizontal: Spacing.sm,
  },
  budgetContainer: {
    marginBottom: Spacing.lg,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  budgetLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.dark.text.secondary,
  },
  budgetPercent: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  budgetTrack: {
    height: 6,
    backgroundColor: Colors.dark.elevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  budgetProgress: {
    height: '100%',
    borderRadius: 3,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  budgetRemaining: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  acceptButton: {
    minHeight: 48,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  acceptButtonBg: {
    borderRadius: 16,
    backgroundColor: Colors.primary.teal,
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  acceptButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    backgroundColor: 'transparent',
  },
  adjustButtonPressed: {
    opacity: 0.7,
  },
  adjustButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary.teal,
  },
  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  qualityText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
});

export default RouteDetails;
