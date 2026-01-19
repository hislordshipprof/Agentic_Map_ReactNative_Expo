/**
 * ErrorDialog Component - Agentic Mobile Map
 *
 * Displays application errors with recovery options.
 * Per requirements-frontend.md Phase 5.1:
 * - Show error type icon
 * - Display title and message
 * - Provide recovery action buttons
 * - Support dismissable errors
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { Colors, Spacing, FontFamily, FontSize, BorderRadius, ColorUtils } from '@/theme';
import { useErrorHandler } from '@/hooks';
import type { ErrorType, RecoveryOption } from '@/redux/slices/errorSlice';

/**
 * Error type to icon mapping
 */
const errorIcons: Record<ErrorType, keyof typeof Ionicons.glyphMap> = {
  network: 'cloud-offline-outline',
  not_found: 'search-outline',
  route_exceeds: 'warning-outline',
  ambiguous: 'help-circle-outline',
  location: 'location-outline',
  timeout: 'time-outline',
  server: 'server-outline',
  validation: 'alert-circle-outline',
  unknown: 'alert-outline',
};

/**
 * Error type to color mapping
 */
const errorColors: Record<ErrorType, string> = {
  network: Colors.semantic.warning,
  not_found: Colors.primary.teal,
  route_exceeds: Colors.semantic.warning,
  ambiguous: Colors.primary.teal,
  location: Colors.semantic.warning,
  timeout: Colors.semantic.warning,
  server: Colors.semantic.error,
  validation: Colors.semantic.error,
  unknown: Colors.semantic.error,
};

/**
 * ErrorDialog Component
 */
export const ErrorDialog: React.FC = () => {
  const { currentError, isErrorDialogVisible, dismissError, handleRecoveryAction } =
    useErrorHandler();

  // Auto-hide after specified duration
  useEffect(() => {
    if (currentError?.autoHideMs) {
      const t = setTimeout(() => dismissError(), currentError.autoHideMs);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [currentError, dismissError]);

  // Announce error to screen readers
  useEffect(() => {
    if (currentError && isErrorDialogVisible) {
      AccessibilityInfo.announceForAccessibility(
        `Error: ${currentError.title}. ${currentError.message}`
      );
    }
  }, [currentError, isErrorDialogVisible]);

  if (!currentError || !isErrorDialogVisible) {
    return null;
  }

  const iconName = errorIcons[currentError.type];
  const iconColor = errorColors[currentError.type];

  return (
    <Modal
      visible={isErrorDialogVisible}
      transparent
      animationType="none"
      onRequestClose={currentError.dismissable ? dismissError : undefined}
      accessibilityViewIsModal
      accessibilityLabel="Error dialog"
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

        <Pressable
          style={styles.backdrop}
          onPress={currentError.dismissable ? dismissError : undefined}
          accessibilityLabel="Close error dialog"
          accessibilityHint={currentError.dismissable ? 'Tap to dismiss' : undefined}
        />

        <Animated.View
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.duration(200)}
          style={styles.dialog}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: ColorUtils.withAlpha(iconColor, 0.15) }]}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title} accessibilityRole="header">
            {currentError.title}
          </Text>

          {/* Message */}
          <Text style={styles.message}>{currentError.message}</Text>

          {/* Details */}
          {currentError.details && (
            <Text style={styles.details}>{currentError.details}</Text>
          )}

          {/* Recovery Options */}
          <View style={styles.actions}>
            {currentError.recoveryOptions.map((option, index) => (
              <RecoveryButton
                key={option.id}
                option={option}
                onPress={() => handleRecoveryAction(option.action, currentError.context)}
                isFirst={index === 0}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

/**
 * Recovery Button Component
 */
const RecoveryButton: React.FC<{
  option: RecoveryOption;
  onPress: () => void;
  isFirst: boolean;
}> = ({ option, onPress, isFirst }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        option.isPrimary && styles.primaryButton,
        pressed && styles.buttonPressed,
        !isFirst && styles.buttonMargin,
      ]}
      accessibilityRole="button"
      accessibilityLabel={option.label}
    >
      <Text
        style={[
          styles.buttonText,
          option.isPrimary && styles.primaryButtonText,
        ]}
      >
        {option.label}
      </Text>
    </Pressable>
  );
};

/**
 * Inline Error Banner
 * For non-modal error display
 */
export const ErrorBanner: React.FC<{
  type: ErrorType;
  message: string;
  onDismiss?: () => void;
}> = ({ type, message, onDismiss }) => {
  const iconName = errorIcons[type];
  const iconColor = errorColors[type];

  return (
    <Animated.View
      entering={SlideInDown.duration(300)}
      exiting={SlideOutDown.duration(200)}
      style={styles.banner}
      accessibilityRole="alert"
    >
      <Ionicons name={iconName} size={20} color={iconColor} />
      <Text style={styles.bannerText} numberOfLines={2}>
        {message}
      </Text>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          style={styles.bannerDismiss}
          accessibilityLabel="Dismiss error"
        >
          <Ionicons name="close" size={18} color={Colors.dark.text.secondary} />
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    backgroundColor: Colors.effects.glassDark,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    padding: Spacing.xl,
    maxWidth: 360,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: Spacing.md,
  },
  details: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },
  actions: {
    width: '100%',
    marginTop: Spacing.md,
  },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary.teal,
    borderColor: Colors.primary.teal,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonMargin: {
    marginTop: Spacing.sm,
  },
  buttonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  primaryButtonText: {
    color: Colors.dark.text.primary,
  },
  // Banner styles
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.effects.glassDark,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  bannerText: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
  },
  bannerDismiss: {
    padding: Spacing.xs,
  },
});

export default ErrorDialog;
