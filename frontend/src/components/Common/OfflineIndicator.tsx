/**
 * OfflineIndicator Component - Agentic Mobile Map
 *
 * Visual indicator for offline status with sync information.
 * Per requirements-frontend.md Phase 4.2:
 * - Show offline mode banner
 * - Display cache freshness
 * - Sync status indicator
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';

import { Colors, Spacing, FontFamily, FontSize, ColorUtils } from '@/theme';

/**
 * OfflineIndicator Props
 */
export interface OfflineIndicatorProps {
  /** Whether the device is offline */
  isOffline: boolean;
  /** Whether sync is in progress */
  isSyncing?: boolean;
  /** Last sync timestamp */
  lastSyncTime?: number | null;
  /** Whether offline mode is forced by user */
  isForcedOffline?: boolean;
  /** Callback when sync button is pressed */
  onSyncPress?: () => void;
  /** Callback when close is pressed */
  onClose?: () => void;
  /** Custom style */
  style?: ViewStyle;
}

/**
 * Format time ago string
 */
const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};

/**
 * Syncing Animation Component
 */
const SyncingIndicator: React.FC = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name="sync" size={16} color={Colors.primary.teal} />
    </Animated.View>
  );
};

/**
 * Pulse Animation for offline dot
 */
const PulsingDot: React.FC<{ color: string }> = ({ color }) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.statusDot,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
};

/**
 * OfflineIndicator Component
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOffline,
  isSyncing = false,
  lastSyncTime,
  isForcedOffline = false,
  onSyncPress,
  onClose,
  style,
}) => {
  // Don't show if online and not syncing
  if (!isOffline && !isSyncing) return null;

  const statusColor = isOffline ? Colors.semantic.warning : Colors.primary.teal;
  const statusText = isForcedOffline
    ? 'Offline Mode'
    : isOffline
    ? 'No Connection'
    : 'Syncing...';

  const syncText = lastSyncTime
    ? `Last synced ${formatTimeAgo(lastSyncTime)}`
    : 'Not synced yet';

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.container, style]}
    >
      <View style={styles.content}>
        {/* Status indicator */}
        <View style={styles.statusContainer}>
          {isSyncing ? (
            <SyncingIndicator />
          ) : (
            <PulsingDot color={statusColor} />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>

        {/* Sync info */}
        <Text style={styles.syncText}>{syncText}</Text>

        {/* Actions */}
        <View style={styles.actions}>
          {isOffline && !isSyncing && onSyncPress && (
            <Pressable
              onPress={onSyncPress}
              style={({ pressed }) => [
                styles.syncButton,
                pressed && styles.syncButtonPressed,
              ]}
            >
              <Ionicons name="refresh" size={14} color={Colors.primary.teal} />
              <Text style={styles.syncButtonText}>Retry</Text>
            </Pressable>
          )}

          {onClose && (
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={Colors.dark.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Message about cached data */}
      {isOffline && (
        <Text style={styles.cacheMessage}>
          Using cached data. Some features may be limited.
        </Text>
      )}
    </Animated.View>
  );
};

/**
 * Compact offline badge for headers
 */
export const OfflineBadge: React.FC<{
  isOffline: boolean;
  isSyncing?: boolean;
}> = ({ isOffline, isSyncing }) => {
  if (!isOffline && !isSyncing) return null;

  return (
    <View style={styles.badge}>
      {isSyncing ? (
        <SyncingIndicator />
      ) : (
        <Ionicons name="cloud-offline" size={14} color={Colors.semantic.warning} />
      )}
      <Text style={styles.badgeText}>
        {isSyncing ? 'Syncing' : 'Offline'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.effects.glassDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  syncText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    flex: 1,
    marginLeft: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.1),
  },
  syncButtonPressed: {
    opacity: 0.7,
  },
  syncButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '500',
    color: Colors.primary.teal,
  },
  closeButton: {
    padding: 4,
  },
  cacheMessage: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.secondary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ColorUtils.withAlpha(Colors.semantic.warning, 0.15),
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ColorUtils.withAlpha(Colors.semantic.warning, 0.3),
  },
  badgeText: {
    fontFamily: FontFamily.primary,
    fontSize: 11,
    fontWeight: '500',
    color: Colors.semantic.warning,
  },
});

export default OfflineIndicator;
