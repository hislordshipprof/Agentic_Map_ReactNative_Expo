/**
 * SavedPlacesRow - Horizontal scroll of saved anchors as cards
 *
 * Design: larger cards with icon + name + address, plus "See all" header.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserAnchors } from '@/hooks';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

const ANCHOR_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  work: 'briefcase',
  gym: 'barbell',
  school: 'school',
};

function getAnchorIcon(name: string): keyof typeof Ionicons.glyphMap {
  return ANCHOR_ICONS[name.toLowerCase()] ?? 'location';
}

export const SavedPlacesRow: React.FC = () => {
  const { anchors } = useUserAnchors();
  const colors = useThemeColors();

  if (anchors.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Saved Places</Text>
        <Pressable>
          <Text style={[styles.seeAll, { color: colors.primary.teal }]}>See all</Text>
        </Pressable>
      </View>

      {/* Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {anchors.map((anchor) => (
          <Pressable
            key={anchor.name}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.surface.card,
                borderColor: colors.border.light,
                shadowColor: colors.effects.shadow,
              },
              pressed && styles.cardPressed,
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary.teal}12` }]}>
              <Ionicons
                name={getAnchorIcon(anchor.name)}
                size={18}
                color={colors.primary.teal}
              />
            </View>
            <View style={styles.cardText}>
              <Text
                style={[styles.cardTitle, { color: colors.text.primary }]}
                numberOfLines={1}
              >
                {anchor.name}
              </Text>
              {anchor.address && (
                <Text
                  style={[styles.cardAddress, { color: colors.text.tertiary }]}
                  numberOfLines={1}
                >
                  {anchor.address}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  seeAll: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  scroll: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    gap: Spacing.sm,
    minWidth: 150,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  cardAddress: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
});
