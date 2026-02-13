/**
 * Session Transcript Screen - Read-only view of a past chat session
 *
 * Reads sessionId from search params, selects the session from Redux,
 * and renders a scrollable list of messages with an optional route summary.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedMessage } from '@/components/Conversation';
import { useAppSelector } from '@/redux/hooks';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

export default function SessionTranscriptScreen(): JSX.Element {
  const router = useRouter();
  const colors = useThemeColors();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const session = useAppSelector((state) =>
    state.chatHistory.sessions.find((s) => s.id === sessionId),
  );

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Transcript</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.text.tertiary} />
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Session not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.tertiary }]}>
            {formatRelativeTime(session.createdAt)}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {session.messages.map((message, index) => (
          <AnimatedMessage
            key={message.id}
            message={message}
            index={index}
            showTimestamp
            colors={colors}
          />
        ))}

        {/* Route summary card */}
        {session.destination && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface.card, borderColor: colors.border.light }]}>
            <View style={styles.summaryRow}>
              <Ionicons name="navigate" size={16} color={colors.design.primaryBlue} />
              <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Destination</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {session.destination}
            </Text>
            {session.stops && session.stops.length > 0 && (
              <>
                <View style={[styles.summaryRow, { marginTop: Spacing.sm }]}>
                  <Ionicons name="git-branch-outline" size={16} color={colors.design.primaryBlue} />
                  <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Stops</Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
                  {session.stops.join(', ')}
                </Text>
              </>
            )}
            {session.totalTimeMin !== undefined && (
              <View style={[styles.summaryRow, { marginTop: Spacing.sm }]}>
                <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
                <Text style={[styles.summaryMeta, { color: colors.text.tertiary }]}>
                  {session.totalTimeMin} min
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
  },
  summaryCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    marginTop: 4,
    marginLeft: 24,
  },
  summaryMeta: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
  },
});
