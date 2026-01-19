/** Pagination dots for onboarding: 3 steps, active = teal. */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing, Layout } from '@/theme';

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
        <View
          key={s}
          style={[
            styles.dot,
            s === activeStep && styles.dotActive,
          ]}
        />
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
    borderColor: Colors.dark.text.tertiary,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary.teal,
    borderWidth: 0,
  },
});
