/**
 * Home Screen - Agentic Mobile Map
 *
 * Hub layout: map background + draggable bottom sheet with greeting,
 * feature cards, saved places, and recent trips.
 */

import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useThemeColors, useTheme } from '@/theme/useThemeColors';
import { Spacing } from '@/theme';
import { SearchBar } from '@/components/Home/SearchBar';
import { HomeMapView } from '@/components/Home/HomeMapView';
import { HomeBottomSheet } from '@/components/Home/HomeBottomSheet';
import { useRouter } from 'expo-router';

export default function HomeScreen(): JSX.Element {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Map fills the background */}
      <HomeMapView />

      {/* Search bar overlay at top */}
      <SafeAreaView style={styles.searchOverlay} edges={['top']}>
        <Animated.View entering={FadeIn.delay(200).duration(400)}>
          <SearchBar onPress={() => router.push('/text-chat')} />
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
