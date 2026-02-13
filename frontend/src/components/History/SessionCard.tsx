/**
 * SessionCard - Displays a chat session in the History list
 *
 * Shows an icon based on trip content, session title, relative timestamp,
 * stop count, and mode indicator. Pressable to navigate to transcript.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import type { ChatSession } from '@/types/chatHistory';

type IconName = keyof typeof Ionicons.glyphMap;

function getSessionIcon(session: ChatSession): IconName {
  const lower = session.title.toLowerCase();
  if (lower.includes('home') && !lower.includes('work')) return 'home';
  if (lower.includes('work') && !lower.includes('home')) return 'briefcase';
  if (lower.includes('coffee') || lower.includes('starbucks') || lower.includes('cafe')) return 'cafe';
  if ((session.stops && session.stops.length > 1) || lower.includes(' via ')) return 'git-branch-outline';
  if (session.mode === 'voice') return 'mic';
  return 'navigate';
}

interface SessionCardProps {
  session: ChatSession;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const colors = useThemeColors();
  const router = useRouter();

  const stopCount = session.stops?.length ?? 0;
  const icon = getSessionIcon(session);
  const modeIcon: IconName = session.mode === 'voice' ? 'mic-outline' : 'chatbubble-outline';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session-transcript/index', params: { sessionId: session.id } })}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border.light },
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${colors.design.primaryBlue}20` }]}>
        <Ionicons name={icon} size={20} color={colors.design.primaryBlue} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>
          {session.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name={modeIcon} size={12} color={colors.text.tertiary} />
          <Text style={[styles.meta, { color: colors.text.tertiary }]}>
            {formatRelativeTime(session.updatedAt)}
            {stopCount > 0 ? ` \u2022 ${stopCount} stop${stopCount > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
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
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'left',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  meta: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    textAlign: 'left',
  },
});
