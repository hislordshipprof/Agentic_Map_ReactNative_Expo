/**
 * Onboarding 3: Get Started - Full-width teal CTA, light theme.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Spacing, Layout } from '@/theme';
import { Skip, PaginationDots, OnboardingProgressBar } from '@/components/Onboarding';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';

export default function ReadyScreen() {
  const router = useRouter();

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

          {/* Journey preview card */}
          <Animated.View entering={SlideInUp.springify().damping(18).stiffness(120).delay(300)} style={styles.journeyCard}>
            <View style={styles.journeyLeft}>
              <View style={styles.journeyIconCircle}>
                <Ionicons name="navigate" size={24} color="#14B8A6" />
              </View>
              <View>
                <Text style={styles.journeyTitle}>Your Journey</Text>
                <View style={styles.journeyMeta}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={styles.journeyMetaText}>22 min</Text>
                </View>
                <Text style={styles.journeyMetaText}>4 stops - 8.2 miles</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeIn.duration(300).delay(480)} style={styles.footer}>
          <OnboardingProgressBar step={3} />
          <View style={styles.footerRow}>
            <PaginationDots activeStep={3} />
            <View style={{ flex: 1, marginLeft: Spacing.xl }}>
              <Pressable onPress={handleGetStarted} style={styles.ctaWrapper}>
                <LinearGradient
                  colors={['#14B8A6', '#0D9488']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
  journeyCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Layout.radiusLarge,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  journeyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  journeyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: '#1A2332',
  },
  journeyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  journeyMetaText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: '#6B7280',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingTop: Spacing.base,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaWrapper: {
    borderRadius: Layout.radiusLarge,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  ctaText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
