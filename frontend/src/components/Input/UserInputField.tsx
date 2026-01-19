/**
 * UserInputField Component - Agentic Mobile Map
 *
 * Beautiful text input with voice button for the conversational UI.
 * Glassmorphism design with teal accents.
 *
 * Features:
 * - Dark glassmorphism background
 * - Animated send button with teal glow
 * - Voice input button with recording animation
 * - Smooth focus transitions
 * - Multiline support with auto-grow
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
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

  // Handle text change
  const handleChangeText = useCallback((value: string) => {
    setText(value);
    // Animate send button glow based on text presence
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

    // Validate and sanitize input
    const validation = InputValidator.validateUtterance(text);
    if (!validation.isValid) {
      // Input is invalid - don't send
      // Could show a toast here, but for now just ignore
      if (__DEV__) {
        console.warn('[UserInputField] Invalid input:', validation.error);
      }
      return;
    }

    // Animate button press
    sendButtonScale.value = withSequence(
      withSpring(0.85, SpringConfig.bouncy),
      withSpring(1, SpringConfig.bouncy)
    );

    // Send sanitized input
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
      borderColor: isFocused ? Colors.primary.teal : Colors.dark.border,
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
    <View style={[styles.wrapper, style]}>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Text input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            disabled && styles.inputDisabled,
          ]}
          value={text}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={Colors.dark.text.tertiary}
          editable={!disabled && !isRecording}
          maxLength={maxLength}
          multiline
          numberOfLines={1}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />

        {/* Voice button (optional) */}
        {showVoiceButton && (
          <View style={styles.voiceButtonContainer}>
            {/* Glow effect for recording */}
            <Animated.View style={[styles.voiceGlow, voiceGlowAnimatedStyle]} />

            <AnimatedTouchable
              style={[styles.voiceButton, voiceButtonAnimatedStyle]}
              onPressIn={handleVoicePressIn}
              onPressOut={handleVoicePressOut}
              disabled={disabled || isLoading}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? 'mic' : 'mic-outline'}
                size={22}
                color={isRecording ? Colors.primary.teal : Colors.dark.text.secondary}
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
                ? [Colors.primary.teal, Colors.primary.tealDark]
                : [Colors.dark.elevated, Colors.dark.surface]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendButton}
          >
            {isLoading ? (
              <Ionicons
                name="hourglass-outline"
                size={20}
                color={Colors.dark.text.primary}
              />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={Colors.dark.text.primary}
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
    backgroundColor: Colors.dark.background,
    // Safe area for bottom notch
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.effects.glassDark,
    borderRadius: Layout.radiusXLarge,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 52,
    maxHeight: 120,
    paddingLeft: Spacing.base,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
    fontSize: FontSize.base,
    fontFamily: FontFamily.primary,
    color: Colors.dark.text.primary,
    maxHeight: 100,
    lineHeight: 22,
  },
  inputDisabled: {
    color: Colors.dark.text.tertiary,
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
    backgroundColor: Colors.primary.teal,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.elevated,
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
