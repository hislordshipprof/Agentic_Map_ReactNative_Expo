/**
 * Home Screen - Agentic Mobile Map
 *
 * Hub layout: map background + draggable bottom sheet with greeting,
 * feature cards, saved places, and recent trips.
 *
 * Location: useLocation() runs on mount and requests permission + fetches
 * current position (cache first, then live). We pass coords to the map as soon
 * as they're available; no static fallback for the user—only the map's initial
 * region uses a default until location is ready.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useThemeColors, useTheme } from '@/theme/useThemeColors';
import { Spacing } from '@/theme';
import { SearchBar } from '@/components/Home/SearchBar';
import { HomeMapView } from '@/components/Home/HomeMapView';
import { HomeBottomSheet } from '@/components/Home/HomeBottomSheet';
import { useRouter } from 'expo-router';
import { useLocation } from '@/hooks';

export default function HomeScreen(): React.ReactElement {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const { currentLocation, address } = useLocation();

  // Map uses one stable location (set once) to avoid flicker from multiple updates.
  const [mapInitialCoords, setMapInitialCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapInitialAddress, setMapInitialAddress] = useState<string | null>(null);
  const hasSetInitial = useRef(false);

  useEffect(() => {
    if (currentLocation && !hasSetInitial.current) {
      hasSetInitial.current = true;
      setMapInitialCoords(currentLocation);
    }
  }, [currentLocation]);

  useEffect(() => {
    if (address && mapInitialCoords) setMapInitialAddress(address);
  }, [address, mapInitialCoords]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Map fills the background; animates to user when location becomes available */}
      <HomeMapView
        initialLat={mapInitialCoords?.lat}
        initialLng={mapInitialCoords?.lng}
        initialAddress={mapInitialAddress}
      />

      {/* Search bar overlay at top */}
      <SafeAreaView style={styles.searchOverlay} edges={['top']}>
        <Animated.View entering={FadeIn.delay(200).duration(400)}>
          <SearchBar onPress={() => router.push('/text-chat' as never)} />
        </Animated.View>
      </SafeAreaView>

      {/* Bottom sheet with content */}
      <HomeBottomSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.sm,
  },
});
