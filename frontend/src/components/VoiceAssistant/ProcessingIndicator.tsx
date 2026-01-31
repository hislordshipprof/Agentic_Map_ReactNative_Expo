/**
 * ProcessingIndicator - System bubble with teal spinner + status message
 *
 * Appears as a left-aligned chat bubble (like system messages in the design).
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

interface ProcessingIndicatorProps {
  message: string;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ message }) => {
  const colors = useThemeColors();

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={styles.container}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.message.system,
            borderColor: colors.message.systemBorder,
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary.teal} />
        <Text style={[styles.text, { color: colors.primary.teal }]}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  text: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
