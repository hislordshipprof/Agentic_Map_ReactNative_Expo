/**
 * AnimatedMessage Component - Agentic Mobile Map
 *
 * Animated message bubble for conversation UI with smooth entrance animations.
 * Per requirements-frontend.md Phase 1.1:
 * - User messages on right (blue)
 * - System messages on left (gray)
 * - Auto-scroll, timestamps optional
 *
 * Uses react-native-reanimated for 60 FPS performance.
 *
 * Supports an optional `colors` prop (ThemePalette) for theme-aware rendering.
 * When omitted, falls back to the legacy dark-theme constants (backward compat).
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors, TextStyles, Spacing, Layout, SpringConfig } from '@/theme';
import type { ThemePalette } from '@/theme/palettes';

/**
 * Message type definition
 */
export interface Message {
  id: string;
  sender: 'user' | 'system';
  text: string;
  timestamp: number;
  messageType?: 'confirmation' | 'info' | 'error' | 'warning';
}

/**
 * AnimatedMessage Props
 */
export interface AnimatedMessageProps {
  /** Message data */
  message: Message;
  /** Message index for stagger animation */
  index?: number;
  /** Show timestamp */
  showTimestamp?: boolean;
  /** Custom styles */
  style?: ViewStyle;
  /** Theme palette — when provided, renders theme-aware colors */
  colors?: ThemePalette;
}

/**
 * AnimatedMessage Component
 *
 * Renders a message bubble with entrance animation.
 * - User messages: Dark navy bubble, aligned right, slide from right
 * - System messages: Light gray bubble, aligned left, slide from left
 */
export const AnimatedMessage: React.FC<AnimatedMessageProps> = ({
  message,
  index = 0,
  showTimestamp = false,
  style,
  colors,
}) => {
  const { sender, text, timestamp } = message;
  const isUser = sender === 'user';

  // Animated values
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(isUser ? 50 : -50);
  const translateY = useSharedValue(20);

  // Entrance animation on mount
  useEffect(() => {
    const staggerDelay = index * 30;

    opacity.value = withDelay(
      staggerDelay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );

    translateX.value = withDelay(
      staggerDelay,
      withSpring(0, SpringConfig.gentle)
    );

    translateY.value = withDelay(
      staggerDelay,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [index]);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Format timestamp
  const formatTime = (ts: number): string => {
    const date = new Date(ts);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Derive dynamic styles from theme palette (or fall back to dark defaults)
  const dynamicStyles = useMemo(() => {
    if (!colors) {
      // Legacy fallback: hardcoded dark-theme colors
      return {
        userBubbleBg: Colors.primary.teal,
        systemBubbleBg: Colors.effects.glassDark,
        systemBorderColor: Colors.effects.glassDarkBorder,
        userTextColor: Colors.dark.text.primary,
        systemTextColor: Colors.dark.text.primary,
        userTimestampColor: Colors.dark.text.primary,
        systemTimestampColor: Colors.dark.text.tertiary,
        shadowColor: Colors.effects.shadowDeep,
      };
    }
    return {
      userBubbleBg: colors.message.user,
      systemBubbleBg: colors.message.system,
      systemBorderColor: colors.message.systemBorder,
      userTextColor: colors.message.userText,
      systemTextColor: colors.message.systemText,
      userTimestampColor: colors.message.userText,
      systemTimestampColor: colors.text.tertiary,
      shadowColor: colors.effects.shadow,
    };
  }, [colors]);

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.systemContainer,
        animatedStyle,
        style,
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            shadowColor: dynamicStyles.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: Layout.elevationMedium,
          },
          isUser
            ? [styles.userBubbleShape, { backgroundColor: dynamicStyles.userBubbleBg }]
            : [
                styles.systemBubbleShape,
                {
                  backgroundColor: dynamicStyles.systemBubbleBg,
                  borderWidth: 1,
                  borderColor: dynamicStyles.systemBorderColor,
                },
              ],
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? dynamicStyles.userTextColor : dynamicStyles.systemTextColor },
          ]}
        >
          {text}
        </Text>

        {showTimestamp && (
          <Text
            style={[
              styles.timestamp,
              {
                color: isUser
                  ? dynamicStyles.userTimestampColor
                  : dynamicStyles.systemTimestampColor,
                opacity: isUser ? 0.7 : 1,
                textAlign: isUser ? 'right' : 'left',
              },
            ]}
          >
            {formatTime(timestamp)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  systemContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Layout.radiusLarge,
  },
  userBubbleShape: {
    borderBottomRightRadius: Spacing.xs,
  },
  systemBubbleShape: {
    borderBottomLeftRadius: Spacing.xs,
  },
  text: {
    ...TextStyles.messageBubble,
  },
  timestamp: {
    ...TextStyles.timestamp,
    marginTop: Spacing.xs,
  },
});

export default AnimatedMessage;
