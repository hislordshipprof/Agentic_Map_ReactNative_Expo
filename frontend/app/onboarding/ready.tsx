/**
 * Onboarding 3: Navigate with Ease
 * Animated journey timeline that builds itself, counting stats, shimmer CTA.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Spacing, Layout } from '@/theme';
import {
  Skip,
  PaginationDots,
  OnboardingCta,
  OnboardingProgressBar,
} from '@/components/Onboarding';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';

const STOPS: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  detour?: string;
  badge?: string;
  badgeColor?: string;
}[] = [
  { icon: 'location', label: 'Current Location', color: '#3B82F6', badge: 'Start', badgeColor: '#3B82F6' },
  { icon: 'cafe-outline', label: 'Starbucks', color: '#8B5CF6', detour: '+3 min detour' },
  { icon: 'cart-outline', label: 'Walmart', color: '#F59E0B', detour: '+5 min detour' },
  { icon: 'flag', label: 'Home', color: '#EC4899', badge: 'End', badgeColor: '#EC4899' },
];

/* ─── Counting stat with animated number ─── */

function CountingStat({
  target,
  suffix,
  label,
  delay,
  decimals = 0,
}: {
  target: number;
  suffix: string;
  label: string;
  delay: number;
  decimals?: number;
}) {
  const val = useSharedValue(0);
  const [display, setDisplay] = useState('0');

  const update = useCallback(
    (v: number) => setDisplay(decimals > 0 ? v.toFixed(decimals) : String(Math.round(v))),
    [decimals],
  );

  useAnimatedReaction(
    () => val.value,
    (v) => runOnJS(update)(v),
  );

  useEffect(() => {
    val.value = withDelay(
      delay,
      withTiming(target, { duration: 1200, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  return (
    <View style={styles.stat}>
      <Text style={styles.statNumber}>
        {display}
        <Text style={styles.statSuffix}>{suffix}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ─── Screen ─── */

export default function ReadyScreen() {
  const router = useRouter();
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withDelay(
      1400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.15 + glow.value * 0.3,
    shadowRadius: 6 + glow.value * 10,
  }));

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
    router.replace('/auth/welcome');
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
    router.replace('/auth/welcome');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Skip onPress={handleSkip} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.Text entering={FadeInDown.duration(400).delay(60)} style={styles.title}>
            Navigate with Ease
          </Animated.Text>

          <Animated.Text entering={FadeInDown.duration(400).delay(140)} style={styles.subtitle}>
            See your entire journey at a glance.{'\n'}Every stop, perfectly planned.
          </Animated.Text>

          {/* Counting stats */}
          <Animated.View entering={FadeInUp.duration(400).delay(220)} style={styles.statsRow}>
            <CountingStat target={22} suffix=" min" label="Total Time" delay={400} />
            <View style={styles.statDivider} />
            <CountingStat target={4} suffix="" label="Stops" delay={550} />
            <View style={styles.statDivider} />
            <CountingStat target={8.2} suffix=" mi" label="Distance" delay={700} decimals={1} />
          </Animated.View>

          {/* Journey timeline */}
          <Animated.View entering={FadeInUp.duration(400).delay(320)} style={styles.journeyCard}>
            {STOPS.map((stop, i) => (
              <Animated.View
                key={stop.label}
                entering={FadeInUp.duration(350).delay(500 + i * 180)}
                style={styles.stopRow}
              >
                <View style={styles.timelineCol}>
                  <View style={[styles.stopDot, { backgroundColor: stop.color }]}>
                    <Ionicons name={stop.icon} size={16} color="#FFF" />
                  </View>
                  {i < STOPS.length - 1 && (
                    <View style={[styles.connector, { backgroundColor: STOPS[i + 1].color + '40' }]} />
                  )}
                </View>

                <View style={styles.stopInfo}>
                  <Text style={styles.stopLabel}>{stop.label}</Text>
                  {stop.detour && <Text style={styles.stopDetour}>{stop.detour}</Text>}
                </View>

                {stop.badge && (
                  <View style={[styles.badge, { backgroundColor: stop.badgeColor + '15' }]}>
                    <Text style={[styles.badgeText, { color: stop.badgeColor }]}>{stop.badge}</Text>
                  </View>
                )}
              </Animated.View>
            ))}
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeIn.duration(300).delay(480)} style={styles.footer}>
          <OnboardingProgressBar step={3} />
          <View style={styles.footerRow}>
            <PaginationDots activeStep={3} />
            <Animated.View style={[styles.ctaGlow, glowStyle]}>
              <OnboardingCta label="Get Started" onPress={handleGetStarted} />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  inner: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    color: '#1A2332',
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  subtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Layout.radiusLarge,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: '#3B82F6',
  },
  statSuffix: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: '#6B7280',
  },
  statLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },

  /* Journey timeline */
  journeyCard: {
    width: '100%',
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Layout.radiusLarge,
    padding: Spacing.lg,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 48,
  },
  timelineCol: { width: 32, alignItems: 'center' },
  stopDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 16,
    borderRadius: 1,
  },
  stopInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    paddingBottom: Spacing.md,
  },
  stopLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#1A2332',
  },
  stopDetour: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: '#3B82F6',
    marginTop: 2,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'center',
  },
  badgeText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  /* Footer */
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingTop: Spacing.base,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaGlow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    borderRadius: Layout.radiusLarge,
  },
});
