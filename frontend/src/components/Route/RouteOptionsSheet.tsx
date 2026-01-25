/**
 * RouteOptionsSheet Component - Agentic Mobile Map
 *
 * Bottom sheet for selecting between multiple route options.
 * Shows clustered stop alternatives with glassmorphism design.
 *
 * Features:
 * - Recommended option pre-selected
 * - Radio selection for each option
 * - Extra time badges for alternatives
 * - Stop names and addresses
 * - Animated slide-up entry
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/Common';
import {
  Colors,
  Spacing,
  Layout,
  FontFamily,
  FontSize,
  SpringConfig,
} from '@/theme';
import type { RouteOption } from '@/types/route';
import { formatDuration, formatDistance } from '@/types/route';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * RouteOptionsSheet Props
 */
export interface RouteOptionsSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Available route options */
  options: RouteOption[];
  /** Callback when user selects an option and confirms */
  onSelect: (option: RouteOption) => void;
  /** Callback when user dismisses */
  onDismiss: () => void;
  /** Destination name for display */
  destinationName?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Route Option Card Component
 */
const RouteOptionCard: React.FC<{
  option: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}> = ({ option, isSelected, onSelect, index }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, SpringConfig.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfig.bouncy);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[
        styles.optionCard,
        isSelected && styles.optionCardSelected,
        animatedStyle,
      ]}
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* Radio Button */}
      <View style={styles.radioContainer}>
        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </View>

      {/* Option Content */}
      <View style={styles.optionContent}>
        {/* Header Row */}
        <View style={styles.optionHeader}>
          <View style={styles.optionTitleRow}>
            <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
              {option.label || `Route ${index + 1}`}
            </Text>
            {option.isRecommended && (
              <View style={styles.recommendedBadge}>
                <Ionicons name="star" size={10} color={Colors.primary.teal} />
                <Text style={styles.recommendedText}>Recommended</Text>
              </View>
            )}
            {!option.isRecommended && option.extraTimeMin > 0 && (
              <View style={styles.extraTimeBadge}>
                <Text style={styles.extraTimeText}>+{Math.round(option.extraTimeMin)} min</Text>
              </View>
            )}
          </View>

          {/* Time and Distance */}
          <View style={styles.optionStats}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color={Colors.dark.text.tertiary} />
              <Text style={styles.statText}>{formatDuration(option.totalTimeMin)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="navigate-outline" size={14} color={Colors.dark.text.tertiary} />
              <Text style={styles.statText}>{formatDistance(option.totalDistanceMi)}</Text>
            </View>
          </View>
        </View>

        {/* Stops List */}
        <View style={styles.stopsContainer}>
          {option.stops.map((stop, stopIndex) => (
            <View key={stop.placeId || stopIndex} style={styles.stopRow}>
              <View style={styles.stopNumber}>
                <Text style={styles.stopNumberText}>{stopIndex + 1}</Text>
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopName} numberOfLines={1}>
                  {stop.name}
                </Text>
                {stop.address && (
                  <Text style={styles.stopAddress} numberOfLines={1}>
                    {stop.address}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Cluster Tightness Indicator */}
        {option.clusterRadiusKm !== undefined && (
          <View style={styles.clusterInfo}>
            <Ionicons name="git-merge-outline" size={12} color={Colors.dark.text.tertiary} />
            <Text style={styles.clusterText}>
              Stops within {option.clusterRadiusKm.toFixed(1)} km of each other
            </Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
};

/**
 * RouteOptionsSheet Component
 */
export const RouteOptionsSheet: React.FC<RouteOptionsSheetProps> = ({
  visible,
  options,
  onSelect,
  onDismiss,
  destinationName,
}) => {
  // Find initial selection (recommended or first)
  const getInitialSelection = () => {
    const recommended = options.find((o) => o.isRecommended);
    return recommended?.id || options[0]?.id || '';
  };

  const [selectedId, setSelectedId] = useState<string>(getInitialSelection());
  const buttonScale = useSharedValue(1);

  // Reset selection when options change
  useEffect(() => {
    if (options.length > 0) {
      setSelectedId(getInitialSelection());
    }
  }, [options]);

  const handleConfirm = () => {
    const selected = options.find((o) => o.id === selectedId);
    if (selected) {
      onSelect(selected);
    }
  };

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95, SpringConfig.snappy);
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, SpringConfig.bouncy);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (options.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        {/* Sheet Content */}
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          exiting={SlideOutDown.duration(200)}
          style={styles.sheetContainer}
        >
          <GlassCard variant="elevated" animated={false} padding={0} borderRadius={24}>
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="git-branch-outline" size={24} color={Colors.primary.teal} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Choose your route</Text>
                {destinationName && (
                  <Text style={styles.subtitle}>
                    to {destinationName}
                  </Text>
                )}
              </View>
            </View>

            {/* Description */}
            <Text style={styles.description}>
              We found {options.length} route{options.length > 1 ? 's' : ''} with your stops clustered together.
              Select the one that works best for you.
            </Text>

            {/* Options List */}
            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option, index) => (
                <RouteOptionCard
                  key={option.id}
                  option={option}
                  isSelected={selectedId === option.id}
                  onSelect={() => setSelectedId(option.id)}
                  index={index}
                />
              ))}
            </ScrollView>

            {/* Action Button */}
            <View style={styles.footer}>
              <AnimatedPressable
                style={[styles.confirmButton, buttonAnimatedStyle]}
                onPress={handleConfirm}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
              >
                <Ionicons name="checkmark" size={20} color={Colors.dark.text.primary} />
                <Text style={styles.confirmButtonText}>Continue with this route</Text>
              </AnimatedPressable>
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.effects.overlayDark,
  },
  sheetContainer: {
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.effects.glassTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    marginTop: 2,
  },
  description: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  optionsList: {
    maxHeight: SCREEN_HEIGHT * 0.45,
  },
  optionsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.elevated,
    borderRadius: Layout.radiusLarge,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  optionCardSelected: {
    borderColor: Colors.primary.teal,
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },
  radioContainer: {
    paddingTop: 2,
    marginRight: Spacing.md,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.dark.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary.teal,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary.teal,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    marginBottom: Spacing.sm,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  optionLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  optionLabelSelected: {
    color: Colors.primary.tealLight,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.effects.glassTeal,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Layout.radiusFull,
    gap: 4,
  },
  recommendedText: {
    fontFamily: FontFamily.primary,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  extraTimeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Layout.radiusFull,
  },
  extraTimeText: {
    fontFamily: FontFamily.primary,
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  optionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    marginHorizontal: Spacing.sm,
  },
  stopsContainer: {
    gap: Spacing.xs,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.effects.glassDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  stopNumberText: {
    fontFamily: FontFamily.primary,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.dark.text.secondary,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.dark.text.primary,
  },
  stopAddress: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    marginTop: 1,
  },
  clusterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.divider,
  },
  clusterText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  footer: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.divider,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.teal,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.radiusMedium,
    gap: Spacing.sm,
  },
  confirmButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
});

export default RouteOptionsSheet;
