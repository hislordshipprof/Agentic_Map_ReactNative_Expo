/**
 * OfflineQuickActions Component - Agentic Mobile Map
 *
 * Quick action buttons for offline mode using cached data.
 * Per requirements-frontend.md Phase 4.2:
 * - Pre-populate common utterances as quick-tap buttons
 * - Show cached anchors (Home, Work, etc.)
 * - Show recently used routes
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ViewStyle,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from './GlassCard';
import { Colors, Spacing, FontFamily, FontSize, ColorUtils } from '@/theme';
import type { Anchor } from '@/types/user';
import type { Route } from '@/types/route';
import { getAnchorIcon } from '@/types/user';
import { formatDistance, formatDuration } from '@/types/route';

/**
 * OfflineQuickActions Props
 */
export interface OfflineQuickActionsProps {
  /** Cached user anchors */
  anchors: Anchor[] | null;
  /** Cached recent routes */
  recentRoutes: Route[];
  /** Callback when anchor is selected */
  onAnchorSelect?: (anchor: Anchor) => void;
  /** Callback when route is selected */
  onRouteSelect?: (route: Route) => void;
  /** Custom style */
  style?: ViewStyle;
}

/**
 * Anchor Button Component
 */
const AnchorButton: React.FC<{
  anchor: Anchor;
  onPress: () => void;
  index: number;
}> = ({ anchor, onPress, index }) => {
  const iconName = getAnchorIcon(anchor.type) as keyof typeof Ionicons.glyphMap;

  return (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(300)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.anchorButton,
          pressed && styles.anchorButtonPressed,
        ]}
      >
        <View style={styles.anchorIcon}>
          <Ionicons name={iconName} size={20} color={Colors.primary.teal} />
        </View>
        <Text style={styles.anchorName} numberOfLines={1}>
          {anchor.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

/**
 * Recent Route Card Component
 */
const RecentRouteCard: React.FC<{
  route: Route;
  onPress: () => void;
  index: number;
}> = ({ route, onPress, index }) => {
  const stopsText = route.stops.length > 0
    ? `with ${route.stops.map((s) => s.name).join(', ')}`
    : 'direct route';

  return (
    <Animated.View entering={FadeInUp.delay((index + 3) * 100).duration(300)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.routeCard,
          pressed && styles.routeCardPressed,
        ]}
      >
        <View style={styles.routeHeader}>
          <View style={styles.routeIconContainer}>
            <Ionicons name="navigate" size={16} color={Colors.primary.teal} />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeDestination} numberOfLines={1}>
              {route.destination.name}
            </Text>
            <Text style={styles.routeStops} numberOfLines={1}>
              {stopsText}
            </Text>
          </View>
        </View>
        <View style={styles.routeStats}>
          <Text style={styles.routeStat}>
            {formatDistance(route.totalDistance)}
          </Text>
          <View style={styles.routeStatDivider} />
          <Text style={styles.routeStat}>
            {formatDuration(route.totalTime)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

/**
 * Empty State Component
 */
const EmptyState: React.FC = () => (
  <View style={styles.emptyState}>
    <Ionicons name="cloud-offline-outline" size={32} color={Colors.dark.text.tertiary} />
    <Text style={styles.emptyTitle}>No cached data</Text>
    <Text style={styles.emptySubtitle}>
      Connect to the internet to sync your saved locations
    </Text>
  </View>
);

/**
 * OfflineQuickActions Component
 */
export const OfflineQuickActions: React.FC<OfflineQuickActionsProps> = ({
  anchors,
  recentRoutes,
  onAnchorSelect,
  onRouteSelect,
  style,
}) => {
  const hasAnchors = anchors && anchors.length > 0;
  const hasRoutes = recentRoutes.length > 0;
  const hasData = hasAnchors || hasRoutes;

  if (!hasData) {
    return (
      <GlassCard variant="default" style={style}>
        <EmptyState />
      </GlassCard>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Saved Locations */}
      {hasAnchors && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Locations</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.anchorsScroll}
          >
            {anchors!.map((anchor, index) => (
              <AnchorButton
                key={anchor.id}
                anchor={anchor}
                onPress={() => onAnchorSelect?.(anchor)}
                index={index}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Routes */}
      {hasRoutes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Routes</Text>
          <View style={styles.routesList}>
            {recentRoutes.slice(0, 3).map((route, index) => (
              <RecentRouteCard
                key={route.id}
                route={route}
                onPress={() => onRouteSelect?.(route)}
                index={index}
              />
            ))}
          </View>
        </View>
      )}

      {/* Offline notice */}
      <View style={styles.offlineNotice}>
        <Ionicons name="information-circle" size={14} color={Colors.dark.text.tertiary} />
        <Text style={styles.offlineNoticeText}>
          Using cached data. Some details may be outdated.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.dark.text.secondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Anchor buttons
  anchorsScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  anchorButton: {
    alignItems: 'center',
    backgroundColor: Colors.effects.glassDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minWidth: 90,
  },
  anchorButtonPressed: {
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.1),
    borderColor: Colors.primary.teal,
  },
  anchorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  anchorName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.dark.text.primary,
    textAlign: 'center',
  },
  // Route cards
  routesList: {
    gap: Spacing.sm,
  },
  routeCard: {
    backgroundColor: Colors.effects.glassDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    padding: Spacing.md,
  },
  routeCardPressed: {
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.1),
    borderColor: Colors.primary.teal,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  routeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  routeInfo: {
    flex: 1,
  },
  routeDestination: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  routeStops: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    marginTop: 2,
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeStat: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.secondary,
    fontWeight: '500',
  },
  routeStatDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.text.tertiary,
    marginHorizontal: Spacing.sm,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.secondary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  // Offline notice
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  offlineNoticeText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    fontStyle: 'italic',
  },
});

export default OfflineQuickActions;
