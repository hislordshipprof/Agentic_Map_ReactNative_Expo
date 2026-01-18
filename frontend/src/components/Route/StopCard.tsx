/**
 * StopCard Component - Agentic Mobile Map
 *
 * Beautiful stop card displaying place details with detour status.
 * Features glassmorphism design with status color coding.
 *
 * Per requirements:
 * - NO_DETOUR (0-50m): Green - "On your route"
 * - MINIMAL (≤25% buffer): Light green - "Minimal detour"
 * - ACCEPTABLE (26-75% buffer): Amber - "Short detour"
 * - NOT_RECOMMENDED (>75% buffer): Red - "Longer detour"
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import Animated, {
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { StatusBadge } from '@/components/Common';
import {
  Colors,
  Spacing,
  FontFamily,
  FontSize,
  ColorUtils,
} from '@/theme';
import type { RouteStop, DetourStatus } from '@/types/route';
import { formatDistance } from '@/types/route';

/**
 * StopCard Props
 */
export interface StopCardProps {
  /** Stop data */
  stop: RouteStop;
  /** Order number in route (1-based) */
  orderNumber: number;
  /** Whether this stop is selected/expanded */
  isSelected?: boolean;
  /** Whether this stop can be removed */
  canRemove?: boolean;
  /** Callback when card is pressed */
  onPress?: (stopId: string) => void;
  /** Callback when remove is pressed */
  onRemove?: (stopId: string) => void;
  /** Animation delay index */
  index?: number;
  /** Custom style */
  style?: ViewStyle;
}

/**
 * Get icon for place category
 */
const getCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
  switch (category?.toLowerCase()) {
    case 'coffee':
    case 'cafe':
      return 'cafe';
    case 'gas':
    case 'fuel':
      return 'car';
    case 'grocery':
    case 'supermarket':
      return 'cart';
    case 'restaurant':
    case 'food':
      return 'restaurant';
    case 'pharmacy':
      return 'medical';
    case 'bank':
    case 'atm':
      return 'card';
    case 'shopping':
    case 'retail':
      return 'bag';
    default:
      return 'location';
  }
};

/**
 * Get detour label text
 */
const getDetourLabel = (status: DetourStatus, detourCost: number): string => {
  switch (status) {
    case 'NO_DETOUR':
      return 'On your route';
    case 'MINIMAL':
      return `+${formatDistance(detourCost / 1609.34)} detour`;
    case 'ACCEPTABLE':
      return `+${formatDistance(detourCost / 1609.34)} detour`;
    case 'NOT_RECOMMENDED':
      return `+${formatDistance(detourCost / 1609.34)} off route`;
    default:
      return '';
  }
};

/**
 * Animated Pressable for spring effect
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * StopCard Component
 */
export const StopCard: React.FC<StopCardProps> = ({
  stop,
  orderNumber,
  isSelected = false,
  canRemove = true,
  onPress,
  onRemove,
  index = 0,
  style,
}) => {
  const scale = useSharedValue(1);
  const statusColor = ColorUtils.getStatusColor(stop.status);

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).duration(400)}
      style={[styles.wrapper, style]}
    >
      <AnimatedPressable
        onPress={() => onPress?.(stop.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          isSelected && styles.containerSelected,
          animatedStyle,
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

        {/* Order number badge */}
        <View style={[styles.orderBadge, { backgroundColor: ColorUtils.withAlpha(statusColor, 0.15) }]}>
          <Text style={[styles.orderNumber, { color: statusColor }]}>
            {orderNumber}
          </Text>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={getCategoryIcon(stop.category)}
                size={18}
                color={Colors.primary.teal}
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.name} numberOfLines={1}>
                {stop.name}
              </Text>
              {stop.address && (
                <Text style={styles.address} numberOfLines={1}>
                  {stop.address}
                </Text>
              )}
            </View>
          </View>

          {/* Details row */}
          <View style={styles.detailsRow}>
            {/* Rating */}
            {stop.rating !== undefined && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color={Colors.semantic.warning} />
                <Text style={styles.ratingText}>{stop.rating.toFixed(1)}</Text>
              </View>
            )}

            {/* Open status */}
            {stop.isOpen !== undefined && (
              <View style={styles.openStatus}>
                <View
                  style={[
                    styles.openDot,
                    { backgroundColor: stop.isOpen ? Colors.semantic.success : Colors.semantic.error },
                  ]}
                />
                <Text
                  style={[
                    styles.openText,
                    { color: stop.isOpen ? Colors.semantic.success : Colors.semantic.error },
                  ]}
                >
                  {stop.isOpen ? 'Open' : 'Closed'}
                </Text>
              </View>
            )}

            {/* Detour info */}
            <Text style={[styles.detourText, { color: statusColor }]}>
              {getDetourLabel(stop.status, stop.detourCost)}
            </Text>
          </View>

          {/* Status badge */}
          <View style={styles.badgeContainer}>
            <StatusBadge status={stop.status} size="small" />
          </View>
        </View>

        {/* Remove button */}
        {canRemove && (
          <Pressable
            onPress={() => onRemove?.(stop.id)}
            style={({ pressed }) => [
              styles.removeButton,
              pressed && styles.removeButtonPressed,
            ]}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={22} color={Colors.dark.text.tertiary} />
          </Pressable>
        )}

        {/* Selection indicator gradient */}
        {isSelected && (
          <LinearGradient
            colors={[ColorUtils.withAlpha(statusColor, 0.1), 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.effects.glassDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    overflow: 'hidden',
    minHeight: 80,
  },
  containerSelected: {
    borderColor: Colors.primary.teal,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
  },
  orderNumber: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.1),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  address: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.secondary,
    fontWeight: '500',
  },
  openStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  detourText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  badgeContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  removeButton: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
  removeButtonPressed: {
    opacity: 0.6,
  },
});

export default StopCard;
