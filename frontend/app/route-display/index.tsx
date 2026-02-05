/**
 * Route Display Screen
 *
 * Shows route summary with map, recommended route, alternative routes,
 * and Start Navigation CTA that opens Google Maps directly.
 */

import { useState, useMemo } from 'react';
import { View, StyleSheet, Text, Linking, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { RouteMap, RouteSummarySheet } from '@/components/Route';
import { useRoute } from '@/hooks';
import { useThemeColors } from '@/theme/useThemeColors';
import { Spacing, FontFamily, FontSize } from '@/theme';
import type { RouteOption } from '@/types/route';

/**
 * Build Google Maps URL with navigation auto-start
 */
function buildGoogleMapsNavigationUrl(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  stops: Array<{ location: { lat: number; lng: number } }>
): string {
  const o = `${origin.lat},${origin.lng}`;
  const d = `${destination.lat},${destination.lng}`;
  const wp = stops.map((s) => `${s.location.lat},${s.location.lng}`).join('|');
  
  const params = new URLSearchParams({
    api: '1',
    origin: o,
    destination: d,
    ...(wp && { waypoints: wp }),
    dir_action: 'navigate', // Auto-start navigation
  });
  
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function RouteDisplayScreen(): React.ReactElement {
  const router = useRouter();
  const colors = useThemeColors();
  const { height: screenHeight } = useWindowDimensions();
  const {
    pending,
    confirmed,
    stops,
    routeOptions,
    isLoading,
    confirm,
    clear,
    selectRouteOption,
  } = useRoute();

  const [mapExpanded, setMapExpanded] = useState(false);

  // Bottom sheet starts at 50% — pad the map so the route is visible above the sheet
  const mapFitPadding = useMemo(() => ({
    top: 80,
    right: 60,
    bottom: Math.round(screenHeight * 0.55),
    left: 60,
  }), [screenHeight]);

  const baseRoute = pending || confirmed;

  const handleStartNavigation = () => {
    if (!baseRoute) return;
    
    // Confirm the route in Redux
    confirm();
    
    // Build Google Maps URL with all stops and auto-navigate
    const url = buildGoogleMapsNavigationUrl(
      baseRoute.origin.location,
      baseRoute.destination.location,
      stops
    );
    
    // Open Google Maps directly
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open Google Maps:', err);
    });
  };

  const handleCancel = () => {
    clear();
    router.back();
  };

  const handleSelectOption = (option: RouteOption) => {
    selectRouteOption(option);
  };

  if (baseRoute && !mapExpanded) {
    return (
      <View style={styles.container}>
        {/* Full-screen map behind the bottom sheet */}
        <RouteMap
          route={baseRoute}
          stops={stops}
          fillScreen
          fitPadding={mapFitPadding}
          showUserLocation
          showOptimization
        />

        {/* Bottom Sheet */}
        <RouteSummarySheet
          route={baseRoute}
          routeOptions={routeOptions}
          onStartNavigation={handleStartNavigation}
          onCancel={handleCancel}
          onSelectOption={handleSelectOption}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.empty}>
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <Ionicons name="map-outline" size={64} color={colors.text.tertiary} />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(400).delay(220)}>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            No route planned yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
            Use the conversation or voice assistant to plan a route, and it will appear here.
          </Text>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  emptySubtext: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 280,
  },
});
