/**
 * RecentTrips - Recent session list with timestamps and stop counts
 *
 * Icons reflect trip type (home, work, coffee, multi-stop). "View all" in Primary Blue.
 * Pulls real data from the chatHistory Redux slice.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import { useAppSelector } from '@/redux/hooks';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import type { ChatSession } from '@/types/chatHistory';

type TripIconName = keyof typeof Ionicons.glyphMap;

function getTripIcon(session: ChatSession): TripIconName {
  const lower = session.title.toLowerCase();
  if (lower.includes('home') && !lower.includes('work')) return 'home';
  if (lower.includes('work') && !lower.includes('home')) return 'briefcase';
  if (lower.includes('coffee') || lower.includes('starbucks') || lower.includes('cafe')) return 'cafe';
  const stopCount = session.stops?.length ?? 0;
  if (stopCount > 1 || lower.includes(' via ')) return 'git-branch-outline';
  return 'navigate';
}

export const RecentTrips: React.FC = () => {
  const colors = useThemeColors();
  const router = useRouter();
  const sessions = useAppSelector((state) => state.chatHistory.sessions);

  // Only show sessions with a completed route
  const recentSessions = sessions
    .filter((s) => s.destination != null)
    .slice(0, 3);

  if (recentSessions.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Trips</Text>
        <Pressable onPress={() => router.push('/(tabs)/history')}>
          <Text style={[styles.viewAll, { color: colors.design.primaryBlue }]}>View all</Text>
        </Pressable>
      </View>

      {recentSessions.map((session) => {
        const stopCount = session.stops?.length ?? 0;
        return (
          <Pressable
            key={session.id}
            onPress={() => router.push({ pathname: '/session-transcript/index', params: { sessionId: session.id } })}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: colors.border.light },
              pressed && styles.rowPressed,
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${colors.design.primaryBlue}20` }]}>
              <Ionicons
                name={getTripIcon(session)}
                size={20}
                color={colors.design.primaryBlue}
              />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.tripText, { color: colors.text.primary }]} numberOfLines={1}>
                {session.title}
              </Text>
              <Text style={[styles.tripMeta, { color: colors.text.tertiary }]}>
                {formatRelativeTime(session.updatedAt)}
                {stopCount > 0 ? ` \u2022 ${stopCount} stop${stopCount > 1 ? 's' : ''}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  viewAll: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  tripText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'left',
  },
  tripMeta: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    marginTop: 2,
    textAlign: 'left',
  },
});
