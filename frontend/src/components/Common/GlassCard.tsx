/**
 * GlassCard Component - Agentic Mobile Map
 *
 * Beautiful glassmorphism card with dark theme support.
 * Inspired by premium AI assistant interfaces.
 *
 * Features:
 * - Frosted glass effect with blur
 * - Subtle border glow
 * - Optional teal accent
 * - Smooth entrance animations
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, Layout, SpringConfig } from '@/theme';

/**
 * GlassCard Props
 */
export interface GlassCardProps {
  children: React.ReactNode;
  /** Card variant */
  variant?: 'default' | 'elevated' | 'accent' | 'teal';
  /** Enable blur effect (iOS only, falls back on Android) */
  blur?: boolean;
  /** Blur intensity (1-100) */
  blurIntensity?: number;
  /** Enable entrance animation */
  animated?: boolean;
  /** Animation delay (for staggered lists) */
  animationDelay?: number;
  /** Border radius override */
  borderRadius?: number;
  /** Custom padding */
  padding?: number;
  /** Custom styles */
  style?: ViewStyle;
  /** Press handler for interactive cards */
  onPress?: () => void;
}

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * GlassCard Component
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  blur = true,
  blurIntensity = 20,
  animated = true,
  animationDelay = 0,
  borderRadius,
  padding,
  style,
}) => {
  // Animation values
  const opacity = useSharedValue(animated ? 0 : 1);
  const scale = useSharedValue(animated ? 0.95 : 1);
  const translateY = useSharedValue(animated ? 10 : 0);

  // Entrance animation
  useEffect(() => {
    if (animated) {
      opacity.value = withDelay(
        animationDelay,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
      );

      scale.value = withDelay(
        animationDelay,
        withSpring(1, SpringConfig.gentle)
      );

      translateY.value = withDelay(
        animationDelay,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [animated, animationDelay]);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: Colors.effects.glassDark,
          borderColor: Colors.effects.glassDarkBorder,
        };
      case 'accent':
        return {
          backgroundColor: Colors.effects.glassTeal,
          borderColor: Colors.effects.glassTealBorder,
        };
      case 'teal':
        return {
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          borderColor: Colors.primary.teal,
        };
      default:
        return {
          backgroundColor: Colors.effects.glassDark,
          borderColor: Colors.effects.glassDarkBorder,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const radius = borderRadius ?? Layout.radiusLarge;
  const paddingValue = padding ?? Spacing.base;

  // Use BlurView on iOS, fallback on Android
  const renderContent = () => {
    if (blur && Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          style={[
            styles.blurContainer,
            { borderRadius: radius, padding: paddingValue },
          ]}
        >
          <View
            style={[
              styles.innerContainer,
              {
                backgroundColor: variantStyles.backgroundColor,
                borderColor: variantStyles.borderColor,
                borderRadius: radius,
              },
            ]}
          >
            {children}
          </View>
        </BlurView>
      );
    }

    // Android fallback (no blur, just semi-transparent)
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: variantStyles.backgroundColor,
            borderColor: variantStyles.borderColor,
            borderRadius: radius,
            padding: paddingValue,
          },
        ]}
      >
        {children}
      </View>
    );
  };

  return (
    <AnimatedView style={[styles.wrapper, animatedStyle, style]}>
      {renderContent()}
    </AnimatedView>
  );
};

/**
 * GlassCardGradient - Card with gradient background
 */
export const GlassCardGradient: React.FC<
  GlassCardProps & {
    gradientColors?: readonly string[] | string[];
  }
> = ({
  children,
  gradientColors,
  borderRadius,
  padding,
  style,
  animated = true,
  animationDelay = 0,
}) => {
  const opacity = useSharedValue(animated ? 0 : 1);
  const scale = useSharedValue(animated ? 0.95 : 1);

  useEffect(() => {
    if (animated) {
      opacity.value = withDelay(animationDelay, withTiming(1, { duration: 400 }));
      scale.value = withDelay(animationDelay, withSpring(1, SpringConfig.gentle));
    }
  }, [animated, animationDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const radius = borderRadius ?? Layout.radiusLarge;
  const paddingValue = padding ?? Spacing.base;
  // Convert readonly array to mutable for LinearGradient
  const colors = gradientColors ? [...gradientColors] : [...Colors.gradients.darkTeal];

  return (
    <AnimatedView style={[styles.wrapper, animatedStyle, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradientContainer,
          {
            borderRadius: radius,
            padding: paddingValue,
          },
        ]}
      >
        {children}
      </LinearGradient>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // Shadow for elevation
    shadowColor: Colors.effects.shadowDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  container: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  blurContainer: {
    overflow: 'hidden',
  },
  innerContainer: {
    flex: 1,
    borderWidth: 1,
  },
  gradientContainer: {
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    overflow: 'hidden',
  },
});

export default GlassCard;
