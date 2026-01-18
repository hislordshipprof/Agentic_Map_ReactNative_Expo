/**
 * StatusBadge Component - Agentic Mobile Map
 * 
 * Color-coded badge for stop detour status classification.
 * Per requirements-backend.md DetourStatus types:
 * - NO_DETOUR (0-50m): Green
 * - MINIMAL (≤25% buffer): Light green
 * - ACCEPTABLE (26-75% buffer): Amber
 * - NOT_RECOMMENDED (>75% buffer): Red
 * 
 * Uses ColorUtils.getStatusColor() from theme.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ColorUtils, TextStyles, Spacing, Layout } from '@/theme';
import type { DetourStatus } from '@/theme/colors';

/**
 * StatusBadge Props
 */
export interface StatusBadgeProps {
  /** Detour status */
  status: DetourStatus;
  /** Show status label */
  showLabel?: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Custom style */
  style?: ViewStyle;
}

/**
 * Get human-readable status label
 */
const getStatusLabel = (status: DetourStatus): string => {
  switch (status) {
    case 'NO_DETOUR':
      return 'Perfect';
    case 'MINIMAL':
      return 'Great';
    case 'ACCEPTABLE':
      return 'Okay';
    case 'NOT_RECOMMENDED':
      return 'Not Ideal';
    default:
      return 'Unknown';
  }
};

/**
 * Get status icon (emoji)
 */
const getStatusIcon = (status: DetourStatus): string => {
  switch (status) {
    case 'NO_DETOUR':
      return '✓';
    case 'MINIMAL':
      return '✓';
    case 'ACCEPTABLE':
      return '!';
    case 'NOT_RECOMMENDED':
      return '✕';
    default:
      return '?';
  }
};

/**
 * StatusBadge Component
 * 
 * Displays stop status with:
 * - Color-coded background
 * - Status icon
 * - Optional label
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'medium',
  style,
}) => {
  const color = ColorUtils.getStatusColor(status);
  const label = getStatusLabel(status);
  const icon = getStatusIcon(status);

  // Size variants
  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      text: TextStyles.caption,
    },
    medium: {
      container: styles.containerMedium,
      text: TextStyles.bodySmall,
    },
    large: {
      container: styles.containerLarge,
      text: TextStyles.body,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.container,
        currentSize.container,
        { backgroundColor: ColorUtils.withAlpha(color, 0.15) },
        style,
      ]}
    >
      <Text style={[styles.icon, currentSize.text, { color }]}>
        {icon}
      </Text>

      {showLabel && (
        <Text style={[styles.label, currentSize.text, { color }]}>
          {label}
        </Text>
      )}
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Layout.radiusMedium,
    gap: Spacing.xs,
  },
  containerSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  containerMedium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  containerLarge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  icon: {
    fontWeight: '700',
  },
  label: {
    fontWeight: '600',
  },
});

export default StatusBadge;
