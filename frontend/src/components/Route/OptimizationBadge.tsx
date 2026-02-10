/**
 * OptimizationBadge - "94% Optimized" teal outlined pill
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

interface OptimizationBadgeProps {
  percentage: number;
}

export const OptimizationBadge: React.FC<OptimizationBadgeProps> = ({ percentage }) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.badge, { borderColor: colors.primary.teal }]}>
      <Ionicons name="flash" size={14} color={colors.primary.teal} />
      <Text style={[styles.text, { color: colors.primary.teal }]}>
        {percentage}% Optimized
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  text: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
