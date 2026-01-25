/**
 * DisambiguationDialog Component - Agentic Mobile Map
 *
 * Modal dialog for choosing between multiple place options.
 * Per requirements-frontend.md Phase 2.3:
 * - Card design with place details
 * - Distance, hours, rating display
 * - Action button per card
 * - Show up to 3 options by default
 *
 * Dark glassmorphism design with teal accents.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
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

/**
 * Place candidate for disambiguation
 */
export interface PlaceCandidate {
  id: string;
  name: string;
  address: string;
  /** Geographic coordinates (optional for disambiguation, required for navigation) */
  location?: { lat: number; lng: number };
  distance?: number; // in miles
  distanceUnit?: 'mi' | 'km';
  isOpen?: boolean;
  openUntil?: string;
  rating?: number;
  reviewCount?: number;
  photoUrl?: string;
  detourCost?: number; // extra miles
  detourStatus?: 'NO_DETOUR' | 'MINIMAL' | 'ACCEPTABLE' | 'NOT_RECOMMENDED';
}

/**
 * DisambiguationDialog Props
 */
export interface DisambiguationDialogProps {
  /** Whether dialog is visible */
  visible: boolean;
  /** Type of disambiguation */
  type: 'destination' | 'stop';
  /** Title/question */
  title?: string;
  /** Place candidates to choose from */
  candidates: PlaceCandidate[];
  /** Callback when user selects a place */
  onSelect: (place: PlaceCandidate) => void;
  /** Callback when user wants to see more options */
  onShowMore?: () => void;
  /** Callback when none of the options work */
  onNoneOfThese?: () => void;
  /** Callback when dialog is dismissed */
  onDismiss?: () => void;
  /** Whether more options are available */
  hasMoreOptions?: boolean;
  /** Initial number of options to show */
  initialShowCount?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Detour status badge colors
 */
const getDetourStatusStyle = (status?: string) => {
  switch (status) {
    case 'NO_DETOUR':
      return { bg: Colors.status.successBg, text: Colors.status.success, label: 'On route' };
    case 'MINIMAL':
      return { bg: Colors.status.successBg, text: Colors.status.success, label: 'Minimal detour' };
    case 'ACCEPTABLE':
      return { bg: Colors.status.warningBg, text: Colors.status.warning, label: 'Acceptable' };
    case 'NOT_RECOMMENDED':
      return { bg: Colors.status.errorBg, text: Colors.status.error, label: 'Long detour' };
    default:
      return null;
  }
};

/**
 * Place Card Component
 */
const PlaceCard: React.FC<{
  place: PlaceCandidate;
  onSelect: () => void;
}> = ({ place, onSelect }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, SpringConfig.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfig.bouncy);
  };

  const detourStyle = getDetourStatusStyle(place.detourStatus);

  return (
    <AnimatedPressable
      style={[styles.placeCard, animatedStyle]}
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* Place Image (if available) */}
      {place.photoUrl && (
        <Image source={{ uri: place.photoUrl }} style={styles.placeImage} />
      )}

      <View style={styles.placeContent}>
        {/* Name and Rating */}
        <View style={styles.placeHeader}>
          <Text style={styles.placeName} numberOfLines={1}>
            {place.name}
          </Text>
          {place.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={Colors.status.warning} />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Address */}
        <Text style={styles.placeAddress} numberOfLines={1}>
          {place.address}
        </Text>

        {/* Details Row */}
        <View style={styles.detailsRow}>
          {/* Distance */}
          {place.distance !== undefined && (
            <View style={styles.detailItem}>
              <Ionicons name="navigate-outline" size={14} color={Colors.dark.text.tertiary} />
              <Text style={styles.detailText}>
                {place.distance.toFixed(1)} {place.distanceUnit || 'mi'}
              </Text>
            </View>
          )}

          {/* Open Status */}
          {place.isOpen !== undefined && (
            <View style={styles.detailItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={place.isOpen ? Colors.status.success : Colors.status.error}
              />
              <Text
                style={[
                  styles.detailText,
                  { color: place.isOpen ? Colors.status.success : Colors.status.error },
                ]}
              >
                {place.isOpen
                  ? place.openUntil
                    ? `Until ${place.openUntil}`
                    : 'Open'
                  : 'Closed'}
              </Text>
            </View>
          )}

          {/* Review count */}
          {place.reviewCount !== undefined && (
            <View style={styles.detailItem}>
              <Ionicons name="chatbubble-outline" size={14} color={Colors.dark.text.tertiary} />
              <Text style={styles.detailText}>{place.reviewCount}</Text>
            </View>
          )}
        </View>

        {/* Detour Status Badge */}
        {detourStyle && (
          <View style={[styles.detourBadge, { backgroundColor: detourStyle.bg }]}>
            <Ionicons
              name={place.detourStatus === 'NO_DETOUR' ? 'checkmark-circle' : 'git-branch-outline'}
              size={12}
              color={detourStyle.text}
            />
            <Text style={[styles.detourText, { color: detourStyle.text }]}>
              {detourStyle.label}
              {place.detourCost !== undefined && place.detourCost > 0
                ? ` (+${place.detourCost.toFixed(1)} mi)`
                : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Select Arrow */}
      <View style={styles.selectArrow}>
        <Ionicons name="chevron-forward" size={20} color={Colors.primary.teal} />
      </View>
    </AnimatedPressable>
  );
};

/**
 * DisambiguationDialog Component
 */
export const DisambiguationDialog: React.FC<DisambiguationDialogProps> = ({
  visible,
  type,
  title,
  candidates,
  onSelect,
  onShowMore,
  onNoneOfThese,
  onDismiss,
  hasMoreOptions = false,
  initialShowCount = 3,
}) => {
  const [showAll, setShowAll] = useState(false);

  const displayedCandidates = showAll
    ? candidates
    : candidates.slice(0, initialShowCount);

  const defaultTitle =
    type === 'destination'
      ? 'Which location did you mean?'
      : 'Multiple options found. Which one?';

  const handleShowMore = () => {
    if (candidates.length > initialShowCount && !showAll) {
      setShowAll(true);
    } else if (onShowMore) {
      onShowMore();
    }
  };

  const handleDismiss = () => {
    setShowAll(false);
    onDismiss?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleDismiss}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        {/* Dialog Content */}
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          exiting={SlideOutDown.duration(200)}
          style={styles.dialogContainer}
        >
          <GlassCard variant="elevated" animated={false} padding={Spacing.lg}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name={type === 'destination' ? 'location' : 'list'}
                  size={24}
                  color={Colors.primary.teal}
                />
              </View>
              <Text style={styles.title}>{title || defaultTitle}</Text>
            </View>

            {/* Place Options */}
            <ScrollView
              style={styles.placesContainer}
              showsVerticalScrollIndicator={false}
            >
              {displayedCandidates.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onSelect={() => onSelect(place)}
                />
              ))}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footerActions}>
              {/* Show More Button */}
              {(candidates.length > initialShowCount && !showAll) || hasMoreOptions ? (
                <Pressable style={styles.footerButton} onPress={handleShowMore}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.primary.teal} />
                  <Text style={styles.footerButtonText}>Show more options</Text>
                </Pressable>
              ) : null}

              {/* None of These Button */}
              {onNoneOfThese && (
                <Pressable style={styles.footerButton} onPress={onNoneOfThese}>
                  <Ionicons name="close-circle-outline" size={18} color={Colors.dark.text.tertiary} />
                  <Text style={[styles.footerButtonText, { color: Colors.dark.text.tertiary }]}>
                    None of these
                  </Text>
                </Pressable>
              )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.effects.overlayDark,
  },
  dialogContainer: {
    width: '90%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.effects.glassTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  placesContainer: {
    maxHeight: 350,
    marginBottom: Spacing.md,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.elevated,
    borderRadius: Layout.radiusMedium,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  placeImage: {
    width: 70,
    height: '100%',
    minHeight: 90,
  },
  placeContent: {
    flex: 1,
    padding: Spacing.md,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  placeName: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginRight: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.dark.text.secondary,
  },
  placeAddress: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    marginBottom: Spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  detourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.radiusSmall,
    gap: 4,
    marginTop: Spacing.xs,
  },
  detourText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  selectArrow: {
    paddingHorizontal: Spacing.md,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  footerButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.primary.teal,
  },
});

export default DisambiguationDialog;
