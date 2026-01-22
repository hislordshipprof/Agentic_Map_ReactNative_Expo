/**
 * LoadingIndicator Component - Agentic Mobile Map
 *
 * Beautiful loading indicators with smooth animations.
 * Multiple variants for different use cases.
 *
 * Features:
 * - Pulse animation (thinking dots)
 * - Spinner with teal gradient
 * - Shimmer effect for skeleton loading
 * - Typing indicator for chat
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontFamily, FontSize } from '@/theme';

/**
 * LoadingIndicator Props
 */
export interface LoadingIndicatorProps {
  /** Loading variant */
  variant?: 'dots' | 'spinner' | 'shimmer' | 'typing';
  /** Size */
  size?: 'small' | 'medium' | 'large';
  /** Loading message */
  message?: string;
  /** Custom color */
  color?: string;
  /** Custom styles */
  style?: ViewStyle;
}

/**
 * Animated Dot for pulse effect
 */
const AnimatedDot: React.FC<{
  delay: number;
  size: number;
  color: string;
}> = ({ delay, size, color }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0.5, { duration: 400, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          marginHorizontal: size / 4,
        },
        animatedStyle,
      ]}
    />
  );
};

/**
 * Spinner component
 */
const Spinner: React.FC<{
  size: number;
  color: string;
}> = ({ size, color }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.spinnerContainer, { width: size, height: size }, animatedStyle]}>
      <LinearGradient
        colors={[color, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: size / 10,
          },
        ]}
      />
    </Animated.View>
  );
};

/**
 * Shimmer effect component
 */
const Shimmer: React.FC<{
  width: number;
  height: number;
}> = ({ width, height }) => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width * 2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );

    return () => {
      cancelAnimation(translateX);
    };
  }, [width]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.shimmerContainer, { width, height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.shimmerGradient, { width: width / 2 }, animatedStyle]}>
        <LinearGradient
          colors={['transparent', Colors.effects.glassDarkLight, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Typing indicator (three bouncing dots)
 */
const TypingIndicator: React.FC<{
  size: number;
  color: string;
}> = ({ size, color }) => {
  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  useEffect(() => {
    const bounce = (value: Animated.SharedValue<number>, delay: number) => {
      value.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-size, { duration: 300, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
          ),
          -1,
          false
        )
      );
    };

    bounce(dot1Y, 0);
    bounce(dot2Y, 150);
    bounce(dot3Y, 300);

    return () => {
      cancelAnimation(dot1Y);
      cancelAnimation(dot2Y);
      cancelAnimation(dot3Y);
    };
  }, [size]);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1Y.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2Y.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3Y.value }],
  }));

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    marginHorizontal: size / 3,
  };

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[dotStyle, dot1Style]} />
      <Animated.View style={[dotStyle, dot2Style]} />
      <Animated.View style={[dotStyle, dot3Style]} />
    </View>
  );
};

/**
 * LoadingIndicator Component
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  variant = 'dots',
  size = 'medium',
  message,
  color = Colors.primary.teal,
  style,
}) => {
  // Get size values
  const getSizeValues = () => {
    switch (size) {
      case 'small':
        return { dot: 6, spinner: 24, shimmerWidth: 100, shimmerHeight: 16 };
      case 'large':
        return { dot: 12, spinner: 48, shimmerWidth: 200, shimmerHeight: 24 };
      default:
        return { dot: 8, spinner: 32, shimmerWidth: 150, shimmerHeight: 20 };
    }
  };

  const sizeValues = getSizeValues();

  const renderIndicator = () => {
    switch (variant) {
      case 'spinner':
        return <Spinner size={sizeValues.spinner} color={color} />;
      case 'shimmer':
        return <Shimmer width={sizeValues.shimmerWidth} height={sizeValues.shimmerHeight} />;
      case 'typing':
        return <TypingIndicator size={sizeValues.dot} color={color} />;
      default:
        return (
          <View style={styles.dotsContainer}>
            <AnimatedDot delay={0} size={sizeValues.dot} color={color} />
            <AnimatedDot delay={150} size={sizeValues.dot} color={color} />
            <AnimatedDot delay={300} size={sizeValues.dot} color={color} />
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, style]}>
      {renderIndicator()}
      {message && (
        <Text style={[styles.message, { color: Colors.dark.text.secondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

/**
 * ThinkingBubble - Chat-style loading indicator with optional message
 */
export const ThinkingBubble: React.FC<{
  style?: ViewStyle;
  message?: string;
}> = ({ style, message }) => {
  return (
    <View style={[styles.thinkingBubble, style]}>
      <TypingIndicator size={6} color={Colors.dark.text.secondary} />
      {message ? (
        <Text style={[styles.thinkingBubbleMessage, { color: Colors.dark.text.secondary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 24,
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    borderColor: 'transparent',
    borderTopColor: Colors.primary.teal,
    borderRightColor: Colors.primary.tealLight,
  },
  shimmerContainer: {
    backgroundColor: Colors.dark.elevated,
    overflow: 'hidden',
  },
  shimmerGradient: {
    height: '100%',
  },
  message: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.primary,
    textAlign: 'center',
  },
  thinkingBubble: {
    backgroundColor: Colors.effects.glassDark,
    borderRadius: 20,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    alignSelf: 'flex-start',
  },
  thinkingBubbleMessage: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.primary,
  },
});

export default LoadingIndicator;
