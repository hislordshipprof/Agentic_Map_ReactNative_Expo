/**
 * RouteTimeline - Vertical timeline for route display
 *
 * Teal dot (current) -> purple numbered circles (stops) -> pink dot (destination).
 * Connecting lines, category icons, ratings, detour badges.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import type { RouteStop } from '@/types/route';

interface RouteTimelineProps {
  origin: { name: string; address?: string };
  destination: { name: string; address?: string };
  stops: RouteStop[];
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({ origin, destination, stops }) => {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Origin */}
      <View style={styles.row}>
        <View style={styles.dotColumn}>
          <View style={[styles.dot, { backgroundColor: colors.primary.teal }]} />
          <View style={[styles.line, { backgroundColor: colors.border.default }]} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.placeName, { color: colors.text.primary }]}>{origin.name}</Text>
          {origin.address && (
            <Text style={[styles.placeAddress, { color: colors.text.tertiary }]} numberOfLines={1}>
              {origin.address}
            </Text>
          )}
          <Text style={[styles.label, { color: colors.primary.teal }]}>Start</Text>
        </View>
      </View>

      {/* Stops */}
      {stops.map((stop, i) => (
        <View key={stop.id} style={styles.row}>
          <View style={styles.dotColumn}>
            <View style={[styles.numberCircle, { backgroundColor: colors.accent.purple }]}>
              <Text style={styles.numberText}>{i + 1}</Text>
            </View>
            <View style={[styles.line, { backgroundColor: colors.border.default }]} />
          </View>
          <View style={styles.content}>
            <Text style={[styles.placeName, { color: colors.text.primary }]}>{stop.name}</Text>
            {stop.address && (
              <Text style={[styles.placeAddress, { color: colors.text.tertiary }]} numberOfLines={1}>
                {stop.address}
              </Text>
            )}
            {(stop.detourCostMin ?? 0) > 0 && (
              <View style={[styles.detourBadge, { backgroundColor: `${colors.status.acceptable}20` }]}>
                <Ionicons name="time-outline" size={12} color={colors.status.acceptable} />
                <Text style={[styles.detourText, { color: colors.status.acceptable }]}>
                  +{Math.round(stop.detourCostMin ?? 0)} min detour
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {/* Destination */}
      <View style={styles.row}>
        <View style={styles.dotColumn}>
          <View style={[styles.dot, { backgroundColor: colors.status.error }]} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.placeName, { color: colors.text.primary }]}>{destination.name}</Text>
          {destination.address && (
            <Text style={[styles.placeAddress, { color: colors.text.tertiary }]} numberOfLines={1}>
              {destination.address}
            </Text>
          )}
          <Text style={[styles.label, { color: colors.status.error }]}>Destination</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    minHeight: 64,
  },
  dotColumn: {
    width: 32,
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  numberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  numberText: {
    fontFamily: FontFamily.primary,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.base,
  },
  placeName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  placeAddress: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  label: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  detourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: 10,
    gap: 4,
    marginTop: 4,
  },
  detourText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
