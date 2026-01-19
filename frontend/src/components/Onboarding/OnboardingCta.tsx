/** Primary CTA for onboarding: "Next >" or "Get Started" with teal gradient. */

import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  FontSize,
  Spacing,
  TouchTarget,
  Layout,
  SpringConfig,
} from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface OnboardingCtaProps {
  label: 'Next' | 'Get Started';
  onPress: () => void;
  /** Slightly smaller for in-card usage (e.g. Get Started in journey card) */
  compact?: boolean;
}

const GRADIENT_COLORS = [Colors.primary.teal, Colors.primary.tealDark] as const;

export const OnboardingCta: React.FC<OnboardingCtaProps> = ({ label, onPress, compact }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const showArrow = label === 'Next';
  const showGetStartedArrow = label === 'Get Started';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, SpringConfig.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SpringConfig.gentle);
      }}
      style={[styles.wrapper, compact && styles.wrapperCompact, animatedStyle]}
      accessibilityLabel={label === 'Next' ? 'Next' : 'Get started'}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[...GRADIENT_COLORS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, compact && styles.gradientCompact]}
      >
        <Text style={styles.text}>{label}</Text>
        {showArrow && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.dark.text.primary}
            style={styles.icon}
          />
        )}
        {showGetStartedArrow && (
          <Ionicons
            name="arrow-forward"
            size={18}
            color={Colors.dark.text.primary}
            style={styles.icon}
          />
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    minHeight: TouchTarget.minAndroid,
    borderRadius: Layout.radiusLarge,
    overflow: 'hidden',
    minWidth: 160,
  },
  wrapperCompact: {
    minWidth: 120,
    minHeight: 44,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    gap: Spacing.xs,
  },
  gradientCompact: {
    paddingVertical: 10,
  },
  text: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  icon: {
    marginLeft: 2,
  },
});
