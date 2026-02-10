/**
 * SearchBar - "Where to?" search input with notification bell
 *
 * Elevated white card style matching the design mockup.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

interface SearchBarProps {
  onPress: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onPress }) => {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.searchBox,
          {
            backgroundColor: colors.surface.card,
            shadowColor: colors.effects.shadow,
          },
          pressed && styles.searchPressed,
        ]}
        onPress={onPress}
      >
        <Ionicons name="search" size={20} color={colors.text.tertiary} />
        <Text style={[styles.placeholder, { color: colors.text.tertiary }]}>
          Where to?
        </Text>
      </Pressable>
      <Pressable
        style={[styles.bellButton, { backgroundColor: colors.surface.card, shadowColor: colors.effects.shadow }]}
      >
        <Ionicons name="notifications-outline" size={22} color={colors.text.secondary} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  placeholder: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
  },
  bellButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
