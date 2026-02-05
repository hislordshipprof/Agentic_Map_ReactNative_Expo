/**
 * RouteSummarySheet - Bottom sheet for route summary and alternative selection
 *
 * Shows: header, stat cards, RECOMMENDED route, ALTERNATIVE ROUTES list,
 * route details with stops, and Start Navigation CTA.
 * Uses pastel gradient background from theme.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import type { Route, RouteOption } from '@/types/route';
import { formatDistance, formatDuration } from '@/types/route';

const SPRING_CONFIG = { damping: 25, stiffness: 180, mass: 1 };

export interface RouteSummarySheetProps {
  /** Current/selected route */
  route: Route;
  /** Available route options from backend (first = recommended) */
  routeOptions?: RouteOption[];
  /** When true, user has selected and is ready to start */
  onStartNavigation: () => void;
  /** Optional: adjust the route */
  onAdjust?: () => void;
  /** Optional: cancel and go back */
  onCancel?: () => void;
  /** When user selects an alternative, switch to that route */
  onSelectOption?: (option: RouteOption) => void;
}

/** Stat card for distance/time/detour */
const StatCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  bgColor: string;
  iconColor: string;
}> = ({ icon, value, label, bgColor, iconColor }) => (
  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
    <Ionicons name={icon} size={20} color={iconColor} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/** Route option card (collapsible) for Recommended and Alternatives */
const RouteOptionCard: React.FC<{
  option: RouteOption;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useThemeColors>;
}> = ({ option, isSelected, isRecommended, onSelect, colors }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      style={[
        styles.optionCard,
        {
          backgroundColor: colors.surface.card,
          borderColor: isSelected ? colors.design.mintGreenDark : colors.border.light,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onSelect}
    >
      {/* Header row */}
      <View style={styles.optionHeader}>
        {/* Radio or checkmark */}
        <View style={styles.optionIconWrap}>
          {isSelected ? (
            <View
              style={[styles.checkCircle, { backgroundColor: colors.design.mintGreenDark }]}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          ) : (
            <View
              style={[styles.radioCircle, { borderColor: colors.border.default }]}
            />
          )}
        </View>

        {/* Title and tags */}
        <View style={styles.optionTitleCol}>
          <View style={styles.optionTitleRow}>
            <Text
              style={[
                styles.optionTitle,
                { color: colors.text.primary },
                isSelected && styles.optionTitleSelected,
              ]}
            >
              {option.label}
            </Text>
            {isRecommended && (
              <View
                style={[
                  styles.recommendedBadge,
                  { backgroundColor: `${colors.design.softLavender}80` },
                ]}
              >
                <Ionicons name="star" size={10} color={colors.accent.purple} />
                <Text style={[styles.badgeText, { color: colors.accent.purple }]}>
                  Recommended
                </Text>
              </View>
            )}
            {!isRecommended && option.extraTimeMin > 0 && (
              <View
                style={[styles.benefitBadge, { backgroundColor: `${colors.status.warning}20` }]}
              >
                <Text style={[styles.badgeText, { color: colors.status.warning }]}>
                  +{Math.round(option.extraTimeMin)} min
                </Text>
              </View>
            )}
          </View>
          {/* Summary line */}
          <Text style={[styles.optionSummary, { color: colors.text.tertiary }]}>
            {formatDistance(option.totalDistanceMi)} · {formatDuration(option.totalTimeMin)} ·{' '}
            {option.stops.length} stop{option.stops.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Expand chevron */}
        <Pressable
          onPress={() => setExpanded(!expanded)}
          hitSlop={12}
          style={styles.chevronButton}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.text.tertiary}
          />
        </Pressable>
      </View>

      {/* Expanded content: stops list */}
      {expanded && option.stops.length > 0 && (
        <View style={styles.expandedContent}>
          {option.stops.map((stop, i) => (
            <View key={`${stop.placeId}-${i}`} style={styles.stopRow}>
              <View
                style={[styles.stopNumber, { backgroundColor: colors.design.softLavender }]}
              >
                <Text style={styles.stopNumberText}>{i + 1}</Text>
              </View>
              <View style={styles.stopInfo}>
                <Text style={[styles.stopName, { color: colors.text.primary }]} numberOfLines={1}>
                  {stop.name}
                </Text>
                {stop.address && (
                  <Text style={[styles.stopAddress, { color: colors.text.tertiary }]} numberOfLines={1}>
                    {stop.address}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
};

export const RouteSummarySheet: React.FC<RouteSummarySheetProps> = ({
  route,
  routeOptions,
  onStartNavigation,
  onAdjust,
  onCancel,
  onSelectOption,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const colors = useThemeColors();

  const HANDLE_AREA = 3;
  const BOTTOM_INSET = 1; // safe area + breathing room so content isn't flush with screen edge
  const MIN_TOP = screenHeight * 0.08; // most the sheet can expand (8% from top)
  const PEEK_HEIGHT = screenHeight * 0.35; // collapsed: show just header + stats

  // Content-driven height: measure on layout
  const [contentHeight, setContentHeight] = useState(0);

  const handleContentLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      setContentHeight((prev) => (Math.abs(prev - h) > 2 ? h : prev));
    },
    [],
  );

  // Full sheet height = content + handle + bottom inset, capped so map stays visible
  const fullHeight = contentHeight > 0
    ? Math.min(contentHeight + HANDLE_AREA + BOTTOM_INSET, screenHeight - MIN_TOP)
    : screenHeight * 0.6;

  // The sheet is always tall enough to show full content.
  // It starts at the "full" position (content-fitted) and can be dragged DOWN to "peek".
  // translateY = 0 → full (content-fitted), translateY = MAX_DOWN → peeking
  const fullTop = screenHeight - fullHeight;
  const peekTop = screenHeight - PEEK_HEIGHT;
  const MAX_DOWN = peekTop - fullTop; // positive: how far sheet can move down

  const translateY = useSharedValue(0);
  const savedY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-25, 25])
    .onStart(() => {
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      const newY = savedY.value + e.translationY;
      // Clamp between 0 (full/expanded) and MAX_DOWN (peeking)
      translateY.value = Math.max(0, Math.min(MAX_DOWN, newY));
    })
    .onEnd((e) => {
      const midpoint = MAX_DOWN / 2;
      const shouldCollapse = translateY.value > midpoint || e.velocityY > 500;
      if (shouldCollapse && e.velocityY >= -500) {
        translateY.value = withSpring(MAX_DOWN, SPRING_CONFIG);
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const pastel = colors.gradients.pastelScreen;

  // Separate recommended and alternatives (backend marks first as recommended)
  const recommended = routeOptions?.find((o) => o.isRecommended) ?? routeOptions?.[0];
  const alternatives = routeOptions?.filter((o) => !o.isRecommended) ?? [];
  const [selectedOptionId, setSelectedOptionId] = useState<string>(recommended?.id ?? '');

  // Compute ETA (current time + route duration)
  const now = new Date();
  const etaTime = new Date(now.getTime() + route.totalTime * 60 * 1000);
  const etaStr = etaTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Calculate extra time (detour minutes)
  const extraTimeMin = recommended?.extraTimeMin ?? 0;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.sheet,
          {
            top: fullTop,
            // Extend past screen bottom so the gradient always covers any gap
            // from Android nav bar / dimension mismatch
            height: fullHeight + 80,
            shadowColor: colors.effects.shadow,
            overflow: 'hidden',
          },
          animatedStyle,
        ]}
      >
        {/* Pastel gradient background */}
        <LinearGradient
          colors={[...pastel.colors]}
          locations={[...pastel.locations]}
          start={pastel.start}
          end={pastel.end}
          style={StyleSheet.absoluteFill}
        />

        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border.default }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
        >
          {/* Measure content to size the sheet */}
          <View onLayout={handleContentLayout}>
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
                Your Route
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
                {route.stops.length} stop{route.stops.length !== 1 ? 's' : ''} · ETA {etaStr}
              </Text>
            </View>
            {extraTimeMin > 0 && (
              <View
                style={[
                  styles.savesBadge,
                  { backgroundColor: `${colors.design.mintGreenDark}20` },
                ]}
              >
                <Text style={[styles.savesBadgeText, { color: colors.design.mintGreenDark }]}>
                  Saves {Math.round(extraTimeMin)} min
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Stat cards */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.statsRow}>
            <StatCard
              icon="navigate-outline"
              value={formatDistance(route.totalDistance)}
              label="miles"
              bgColor={colors.design.mintGreen}
              iconColor={colors.design.mintGreenDark}
            />
            <StatCard
              icon="time-outline"
              value={Math.round(route.totalTime).toString()}
              label="minutes"
              bgColor={colors.design.softLavender}
              iconColor={colors.accent.purple}
            />
            <StatCard
              icon="git-branch-outline"
              value={`+${Math.round(extraTimeMin)}`}
              label="detour"
              bgColor="#FFF4E6"
              iconColor="#F59E0B"
            />
          </Animated.View>

          {/* RECOMMENDED Section */}
          {recommended && (
            <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
                RECOMMENDED
              </Text>
              <RouteOptionCard
                option={recommended}
                isSelected={selectedOptionId === recommended.id}
                isRecommended
                onSelect={() => {
                  setSelectedOptionId(recommended.id);
                  if (onSelectOption) onSelectOption(recommended);
                }}
                colors={colors}
              />
            </Animated.View>
          )}

          {/* ALTERNATIVE ROUTES Section */}
          {alternatives.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
                ALTERNATIVE ROUTES
              </Text>
              {alternatives.map((alt) => (
                <RouteOptionCard
                  key={alt.id}
                  option={alt}
                  isSelected={selectedOptionId === alt.id}
                  isRecommended={false}
                  onSelect={() => {
                    setSelectedOptionId(alt.id);
                    if (onSelectOption) onSelectOption(alt);
                  }}
                  colors={colors}
                />
              ))}
            </Animated.View>
          )}

          {/* Route Details: Current Location + Stops */}
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
              ROUTE DETAILS
            </Text>

            {/* Current Location */}
            <View style={styles.routeDetailRow}>
              <View
                style={[
                  styles.routeDetailIcon,
                  { backgroundColor: `${colors.design.primaryBlue}20` },
                ]}
              >
                <Ionicons name="paper-plane-outline" size={18} color={colors.design.primaryBlue} />
              </View>
              <View style={styles.routeDetailInfo}>
                <Text style={[styles.routeDetailLabel, { color: colors.text.tertiary }]}>
                  Current Location
                </Text>
                <Text style={[styles.routeDetailName, { color: colors.text.primary }]}>
                  {route.origin.name}
                </Text>
              </View>
            </View>

            {/* Stops */}
            {route.stops.map((stop, i) => (
              <View key={stop.id} style={styles.routeDetailRow}>
                {/* Connector line (before each stop except first) */}
                {i === 0 && <View style={[styles.connector, { backgroundColor: colors.design.softLavender }]} />}
                <View
                  style={[
                    styles.stopNumberCircle,
                    { backgroundColor: colors.design.softLavender },
                  ]}
                >
                  <Text style={styles.stopNumberCircleText}>{i + 1}</Text>
                </View>
                <View style={styles.routeDetailInfo}>
                  <Text style={[styles.routeDetailName, { color: colors.text.primary }]} numberOfLines={1}>
                    {stop.name}
                  </Text>
                  {stop.address && (
                    <Text style={[styles.routeDetailAddress, { color: colors.text.tertiary }]} numberOfLines={1}>
                      {stop.address}
                    </Text>
                  )}
                </View>
                {/* Connector after */}
                <View style={[styles.connector, { backgroundColor: colors.design.softLavender }]} />
              </View>
            ))}

            {/* Destination */}
            <View style={styles.routeDetailRow}>
              <View
                style={[
                  styles.routeDetailIcon,
                  { backgroundColor: `${colors.status.success}20` },
                ]}
              >
                <Ionicons name="flag" size={18} color={colors.status.success} />
              </View>
              <View style={styles.routeDetailInfo}>
                <Text style={[styles.routeDetailLabel, { color: colors.text.tertiary }]}>
                  Destination
                </Text>
                <Text style={[styles.routeDetailName, { color: colors.text.primary }]}>
                  {route.destination.name}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Start Navigation CTA */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.ctaWrap}>
            <Pressable
              onPress={onStartNavigation}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <LinearGradient
                colors={[colors.design.mintGreenDark, colors.design.primaryBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
                <Text style={styles.ctaText}>Start Navigation</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Adjust / Cancel */}
          {(onAdjust || onCancel) && (
            <View style={styles.footerActions}>
              {onAdjust && (
                <Pressable
                  onPress={onAdjust}
                  style={({ pressed }) => [
                    styles.footerButton,
                    pressed && styles.footerButtonPressed,
                  ]}
                >
                  <Ionicons name="create-outline" size={16} color={colors.design.primaryBlue} />
                  <Text style={[styles.footerButtonText, { color: colors.design.primaryBlue }]}>
                    Adjust
                  </Text>
                </Pressable>
              )}
              {onCancel && (
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.footerButton,
                    pressed && styles.footerButtonPressed,
                  ]}
                >
                  <Text style={[styles.footerButtonText, { color: colors.text.secondary }]}>
                    Cancel
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  savesBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savesBadgeText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 14,
    gap: 4,
  },
  statValue: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#1A2332',
  },
  statLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: '#5E5E5E',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  optionCard: {
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionIconWrap: {
    paddingTop: 2,
    marginRight: Spacing.sm,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionTitleCol: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  optionTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '700',
  },
  optionTitleSelected: {
    color: '#0D9488',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  benefitBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: FontFamily.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  optionSummary: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
  },
  chevronButton: {
    padding: 4,
  },
  expandedContent: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: Spacing.xs,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontFamily: FontFamily.primary,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  stopAddress: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  routeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    position: 'relative',
  },
  routeDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stopNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stopNumberCircleText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connector: {
    position: 'absolute',
    left: 17,
    top: -12,
    width: 2,
    height: 24,
  },
  routeDetailInfo: {
    flex: 1,
  },
  routeDetailLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeDetailName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  routeDetailAddress: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  ctaWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cta: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  footerButtonPressed: {
    opacity: 0.7,
  },
  footerButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
