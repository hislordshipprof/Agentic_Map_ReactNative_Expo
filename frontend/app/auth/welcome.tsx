/**
 * WelcomeAuthScreen - Initial authentication screen
 *
 * Design matching reference UI:
 * - Light background with cyan tint at top, soft pink at bottom
 * - Gradient buttons (pink-lavender → cyan) with shimmer animation
 * - Subtle floating orbs
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
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { signIn, initializeAuth } from '@/redux/slices/authSlice';
import { FontFamily, FontSize, Spacing } from '@/theme';

/** Subtle floating orb */
function FloatingOrb({
  delay = 0,
  size = 200,
  color = '#93C5FD',
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
        withTiming(1, { duration: 14000 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 14000 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 0.5, 1], [startX, startX + 15, startX]) },
      { translateY: interpolate(progress.value, [0, 0.5, 1], [startY, startY - 20, startY]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.06, 1]) },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.12, 0.2, 0.12]),
  }));

  return (
    <Animated.View style={[styles.orb, { width: size, height: size }, animatedStyle]}>
      <LinearGradient
        colors={[color + '35', color + '00']}
        style={styles.orbGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  );
}

/** Gradient button with shimmer animation */
function GradientButton({
  icon,
  label,
  onPress,
  disabled = false,
  delayMs = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  delayMs?: number;
}) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.3, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-150, 150]) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.gradientButtonWrap,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <LinearGradient
        colors={['#E8B4CB', '#D4BEE4', '#B8D4E8', '#A8E0E8']}
        locations={[0, 0.35, 0.7, 1]}
        style={styles.gradientButton}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      >
        <Ionicons name={icon} size={20} color="#4A4A5A" />
        <Text style={styles.gradientButtonText}>{label}</Text>

        {/* Shimmer overlay */}
        <Animated.View style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
}

export default function WelcomeAuthScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  // Gentle pulsing animation for logo
  const logoScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const handleGoogleSignIn = async () => {
    dispatch(signIn('google'));
    router.replace('/(tabs)');
  };

  const handleAppleSignIn = async () => {
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
      {/* Main background: white → soft pink */}
      <LinearGradient
        colors={['#FFFFFF', '#FAFBFC', '#F8F4F6', '#F8EEF2', '#FCE8EE']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Top cyan/mint gradient overlay */}
      <LinearGradient
        colors={['#E0F7FA', '#E8F5F7', 'transparent']}
        locations={[0, 0.4, 1]}
        style={styles.topGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Subtle ambient orbs */}
      <View style={styles.orbsContainer}>
        <FloatingOrb delay={0} size={300} color="#A5D8E6" startX={-100} startY={-80} />
        <FloatingOrb delay={2500} size={240} color="#C8B8E8" startX={180} startY={100} />
        <FloatingOrb delay={5000} size={200} color="#E8C8D8" startX={-60} startY={350} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View entering={FadeIn.duration(700)} style={styles.logoSection}>
            <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="navigate" size={44} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          {/* Welcome Text */}
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.textSection}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.appName}>Agentic Map</Text>
            <Text style={styles.tagline}>
              Navigate smarter with AI-powered{'\n'}multi-stop route planning
            </Text>
          </Animated.View>

          {/* Auth Buttons */}
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.authSection}>
            <GradientButton
              icon="logo-google"
              label="Continue with Google"
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              delayMs={0}
            />

            {Platform.OS === 'ios' && (
              <GradientButton
                icon="logo-apple"
                label="Continue with Apple"
                onPress={handleAppleSignIn}
                disabled={isLoading}
                delayMs={400}
              />
            )}

            <GradientButton
              icon="phone-portrait-outline"
              label="Continue with Phone"
              onPress={handlePhoneSignIn}
              disabled={isLoading}
              delayMs={800}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Skip */}
            <Pressable
              onPress={handleSkip}
              disabled={isLoading}
              style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
              <Ionicons name="arrow-forward" size={16} color="#6B7280" />
            </Pressable>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeIn.duration(500).delay(600)} style={styles.footer}>
            <Text style={styles.footerText}>By continuing, you agree to our </Text>
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
    backgroundColor: '#FFFFFF',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
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

  /* Logo */
  logoSection: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Text */
  textSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  welcomeText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '400',
    color: '#6B7280',
    marginBottom: 4,
  },
  appName: {
    fontFamily: FontFamily.primary,
    fontSize: 38,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },

  /* Auth buttons */
  authSection: {
    gap: 14,
  },
  gradientButtonWrap: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  gradientButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#3A3A4A',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  /* Divider */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  dividerText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: '#9CA3AF',
  },

  /* Skip */
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '500',
    color: '#6B7280',
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  footerText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: '#9CA3AF',
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
    color: '#60A5FA',
    textDecorationLine: 'underline',
  },
});
