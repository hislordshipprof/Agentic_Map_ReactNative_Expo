/** Search and select a place to add or replace a stop. Uses placesApi.search. */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '@/components/Common';
import { Colors, Spacing, FontFamily, FontSize, ColorUtils } from '@/theme';
import type { LatLng } from '@/types/route';
import { placesApi } from '@/services/api/places';

export interface AddStopPlace {
  placeId: string;
  name: string;
  address?: string;
  location: LatLng;
}

export interface AddStopFormProps {
  onSelect: (place: AddStopPlace) => void;
  onCancel: () => void;
  mode?: 'add' | 'replace';
  replaceStopId?: string;
  replaceStopName?: string;
  /** Optional location (e.g. route center) for biasing place search */
  location?: { lat: number; lng: number };
}

export const AddStopForm: React.FC<AddStopFormProps> = ({
  onSelect,
  onCancel,
  mode = 'add',
  replaceStopName,
  location,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddStopPlace[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await placesApi.search({
        query: query.trim(),
        location: location ?? { lat: 0, lng: 0 },
        limit: 10,
      });
      if (!res.success) {
        setResults([]);
        return;
      }
      const raw = (res.data as { places?: Array<{ placeId?: string; id?: string; name: string; address?: string; location?: { lat: number; lng: number } }> })?.places ?? [];
      setResults(
        raw.map((p) => ({
          placeId: (p.placeId ?? p.id) || p.name,
          name: p.name,
          address: p.address,
          location: (p.location ?? { lat: 0, lng: 0 }) as LatLng,
        }))
      );
    } finally {
      setSearching(false);
    }
  }, [query, location]);

  const title = mode === 'replace' && replaceStopName
    ? `Replace ${replaceStopName}`
    : 'Add a stop';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.overlayInner} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <Animated.View entering={FadeInUp.duration(350)} style={styles.sheetInner}>
            <Animated.Text entering={FadeInDown.duration(300).delay(50)} style={styles.title}>
              {title}
            </Animated.Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                placeholder="Search for a place..."
                placeholderTextColor={Colors.dark.text.tertiary}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <Pressable onPress={handleSearch} disabled={searching} style={styles.searchBtn}>
                <Ionicons name="search" size={20} color={Colors.dark.text.primary} />
              </Pressable>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {results.map((place, i) => (
                <Animated.View
                  key={place.placeId}
                  entering={FadeInRight.delay(50 * i).duration(350)}
                >
                  <GlassCard variant="default" style={styles.resultCard}>
                    <View style={styles.resultMain}>
                      <Text style={styles.resultName}>{place.name}</Text>
                      {place.address && (
                        <Text style={styles.resultAddress} numberOfLines={1}>{place.address}</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => onSelect(place)}
                      style={({ pressed }) => [styles.selectBtn, pressed && styles.selectBtnPressed]}
                    >
                      <Text style={styles.selectBtnText}>
                        {mode === 'replace' ? 'Replace with this' : 'Add'}
                      </Text>
                    </Pressable>
                  </GlassCard>
                </Animated.View>
              ))}
              {results.length === 0 && !searching && query && (
                <Text style={styles.hint}>Tap Search to find places</Text>
              )}
            </ScrollView>

            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayInner: { ...StyleSheet.absoluteFillObject },
  sheet: { maxHeight: '80%' },
  sheetInner: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginBottom: Spacing.md,
  },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.dark.elevated,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { maxHeight: 260 },
  listContent: { paddingBottom: Spacing.lg },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultMain: { flex: 1 },
  resultName: { fontFamily: FontFamily.primary, fontSize: FontSize.base, fontWeight: '600', color: Colors.dark.text.primary },
  resultAddress: { fontFamily: FontFamily.primary, fontSize: FontSize.sm, color: Colors.dark.text.tertiary, marginTop: 2 },
  selectBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.2),
  },
  selectBtnPressed: { opacity: 0.8 },
  selectBtnText: { fontFamily: FontFamily.primary, fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary.teal },
  hint: { fontFamily: FontFamily.primary, fontSize: FontSize.sm, color: Colors.dark.text.tertiary, textAlign: 'center', marginTop: Spacing.lg },
  cancelBtn: { marginTop: Spacing.lg, alignSelf: 'center' },
  cancelBtnText: { fontFamily: FontFamily.primary, fontSize: FontSize.base, color: Colors.dark.text.secondary },
});
