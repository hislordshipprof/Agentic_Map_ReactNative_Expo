/**
 * Saved Places Tab - Anchor management
 *
 * Empty state: prompts to add Home/Work with teal-bordered dashed cards.
 * With anchors: shows PlaceCards with edit/delete, plus "Add" cards for missing types.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@/theme';
import { useUserAnchors } from '@/hooks';
import { userApi } from '@/services/api';
import { AddressInputModal, PlaceCard } from '@/components/SavedPlaces';
import type { AnchorType, Anchor } from '@/types/user';

export default function SavedScreen(): JSX.Element {
  const colors = useThemeColors();
  const { anchors, home, work, setAnchor, removeAnchor } = useUserAnchors();
  const [modalType, setModalType] = useState<AnchorType | null>(null);

  const handleSelect = useCallback(
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
        // Backend sync failed silently - Redux has the data
      }
    },
    [modalType, setAnchor],
  );

  const handleEdit = useCallback((anchor: Anchor) => {
    setModalType(anchor.type);
  }, []);

  const handleDelete = useCallback(
    (anchor: Anchor) => {
      Alert.alert(
        `Remove ${anchor.name}?`,
        `This will remove your saved ${anchor.name.toLowerCase()} address.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await removeAnchor(anchor.type);
              try {
                await userApi.deleteAnchor(anchor.id);
              } catch {
                // Backend sync failed silently
              }
            },
          },
        ],
      );
    },
    [removeAnchor],
  );

  const hasAnchors = anchors.length > 0;

  const renderAddCard = (
    type: AnchorType,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    delay: number,
  ) => (
    <Animated.View entering={FadeInDown.duration(300).delay(delay)} key={type}>
      <Pressable
        onPress={() => setModalType(type)}
        style={({ pressed }) => [
          styles.addCard,
          { borderColor: `${colors.primary.teal}40` },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={[styles.addCardIcon, { backgroundColor: `${colors.primary.teal}15` }]}>
          <Ionicons name={icon} size={24} color={colors.primary.teal} />
        </View>
        <Text style={[styles.addCardLabel, { color: colors.text.primary }]}>Add {label}</Text>
        <Ionicons name="add" size={20} color={colors.primary.teal} />
      </Pressable>
    </Animated.View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Saved Places</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasAnchors ? (
          /* Empty state */
          <View style={styles.emptySection}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary.teal}15` }]}>
              <Ionicons name="location" size={40} color={colors.primary.teal} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Set up your places
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
              Save Home and Work for one-tap routing
            </Text>

            <View style={styles.addCardsRow}>
              {renderAddCard('home', 'home-outline', 'Home', 100)}
              {renderAddCard('work', 'briefcase-outline', 'Work', 200)}
            </View>
          </View>
        ) : (
          /* Anchors exist */
          <View style={styles.anchorsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
              Your Places
            </Text>

            <View style={styles.cardsList}>
              {home && (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <PlaceCard anchor={home} onEdit={handleEdit} onDelete={handleDelete} />
                </Animated.View>
              )}
              {work && (
                <Animated.View entering={FadeInDown.duration(300).delay(50)}>
                  <PlaceCard anchor={work} onEdit={handleEdit} onDelete={handleDelete} />
                </Animated.View>
              )}

              {/* Show add cards for missing anchor types */}
              {!home && renderAddCard('home', 'home-outline', 'Home', 100)}
              {!work && renderAddCard('work', 'briefcase-outline', 'Work', 150)}
            </View>
          </View>
        )}
      </ScrollView>

      <AddressInputModal
        visible={modalType !== null}
        anchorType={modalType ?? 'home'}
        onSelect={handleSelect}
        onClose={() => setModalType(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  /* Empty state */
  emptySection: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    maxWidth: 280,
  },
  addCardsRow: {
    width: '100%',
    gap: Spacing.md,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardLabel: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  /* Anchors exist */
  anchorsSection: {
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  cardsList: {
    gap: Spacing.md,
  },
});
