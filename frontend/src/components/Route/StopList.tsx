/**
 * StopList Component - Agentic Mobile Map
 *
 * Scrollable list of stops with reorder capability.
 * Displays origin, stops in order, and destination.
 *
 * Features:
 * - Animated stop cards
 * - Visual route line connecting stops
 * - Empty state when no stops
 * - Add stop button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ViewStyle,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { StopCard } from './StopCard';
import { GlassCard } from '@/components/Common';
import {
  Colors,
  Spacing,
  FontFamily,
  FontSize,
  ColorUtils,
} from '@/theme';
import type { RouteStop, LatLng } from '@/types/route';

/**
 * Endpoint (origin/destination) display
 */
interface Endpoint {
  name: string;
  location: LatLng;
}

/**
 * StopList Props
 */
export interface StopListProps {
  /** Origin location */
  origin?: Endpoint;
  /** Destination location */
  destination?: Endpoint;
  /** Ordered list of stops */
  stops: RouteStop[];
  /** Currently selected stop ID */
  selectedStopId?: string;
  /** Callback when a stop is pressed */
  onStopPress?: (stopId: string) => void;
  /** Callback when a stop is removed */
  onStopRemove?: (stopId: string) => void;
  /** Callback when add stop is pressed */
  onAddStop?: () => void;
  /** Whether stops can be reordered */
  canReorder?: boolean;
  /** Whether the list is in loading state */
  isLoading?: boolean;
  /** Maximum height before scrolling */
  maxHeight?: number;
  /** Custom style */
  style?: ViewStyle;
}

/**
 * Endpoint Card Component
 */
const EndpointCard: React.FC<{
  type: 'origin' | 'destination';
  endpoint: Endpoint;
  index: number;
}> = ({ type, endpoint, index }) => {
  const isOrigin = type === 'origin';
  const icon = isOrigin ? 'radio-button-on' : 'flag';
  const color = isOrigin ? Colors.primary.teal : Colors.semantic.success;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={styles.endpointCard}
    >
      <View style={[styles.endpointIcon, { backgroundColor: ColorUtils.withAlpha(color, 0.15) }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.endpointContent}>
        <Text style={styles.endpointLabel}>
          {isOrigin ? 'Starting point' : 'Destination'}
        </Text>
        <Text style={styles.endpointName} numberOfLines={1}>
          {endpoint.name}
        </Text>
      </View>
    </Animated.View>
  );
};

/**
 * Route line connector between stops
 */
const RouteConnector: React.FC<{ isLast?: boolean }> = ({ isLast }) => (
  <View style={styles.connectorContainer}>
    <View style={styles.connectorLine} />
    {!isLast && (
      <View style={styles.connectorDot} />
    )}
  </View>
);

/**
 * Empty State Component
 */
const EmptyState: React.FC<{ onAddStop?: () => void }> = ({ onAddStop }) => (
  <GlassCard variant="default" style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name="add-circle-outline" size={48} color={Colors.primary.teal} />
    </View>
    <Text style={styles.emptyTitle}>No stops added</Text>
    <Text style={styles.emptySubtitle}>
      Add stops along your route like coffee shops, gas stations, or stores
    </Text>
    {onAddStop && (
      <Pressable
        onPress={onAddStop}
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
        ]}
      >
        <Ionicons name="add" size={20} color={Colors.primary.teal} />
        <Text style={styles.addButtonText}>Add a stop</Text>
      </Pressable>
    )}
  </GlassCard>
);

/**
 * StopList Component
 */
export const StopList: React.FC<StopListProps> = ({
  origin,
  destination,
  stops,
  selectedStopId,
  onStopPress,
  onStopRemove,
  onAddStop,
  maxHeight,
  style,
}) => {
  const hasStops = stops.length > 0;

  return (
    <View style={[styles.container, style]}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Route</Text>
        <Text style={styles.headerSubtitle}>
          {hasStops
            ? `${stops.length} stop${stops.length !== 1 ? 's' : ''}`
            : 'Direct route'}
        </Text>
      </View>

      <ScrollView
        style={[styles.scrollView, maxHeight ? { maxHeight } : null]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Origin */}
        {origin && (
          <>
            <EndpointCard type="origin" endpoint={origin} index={0} />
            {(hasStops || destination) && <RouteConnector />}
          </>
        )}

        {/* Stops */}
        {hasStops ? (
          stops.map((stop, index) => (
            <View key={stop.id}>
              <StopCard
                stop={stop}
                orderNumber={index + 1}
                isSelected={selectedStopId === stop.id}
                onPress={onStopPress}
                onRemove={onStopRemove}
                index={index + 1}
              />
              {(index < stops.length - 1 || destination) && (
                <RouteConnector isLast={index === stops.length - 1 && !destination} />
              )}
            </View>
          ))
        ) : (
          <EmptyState onAddStop={onAddStop} />
        )}

        {/* Destination */}
        {destination && (
          <EndpointCard
            type="destination"
            endpoint={destination}
            index={stops.length + 1}
          />
        )}

        {/* Add stop button (when there are existing stops) */}
        {hasStops && onAddStop && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Pressable
              onPress={onAddStop}
              style={({ pressed }) => [
                styles.floatingAddButton,
                pressed && styles.addButtonPressed,
              ]}
            >
              <Ionicons name="add" size={18} color={Colors.primary.teal} />
              <Text style={styles.floatingAddText}>Add another stop</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  headerTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  headerSubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  // Endpoint styles
  endpointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.effects.glassDark,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
  },
  endpointIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  endpointContent: {
    flex: 1,
  },
  endpointLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  endpointName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '500',
    color: Colors.dark.text.primary,
  },
  // Connector styles
  connectorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    marginLeft: Spacing.md + 16, // Align with endpoint icon center
  },
  connectorLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.dark.border,
    borderRadius: 1,
  },
  connectorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.border,
    marginTop: 4,
  },
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginVertical: Spacing.md,
  },
  emptyIconContainer: {
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  // Add button styles
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15),
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.primary.teal,
    gap: Spacing.sm,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.primary.teal,
  },
  floatingAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  floatingAddText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.primary.teal,
  },
});

export default StopList;
