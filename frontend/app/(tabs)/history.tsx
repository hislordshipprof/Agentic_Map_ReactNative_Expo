/**
 * History Tab - Completed route trips
 *
 * Only shows sessions where a route was successfully planned (destination set).
 * Supports clearing all sessions with a confirmation alert.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { clearAllSessions } from '@/redux/slices/chatHistorySlice';
import { SessionCard } from '@/components/History';
import type { ChatSession } from '@/types/chatHistory';

export default function HistoryScreen(): JSX.Element {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const completedTrips = useAppSelector((state) =>
    state.chatHistory.sessions.filter((s) => s.destination != null),
  );

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all session history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => dispatch(clearAllSessions()),
        },
      ],
    );
  }, [dispatch]);

  const renderItem = useCallback(
    ({ item }: { item: ChatSession }) => <SessionCard session={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ChatSession) => item.id, []);

  if (completedTrips.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text.primary }]}>History</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={64} color={colors.text.tertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            No recent trips
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
            Your trip history and past conversations will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>History</Text>
        <Pressable onPress={handleClearAll}>
          <Text style={[styles.clearAll, { color: colors.design.primaryBlue }]}>Clear All</Text>
        </Pressable>
      </View>
      <FlatList
        data={completedTrips}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  clearAll: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
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
