/**
 * ConfirmationDialog Component - Agentic Mobile Map
 *
 * Modal dialog for confirming understood intent (MEDIUM confidence 0.60-0.79).
 * Per requirements-frontend.md Phase 2.2:
 * - Semi-transparent overlay
 * - Centered card with extracted entities
 * - Two action buttons: [Confirm] [Rephrase]
 * - Entity icons for visual clarity
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
  ScrollView,
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
 * Extracted entities to display
 */
export interface ConfirmationEntities {
  destination?: string;
  stops?: string[];
  radius?: number;
  preferences?: string[];
}

/**
 * ConfirmationDialog Props
 */
export interface ConfirmationDialogProps {
  /** Whether dialog is visible */
  visible: boolean;
  /** Header message */
  title?: string;
  /** Extracted entities to display */
  entities: ConfirmationEntities;
  /** Confidence score (for display) */
  confidence?: number;
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Callback when user wants to rephrase */
  onRephrase: () => void;
  /** Callback when dialog is dismissed (tap outside) */
  onDismiss?: () => void;
  /** Allow dismissing by tapping outside */
  dismissible?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Entity Row Component
 */
const EntityRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | string[];
}> = ({ icon, label, value }) => {
  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  return (
    <View style={styles.entityRow}>
      <View style={styles.entityIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary.teal} />
      </View>
      <View style={styles.entityContent}>
        <Text style={styles.entityLabel}>{label}</Text>
        <Text style={styles.entityValue}>{displayValue}</Text>
      </View>
    </View>
  );
};

/**
 * ConfirmationDialog Component
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title = 'I think you want to:',
  entities,
  confidence,
  onConfirm,
  onRephrase,
  onDismiss,
  dismissible = true,
}) => {
  // Animation values for buttons
  const confirmScale = useSharedValue(1);
  const rephraseScale = useSharedValue(1);

  // Handle backdrop press
  const handleBackdropPress = () => {
    if (dismissible && onDismiss) {
      onDismiss();
    } else if (dismissible) {
      onRephrase();
    }
  };

  // Button press animations
  const handleConfirmPressIn = () => {
    confirmScale.value = withSpring(0.95, SpringConfig.snappy);
  };

  const handleConfirmPressOut = () => {
    confirmScale.value = withSpring(1, SpringConfig.bouncy);
  };

  const handleRephrasePressIn = () => {
    rephraseScale.value = withSpring(0.95, SpringConfig.snappy);
  };

  const handleRephrasePressOut = () => {
    rephraseScale.value = withSpring(1, SpringConfig.bouncy);
  };

  // Animated styles
  const confirmAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confirmScale.value }],
  }));

  const rephraseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rephraseScale.value }],
  }));

  // Check if we have any entities to display
  const hasEntities =
    entities.destination ||
    (entities.stops && entities.stops.length > 0) ||
    entities.radius ||
    (entities.preferences && entities.preferences.length > 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
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
                <Ionicons name="help-circle" size={28} color={Colors.primary.teal} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>

            {/* Confidence indicator (optional) */}
            {confidence !== undefined && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>Confidence:</Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceValue}>
                    {Math.round(confidence * 100)}%
                  </Text>
                </View>
              </View>
            )}

            {/* Entities */}
            {hasEntities && (
              <ScrollView style={styles.entitiesContainer} showsVerticalScrollIndicator={false}>
                {entities.destination && (
                  <EntityRow
                    icon="location"
                    label="Destination"
                    value={entities.destination}
                  />
                )}

                {entities.stops && entities.stops.length > 0 && (
                  <EntityRow
                    icon="stop-circle"
                    label={entities.stops.length === 1 ? 'Stop' : 'Stops'}
                    value={entities.stops}
                  />
                )}

                {entities.radius && (
                  <EntityRow
                    icon="resize"
                    label="Search radius"
                    value={`${entities.radius} miles`}
                  />
                )}

                {entities.preferences && entities.preferences.length > 0 && (
                  <EntityRow
                    icon="options"
                    label="Preferences"
                    value={entities.preferences}
                  />
                )}
              </ScrollView>
            )}

            {/* Confirmation question */}
            <Text style={styles.question}>Is this correct?</Text>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {/* Rephrase Button */}
              <AnimatedPressable
                style={[styles.button, styles.rephraseButton, rephraseAnimatedStyle]}
                onPress={onRephrase}
                onPressIn={handleRephrasePressIn}
                onPressOut={handleRephrasePressOut}
              >
                <Ionicons name="refresh" size={18} color={Colors.dark.text.secondary} />
                <Text style={styles.rephraseButtonText}>Let me rephrase</Text>
              </AnimatedPressable>

              {/* Confirm Button */}
              <AnimatedPressable
                style={[styles.button, styles.confirmButton, confirmAnimatedStyle]}
                onPress={onConfirm}
                onPressIn={handleConfirmPressIn}
                onPressOut={handleConfirmPressOut}
              >
                <Ionicons name="checkmark" size={18} color={Colors.dark.text.primary} />
                <Text style={styles.confirmButtonText}>Yes, proceed</Text>
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
    maxHeight: '80%',
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
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  confidenceLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    marginRight: Spacing.sm,
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.radiusSmall,
    backgroundColor: Colors.effects.glassTeal,
  },
  confidenceValue: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary.teal,
  },
  entitiesContainer: {
    maxHeight: 200,
    marginBottom: Spacing.lg,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  entityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.effects.glassDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  entityContent: {
    flex: 1,
  },
  entityLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  entityValue: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.primary,
    fontWeight: '500',
  },
  question: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.radiusMedium,
    gap: Spacing.sm,
  },
  rephraseButton: {
    backgroundColor: Colors.dark.elevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  rephraseButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.dark.text.secondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary.teal,
  },
  confirmButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
});

export default ConfirmationDialog;
