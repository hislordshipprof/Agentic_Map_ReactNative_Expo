/**
 * Primary CTA for onboarding: gradient button with shimmer animation.
 * Pink → Lavender → Light Blue → Cyan horizontal gradient (matches auth/welcome).
 */

import React, { useEffect } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  FontFamily,
  FontSize,
  Spacing,
  TouchTarget,
  SpringConfig,
} from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface OnboardingCtaProps {
  label: 'Next' | 'Get Started';
  onPress: () => void;
  /** Slightly smaller for in-card usage */
  compact?: boolean;
}

export const OnboardingCta: React.FC<OnboardingCtaProps> = ({ label, onPress, compact }) => {
  const scale = useSharedValue(1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.3, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-150, 150]) }],
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
        colors={['#E8B4CB', '#D4BEE4', '#B8D4E8', '#A8E0E8']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.gradient, compact && styles.gradientCompact]}
      >
        <Text style={styles.text}>{label}</Text>
        {showArrow && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#4A4A5A"
            style={styles.icon}
          />
        )}
        {showGetStartedArrow && (
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#4A4A5A"
            style={styles.icon}
          />
        )}

        {/* Shimmer overlay */}
        <Animated.View style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
        </Animated.View>
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    minHeight: TouchTarget.minAndroid,
    borderRadius: 28,
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
    color: '#3A3A4A',
  },
  icon: {
    marginLeft: 2,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
  },
});
