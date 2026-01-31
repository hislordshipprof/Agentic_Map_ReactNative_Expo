/**
 * HomeBottomSheet - Draggable bottom sheet for the home screen
 *
 * Uses Gesture.Pan + Reanimated (non-deprecated API).
 * Starts at ~50% screen height (collapsed), expands to ~90%.
 * Shows greeting, feature cards, saved places at collapsed;
 * reveals recent trips when expanded.
 */

import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import { FeatureCards } from './FeatureCards';
import { SavedPlacesRow } from './SavedPlacesRow';
import { RecentTrips } from './RecentTrips';

const SPRING_CONFIG = { damping: 25, stiffness: 180, mass: 1 };

export const HomeBottomSheet: React.FC = () => {
  const { height: screenHeight } = useWindowDimensions();
  const colors = useThemeColors();

  const COLLAPSED_TOP = screenHeight * 0.45;
  const EXPANDED_TOP = screenHeight * 0.08;
  const MAX_UP = -(COLLAPSED_TOP - EXPANDED_TOP);

  const translateY = useSharedValue(0);
  const savedY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      const newY = savedY.value + e.translationY;
      translateY.value = Math.max(MAX_UP, Math.min(0, newY));
    })
    .onEnd((e) => {
      const midpoint = MAX_UP / 2;
      const shouldExpand = translateY.value < midpoint || e.velocityY < -500;
      if (shouldExpand && e.velocityY <= 500) {
        translateY.value = withSpring(MAX_UP, SPRING_CONFIG);
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.sheet,
          {
            top: COLLAPSED_TOP,
            height: screenHeight - EXPANDED_TOP,
            backgroundColor: colors.background.primary,
            shadowColor: colors.effects.shadow,
          },
          animatedStyle,
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border.default }]} />
        </View>

        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Text style={[styles.greetingHi, { color: colors.text.secondary }]}>
            Hi there
          </Text>
          <Text style={[styles.greeting, { color: colors.text.primary }]}>
            Good {getTimeOfDay()}
          </Text>
          <Text style={[styles.greetingSub, { color: colors.text.secondary }]}>
            How can I help you today?
          </Text>
        </View>

        {/* Feature Cards */}
        <FeatureCards />

        {/* Saved Places */}
        <View style={{ marginTop: Spacing.xl }}>
          <SavedPlacesRow />
        </View>

        {/* Recent Trips (visible when expanded) */}
        <View style={{ marginTop: Spacing.xl }}>
          <RecentTrips />
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  greetingRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
  },
  greetingHi: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  greeting: {
    fontFamily: FontFamily.primary,
    fontSize: 26,
    fontWeight: '700',
  },
  greetingSub: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    marginTop: 4,
  },
});
