/**
 * Saved Places Tab - Placeholder
 *
 * Will show saved anchors (home, work) and favorite places.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

export default function SavedScreen(): JSX.Element {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Saved Places</Text>
      </View>
      <View style={styles.empty}>
        <Ionicons name="bookmark-outline" size={64} color={colors.text.tertiary} />
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
          No saved places yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
          Your home, work, and favorite places will appear here.
        </Text>
      </View>
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 280,
  },
});
