/**
 * VoiceStatusIndicator - Voice mode status text display
 *
 * Per FINAL_REQUIREMENTS.md - Voice Mode UI:
 * - Shows current voice state ("Listening...", "Thinking...", etc.)
 * - Displays live transcript while speaking
 * - Animated transitions between states
 *
 * Design: Glassmorphism card with animated text
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontWeight, FontSize, Spacing } from '@/theme';
import type { VoiceStatus } from '@/redux/slices/voiceSlice';
import { InlineWaveform } from './WaveformVisualizer';

/**
 * Props for VoiceStatusIndicator
 */
interface VoiceStatusIndicatorProps {
  /** Current voice status */
  status: VoiceStatus;
  /** Live transcript text (interim or final) */
  transcript?: string;
  /** Suggested response (shown during speaking) */
  suggestedResponse?: string;
  /** Audio level for waveform (0-1) */
  audioLevel?: number;
  /** Custom style */
  style?: ViewStyle;
  /** Whether to show the card background */
  showBackground?: boolean;
}

/**
 * Status configuration
 */
interface StatusConfig {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  showWaveform: boolean;
}

/**
 * Get status configuration
 */
function getStatusConfig(status: VoiceStatus): StatusConfig {
  switch (status) {
    case 'connecting':
      return {
        text: 'Connecting...',
        icon: 'wifi-outline',
        color: Colors.dark.text.secondary,
        showWaveform: false,
      };
    case 'listening':
      return {
        text: 'Listening...',
        icon: 'mic',
        color: Colors.primary.tealLight,
        showWaveform: true,
      };
    case 'processing':
      return {
        text: 'Thinking...',
        icon: 'sparkles',
        color: Colors.primary.tealLight,
        showWaveform: false,
      };
    case 'speaking':
      return {
        text: 'Speaking...',
        icon: 'volume-high',
        color: Colors.primary.emerald,
        showWaveform: true,
      };
    case 'confirming':
      return {
        text: 'Confirm route?',
        icon: 'help-circle',
        color: Colors.primary.tealLight,
        showWaveform: false,
      };
    case 'error':
      return {
        text: 'Something went wrong',
        icon: 'alert-circle',
        color: Colors.status.error,
        showWaveform: false,
      };
    default:
      return {
        text: 'Tap mic to speak',
        icon: 'mic-outline',
        color: Colors.dark.text.secondary,
        showWaveform: false,
      };
  }
}

/**
 * Animated dots for loading states
 */
const AnimatedDots: React.FC<{ color: string }> = ({ color }) => {
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.3);
  const opacity3 = useSharedValue(0.3);

  useEffect(() => {
    opacity1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      true
    );

    setTimeout(() => {
      opacity2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        true
      );
    }, 150);

    setTimeout(() => {
      opacity3.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        true
      );
    }, 300);
  }, [opacity1, opacity2, opacity3]);

  const dot1Style = useAnimatedStyle(() => ({ opacity: opacity1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: opacity2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: opacity3.value }));

  return (
    <View style={styles.dotsContainer}>
      <Animated.Text style={[styles.dot, { color }, dot1Style]}>.</Animated.Text>
      <Animated.Text style={[styles.dot, { color }, dot2Style]}>.</Animated.Text>
      <Animated.Text style={[styles.dot, { color }, dot3Style]}>.</Animated.Text>
    </View>
  );
};

/**
 * VoiceStatusIndicator Component
 */
export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  status,
  transcript,
  suggestedResponse,
  audioLevel = 0,
  style,
  showBackground = true,
}) => {
  const config = useMemo(() => getStatusConfig(status), [status]);
  const isActive = status !== 'idle';

  // Determine what text to show
  const displayText = useMemo(() => {
    if (status === 'listening' && transcript) {
      return transcript;
    }
    if (status === 'speaking' && suggestedResponse) {
      return suggestedResponse;
    }
    return config.text;
  }, [status, transcript, suggestedResponse, config.text]);

  // Show animated dots for processing/connecting
  const showDots = status === 'processing' || status === 'connecting';

  if (!isActive && !showBackground) {
    return null;
  }

  const content = (
    <View style={styles.contentContainer}>
      {/* Icon and waveform */}
      <View style={styles.iconContainer}>
        {config.showWaveform ? (
          <InlineWaveform
            isActive={status === 'listening' || status === 'speaking'}
            audioLevel={audioLevel}
          />
        ) : (
          <Ionicons
            name={config.icon}
            size={18}
            color={config.color}
          />
        )}
      </View>

      {/* Status text */}
      <View style={styles.textContainer}>
        <Animated.Text
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.statusText,
            { color: transcript ? Colors.dark.text.primary : config.color },
            transcript ? styles.transcriptText : undefined,
          ]}
          numberOfLines={transcript ? 2 : 1}
        >
          {displayText}
        </Animated.Text>

        {showDots && <AnimatedDots color={config.color} />}
      </View>
    </View>
  );

  if (!showBackground) {
    return <View style={[styles.container, style]}>{content}</View>;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.container, style]}
    >
      <BlurView intensity={40} tint="dark" style={styles.blurView}>
        <View style={styles.glassCard}>
          {content}
        </View>
      </BlurView>
    </Animated.View>
  );
};

/**
 * Compact status indicator (for header/inline use)
 */
interface CompactStatusProps {
  status: VoiceStatus;
  style?: ViewStyle;
}

export const CompactVoiceStatus: React.FC<CompactStatusProps> = ({
  status,
  style,
}) => {
  const config = useMemo(() => getStatusConfig(status), [status]);
  const isActive = status !== 'idle';

  if (!isActive) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      style={[styles.compactContainer, style]}
    >
      <View style={[styles.compactDot, { backgroundColor: config.color }]} />
      <Text style={[styles.compactText, { color: config.color }]}>
        {config.text.replace('...', '')}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurView: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderRadius: 16,
    paddingHorizontal: Spacing.base, // 16px
    paddingVertical: Spacing.md, // 12px
    minWidth: 160,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: Spacing.sm, // 8px
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontFamily: FontFamily.primary,
    fontWeight: FontWeight.medium,
    fontSize: FontSize.sm,
    textAlign: 'center',
    flexShrink: 1,
  },
  transcriptText: {
    fontFamily: FontFamily.primary,
    fontWeight: FontWeight.regular,
    textAlign: 'left' as const,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginLeft: 2,
  },
  dot: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.primary,
    fontWeight: FontWeight.bold,
    lineHeight: 14,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm, // 8px
    paddingVertical: Spacing.xs, // 4px
    backgroundColor: Colors.effects.glassDark,
    borderRadius: 12,
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs, // 4px
  },
  compactText: {
    fontFamily: FontFamily.primary,
    fontWeight: FontWeight.medium,
    fontSize: FontSize.xs,
  },
});

export default VoiceStatusIndicator;
