/**
 * Route Display Screen
 *
 * Shows route summary with map, recommended route, alternative routes,
 * and Start Navigation CTA that opens the in-app navigation screen.
 *
 * Supports auto-start navigation from voice commands.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { RouteMap, RouteSummarySheet } from '@/components/Route';
import { useRoute } from '@/hooks';
import { useThemeColors } from '@/theme/useThemeColors';
import { Spacing, FontFamily, FontSize } from '@/theme';
import { setAutoStartNavigation } from '@/redux/slices/routeSlice';
import type { RootState } from '@/redux/store';
import type { RouteOption } from '@/types/route';

export default function RouteDisplayScreen(): React.ReactElement {
  const router = useRouter();
  const colors = useThemeColors();
  const dispatch = useDispatch();
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
  const autoStartHandled = useRef(false);

  // Get auto-start flag from Redux
  const autoStartNavigation = useSelector((state: RootState) => state.route.autoStartNavigation);

  const baseRoute = pending || confirmed;

  // Auto-start navigation when flag is set (from voice command)
  useEffect(() => {
    if (autoStartNavigation && baseRoute && !autoStartHandled.current) {
      autoStartHandled.current = true;

      // Clear the flag
      dispatch(setAutoStartNavigation(false));

      // Small delay to let the screen render, then open in-app navigation
      const timer = setTimeout(() => {
        router.push('/navigation');
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoStartNavigation, baseRoute, dispatch, router]);

  // Bottom sheet starts at 50% — pad the map so the route is visible above the sheet
  const mapFitPadding = useMemo(() => ({
    top: 80,
    right: 60,
    bottom: Math.round(screenHeight * 0.55),
    left: 60,
  }), [screenHeight]);

  const handleStartNavigation = () => {
    if (!baseRoute) return;
    router.push('/navigation');
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
