/**
 * VoiceChatBubble - Chat bubbles for voice assistant
 *
 * User: dark navy background, white text (right-aligned)
 * System: light bordered background, dark text (left-aligned)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

interface VoiceChatBubbleProps {
  text: string;
  sender: 'user' | 'system';
  index?: number;
}

export const VoiceChatBubble: React.FC<VoiceChatBubbleProps> = ({ text, sender, index = 0 }) => {
  const colors = useThemeColors();
  const isUser = sender === 'user';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.systemContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.message.user }
            : {
                backgroundColor: colors.message.system,
                borderWidth: 1,
                borderColor: colors.message.systemBorder,
              },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? colors.message.userText : colors.message.systemText },
          ]}
        >
          {text}
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
  userContainer: {
    alignItems: 'flex-end',
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
});
