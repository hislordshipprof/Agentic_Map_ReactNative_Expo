/**
 * LoadingOverlay Component - Agentic Mobile Map
 *
 * Enhanced loading states with progress tracking.
 * Per requirements-frontend.md Phase 5.2:
 * - Minimal loading (< 500ms): No spinner
 * - Medium loading (500ms-2s): Animated spinner
 * - Long loading (> 2s): Progress indicator
 * - Cancelable operations
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, FontFamily, FontSize, BorderRadius, ColorUtils } from '@/theme';
import { useLoadingState } from '@/hooks';

/**
 * Props for LoadingOverlay
 */
export interface LoadingOverlayProps {
  /** Override visibility */
  visible?: boolean;
  /** Override message */
  message?: string;
  /** Show as full screen overlay */
  fullScreen?: boolean;
  /** Show cancel button */
  showCancel?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
}

/**
 * LoadingOverlay Component
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible: visibleOverride,
  message: messageOverride,
  fullScreen = true,
  showCancel,
  onCancel,
}) => {
  const { isLoading, primaryOperation, globalMessage, cancel } = useLoadingState();
  const [, setShowProgress] = useState(false);

  // Determine visibility
  const visible = visibleOverride ?? isLoading;
  const message = messageOverride ?? globalMessage ?? 'Loading...';
  const progress = primaryOperation?.progress ?? 0;
  const isIndeterminate = primaryOperation?.isIndeterminate ?? true;
  const canCancel = showCancel ?? primaryOperation?.canCancel ?? false;
  const operationId = primaryOperation?.id;

  // After 2s in indeterminate mode, showProgress could drive a "Taking longer…" message (reserved).
  useEffect(() => {
    if (visible && isIndeterminate) {
      const t = setTimeout(() => setShowProgress(true), 2000);
      return () => clearTimeout(t);
    }
    setShowProgress(false);
    return undefined;
  }, [visible, isIndeterminate]);

  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (operationId) cancel(operationId);
  };

  if (!visible) {
    return null;
  }

  const content = (
    <View style={styles.content}>
      {/* Spinner or Progress */}
      {isIndeterminate ? (
        <AnimatedSpinner />
      ) : (
        <ProgressRing progress={progress} />
      )}

      {/* Message */}
      <Text style={styles.message}>{message}</Text>

      {/* Progress text */}
      {!isIndeterminate && (
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      )}

      {/* Cancel button */}
      {canCancel && (
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.cancelButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Cancel operation"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(100)}
        style={styles.overlay}
        accessibilityRole="progressbar"
        accessibilityLabel={message}
        accessibilityValue={{
          now: progress,
          min: 0,
          max: 100,
        }}
      >
        <BlurView intensity={15} style={StyleSheet.absoluteFill} tint="dark" />
        {content}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      style={styles.inline}
    >
      {content}
    </Animated.View>
  );
};

/**
 * Animated Spinner Component
 */
const AnimatedSpinner: React.FC = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.spinnerContainer}>
      <Animated.View style={[styles.spinner, animatedStyle]}>
        <View style={styles.spinnerTrack} />
        <View style={styles.spinnerIndicator} />
      </Animated.View>
    </View>
  );
};

/**
 * Progress Ring Component
 */
const ProgressRing: React.FC<{ progress: number }> = ({ progress }) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(progress, {
      damping: 15,
      stiffness: 100,
    });
  }, [progress, animatedProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(animatedProgress.value, [0, 100], [0, 360]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  return (
    <View style={styles.progressRingContainer}>
      <View style={styles.progressRingTrack} />
      <Animated.View style={[styles.progressRingFill, animatedStyle]} />
      <Ionicons
        name="checkmark"
        size={24}
        color={progress >= 100 ? Colors.semantic.success : Colors.dark.text.tertiary}
        style={styles.progressIcon}
      />
    </View>
  );
};

/**
 * Minimal Loader Component
 * For quick operations (< 500ms delay before showing)
 */
export const MinimalLoader: React.FC<{
  visible: boolean;
  delay?: number;
}> = ({ visible, delay = 500 }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(t);
    }
    setShow(false);
    return undefined;
  }, [visible, delay]);

  if (!show) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
      <ActivityIndicator size="small" color={Colors.primary.teal} />
    </Animated.View>
  );
};

/**
 * Inline Loading Text
 * Animated ellipsis for inline loading states
 */
export const LoadingText: React.FC<{
  text?: string;
}> = ({ text = 'Loading' }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <Text style={styles.loadingText}>
      {text}
      <Text style={styles.loadingDots}>{dots}</Text>
    </Text>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  content: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.effects.glassDark,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    minWidth: 160,
  },
  spinnerContainer: {
    width: 48,
    height: 48,
    marginBottom: Spacing.lg,
  },
  spinner: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerTrack: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: ColorUtils.withAlpha(Colors.primary.teal, 0.2),
  },
  spinnerIndicator: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: Colors.primary.teal,
  },
  progressRingContainer: {
    width: 56,
    height: 56,
    marginBottom: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingTrack: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: ColorUtils.withAlpha(Colors.primary.teal, 0.2),
  },
  progressRingFill: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: Colors.primary.teal,
    borderRightColor: Colors.primary.teal,
  },
  progressIcon: {
    position: 'absolute',
  },
  message: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  progressText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
    marginBottom: Spacing.md,
  },
  cancelButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: ColorUtils.withAlpha(Colors.dark.text.tertiary, 0.2),
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
  },
  loadingText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
  },
  loadingDots: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.tertiary,
    width: 24,
  },
});

export default LoadingOverlay;
