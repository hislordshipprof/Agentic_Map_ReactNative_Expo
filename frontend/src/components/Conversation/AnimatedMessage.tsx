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
 */

import React, { useEffect } from 'react';
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
}

/**
 * AnimatedMessage Component
 * 
 * Renders a message bubble with entrance animation.
 * - User messages: Blue bubble, aligned right, slide from right
 * - System messages: Gray bubble, aligned left, slide from left
 */
export const AnimatedMessage: React.FC<AnimatedMessageProps> = ({
  message,
  index = 0,
  showTimestamp = false,
  style,
}) => {
  const { sender, text, timestamp } = message;
  const isUser = sender === 'user';

  // Animated values
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(isUser ? 50 : -50);
  const translateY = useSharedValue(20);

  // Entrance animation on mount
  useEffect(() => {
    const staggerDelay = index * 30; // Stagger by 30ms

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
          isUser ? styles.userBubble : styles.systemBubble,
        ]}
      >
        <Text
          style={[
            styles.text,
            isUser ? styles.userText : styles.systemText,
          ]}
        >
          {text}
        </Text>

        {showTimestamp && (
          <Text
            style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.systemTimestamp,
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
 * Shadow style (defined separately to avoid circular reference)
 */
const shadowStyle = {
  shadowColor: Colors.effects.shadowDeep,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: Layout.elevationMedium,
};

/**
 * Styles - Dark theme with teal accents
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
    ...shadowStyle,
  },
  userBubble: {
    // Teal gradient for user messages
    backgroundColor: Colors.primary.teal,
    borderBottomRightRadius: Spacing.xs,
  },
  systemBubble: {
    // Dark glassmorphism for system messages
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderBottomLeftRadius: Spacing.xs,
  },
  text: {
    ...TextStyles.messageBubble,
  },
  userText: {
    color: Colors.dark.text.primary,
  },
  systemText: {
    color: Colors.dark.text.primary,
  },
  timestamp: {
    ...TextStyles.timestamp,
    marginTop: Spacing.xs,
  },
  userTimestamp: {
    color: Colors.dark.text.primary,
    opacity: 0.7,
    textAlign: 'right',
  },
  systemTimestamp: {
    color: Colors.dark.text.tertiary,
    textAlign: 'left',
  },
});

export default AnimatedMessage;
