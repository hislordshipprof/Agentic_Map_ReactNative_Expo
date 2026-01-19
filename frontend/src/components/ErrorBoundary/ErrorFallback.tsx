/**
 * ErrorFallback Component - Agentic Mobile Map
 *
 * Fallback UI displayed when an error boundary catches an error.
 * Matches the dark glassmorphism theme of the app.
 *
 * Features:
 * - Full-screen or inline variants
 * - Recovery actions (retry, go back)
 * - Optional technical details in dev mode
 * - Smooth animations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Clipboard,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorInfo } from 'react';
import {
  Colors,
  Spacing,
  FontFamily,
  FontSize,
  BorderRadius,
  ColorUtils,
} from '@/theme';

/**
 * ErrorFallback Props
 */
export interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** React error info with component stack */
  errorInfo: ErrorInfo | null;
  /** Level of the error boundary */
  level?: 'app' | 'screen' | 'section';
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Show technical details */
  showDetails?: boolean;
  /** Reset callback */
  onReset?: () => void;
}

/**
 * Default messages by level
 */
const defaultMessages: Record<string, { title: string; message: string }> = {
  app: {
    title: 'Something went wrong',
    message: 'The app encountered an unexpected error. Please try again.',
  },
  screen: {
    title: 'Unable to load',
    message: 'This screen couldn\'t load properly. Try going back or refreshing.',
  },
  section: {
    title: 'Error loading content',
    message: 'This section couldn\'t load. Other parts of the app should still work.',
  },
};

/**
 * ErrorFallback Component
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  level = 'app',
  title,
  message,
  showDetails = false,
  onReset,
}) => {
  const [showStack, setShowStack] = useState(false);
  const [copied, setCopied] = useState(false);

  const defaults = defaultMessages[level];
  const displayTitle = title || defaults.title;
  const displayMessage = message || defaults.message;

  const isFullScreen = level === 'app' || level === 'screen';

  /**
   * Copy error details to clipboard
   */
  const handleCopyError = (): void => {
    const errorText = `
Error: ${error.message}
Stack: ${error.stack || 'N/A'}
Component Stack: ${errorInfo?.componentStack || 'N/A'}
Time: ${new Date().toISOString()}
    `.trim();

    Clipboard.setString(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Content for the fallback
   */
  const content = (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[
        styles.content,
        isFullScreen && styles.contentFullScreen,
      ]}
    >
      {/* Icon */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={styles.iconContainer}
      >
        <Ionicons
          name="warning-outline"
          size={48}
          color={Colors.semantic.warning}
        />
      </Animated.View>

      {/* Title */}
      <Animated.Text
        entering={FadeInDown.duration(400).delay(200)}
        style={styles.title}
      >
        {displayTitle}
      </Animated.Text>

      {/* Message */}
      <Animated.Text
        entering={FadeInDown.duration(400).delay(300)}
        style={styles.message}
      >
        {displayMessage}
      </Animated.Text>

      {/* Error name in dev */}
      {showDetails && (
        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.errorBox}
        >
          <Text style={styles.errorName}>{error.name}</Text>
          <Text style={styles.errorMessage} numberOfLines={3}>
            {error.message}
          </Text>
        </Animated.View>
      )}

      {/* Actions */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(500)}
        style={styles.actions}
      >
        {/* Retry button */}
        {onReset && (
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={[Colors.primary.teal, Colors.primary.tealDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="refresh" size={20} color={Colors.dark.text.primary} />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Show details toggle (dev only) */}
        {showDetails && (
          <Pressable
            onPress={() => setShowStack(!showStack)}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons
              name={showStack ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.dark.text.secondary}
            />
            <Text style={styles.secondaryButtonText}>
              {showStack ? 'Hide' : 'Show'} Details
            </Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Stack trace (dev only) */}
      {showDetails && showStack && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.stackContainer}
        >
          <View style={styles.stackHeader}>
            <Text style={styles.stackTitle}>Stack Trace</Text>
            <Pressable onPress={handleCopyError} style={styles.copyButton}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={copied ? Colors.semantic.success : Colors.dark.text.tertiary}
              />
              <Text style={[
                styles.copyText,
                copied && styles.copyTextSuccess,
              ]}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.stackScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Text style={styles.stackText} selectable>
              {error.stack || 'No stack trace available'}
            </Text>
          </ScrollView>

          {errorInfo?.componentStack && (
            <>
              <Text style={[styles.stackTitle, { marginTop: Spacing.md }]}>
                Component Stack
              </Text>
              <ScrollView
                style={styles.stackScroll}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <Text style={styles.stackText} selectable>
                  {errorInfo.componentStack}
                </Text>
              </ScrollView>
            </>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );

  // Full-screen variant
  if (isFullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        <LinearGradient
          colors={[Colors.dark.background, Colors.dark.surface]}
          style={StyleSheet.absoluteFill}
        />
        {content}
      </View>
    );
  }

  // Inline variant (for section-level errors)
  return (
    <View style={styles.inlineContainer}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  inlineContainer: {
    backgroundColor: Colors.effects.glassDark,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    margin: Spacing.md,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  contentFullScreen: {
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ColorUtils.withAlpha(Colors.semantic.warning, 0.15),
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
    marginBottom: Spacing.lg,
  },
  errorBox: {
    backgroundColor: ColorUtils.withAlpha(Colors.semantic.error, 0.1),
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: ColorUtils.withAlpha(Colors.semantic.error, 0.3),
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  errorName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.semantic.error,
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  primaryButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.effects.glassDark,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
  },
  secondaryButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  stackContainer: {
    width: '100%',
    marginTop: Spacing.lg,
    backgroundColor: Colors.dark.elevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  stackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stackTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.dark.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  copyText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  copyTextSuccess: {
    color: Colors.semantic.success,
  },
  stackScroll: {
    maxHeight: 150,
  },
  stackText: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 10,
    color: Colors.dark.text.secondary,
    lineHeight: 16,
  },
});

export default ErrorFallback;
