/**
 * PlaceCard - Displays a saved anchor with edit/delete actions
 *
 * Shows icon, name, address, and action buttons for anchor management.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@/theme';
import type { Anchor } from '@/types/user';

const ANCHOR_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  work: 'briefcase-outline',
  gym: 'barbell-outline',
  school: 'school-outline',
};

function getIcon(type: string): keyof typeof Ionicons.glyphMap {
  return ANCHOR_ICONS[type.toLowerCase()] ?? 'location-outline';
}

interface PlaceCardProps {
  anchor: Anchor;
  onEdit: (anchor: Anchor) => void;
  onDelete: (anchor: Anchor) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ anchor, onEdit, onDelete }) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${colors.primary.teal}15` }]}>
        <Ionicons name={getIcon(anchor.type)} size={22} color={colors.primary.teal} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text.primary }]}>
          {anchor.name}
        </Text>
        {anchor.address && (
          <Text style={[styles.address, { color: colors.text.secondary }]} numberOfLines={1}>
            {anchor.address}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => onEdit(anchor)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.text.tertiary} />
        </Pressable>
        <Pressable
          onPress={() => onDelete(anchor)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.status.error} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  address: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.6,
  },
});
