/** Route confirmation: map, summary, stops, Accept/Adjust/Cancel. */

import React from 'react';
import { Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { RouteMap, RouteDetails, StopList } from '@/components/Route';
import { Colors, Spacing, FontFamily, FontSize } from '@/theme';
import type { Route } from '@/types/route';

export interface RouteConfirmationScreenProps {
  route: Route;
  onAccept: () => void;
  onAdjust: () => void;
  onCancel: () => void;
  onStopPress?: (stopId: string) => void;
  isLoading?: boolean;
}

function RouteTitleBar({ route }: { route: Route }) {
  const { origin, destination, stops } = route;
  const main = `${origin.name} → ${destination.name}`;
  const suffix = stops.length > 0 ? ` · ${stops.length} stop${stops.length === 1 ? '' : 's'}` : '';

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(0)} style={styles.titleBar}>
      <Ionicons name="navigate" size={18} color={Colors.primary.teal} />
      <Text style={styles.titleText} numberOfLines={1}>
        {main}{suffix}
      </Text>
    </Animated.View>
  );
}

export const RouteConfirmationScreen: React.FC<RouteConfirmationScreenProps> = ({
  route,
  onAccept,
  onAdjust,
  onCancel,
  onStopPress,
  isLoading = false,
}) => {
  const { height: winHeight } = useWindowDimensions();
  const mapHeight = Math.max(200, Math.round(winHeight * 0.45));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RouteTitleBar route={route} />

      <Animated.View entering={FadeIn.duration(450).delay(50)} style={styles.mapWrap}>
        <RouteMap
          route={route}
          height={mapHeight}
          showControls
          onStopPress={onStopPress}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(100)}>
        <RouteDetails
          route={route}
          canNavigate
          isOptimizing={isLoading}
          onStartNavigation={onAccept}
          onEditRoute={onAdjust}
          onCancel={onCancel}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.stopsSection}>
        <Text style={styles.stopsSectionTitle}>Stops</Text>
        <StopList
          origin={route.origin}
          destination={route.destination}
          stops={route.stops}
          onStopPress={onStopPress}
          maxHeight={220}
        />
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingBottom: Spacing['2xl'],
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  titleText: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  mapWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  stopsSection: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  stopsSectionTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginBottom: Spacing.md,
  },
});

export default RouteConfirmationScreen;
