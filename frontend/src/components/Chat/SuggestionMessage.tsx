/**
 * SuggestionMessage Component
 *
 * "Did you mean?" chat bubble with tappable suggestion chips.
 * Displayed when the backend returns DESTINATION_NOT_FOUND_SUGGESTIONS.
 * Follows the AnimatedMessage system-bubble pattern with theme support.
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, FontFamily, FontSize, Layout } from '@/theme';
import type { ThemePalette } from '@/theme/palettes';
import type { DestinationSuggestion } from '@/types/api';

export interface SuggestionMessageProps {
  suggestions: DestinationSuggestion[];
  onSelect: (suggestion: DestinationSuggestion) => void;
  colors: ThemePalette;
}

export const SuggestionMessage: React.FC<SuggestionMessageProps> = ({
  suggestions,
  onSelect,
  colors,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(
      80,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      80,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.message.system,
            borderWidth: 1,
            borderColor: colors.message.systemBorder,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Ionicons name="search-outline" size={16} color={colors.primary.teal} />
          <Text style={[styles.headerText, { color: colors.text.secondary }]}>
            Did you mean one of these?
          </Text>
        </View>

        <View style={styles.chipContainer}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.placeId}
              onPress={() => onSelect(suggestion)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: pressed
                    ? colors.chip.active.background
                    : colors.chip.suggested.background,
                  borderColor: pressed
                    ? colors.chip.active.border
                    : colors.chip.suggested.border,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.chip.suggested.text}
                style={styles.chipIcon}
              />
              <View style={styles.chipTextContainer}>
                <Text
                  style={[styles.chipName, { color: colors.chip.suggested.text }]}
                  numberOfLines={1}
                >
                  {suggestion.name}
                </Text>
                {suggestion.description ? (
                  <Text
                    style={[styles.chipDescription, { color: colors.text.tertiary }]}
                    numberOfLines={1}
                  >
                    {suggestion.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '90%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Layout.radiusLarge,
    borderBottomLeftRadius: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  headerText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  chipContainer: {
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.radiusMedium,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: Spacing.xs,
  },
  chipTextContainer: {
    flex: 1,
  },
  chipName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  chipDescription: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
});

export default SuggestionMessage;
