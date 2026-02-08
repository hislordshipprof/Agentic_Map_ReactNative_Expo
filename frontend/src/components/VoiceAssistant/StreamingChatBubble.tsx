/**
 * StreamingChatBubble - Chat bubble with typewriter streaming effect
 *
 * Used for AI responses to simulate real-time streaming.
 * Text appears character by character with a smooth animation.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

interface StreamingChatBubbleProps {
  /** Full text to display with typewriter effect */
  text: string;
  /** Animation index for stagger */
  index?: number;
  /** Characters per second (speed of typing) */
  charsPerSecond?: number;
  /** Callback when streaming completes */
  onComplete?: () => void;
  /** Whether to show cursor while typing */
  showCursor?: boolean;
}

export const StreamingChatBubble: React.FC<StreamingChatBubbleProps> = ({
  text,
  index = 0,
  charsPerSecond = 40,
  onComplete,
  showCursor = true,
}) => {
  const colors = useThemeColors();
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setIsComplete(false);
    indexRef.current = 0;

    if (!text) return;

    // Calculate interval based on chars per second
    const interval = 1000 / charsPerSecond;

    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        // Add characters in batches for smoother appearance (2-3 chars at a time)
        const charsToAdd = Math.min(2, text.length - indexRef.current);
        setDisplayedText(text.slice(0, indexRef.current + charsToAdd));
        indexRef.current += charsToAdd;
      } else {
        // Streaming complete
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsComplete(true);
        onComplete?.();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, charsPerSecond, onComplete]);

  // Don't render empty bubble
  if (!text && !displayedText) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
      style={[styles.container, styles.systemContainer]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.message.system,
            borderWidth: 1,
            borderColor: colors.message.systemBorder,
          },
        ]}
      >
        <Text style={[styles.text, { color: colors.message.systemText }]}>
          {displayedText}
          {showCursor && !isComplete && (
            <Text style={styles.cursor}>|</Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  systemContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: 18,
  },
  text: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    lineHeight: 22,
  },
  cursor: {
    opacity: 0.6,
  },
});
