/**
 * Splash Screen — Animated brand reveal
 *
 * Pastel gradient background (white → lavender → soft pink).
 * Core beacon uses the pink → lavender CTA gradient from the design system.
 * Concentric rings pulse outward, orbiting accent dots add depth.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, LetterSpacing } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const EASE_SMOOTH = Easing.inOut(Easing.quad);

// ─── Color palette (matching app design: pink/lavender CTA gradient) ─
const C = {
  // Background (pastelScreen from palettes.ts)
  bgTop: '#FAFBFD',
  bgMid: '#F5F0F8',
  bgPink: '#F8E8F0',
  bgBottom: '#FCE8EE',
  // CTA gradient (same as "Start Talking" / "Skip" buttons)
  ctaPink: '#FFB8C9',
  ctaLavender: '#E8D4F8',
  // Accent dots
  dotPink: '#FFB8C9',
  dotLavender: '#C4B5FD',
  dotBlue: '#4A9FF5',
  // Rings (soft pink tones)
  ringPink: 'rgba(255, 184, 201, 0.25)',
  ringPinkFaint: 'rgba(255, 184, 201, 0.12)',
  // Glow
  glowPink: 'rgba(255, 184, 201, 0.20)',
  // Text
  textDark: '#1A2332',
  textMuted: '#6B7280',
  // Accent line (blended pink)
  accentPink: '#E8A0B8',
} as const;

// ─── Sizes ──────────────────────────────────────────────────────────
const CORE_SIZE = 88;
const RING_1 = 140;
const RING_2 = 200;
const RING_3 = 272;

// ─── Orbiting dots ──────────────────────────────────────────────────
const ORBIT_DOTS = [
  { angle: 40, r: RING_2 / 2 + 8, sz: 8, color: C.dotPink, delay: 0 },
  { angle: 150, r: RING_3 / 2 - 6, sz: 6, color: C.dotLavender, delay: 100 },
  { angle: 250, r: RING_1 / 2 + 18, sz: 7, color: C.dotBlue, delay: 200 },
  { angle: 320, r: RING_3 / 2 + 4, sz: 5, color: C.dotPink, delay: 300 },
] as const;

// ─── Animated ring ──────────────────────────────────────────────────
function PulseRing({ size, borderColor, delay }: { size: number; borderColor: string; delay: number }) {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 80 }));
    pulse.value = withDelay(
      delay + 600,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 2400, easing: EASE_SMOOTH }),
          withTiming(0.97, { duration: 2400, easing: EASE_SMOOTH }),
        ),
        -1, true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value * pulse.value }],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.3, 1]),
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor },
        style,
      ]}
    />
  );
}

// ─── Orbiting dot ───────────────────────────────────────────────────
function OrbitDot({ angle, r, sz, color, delay }: { angle: number; r: number; sz: number; color: string; delay: number }) {
  const progress = useSharedValue(0);
  const glow = useSharedValue(0.5);
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * r;
  const y = Math.sin(rad) * r;

  useEffect(() => {
    progress.value = withDelay(500 + delay, withSpring(1, { damping: 14, stiffness: 100 }));
    glow.value = withDelay(
      800 + delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: EASE_SMOOTH }),
          withTiming(0.3, { duration: 2000, easing: EASE_SMOOTH }),
        ),
        -1, true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value * glow.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute', width: sz, height: sz, borderRadius: sz / 2,
          backgroundColor: color, left: x - sz / 2, top: y - sz / 2,
          shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: sz * 2,
        },
        style,
      ]}
    />
  );
}

// ─── Main splash ────────────────────────────────────────────────────
export default function SplashScreenPage() {
  const router = useRouter();

  const coreScale = useSharedValue(0.3);
  const coreOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const nameOpacity = useSharedValue(0);
  const nameY = useSharedValue(14);
  const taglineOpacity = useSharedValue(0);
  const lineWidth = useSharedValue(0);

  useEffect(() => {
    coreScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    coreOpacity.value = withTiming(1, { duration: 500 });

    glowScale.value = withDelay(200, withSpring(1, { damping: 20, stiffness: 60 }));
    glowOpacity.value = withDelay(200, withTiming(0.5, { duration: 800 }));
    glowScale.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 2200, easing: EASE_SMOOTH }),
          withTiming(0.92, { duration: 2200, easing: EASE_SMOOTH }),
        ),
        -1, true,
      ),
    );

    nameOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    nameY.value = withDelay(600, withSpring(0, { damping: 14, stiffness: 100 }));
    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    lineWidth.value = withDelay(
      1100,
      withTiming(56, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );

    // Resolve destination while animation plays
    let dest: '/(tabs)' | '/onboarding/welcome' | '/auth/welcome' = '/(tabs)';
    const resolveRoute = async () => {
      try {
        const [onboarding, user] = await Promise.all([
          AsyncStorage.getItem('@agentic_map:onboarding_complete'),
          AsyncStorage.getItem('@agentic_map:user'),
        ]);
        if (onboarding !== 'true') dest = '/onboarding/welcome';
        else if (user === null) dest = '/auth/welcome';
      } catch {
        dest = '/onboarding/welcome';
      }
    };
    resolveRoute();

    const timer = setTimeout(() => router.replace(dest), 2500);
    return () => clearTimeout(timer);
  }, []);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
    opacity: coreOpacity.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));
  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
  }));

  return (
    <LinearGradient
      colors={[C.bgTop, C.bgMid, C.bgPink, C.bgBottom]}
      locations={[0, 0.4, 0.7, 1]}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {/* Ambient pink glow */}
      <View style={styles.ambientGlow} />

      {/* Logo assembly */}
      <View style={styles.logoAssembly}>
        <PulseRing size={RING_3} borderColor={C.ringPinkFaint} delay={350} />
        <PulseRing size={RING_2} borderColor={C.ringPink} delay={200} />
        <PulseRing size={RING_1} borderColor={C.ringPink} delay={100} />

        {ORBIT_DOTS.map((dot, i) => (
          <OrbitDot key={i} {...dot} />
        ))}

        {/* Glow halo */}
        <Animated.View style={[styles.glowHalo, glowStyle]} />

        {/* Core beacon — pink → lavender gradient (matches CTA buttons) */}
        <Animated.View style={[styles.coreOuter, coreStyle]}>
          <LinearGradient
            colors={[C.ctaPink, C.ctaLavender]}
            style={styles.coreGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="navigate" size={36} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Typography */}
      <View style={styles.textBlock}>
        <Animated.Text style={[styles.appName, nameStyle]}>
          Agentic Map
        </Animated.Text>
        <Animated.View style={[styles.accentLine, lineStyle]} />
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Your AI-powered navigator
        </Animated.Text>
      </View>
    </LinearGradient>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    top: '22%',
    width: SCREEN_W * 0.8,
    height: SCREEN_W * 0.8,
    borderRadius: SCREEN_W * 0.4,
    backgroundColor: C.glowPink,
  },
  logoAssembly: {
    width: RING_3 + 40,
    height: RING_3 + 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  glowHalo: {
    position: 'absolute',
    width: RING_1 + 24,
    height: RING_1 + 24,
    borderRadius: (RING_1 + 24) / 2,
    backgroundColor: 'rgba(255, 184, 201, 0.18)',
  },
  coreOuter: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    shadowColor: C.ctaPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  coreGradient: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    alignItems: 'center',
  },
  appName: {
    fontFamily: FontFamily.primary,
    fontSize: 30,
    fontWeight: '700',
    color: C.textDark,
    letterSpacing: LetterSpacing.tight,
  },
  accentLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: C.accentPink,
    marginVertical: 10,
  },
  tagline: {
    fontFamily: FontFamily.primary,
    fontSize: 13,
    fontWeight: '500',
    color: C.textMuted,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
});
