/**
 * AddressInputModal - Reusable modal for setting an anchor address
 *
 * Features:
 * - Full-screen modal with search input
 * - Google Places autocomplete results
 * - "Use current location" option
 * - Shared between onboarding, Saved tab, and SavedPlacesRow
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@/theme';
import { placesApi } from '@/services/api';
import { useLocation } from '@/hooks';
import type { AnchorType } from '@/types/user';

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressResult {
  location: { lat: number; lng: number };
  address: string;
  name: string;
}

interface AddressInputModalProps {
  visible: boolean;
  anchorType: AnchorType;
  onSelect: (result: AddressResult) => void;
  onClose: () => void;
}

export const AddressInputModal: React.FC<AddressInputModalProps> = ({
  visible,
  anchorType,
  onSelect,
  onClose,
}) => {
  const colors = useThemeColors();
  const { currentLocation, address: currentAddress } = useLocation();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef(`session_${Date.now()}`);

  const label = anchorType === 'home' ? 'Home' : anchorType === 'work' ? 'Work' : anchorType;

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.trim().length < 2) {
        setPredictions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await placesApi.autocomplete({
            input: text,
            location: currentLocation ?? undefined,
            sessionToken: sessionTokenRef.current,
          });
          if (res.success && res.data?.predictions) {
            setPredictions(res.data.predictions);
          }
        } catch {
          // Silently fail - user can keep typing
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [currentLocation],
  );

  const handleSelectPrediction = useCallback(
    async (prediction: Prediction) => {
      Keyboard.dismiss();
      setIsLoadingDetails(true);
      try {
        const res = await placesApi.getDetails(prediction.placeId);
        if (res.success && res.data) {
          onSelect({
            location: res.data.location,
            address: res.data.address,
            name: prediction.mainText,
          });
          resetState();
        }
      } catch {
        // Fallback: use prediction text without coordinates
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [onSelect],
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!currentLocation) return;
    onSelect({
      location: currentLocation,
      address: currentAddress ?? 'Current location',
      name: currentAddress ?? 'Current location',
    });
    resetState();
  }, [currentLocation, currentAddress, onSelect]);

  const resetState = () => {
    setQuery('');
    setPredictions([]);
    setIsSearching(false);
    sessionTokenRef.current = `session_${Date.now()}`;
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const renderPrediction = ({ item }: { item: Prediction }) => (
    <Pressable
      style={({ pressed }) => [
        styles.predictionRow,
        { borderBottomColor: colors.border.light },
        pressed && { backgroundColor: colors.surface.elevated },
      ]}
      onPress={() => handleSelectPrediction(item)}
    >
      <View style={[styles.predictionIcon, { backgroundColor: `${colors.primary.teal}15` }]}>
        <Ionicons name="location-outline" size={18} color={colors.primary.teal} />
      </View>
      <View style={styles.predictionText}>
        <Text style={[styles.predictionMain, { color: colors.text.primary }]} numberOfLines={1}>
          {item.mainText}
        </Text>
        <Text style={[styles.predictionSecondary, { color: colors.text.tertiary }]} numberOfLines={1}>
          {item.secondaryText}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background.primary }]}
        edges={['top', 'bottom']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Set {label} Address
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Search Input */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: colors.input.background, borderColor: colors.input.border }]}>
            <Ionicons name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.input.text }]}
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Search for an address..."
              placeholderTextColor={colors.input.placeholder}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => handleQueryChange('')}>
                <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
              </Pressable>
            )}
            {isSearching && <ActivityIndicator size="small" color={colors.primary.teal} />}
          </View>
        </View>

        {/* Loading overlay for place details */}
        {isLoadingDetails && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary.teal} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
              Getting address details...
            </Text>
          </View>
        )}

        {/* Use Current Location */}
        {currentLocation && query.length === 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.currentLocationRow,
              { borderBottomColor: colors.border.light },
              pressed && { backgroundColor: colors.surface.elevated },
            ]}
            onPress={handleUseCurrentLocation}
          >
            <View style={[styles.currentLocationIcon, { backgroundColor: `${colors.primary.teal}20` }]}>
              <Ionicons name="navigate" size={18} color={colors.primary.teal} />
            </View>
            <View style={styles.predictionText}>
              <Text style={[styles.predictionMain, { color: colors.primary.teal }]}>
                Use current location
              </Text>
              {currentAddress && (
                <Text style={[styles.predictionSecondary, { color: colors.text.tertiary }]} numberOfLines={1}>
                  {currentAddress}
                </Text>
              )}
            </View>
          </Pressable>
        )}

        {/* Results List */}
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.placeId}
          renderItem={renderPrediction}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
  },
  currentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  currentLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  predictionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionText: {
    flex: 1,
  },
  predictionMain: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '500',
  },
  predictionSecondary: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
  },
});
