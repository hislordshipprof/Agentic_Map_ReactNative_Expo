/** Pagination dots for onboarding: 3 steps, active = gradient pill, light theme. */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Layout } from '@/theme';

export interface PaginationDotsProps {
  /** 1, 2, or 3 */
  activeStep: 1 | 2 | 3;
}

export const PaginationDots: React.FC<PaginationDotsProps> = ({ activeStep }) => {
  return (
    <View
      style={styles.root}
      accessibilityLabel={`Step ${activeStep} of 3`}
      accessibilityRole="adjustable"
    >
      {([1, 2, 3] as const).map((s) => (
        s === activeStep ? (
          <LinearGradient
            key={s}
            colors={['#E8B4CB', '#D4BEE4', '#B8D4E8', '#A8E0E8']}
            locations={[0, 0.35, 0.7, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.dot, styles.dotActive]}
          />
        ) : (
          <View key={s} style={styles.dot} />
        )
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Layout.radiusFull,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dotActive: {
    width: 24,
    borderWidth: 0,
  },
});
