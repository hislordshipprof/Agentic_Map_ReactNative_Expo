/**
 * SavedPlacesRow - Horizontal scroll of saved anchors as cards
 *
 * Design: larger cards with icon + name + address, plus "See all" header.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserAnchors } from '@/hooks';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import { AddressInputModal } from '@/components/SavedPlaces';
import { userApi } from '@/services/api';
import type { AnchorType } from '@/types/user';

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
  const { anchors, setAnchor } = useUserAnchors();
  const colors = useThemeColors();
  const router = useRouter();
  const [modalType, setModalType] = useState<AnchorType | null>(null);

  const handleAddressSelect = useCallback(
    async (result: { location: { lat: number; lng: number }; address: string; name: string }) => {
      const type = modalType;
      if (!type) return;
      setModalType(null);
      await setAnchor(type, result.location, type === 'home' ? 'Home' : 'Work', result.address);
      try {
        await userApi.saveAnchor({
          name: type === 'home' ? 'Home' : 'Work',
          location: result.location,
          address: result.address,
          type,
        });
      } catch {
        // Backend sync failed silently
      }
    },
    [modalType, setAnchor],
  );

  return (
    <View style={styles.container}>
      {/* Header row – always visible so layout matches reference */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Saved Places</Text>
        <Pressable onPress={() => router.push('/(tabs)/saved')}>
          <Text style={[styles.seeAll, { color: colors.design.primaryBlue }]}>See all</Text>
        </Pressable>
      </View>

      {/* Cards – empty state when no anchors */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={anchors.length > 0}
        nestedScrollEnabled
        contentContainerStyle={styles.scroll}
      >
        {anchors.length === 0 ? (
          <Pressable
            onPress={() => setModalType('home')}
            style={({ pressed }) => [
              styles.emptyCard,
              { borderColor: colors.border.light },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="add-circle-outline" size={16} color={colors.primary.teal} />
            <Text style={[styles.emptyText, { color: colors.primary.teal }]}>
              Add Home or Work
            </Text>
          </Pressable>
        ) : anchors.map((anchor) => (
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
            <View style={[styles.iconCircle, { backgroundColor: `${colors.design.primaryBlue}20` }]}>
              <Ionicons
                name={getAnchorIcon(anchor.name)}
                size={18}
                color={colors.design.primaryBlue}
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

      <AddressInputModal
        visible={modalType !== null}
        anchorType={modalType ?? 'home'}
        onSelect={handleAddressSelect}
        onClose={() => setModalType(null)}
      />
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
  emptyCard: {
    minWidth: 150,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
  },
});
