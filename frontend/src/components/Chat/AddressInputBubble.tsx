/**
 * AddressInputBubble - In-chat address input with autocomplete
 *
 * Appears in the chat when the system asks for a home/work address.
 * Shows inline text input with autocomplete suggestions.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@/theme';
import { placesApi } from '@/services/api';
import { useLocation } from '@/hooks/useLocation';

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressInputBubbleProps {
  anchorType: string;
  onAddressSelected: (result: {
    location: { lat: number; lng: number };
    address: string;
    name: string;
  }) => void;
  onUseCurrentLocation: () => void;
}

export const AddressInputBubble: React.FC<AddressInputBubbleProps> = ({
  anchorType,
  onAddressSelected,
  onUseCurrentLocation,
}) => {
  const colors = useThemeColors();
  const { currentLocation } = useLocation();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.trim().length < 2) {
        setPredictions([]);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await placesApi.autocomplete({
            input: text,
            location: currentLocation ?? undefined,
          });
          if (res.success && res.data?.predictions) {
            setPredictions(res.data.predictions.slice(0, 3));
          }
        } catch {
          // Silently fail
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [currentLocation],
  );

  const handleSelectPrediction = useCallback(
    async (prediction: Prediction) => {
      setIsLoading(true);
      try {
        const res = await placesApi.getDetails(prediction.placeId);
        if (res.success && res.data) {
          onAddressSelected({
            location: res.data.location,
            address: res.data.address,
            name: prediction.mainText,
          });
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    },
    [onAddressSelected],
  );

  const label = anchorType === 'home' ? 'home' : 'work';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
      <Text style={[styles.label, { color: colors.text.secondary }]}>
        Enter your {label} address:
      </Text>

      {/* Search input */}
      <View style={[styles.inputRow, { backgroundColor: colors.input.background, borderColor: colors.input.border }]}>
        <Ionicons name="search" size={16} color={colors.text.tertiary} />
        <TextInput
          style={[styles.input, { color: colors.input.text }]}
          value={query}
          onChangeText={handleQueryChange}
          placeholder={`Search ${label} address...`}
          placeholderTextColor={colors.input.placeholder}
          autoCorrect={false}
        />
        {isSearching && <ActivityIndicator size="small" color={colors.primary.teal} />}
      </View>

      {/* Use current location */}
      {currentLocation && (
        <Pressable
          onPress={onUseCurrentLocation}
          style={({ pressed }) => [styles.locationButton, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="navigate" size={14} color={colors.primary.teal} />
          <Text style={[styles.locationButtonText, { color: colors.primary.teal }]}>
            Use current location
          </Text>
        </Pressable>
      )}

      {/* Predictions */}
      {predictions.map((p) => (
        <Pressable
          key={p.placeId}
          onPress={() => handleSelectPrediction(p)}
          style={({ pressed }) => [
            styles.predictionRow,
            { borderTopColor: colors.border.light },
            pressed && { backgroundColor: colors.surface.elevated },
          ]}
        >
          <Ionicons name="location-outline" size={16} color={colors.text.tertiary} />
          <View style={styles.predictionText}>
            <Text style={[styles.predictionMain, { color: colors.text.primary }]} numberOfLines={1}>
              {p.mainText}
            </Text>
            <Text style={[styles.predictionSecondary, { color: colors.text.tertiary }]} numberOfLines={1}>
              {p.secondaryText}
            </Text>
          </View>
        </Pressable>
      ))}

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary.teal} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Getting address details...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  label: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  locationButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  predictionText: {
    flex: 1,
  },
  predictionMain: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  predictionSecondary: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  loadingText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
  },
});
