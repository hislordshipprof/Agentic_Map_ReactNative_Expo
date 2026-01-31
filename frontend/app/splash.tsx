/**
 * Splash Screen - Animated brand reveal
 *
 * Logo scale + fade, teal gradient, auto-navigate after 2s.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '@/theme';

export default function SplashScreenPage() {
  const router = useRouter();
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo animation
    scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 600 });
    textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    // Navigate after 2 seconds
    const timer = setTimeout(() => {
      router.replace('/');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F0FDFA', '#CCFBF1']}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <View style={styles.iconCircle}>
          <Ionicons name="navigate" size={48} color="#14B8A6" />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.appName}>Agentic Map</Text>
        <Text style={styles.tagline}>Your AI-powered navigator</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: '#1A2332',
  },
  tagline: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: '#6B7280',
    marginTop: 4,
  },
});
