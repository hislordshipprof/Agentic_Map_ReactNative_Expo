/**
 * RouteResultCard - Inline chat card for route results
 *
 * Shown after backend returns route data. Replaces the RouteOptionsSheet
 * bottom sheet modal in text-chat with an inline card.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, FontFamily, Layout } from '@/theme';
import type { ThemePalette } from '@/theme/palettes';
import type { Route, RouteOption } from '@/types/route';
import { formatDistance, formatDuration } from '@/types/route';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RouteResultCardProps {
  route?: Route;
  routeOptions?: RouteOption[];
  destinationName?: string;
  colors: ThemePalette;
  onNavigate: (option?: RouteOption) => void;
  onAdjust?: () => void;
}

// ─── StatPill ───────────────────────────────────────────────────────────────

interface StatPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  colors: ThemePalette;
}

const StatPill: React.FC<StatPillProps> = ({ icon, value, colors }) => (
  <View style={[pillStyles.pill, { backgroundColor: colors.surface.elevated }]}>
    <Ionicons name={icon} size={13} color={colors.primary.teal} />
    <Text style={[pillStyles.text, { color: colors.text.primary }]}>{value}</Text>
  </View>
);

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontFamily: FontFamily.primary,
    fontWeight: '500',
  },
});

// ─── StopList ───────────────────────────────────────────────────────────────

interface StopListProps {
  stops: Array<{ name: string; address?: string }>;
  colors: ThemePalette;
}

const StopList: React.FC<StopListProps> = ({ stops, colors }) => (
  <View style={stopListStyles.container}>
    {stops.map((stop, i) => (
      <View key={`${stop.name}-${i}`} style={stopListStyles.row}>
        <View style={[stopListStyles.number, { backgroundColor: colors.accent.purple }]}>
          <Text style={stopListStyles.numberText}>{i + 1}</Text>
        </View>
        <View style={stopListStyles.info}>
          <Text
            style={[stopListStyles.name, { color: colors.text.primary }]}
            numberOfLines={1}
          >
            {stop.name}
          </Text>
          {stop.address && (
            <Text
              style={[stopListStyles.address, { color: colors.text.secondary }]}
              numberOfLines={1}
            >
              {stop.address}
            </Text>
          )}
        </View>
      </View>
    ))}
  </View>
);

const stopListStyles = StyleSheet.create({
  container: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  number: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 11,
    fontFamily: FontFamily.primary,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  info: { flex: 1 },
  name: {
    fontSize: 13,
    fontFamily: FontFamily.primary,
    fontWeight: '500',
  },
  address: {
    fontSize: 11,
    fontFamily: FontFamily.primary,
    fontWeight: '400',
  },
});

// ─── SingleRouteCard ────────────────────────────────────────────────────────

interface SingleRouteCardProps {
  route: Route;
  destinationName?: string;
  colors: ThemePalette;
  onNavigate: () => void;
  onAdjust?: () => void;
}

const SingleRouteCard: React.FC<SingleRouteCardProps> = ({
  route,
  destinationName,
  colors,
  onNavigate,
  onAdjust,
}) => {
  const stopCount = route.stops?.length ?? 0;
  const stopsForList = (route.stops ?? []).map((s) => ({
    name: s.name,
    address: s.address,
  }));

  return (
    <View style={singleStyles.container}>
      {/* Header */}
      <View style={singleStyles.header}>
        <Ionicons name="navigate" size={18} color={colors.primary.teal} />
        <Text style={[singleStyles.title, { color: colors.text.primary }]} numberOfLines={1}>
          Route to {destinationName ?? route.destination?.name ?? 'destination'}
        </Text>
      </View>

      {/* Stats */}
      <View style={singleStyles.stats}>
        <StatPill icon="time-outline" value={formatDuration(route.totalTime)} colors={colors} />
        <StatPill icon="speedometer-outline" value={formatDistance(route.totalDistance)} colors={colors} />
        {stopCount > 0 && (
          <StatPill
            icon="flag-outline"
            value={`${stopCount} stop${stopCount !== 1 ? 's' : ''}`}
            colors={colors}
          />
        )}
      </View>

      {/* Stops */}
      {stopsForList.length > 0 && <StopList stops={stopsForList} colors={colors} />}

      {/* Buttons */}
      <View style={singleStyles.buttons}>
        <Pressable
          style={[singleStyles.navButton, { backgroundColor: colors.primary.teal }]}
          onPress={onNavigate}
        >
          <Ionicons name="navigate" size={16} color={colors.text.inverse} />
          <Text style={[singleStyles.navButtonText, { color: colors.text.inverse }]}>
            Navigate
          </Text>
        </Pressable>
        {onAdjust && (
          <Pressable
            style={[singleStyles.adjustButton, { borderColor: colors.border.default }]}
            onPress={onAdjust}
          >
            <Ionicons name="options-outline" size={16} color={colors.text.secondary} />
            <Text style={[singleStyles.adjustButtonText, { color: colors.text.secondary }]}>
              Adjust
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const singleStyles = StyleSheet.create({
  container: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.primary,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navButtonText: {
    fontSize: 14,
    fontFamily: FontFamily.primary,
    fontWeight: '600',
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  adjustButtonText: {
    fontSize: 14,
    fontFamily: FontFamily.primary,
    fontWeight: '500',
  },
});

// ─── MultiRouteCard ─────────────────────────────────────────────────────────

interface MultiRouteCardProps {
  routeOptions: RouteOption[];
  destinationName?: string;
  colors: ThemePalette;
  onNavigate: (option: RouteOption) => void;
}

const MultiRouteCard: React.FC<MultiRouteCardProps> = ({
  routeOptions,
  destinationName,
  colors,
  onNavigate,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    routeOptions.find((o) => o.isRecommended)?.id ?? routeOptions[0]?.id ?? null,
  );

  return (
    <View style={multiStyles.container}>
      {/* Header */}
      <View style={multiStyles.header}>
        <Ionicons name="git-branch-outline" size={18} color={colors.primary.teal} />
        <Text style={[multiStyles.title, { color: colors.text.primary }]}>
          Found {routeOptions.length} routes to {destinationName ?? 'destination'}
        </Text>
      </View>

      {/* Option cards */}
      {routeOptions.map((option) => {
        const isExpanded = expandedId === option.id;
        const stopsForList = option.stops.map((s) => ({
          name: s.name,
          address: s.address,
        }));

        return (
          <Animated.View
            key={option.id}
            layout={LinearTransition.springify().damping(18).stiffness(140)}
          >
            <Pressable
              style={[
                multiStyles.optionCard,
                {
                  backgroundColor: isExpanded ? colors.surface.card : colors.surface.elevated,
                  borderColor: option.isRecommended ? colors.primary.teal : colors.border.default,
                },
              ]}
              onPress={() => setExpandedId(isExpanded ? null : option.id)}
            >
              {/* Top row: label + badges + chevron */}
              <View style={multiStyles.topRow}>
                <Text
                  style={[multiStyles.optionName, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                {option.isRecommended && (
                  <View style={[multiStyles.badge, { backgroundColor: colors.effects.glowTeal }]}>
                    <Ionicons name="star" size={10} color={colors.primary.teal} />
                    <Text style={[multiStyles.badgeText, { color: colors.primary.teal }]}>
                      Best
                    </Text>
                  </View>
                )}
                {!option.isRecommended && option.extraTimeMin > 0 && (
                  <View style={[multiStyles.badge, { backgroundColor: colors.status.warningBg }]}>
                    <Text style={[multiStyles.badgeText, { color: colors.status.warning }]}>
                      +{Math.round(option.extraTimeMin)} min
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.text.tertiary}
                />
              </View>

              {/* Bottom row: stats */}
              <View style={multiStyles.statsRow}>
                <Ionicons name="time-outline" size={12} color={colors.text.secondary} />
                <Text style={[multiStyles.metaText, { color: colors.text.secondary }]}>
                  {formatDuration(option.totalTimeMin)}
                </Text>
                <Text style={[multiStyles.metaDivider, { color: colors.text.tertiary }]}>
                  {'\u00B7'}
                </Text>
                <Ionicons name="speedometer-outline" size={12} color={colors.text.secondary} />
                <Text style={[multiStyles.metaText, { color: colors.text.secondary }]}>
                  {formatDistance(option.totalDistanceMi)}
                </Text>
                <Text style={[multiStyles.metaDivider, { color: colors.text.tertiary }]}>
                  {'\u00B7'}
                </Text>
                <Ionicons name="flag-outline" size={12} color={colors.text.secondary} />
                <Text style={[multiStyles.metaText, { color: colors.text.secondary }]}>
                  {option.stops.length} stop{option.stops.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Expanded content */}
              {isExpanded && (
                <View style={multiStyles.expandedContent}>
                  {stopsForList.length > 0 && (
                    <StopList stops={stopsForList} colors={colors} />
                  )}
                  <Pressable
                    style={[multiStyles.selectButton, { backgroundColor: colors.primary.teal }]}
                    onPress={() => onNavigate(option)}
                  >
                    <Ionicons name="navigate" size={14} color={colors.text.inverse} />
                    <Text style={[multiStyles.selectText, { color: colors.text.inverse }]}>
                      Select & Navigate
                    </Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
};

const multiStyles = StyleSheet.create({
  container: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.primary,
    fontWeight: '600',
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionName: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.primary,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FontFamily.primary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    fontFamily: FontFamily.primary,
    fontWeight: '400',
  },
  metaDivider: {
    fontSize: 12,
  },
  expandedContent: {
    gap: 10,
    paddingTop: 8,
    marginTop: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  selectText: {
    fontSize: 13,
    fontFamily: FontFamily.primary,
    fontWeight: '600',
  },
});

// ─── RouteResultCard (main export) ──────────────────────────────────────────

export const RouteResultCard: React.FC<RouteResultCardProps> = ({
  route,
  routeOptions,
  destinationName,
  colors,
  onNavigate,
  onAdjust,
}) => {
  const hasMultiple = routeOptions && routeOptions.length > 1;

  return (
    <Animated.View
      entering={FadeInUp.duration(350)}
      layout={LinearTransition.springify().damping(18).stiffness(140)}
      style={cardStyles.outer}
    >
      <View
        style={[
          cardStyles.card,
          {
            backgroundColor: colors.surface.card,
            borderColor: colors.border.default,
            shadowColor: colors.effects.shadow,
          },
        ]}
      >
        {hasMultiple ? (
          <MultiRouteCard
            routeOptions={routeOptions}
            destinationName={destinationName}
            colors={colors}
            onNavigate={(opt) => onNavigate(opt)}
          />
        ) : route ? (
          <SingleRouteCard
            route={route}
            destinationName={destinationName}
            colors={colors}
            onNavigate={() => onNavigate()}
            onAdjust={onAdjust}
          />
        ) : null}
      </View>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  outer: {
    width: '100%',
    paddingVertical: Spacing.sm,
  },
  card: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Layout.radiusLarge,
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
});

export default RouteResultCard;
