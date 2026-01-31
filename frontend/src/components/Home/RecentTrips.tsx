/**
 * RecentTrips - Recent query list with timestamps for the home bottom sheet
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

const SAMPLE_TRIPS = [
  { id: '1', text: 'Take me home with Starbucks', time: 'Yesterday' },
  { id: '2', text: 'Find gas station nearby', time: 'Yesterday' },
  { id: '3', text: 'Coffee on the way to work', time: '2 days ago' },
];

export const RecentTrips: React.FC = () => {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Trips</Text>
        <Pressable>
          <Text style={[styles.viewAll, { color: colors.primary.teal }]}>View all</Text>
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
          <View style={[styles.iconCircle, { backgroundColor: colors.surface.elevated }]}>
            <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.tripText, { color: colors.text.primary }]} numberOfLines={1}>
              {trip.text}
            </Text>
            <Text style={[styles.tripTime, { color: colors.text.tertiary }]}>
              {trip.time}
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
  },
  tripText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  tripTime: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
