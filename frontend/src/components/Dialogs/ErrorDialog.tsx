/**
 * ErrorDialog Component - Agentic Mobile Map
 *
 * Modal dialog for displaying errors with recovery options.
 * Per requirements-frontend.md Phase 5.1:
 * - Network errors
 * - No results found
 * - Route too long
 * - Location unavailable
 *
 * Dark glassmorphism design with appropriate status colors.
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
 * Error types
 */
export type ErrorType =
  | 'NETWORK'
  | 'NO_RESULTS'
  | 'ROUTE_TOO_LONG'
  | 'LOCATION_UNAVAILABLE'
  | 'AMBIGUITY_UNRESOLVED'
  | 'GENERIC';

/**
 * Action button configuration
 */
export interface ErrorAction {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'tertiary';
  onPress: () => void;
}

/**
 * ErrorDialog Props
 */
export interface ErrorDialogProps {
  /** Whether dialog is visible */
  visible: boolean;
  /** Error type for styling and default message */
  type?: ErrorType;
  /** Custom title (overrides default) */
  title?: string;
  /** Custom message (overrides default) */
  message?: string;
  /** Recovery actions */
  actions?: ErrorAction[];
  /** Callback when dialog is dismissed */
  onDismiss?: () => void;
  /** Allow dismissing by tapping outside */
  dismissible?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Get error configuration based on type
 */
const getErrorConfig = (type: ErrorType) => {
  switch (type) {
    case 'NETWORK':
      return {
        icon: 'cloud-offline-outline' as const,
        title: 'Connection failed',
        message: "I couldn't reach the server. Please check your internet and try again.",
        color: Colors.status.error,
      };
    case 'NO_RESULTS':
      return {
        icon: 'search-outline' as const,
        title: 'No results found',
        message: "I couldn't find any matching places within your search area.",
        color: Colors.status.warning,
      };
    case 'ROUTE_TOO_LONG':
      return {
        icon: 'resize-outline' as const,
        title: 'Route too long',
        message: 'With all stops, the route exceeds your distance budget.',
        color: Colors.status.warning,
      };
    case 'LOCATION_UNAVAILABLE':
      return {
        icon: 'location-outline' as const,
        title: 'Location not available',
        message: 'I need your location to plan routes. Please enable location services.',
        color: Colors.status.error,
      };
    case 'AMBIGUITY_UNRESOLVED':
      return {
        icon: 'help-circle-outline' as const,
        title: 'Still unclear',
        message: "I'm having trouble understanding. Could you provide more details?",
        color: Colors.status.info,
      };
    default:
      return {
        icon: 'warning-outline' as const,
        title: 'Something went wrong',
        message: 'An unexpected error occurred. Please try again.',
        color: Colors.status.error,
      };
  }
};

/**
 * Action Button Component
 */
const ActionButton: React.FC<{
  action: ErrorAction;
  isFirst: boolean;
}> = ({ action, isFirst }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, SpringConfig.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfig.bouncy);
  };

  const isPrimary = action.variant === 'primary' || (isFirst && !action.variant);
  const isSecondary = action.variant === 'secondary';
  const isTertiary = action.variant === 'tertiary';

  return (
    <AnimatedPressable
      style={[
        styles.actionButton,
        isPrimary && styles.primaryButton,
        isSecondary && styles.secondaryButton,
        isTertiary && styles.tertiaryButton,
        animatedStyle,
      ]}
      onPress={action.onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {action.icon && (
        <Ionicons
          name={action.icon}
          size={18}
          color={
            isPrimary
              ? Colors.dark.text.primary
              : isSecondary
              ? Colors.primary.teal
              : Colors.dark.text.secondary
          }
        />
      )}
      <Text
        style={[
          styles.actionButtonText,
          isPrimary && styles.primaryButtonText,
          isSecondary && styles.secondaryButtonText,
          isTertiary && styles.tertiaryButtonText,
        ]}
      >
        {action.label}
      </Text>
    </AnimatedPressable>
  );
};

/**
 * ErrorDialog Component
 */
export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  visible,
  type = 'GENERIC',
  title,
  message,
  actions = [],
  onDismiss,
  dismissible = true,
}) => {
  const config = getErrorConfig(type);

  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  const handleBackdropPress = () => {
    if (dismissible && onDismiss) {
      onDismiss();
    }
  };

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
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
              <Ionicons name={config.icon} size={40} color={config.color} />
            </View>

            {/* Title */}
            <Text style={styles.title}>{displayTitle}</Text>

            {/* Message */}
            <Text style={styles.message}>{displayMessage}</Text>

            {/* Example/Hint for ambiguity */}
            {type === 'AMBIGUITY_UNRESOLVED' && (
              <View style={styles.exampleContainer}>
                <Text style={styles.exampleLabel}>Example:</Text>
                <Text style={styles.exampleText}>
                  "Take me home with coffee and gas stops"
                </Text>
              </View>
            )}

            {/* Actions */}
            {actions.length > 0 && (
              <View style={styles.actionsContainer}>
                {actions.map((action, index) => (
                  <ActionButton key={action.id} action={action} isFirst={index === 0} />
                ))}
              </View>
            )}

            {/* Dismiss hint if no actions */}
            {actions.length === 0 && dismissible && (
              <Text style={styles.dismissHint}>Tap outside to dismiss</Text>
            )}
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

/**
 * Pre-configured error dialogs factory
 */
export const ErrorDialogs = {
  network: (onRetry: () => void, onOffline?: () => void): ErrorDialogProps => ({
    visible: true,
    type: 'NETWORK',
    actions: [
      { id: 'retry', label: 'Retry', icon: 'refresh', variant: 'primary', onPress: onRetry },
      ...(onOffline
        ? [{ id: 'offline', label: 'Use Offline Mode', icon: 'cloud-offline-outline' as const, variant: 'secondary' as const, onPress: onOffline }]
        : []),
    ],
  }),

  noResults: (
    onExpand: () => void,
    onShowAll?: () => void,
    onSkip?: () => void
  ): ErrorDialogProps => ({
    visible: true,
    type: 'NO_RESULTS',
    actions: [
      { id: 'expand', label: 'Expand search', icon: 'resize', variant: 'primary', onPress: onExpand },
      ...(onShowAll
        ? [{ id: 'showAll', label: 'Show all options', icon: 'list' as const, variant: 'secondary' as const, onPress: onShowAll }]
        : []),
      ...(onSkip
        ? [{ id: 'skip', label: 'Skip this stop', icon: 'arrow-forward' as const, variant: 'tertiary' as const, onPress: onSkip }]
        : []),
    ],
  }),

  routeTooLong: (
    onAdjust: () => void,
    onExpand?: () => void,
    onChange?: () => void
  ): ErrorDialogProps => ({
    visible: true,
    type: 'ROUTE_TOO_LONG',
    actions: [
      { id: 'adjust', label: 'Remove a stop', icon: 'remove-circle-outline', variant: 'primary', onPress: onAdjust },
      ...(onExpand
        ? [{ id: 'expand', label: 'Expand budget', icon: 'resize' as const, variant: 'secondary' as const, onPress: onExpand }]
        : []),
      ...(onChange
        ? [{ id: 'change', label: 'Change stops', icon: 'swap-horizontal' as const, variant: 'tertiary' as const, onPress: onChange }]
        : []),
    ],
  }),

  locationUnavailable: (
    onOpenSettings: () => void,
    onTryWithout?: () => void
  ): ErrorDialogProps => ({
    visible: true,
    type: 'LOCATION_UNAVAILABLE',
    dismissible: false,
    actions: [
      { id: 'settings', label: 'Open Settings', icon: 'settings-outline', variant: 'primary', onPress: onOpenSettings },
      ...(onTryWithout
        ? [{ id: 'tryWithout', label: 'Try Without Location', variant: 'secondary' as const, onPress: onTryWithout }]
        : []),
    ],
  }),
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
    width: '85%',
    maxWidth: 360,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.dark.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  exampleContainer: {
    backgroundColor: Colors.dark.elevated,
    borderRadius: Layout.radiusMedium,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  exampleLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  exampleText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.primary.tealLight,
    fontStyle: 'italic',
  },
  actionsContainer: {
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.radiusMedium,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary.teal,
  },
  secondaryButton: {
    backgroundColor: Colors.dark.elevated,
    borderWidth: 1,
    borderColor: Colors.primary.teal,
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: Colors.dark.text.primary,
  },
  secondaryButtonText: {
    color: Colors.primary.teal,
  },
  tertiaryButtonText: {
    color: Colors.dark.text.secondary,
  },
  dismissHint: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});

export default ErrorDialog;
