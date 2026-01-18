/**
 * AlternativesDialog Component - Agentic Mobile Map
 *
 * Modal dialog for LOW confidence scenarios (< 0.60).
 * Per requirements-frontend.md Phase 2.1 Flow 3:
 * - Show 2-3 alternative interpretations
 * - Each option is a clickable button
 * - Track which option user selected
 * - "Let me try again" option
 *
 * Dark glassmorphism design with teal accents.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
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
 * Alternative option
 */
export interface Alternative {
  id: string;
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  intent?: string;
}

/**
 * AlternativesDialog Props
 */
export interface AlternativesDialogProps {
  /** Whether dialog is visible */
  visible: boolean;
  /** Header title */
  title?: string;
  /** Subtitle/message */
  message?: string;
  /** Alternative options */
  alternatives: Alternative[];
  /** Callback when user selects an alternative */
  onSelect: (alternative: Alternative) => void;
  /** Callback when user wants to rephrase */
  onRephrase: () => void;
  /** Callback when dialog is dismissed */
  onDismiss?: () => void;
  /** Show "Let me try again" button */
  showRephraseOption?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Default alternatives for common ambiguity
 */
export const DEFAULT_ALTERNATIVES: Alternative[] = [
  {
    id: 'multi_stop',
    label: 'Plan a multi-stop trip',
    description: 'Navigate with stops along the way',
    icon: 'git-branch-outline',
    intent: 'navigate_with_stops',
  },
  {
    id: 'find_place',
    label: 'Find a specific place',
    description: 'Search for a business or location',
    icon: 'search-outline',
    intent: 'find_place',
  },
  {
    id: 'set_destination',
    label: 'Just set where I\'m going',
    description: 'Navigate to a single destination',
    icon: 'navigate-outline',
    intent: 'set_destination',
  },
];

/**
 * Alternative Option Button Component
 */
const AlternativeButton: React.FC<{
  alternative: Alternative;
  optionLabel: string;
  onPress: () => void;
}> = ({ alternative, optionLabel, onPress }) => {
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

  return (
    <AnimatedPressable
      style={[styles.alternativeButton, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* Option Letter Badge */}
      <View style={styles.optionBadge}>
        <Text style={styles.optionBadgeText}>{optionLabel}</Text>
      </View>

      {/* Icon */}
      {alternative.icon && (
        <View style={styles.alternativeIcon}>
          <Ionicons name={alternative.icon} size={22} color={Colors.primary.teal} />
        </View>
      )}

      {/* Content */}
      <View style={styles.alternativeContent}>
        <Text style={styles.alternativeLabel}>{alternative.label}</Text>
        {alternative.description && (
          <Text style={styles.alternativeDescription}>{alternative.description}</Text>
        )}
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={18} color={Colors.dark.text.tertiary} />
    </AnimatedPressable>
  );
};

/**
 * AlternativesDialog Component
 */
export const AlternativesDialog: React.FC<AlternativesDialogProps> = ({
  visible,
  title = "I'm not quite sure what you meant",
  message = 'Did you want to:',
  alternatives = DEFAULT_ALTERNATIVES,
  onSelect,
  onRephrase,
  onDismiss,
  showRephraseOption = true,
}) => {
  // Option labels (A, B, C, etc.)
  const optionLabels = ['A', 'B', 'C', 'D', 'E'];

  const handleDismiss = () => {
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
                <Ionicons name="help" size={28} color={Colors.primary.tealLight} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
              </View>
            </View>

            {/* Alternatives */}
            <View style={styles.alternativesContainer}>
              {alternatives.slice(0, 5).map((alt, index) => (
                <AlternativeButton
                  key={alt.id}
                  alternative={alt}
                  optionLabel={optionLabels[index]}
                  onPress={() => onSelect(alt)}
                />
              ))}
            </View>

            {/* Rephrase Option */}
            {showRephraseOption && (
              <Pressable style={styles.rephraseButton} onPress={onRephrase}>
                <Ionicons name="refresh" size={18} color={Colors.dark.text.tertiary} />
                <Text style={styles.rephraseText}>Let me try again</Text>
              </Pressable>
            )}

            {/* Help Hint */}
            <View style={styles.helpHint}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.dark.text.tertiary} />
              <Text style={styles.helpHintText}>
                Try saying: "Take me home with coffee and gas stops"
              </Text>
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
    maxWidth: 400,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginBottom: Spacing.xs,
  },
  message: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
  },
  alternativesContainer: {
    marginBottom: Spacing.lg,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.elevated,
    borderRadius: Layout.radiusMedium,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  optionBadgeText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.dark.background,
  },
  alternativeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.effects.glassTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  alternativeContent: {
    flex: 1,
  },
  alternativeLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginBottom: 2,
  },
  alternativeDescription: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
  },
  rephraseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    marginTop: Spacing.sm,
  },
  rephraseText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.tertiary,
  },
  helpHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
  },
  helpHintText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    fontStyle: 'italic',
  },
});

export default AlternativesDialog;
