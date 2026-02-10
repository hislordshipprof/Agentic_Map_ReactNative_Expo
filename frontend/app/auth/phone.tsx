/**
 * PhoneAuthScreen - Phone number OTP authentication
 *
 * Features:
 * - Phone number input with country code
 * - OTP verification with 6-digit code
 * - Countdown timer for resend
 * - Animated transitions between states
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { signUp } from '@/redux/slices/authSlice';
import {
  Colors,
  ColorUtils,
  FontFamily,
  FontSize,
  Spacing,
  Layout,
  BorderRadius,
} from '@/theme';

type AuthStep = 'phone' | 'otp';

const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
];

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function PhoneAuthScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  // State
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for OTP inputs
  const otpInputRefs = useRef<(TextInput | null)[]>([]);

  // Animation values
  const phoneInputFocus = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // Resend timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Phone input animation
  const phoneInputStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      phoneInputFocus.value,
      [0, 1],
      [Colors.effects.glassDarkBorder, Colors.primary.teal]
    ),
    shadowOpacity: withTiming(phoneInputFocus.value * 0.3),
  }));

  const handlePhoneInputFocus = () => {
    phoneInputFocus.value = withSpring(1);
  };

  const handlePhoneInputBlur = () => {
    phoneInputFocus.value = withSpring(0);
  };

  // Format phone number as user types
  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    // Format: XXX-XXX-XXXX for US
    if (selectedCountry.code === '+1') {
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
    return cleaned;
  };

  const handlePhoneChange = (text: string) => {
    setError(null);
    setPhoneNumber(formatPhoneNumber(text));
  };

  const handleSendCode = async () => {
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    Keyboard.dismiss();
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    // TODO: Call backend to send OTP
    // For now, simulate sending
    setStep('otp');
    setResendTimer(RESEND_COOLDOWN);

    // Focus first OTP input after transition
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 300);
  };

  const handleOtpChange = (value: string, index: number) => {
    setError(null);
    const newOtp = [...otp];

    // Handle paste (multiple digits)
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, OTP_LENGTH);
      digits.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setError('Please enter the complete verification code');
      return;
    }

    Keyboard.dismiss();
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    // TODO: Verify OTP with backend
    // For now, simulate verification
    try {
      await dispatch(signUp({
        provider: 'phone',
        phoneNumber: `${selectedCountry.code}${phoneNumber.replace(/\D/g, '')}`,
      }));
      router.push('/auth/profile-setup');
    } catch (err) {
      setError('Invalid verification code. Please try again.');
    }
  };

  const handleResendCode = () => {
    if (resendTimer > 0) return;

    // TODO: Resend OTP
    setOtp(Array(OTP_LENGTH).fill(''));
    setResendTimer(RESEND_COOLDOWN);
    otpInputRefs.current[0]?.focus();
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp(Array(OTP_LENGTH).fill(''));
      setError(null);
    } else {
      router.back();
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const isPhoneValid = phoneNumber.replace(/\D/g, '').length >= 10;
  const isOtpComplete = otp.every((digit) => digit !== '');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.dark.background, Colors.dark.gradientMid, Colors.dark.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text.primary} />
            </Pressable>
          </Animated.View>

          {/* Content */}
          <View style={styles.content}>
            {step === 'phone' ? (
              <Animated.View
                key="phone-step"
                entering={SlideInRight.duration(300)}
                exiting={SlideOutLeft.duration(300)}
                style={styles.stepContent}
              >
                {/* Icon */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.iconContainer}>
                  <LinearGradient
                    colors={[ColorUtils.withAlpha(Colors.primary.teal, 0.2), ColorUtils.withAlpha(Colors.primary.teal, 0.05)]}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="phone-portrait-outline" size={36} color={Colors.primary.teal} />
                  </LinearGradient>
                </Animated.View>

                {/* Title */}
                <Animated.Text entering={FadeInDown.duration(400).delay(100)} style={styles.title}>
                  Enter your phone number
                </Animated.Text>
                <Animated.Text entering={FadeInDown.duration(400).delay(150)} style={styles.subtitle}>
                  We'll send you a verification code
                </Animated.Text>

                {/* Phone Input */}
                <Animated.View
                  entering={FadeInUp.duration(400).delay(200)}
                  style={styles.phoneInputContainer}
                >
                  {/* Country Code Selector */}
                  <Pressable
                    onPress={() => setShowCountryPicker(!showCountryPicker)}
                    style={styles.countrySelector}
                  >
                    <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                    <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                    <Ionicons
                      name={showCountryPicker ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={Colors.dark.text.secondary}
                    />
                  </Pressable>

                  {/* Phone Input */}
                  <Animated.View style={[styles.phoneInputWrapper, phoneInputStyle]}>
                    <TextInput
                      style={styles.phoneInput}
                      value={phoneNumber}
                      onChangeText={handlePhoneChange}
                      onFocus={handlePhoneInputFocus}
                      onBlur={handlePhoneInputBlur}
                      placeholder="Phone number"
                      placeholderTextColor={Colors.dark.text.tertiary}
                      keyboardType="phone-pad"
                      maxLength={14}
                      autoFocus
                    />
                  </Animated.View>
                </Animated.View>

                {/* Country Picker Dropdown */}
                {showCountryPicker && (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.countryPicker}>
                    {COUNTRY_CODES.map((country) => (
                      <Pressable
                        key={country.code}
                        onPress={() => {
                          setSelectedCountry(country);
                          setShowCountryPicker(false);
                        }}
                        style={({ pressed }) => [
                          styles.countryOption,
                          pressed && styles.countryOptionPressed,
                          selectedCountry.code === country.code && styles.countryOptionSelected,
                        ]}
                      >
                        <Text style={styles.countryFlag}>{country.flag}</Text>
                        <Text style={styles.countryName}>{country.country}</Text>
                        <Text style={styles.countryCodeOption}>{country.code}</Text>
                      </Pressable>
                    ))}
                  </Animated.View>
                )}

                {/* Error */}
                {error && (
                  <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
                    {error}
                  </Animated.Text>
                )}

                {/* Send Code Button */}
                <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.buttonContainer}>
                  <Pressable
                    onPress={handleSendCode}
                    disabled={!isPhoneValid || isLoading}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (!isPhoneValid || isLoading) && styles.primaryButtonDisabled,
                      pressed && styles.primaryButtonPressed,
                    ]}
                  >
                    <Animated.View style={[styles.primaryButtonInner, buttonAnimatedStyle]}>
                      <LinearGradient
                        colors={[Colors.primary.teal, Colors.primary.tealDark]}
                        style={styles.primaryButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.primaryButtonText}>Send Code</Text>
                        <Ionicons name="arrow-forward" size={20} color={Colors.dark.text.primary} />
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            ) : (
              <Animated.View
                key="otp-step"
                entering={SlideInRight.duration(300)}
                exiting={SlideOutLeft.duration(300)}
                style={styles.stepContent}
              >
                {/* Icon */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.iconContainer}>
                  <LinearGradient
                    colors={[ColorUtils.withAlpha(Colors.primary.teal, 0.2), ColorUtils.withAlpha(Colors.primary.teal, 0.05)]}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="shield-checkmark-outline" size={36} color={Colors.primary.teal} />
                  </LinearGradient>
                </Animated.View>

                {/* Title */}
                <Animated.Text entering={FadeInDown.duration(400).delay(100)} style={styles.title}>
                  Verify your number
                </Animated.Text>
                <Animated.Text entering={FadeInDown.duration(400).delay(150)} style={styles.subtitle}>
                  Enter the 6-digit code sent to{'\n'}
                  <Text style={styles.phoneHighlight}>
                    {selectedCountry.code} {phoneNumber}
                  </Text>
                </Animated.Text>

                {/* OTP Input */}
                <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.otpContainer}>
                  {Array(OTP_LENGTH).fill(0).map((_, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (otpInputRefs.current[index] = ref)}
                      style={[
                        styles.otpInput,
                        otp[index] && styles.otpInputFilled,
                        error && styles.otpInputError,
                      ]}
                      value={otp[index]}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </Animated.View>

                {/* Error */}
                {error && (
                  <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
                    {error}
                  </Animated.Text>
                )}

                {/* Resend */}
                <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.resendContainer}>
                  {resendTimer > 0 ? (
                    <Text style={styles.resendTimerText}>
                      Resend code in {resendTimer}s
                    </Text>
                  ) : (
                    <Pressable onPress={handleResendCode}>
                      <Text style={styles.resendLink}>Resend code</Text>
                    </Pressable>
                  )}
                </Animated.View>

                {/* Verify Button */}
                <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.buttonContainer}>
                  <Pressable
                    onPress={handleVerify}
                    disabled={!isOtpComplete || isLoading}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (!isOtpComplete || isLoading) && styles.primaryButtonDisabled,
                      pressed && styles.primaryButtonPressed,
                    ]}
                  >
                    <Animated.View style={[styles.primaryButtonInner, buttonAnimatedStyle]}>
                      <LinearGradient
                        colors={[Colors.primary.teal, Colors.primary.tealDark]}
                        style={styles.primaryButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.primaryButtonText}>Verify</Text>
                        <Ionicons name="checkmark" size={20} color={Colors.dark.text.primary} />
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.effects.glassDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.dark.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  phoneHighlight: {
    color: Colors.primary.tealLight,
    fontWeight: '600',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    marginBottom: Spacing.md,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  phoneInputWrapper: {
    flex: 1,
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.primary.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 0,
  },
  phoneInput: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    color: Colors.dark.text.primary,
    paddingHorizontal: Spacing.lg,
    height: 56,
  },
  countryPicker: {
    position: 'absolute',
    top: 220,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.elevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    padding: Spacing.sm,
    zIndex: 100,
    maxHeight: 250,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  countryOptionPressed: {
    backgroundColor: Colors.effects.glassDark,
  },
  countryOptionSelected: {
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15),
  },
  countryName: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.primary,
  },
  countryCodeOption: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderRadius: BorderRadius.md,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.dark.text.primary,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: Colors.primary.teal,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.1),
  },
  otpInputError: {
    borderColor: Colors.semantic.error,
  },
  resendContainer: {
    marginBottom: Spacing.xl,
  },
  resendTimerText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
  },
  resendLink: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.primary.tealLight,
    fontWeight: '600',
  },
  errorText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.semantic.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: Spacing['2xl'],
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonInner: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
  },
  primaryButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
});
