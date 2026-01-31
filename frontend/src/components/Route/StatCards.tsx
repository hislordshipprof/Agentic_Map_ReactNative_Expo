/**
 * StatCards - Three stat cards: miles (teal), minutes (teal), detour (amber)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

interface StatCardsProps {
  distanceMiles: number;
  durationMinutes: number;
  detourMinutes: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  distanceMiles,
  durationMinutes,
  detourMinutes,
}) => {
  const colors = useThemeColors();

  const cards = [
    {
      value: distanceMiles.toFixed(1),
      unit: 'mi',
      icon: 'navigate-outline' as const,
      color: colors.primary.teal,
    },
    {
      value: Math.round(durationMinutes).toString(),
      unit: 'min',
      icon: 'time-outline' as const,
      color: colors.primary.teal,
    },
    {
      value: `+${Math.round(detourMinutes)}`,
      unit: 'detour',
      icon: 'swap-horizontal-outline' as const,
      color: colors.status.acceptable,
    },
  ];

  return (
    <View style={styles.container}>
      {cards.map((card) => (
        <View
          key={card.unit}
          style={[styles.card, { backgroundColor: colors.surface.elevated }]}
        >
          <Ionicons name={card.icon} size={18} color={card.color} />
          <Text style={[styles.value, { color: colors.text.primary }]}>{card.value}</Text>
          <Text style={[styles.unit, { color: colors.text.tertiary }]}>{card.unit}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: 2,
  },
  value: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  unit: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
