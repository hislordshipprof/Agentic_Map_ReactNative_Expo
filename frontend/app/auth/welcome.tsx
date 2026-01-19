/**
 * WelcomeAuthScreen - Initial authentication screen
 *
 * Cinematic dark glassmorphism design with:
 * - Animated gradient orbs background
 * - Social login buttons (Google, Apple)
 * - Phone authentication option
 * - Skip option for anonymous mode
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { signIn, initializeAuth } from '@/redux/slices/authSlice';
import {
  Colors,
  ColorUtils,
  FontFamily,
  FontSize,
  Spacing,
  Layout,
  BorderRadius,
} from '@/theme';

/** Floating gradient orb for ambient background effect */
function FloatingOrb({
  delay = 0,
  size = 200,
  color = Colors.primary.teal,
  startX = 0,
  startY = 0,
}: {
  delay?: number;
  size?: number;
  color?: string;
  startX?: number;
  startY?: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 8000 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 8000 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 0.5, 1], [startX, startX + 30, startX]) },
      { translateY: interpolate(progress.value, [0, 0.5, 1], [startY, startY - 40, startY]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.1, 1]) },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.3, 0.5, 0.3]),
  }));

  return (
    <Animated.View style={[styles.orb, { width: size, height: size }, animatedStyle]}>
      <LinearGradient
        colors={[ColorUtils.withAlpha(color, 0.4), ColorUtils.withAlpha(color, 0)]}
        style={styles.orbGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  );
}

/** Social auth button component */
function AuthButton({
  icon,
  label,
  onPress,
  variant = 'default',
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'dark';
  disabled?: boolean;
}) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.authButtonPrimary;
      case 'dark':
        return styles.authButtonDark;
      default:
        return styles.authButtonDefault;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return Colors.dark.text.primary;
      case 'dark':
        return Colors.dark.text.primary;
      default:
        return Colors.dark.text.primary;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.authButton,
        getButtonStyle(),
        pressed && styles.authButtonPressed,
        disabled && styles.authButtonDisabled,
      ]}
    >
      <Ionicons name={icon} size={22} color={getIconColor()} />
      <Text style={[styles.authButtonText, variant === 'dark' && styles.authButtonTextDark]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function WelcomeAuthScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  // Pulsing animation for logo
  const logoScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const handleGoogleSignIn = async () => {
    // TODO: Implement Google Sign-In with expo-auth-session
    dispatch(signIn('google'));
    router.replace('/(tabs)');
  };

  const handleAppleSignIn = async () => {
    // TODO: Implement Apple Sign-In
    dispatch(signIn('apple'));
    router.replace('/(tabs)');
  };

  const handlePhoneSignIn = () => {
    router.push('/auth/phone');
  };

  const handleSkip = async () => {
    await dispatch(initializeAuth());
    router.replace('/(tabs)');
  };

  const handleTerms = () => {
    Linking.openURL('https://agenticmap.com/terms');
  };

  const handlePrivacy = () => {
    Linking.openURL('https://agenticmap.com/privacy');
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[Colors.dark.background, Colors.dark.gradientMid, Colors.dark.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating ambient orbs */}
      <View style={styles.orbsContainer}>
        <FloatingOrb delay={0} size={280} color={Colors.primary.teal} startX={-80} startY={-50} />
        <FloatingOrb delay={2000} size={200} color={Colors.primary.emerald} startX={150} startY={400} />
        <FloatingOrb delay={4000} size={160} color={Colors.primary.tealLight} startX={-40} startY={600} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Logo Section */}
          <Animated.View
            entering={FadeIn.duration(600)}
            style={styles.logoSection}
          >
            <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
              <LinearGradient
                colors={[Colors.primary.teal, Colors.primary.tealDark]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="navigate" size={40} color={Colors.dark.text.primary} />
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          {/* Welcome Text */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            style={styles.textSection}
          >
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.appName}>Agentic Map</Text>
            <Text style={styles.tagline}>
              Navigate smarter with AI-powered{'\n'}multi-stop route planning
            </Text>
          </Animated.View>

          {/* Auth Buttons */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(400)}
            style={styles.authSection}
          >
            {/* Google Sign In */}
            <AuthButton
              icon="logo-google"
              label="Continue with Google"
              onPress={handleGoogleSignIn}
              variant="default"
              disabled={isLoading}
            />

            {/* Apple Sign In (iOS only) */}
            {Platform.OS === 'ios' && (
              <AuthButton
                icon="logo-apple"
                label="Continue with Apple"
                onPress={handleAppleSignIn}
                variant="dark"
                disabled={isLoading}
              />
            )}

            {/* Phone Sign In */}
            <AuthButton
              icon="phone-portrait-outline"
              label="Continue with Phone"
              onPress={handlePhoneSignIn}
              variant="primary"
              disabled={isLoading}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Skip Button */}
            <Pressable
              onPress={handleSkip}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.skipButtonPressed,
              ]}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.dark.text.secondary} />
            </Pressable>
          </Animated.View>

          {/* Footer - Terms & Privacy */}
          <Animated.View
            entering={FadeIn.duration(400).delay(600)}
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
            </Text>
            <View style={styles.footerLinks}>
              <Pressable onPress={handleTerms}>
                <Text style={styles.footerLink}>Terms of Service</Text>
              </Pressable>
              <Text style={styles.footerText}> and </Text>
              <Pressable onPress={handlePrivacy}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  orbsContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 1000,
  },
  orbGradient: {
    flex: 1,
    borderRadius: 1000,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    overflow: 'hidden',
    // Glow effect
    shadowColor: Colors.primary.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  welcomeText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '400',
    color: Colors.dark.text.secondary,
    marginBottom: Spacing.xs,
  },
  appName: {
    fontFamily: FontFamily.primary,
    fontSize: 36,
    fontWeight: '700',
    color: Colors.dark.text.primary,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  authSection: {
    gap: Spacing.md,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  authButtonDefault: {
    backgroundColor: Colors.effects.glassDark,
    borderColor: Colors.effects.glassDarkBorder,
  },
  authButtonPrimary: {
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15),
    borderColor: ColorUtils.withAlpha(Colors.primary.teal, 0.3),
  },
  authButtonDark: {
    backgroundColor: Colors.dark.text.primary,
    borderColor: Colors.dark.text.primary,
  },
  authButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  authButtonDisabled: {
    opacity: 0.5,
  },
  authButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  authButtonTextDark: {
    color: Colors.dark.background,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.effects.glassDarkBorder,
  },
  dividerText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  footerText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerLink: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.primary.tealLight,
    textDecorationLine: 'underline',
  },
});
