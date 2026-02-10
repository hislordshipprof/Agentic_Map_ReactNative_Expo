/**
 * HomeBottomSheet - Draggable bottom sheet for the home screen
 *
 * Background: same pastel gradient as onboarding reference (cool white →
 * lavender → soft pink), from theme.gradients.pastelScreen. Uses Gesture.Pan + Reanimated.
 */

import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

  // 40% sheet visible = 60% from top
  const COLLAPSED_TOP = screenHeight * 0.60;
  const EXPANDED_TOP = screenHeight * 0.08;
  const MAX_UP = -(COLLAPSED_TOP - EXPANDED_TOP);

  const translateY = useSharedValue(0);
  const savedY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-25, 25])
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

  const pastel = colors.gradients.pastelScreen;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.sheet,
          {
            top: COLLAPSED_TOP,
            height: screenHeight - EXPANDED_TOP,
            shadowColor: colors.effects.shadow,
            overflow: 'hidden',
          },
          animatedStyle,
        ]}
      >
        {/* Same gradient as onboarding reference: vertical, soft pastel */}
        <LinearGradient
          colors={[...pastel.colors]}
          locations={[...pastel.locations]}
          start={pastel.start}
          end={pastel.end}
          style={StyleSheet.absoluteFill}
        />
        {/* Very subtle top edge (matches reference “very soft” look) */}
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.sheetTopHighlight}
        />
        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border.default }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          bounces={false}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
        >
          {/* Greeting */}
          <View style={styles.greetingRow}>
            <Text style={[styles.greetingHi, { color: colors.text.secondary }]}>
              Hi Alex
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

          {/* Recent Trips */}
          <View style={{ marginTop: Spacing.xl }}>
            <RecentTrips />
          </View>
        </ScrollView>
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
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetTopHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 48,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    pointerEvents: 'none',
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
  scrollContent: {
    paddingBottom: 100,
  },
  greetingRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    alignItems: 'flex-start',
  },
  greetingHi: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    marginBottom: 2,
    textAlign: 'left',
  },
  greeting: {
    fontFamily: FontFamily.primary,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'left',
  },
  greetingSub: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    marginTop: 4,
    textAlign: 'left',
  },
});
