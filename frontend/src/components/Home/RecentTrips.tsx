/**
 * RecentTrips - Recent query list with timestamps and stop counts
 *
 * Icons reflect trip type (home, work, coffee, multi-stop). "View all" in Primary Blue.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

const SAMPLE_TRIPS = [
  { id: '1', text: 'Home via Starbucks', time: 'Yesterday', stops: 2 },
  { id: '2', text: 'Work', time: '2 days ago', stops: 0 },
  { id: '3', text: 'Coffee on the way to work', time: '3 days ago', stops: 1 },
];

type TripIconName = keyof typeof Ionicons.glyphMap;

function getTripIcon(text: string, stops: number): TripIconName {
  const lower = text.toLowerCase();
  if (lower.includes('home') && !lower.includes('work')) return 'home';
  if (lower.includes('work') && !lower.includes('home')) return 'briefcase';
  if (lower.includes('coffee') || lower.includes('starbucks') || lower.includes('cafe')) return 'cafe';
  if (stops > 1 || lower.includes(' via ')) return 'git-branch-outline';
  return 'navigate';
}

export const RecentTrips: React.FC = () => {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Trips</Text>
        <Pressable onPress={() => router.push('/(tabs)/history')}>
          <Text style={[styles.viewAll, { color: colors.design.primaryBlue }]}>View all</Text>
        </Pressable>
      </View>

      {SAMPLE_TRIPS.map((trip) => (
        <Pressable
          key={trip.id}
          style={({ pressed }) => [
            styles.row,
            { borderBottomColor: colors.border.light },
            pressed && styles.rowPressed,
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: `${colors.design.primaryBlue}20` }]}>
            <Ionicons
              name={getTripIcon(trip.text, trip.stops)}
              size={20}
              color={colors.design.primaryBlue}
            />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.tripText, { color: colors.text.primary }]} numberOfLines={1}>
              {trip.text}
            </Text>
            <Text style={[styles.tripMeta, { color: colors.text.tertiary }]}>
              {trip.time}{trip.stops > 0 ? ` \u2022 ${trip.stops} stop${trip.stops > 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        </Pressable>
      ))}
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
