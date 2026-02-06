/**
 * UserInputField Component - Agentic Mobile Map
 *
 * Beautiful text input with voice button for the conversational UI.
 * Glassmorphism design with teal accents.
 *
 * Features:
 * - Dark glassmorphism background (default) or theme-aware via `colors` prop
 * - Animated send button with teal glow
 * - Voice input button with recording animation
 * - Smooth focus transitions
 * - Multiline support with auto-grow
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  Layout,
  SemanticSpacing,
  SpringConfig,
  FontFamily,
  FontSize,
} from '@/theme';
import type { ThemePalette } from '@/theme/palettes';
import { InputValidator } from '@/services/security';

/**
 * UserInputField Props
 */
export interface UserInputFieldProps {
  /** Callback when message is sent */
  onSend: (message: string) => void;
  /** Callback for voice button press */
  onVoicePress?: () => void;
  /** Callback when voice recording stops */
  onVoiceRelease?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disable input (e.g., during processing) */
  disabled?: boolean;
  /** Show loading state on send button */
  isLoading?: boolean;
  /** Show voice button */
  showVoiceButton?: boolean;
  /** Voice recording active */
  isRecording?: boolean;
  /** Custom styles */
  style?: ViewStyle;
  /** Maximum input length */
  maxLength?: number;
  /** Disable wrapper padding (for inline usage) */
  disableWrapperPadding?: boolean;
  /** Theme palette — when provided, renders theme-aware colors */
  colors?: ThemePalette;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * UserInputField Component
 */
export const UserInputField: React.FC<UserInputFieldProps> = ({
  onSend,
  onVoicePress,
  onVoiceRelease,
  placeholder = 'Where would you like to go?',
  disabled = false,
  isLoading = false,
  showVoiceButton = true,
  isRecording = false,
  style,
  maxLength = 500,
  disableWrapperPadding = false,
  colors,
}) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const focusAnimation = useSharedValue(0);
  const sendButtonScale = useSharedValue(1);
  const sendButtonGlow = useSharedValue(0);
  const voiceButtonScale = useSharedValue(1);
  const voicePulse = useSharedValue(1);

  // Derive color tokens - using blue/pink-cyan gradient colors to match design
  const c = useMemo(() => {
    if (!colors) {
      return {
        wrapperBg: Colors.dark.background,
        containerBg: Colors.effects.glassDark,
        containerBorder: Colors.dark.border,
        focusBorder: Colors.primary.blue,
        inputText: Colors.dark.text.primary,
        disabledText: Colors.dark.text.tertiary,
        placeholder: Colors.dark.text.tertiary,
        sendInactive: [Colors.dark.elevated, Colors.dark.surface] as readonly string[],
        sendActive: ['#B8D4E8', '#A8E0E8'] as readonly string[], // Light blue → cyan gradient
        sendIcon: '#4A4A5A',
        voiceBg: Colors.dark.elevated,
        voiceIcon: Colors.dark.text.secondary,
        voiceActiveIcon: Colors.primary.blue,
        voiceGlow: Colors.primary.blue,
      };
    }
    return {
      wrapperBg: colors.background.primary,
      containerBg: colors.input.background,
      containerBorder: colors.input.border,
      focusBorder: colors.primary.blue,
      inputText: colors.input.text,
      disabledText: colors.text.tertiary,
      placeholder: colors.input.placeholder,
      sendInactive: ['#E5E7EB', '#F3F4F6'] as readonly string[],
      sendActive: ['#B8D4E8', '#A8E0E8'] as readonly string[], // Light blue → cyan gradient
      sendIcon: '#4A4A5A',
      voiceBg: colors.surface.elevated,
      voiceIcon: colors.text.secondary,
      voiceActiveIcon: colors.primary.blue,
      voiceGlow: colors.primary.blue,
    };
  }, [colors]);

  // Handle text change
  const handleChangeText = useCallback((value: string) => {
    setText(value);
    sendButtonGlow.value = withTiming(value.trim().length > 0 ? 1 : 0, {
      duration: 200,
    });
  }, []);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    focusAnimation.value = withSpring(1, SpringConfig.snappy);
  }, []);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    focusAnimation.value = withSpring(0, SpringConfig.snappy);
  }, []);

  // Handle send with input validation
  const handleSend = useCallback(() => {
    if (disabled || isLoading) return;

    const validation = InputValidator.validateUtterance(text);
    if (!validation.isValid) {
      if (__DEV__) {
        console.warn('[UserInputField] Invalid input:', validation.error);
      }
      return;
    }

    sendButtonScale.value = withSequence(
      withSpring(0.85, SpringConfig.bouncy),
      withSpring(1, SpringConfig.bouncy)
    );

    onSend(validation.sanitized);
    setText('');
    sendButtonGlow.value = withTiming(0, { duration: 200 });
    Keyboard.dismiss();
  }, [text, disabled, isLoading, onSend]);

  // Voice button handlers
  const handleVoicePressIn = useCallback(() => {
    if (disabled || isLoading) return;
    voiceButtonScale.value = withSpring(0.9, SpringConfig.snappy);
    onVoicePress?.();
  }, [disabled, isLoading, onVoicePress]);

  const handleVoicePressOut = useCallback(() => {
    voiceButtonScale.value = withSpring(1, SpringConfig.bouncy);
    onVoiceRelease?.();
  }, [onVoiceRelease]);

  // Voice recording pulse animation
  useEffect(() => {
    if (isRecording) {
      voicePulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(voicePulse);
      voicePulse.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  // Container animated style (focus border)
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const borderWidth = interpolate(
      focusAnimation.value,
      [0, 1],
      [1, 2],
      Extrapolation.CLAMP
    );

    return {
      borderWidth,
      borderColor: isFocused ? c.focusBorder : c.containerBorder,
    };
  });

  // Send button animated style
  const sendButtonAnimatedStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(
      sendButtonGlow.value,
      [0, 1],
      [0.5, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: sendButtonScale.value }],
      opacity: glowOpacity,
    };
  });

  // Voice button animated style
  const voiceButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: voiceButtonScale.value * voicePulse.value },
    ],
  }));

  // Voice glow animated style (for recording state)
  const voiceGlowAnimatedStyle = useAnimatedStyle(() => {
    const glowScale = interpolate(
      voicePulse.value,
      [1, 1.2],
      [1, 1.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: glowScale }],
      opacity: isRecording ? 0.4 : 0,
    };
  });

  const canSend = text.trim().length > 0 && !disabled && !isLoading;

  return (
    <View
      style={[
        !disableWrapperPadding && [styles.wrapper, { backgroundColor: c.wrapperBg }],
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: c.containerBg },
          containerAnimatedStyle,
        ]}
      >
        {/* Text input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { color: c.inputText },
            disabled && { color: c.disabledText },
          ]}
          value={text}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          editable={!disabled && !isRecording}
          maxLength={maxLength}
          multiline
          textAlignVertical="center"
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />

        {/* Voice button (optional) */}
        {showVoiceButton && (
          <View style={styles.voiceButtonContainer}>
            {/* Glow effect for recording */}
            <Animated.View
              style={[
                styles.voiceGlow,
                { backgroundColor: c.voiceGlow },
                voiceGlowAnimatedStyle,
              ]}
            />

            <AnimatedTouchable
              style={[
                styles.voiceButton,
                { backgroundColor: c.voiceBg },
                voiceButtonAnimatedStyle,
              ]}
              onPressIn={handleVoicePressIn}
              onPressOut={handleVoicePressOut}
              disabled={disabled || isLoading}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? 'mic' : 'mic-outline'}
                size={22}
                color={isRecording ? c.voiceActiveIcon : c.voiceIcon}
              />
            </AnimatedTouchable>
          </View>
        )}

        {/* Send button */}
        <AnimatedTouchable
          style={[styles.sendButtonWrapper, sendButtonAnimatedStyle]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              canSend
                ? (c.sendActive as [string, string])
                : (c.sendInactive as [string, string])
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendButton}
          >
            {isLoading ? (
              <Ionicons
                name="hourglass-outline"
                size={20}
                color={c.sendIcon}
              />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={c.sendIcon}
                style={styles.sendIcon}
              />
            )}
          </LinearGradient>
        </AnimatedTouchable>
      </Animated.View>
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SemanticSpacing.screenPadding,
    paddingVertical: Spacing.md,
    // Safe area for bottom notch
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: Layout.radiusXLarge,
    borderWidth: 1,
    minHeight: 52,
    maxHeight: 120,
    paddingLeft: Spacing.base,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    paddingRight: Spacing.sm,
    fontSize: FontSize.base,
    fontFamily: FontFamily.primary,
    minHeight: 40,
    maxHeight: 100,
    lineHeight: 22,
  },
  voiceButtonContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  voiceGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonWrapper: {
    marginBottom: 2,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    marginLeft: 2, // Visual centering
  },
});

export default UserInputField;
