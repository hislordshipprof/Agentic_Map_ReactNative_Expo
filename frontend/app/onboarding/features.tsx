/**
 * Onboarding 2: Everything You Need - Chat bubble icons, light theme.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Spacing, Layout } from '@/theme';
import { Skip, PaginationDots, OnboardingCta, OnboardingProgressBar } from '@/components/Onboarding';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';
const PROGRESS_WIDTH = 200;
const OPTIMIZED_RATIO = 33 / 45;

const FEATURES = [
  { icon: 'mic-outline' as const, label: 'Voice Commands', color: '#14B8A6' },
  { icon: 'git-branch-outline' as const, label: 'Multi-Stop Routes', color: '#7C3AED' },
  { icon: 'flash-outline' as const, label: 'Smart Optimization', color: '#F59E0B' },
  { icon: 'navigate-outline' as const, label: 'Turn-by-Turn Nav', color: '#3B82F6' },
];

export default function FeaturesScreen() {
  const router = useRouter();
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withDelay(
      500,
      withTiming(PROGRESS_WIDTH * OPTIMIZED_RATIO, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, []);

  const animatedBar = useAnimatedStyle(() => ({
    width: barWidth.value,
  }));

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Skip onPress={handleSkip} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.Text entering={FadeInDown.duration(400).delay(80)} style={styles.title}>
            Everything You Need
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(400).delay(140)} style={styles.titleAccent}>
            All In One Place
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(400).delay(200)} style={styles.subtitle}>
            We find the best locations on your route.{'\n'}Less detours, more time saved.
          </Animated.Text>

          {/* Feature badges */}
          <Animated.View entering={FadeInUp.duration(400).delay(280)} style={styles.featuresGrid}>
            {FEATURES.map((feat, i) => (
              <View key={feat.label} style={styles.featureBadge}>
                <View style={[styles.featureIconCircle, { backgroundColor: `${feat.color}15` }]}>
                  <Ionicons name={feat.icon} size={24} color={feat.color} />
                </View>
                <Text style={styles.featureLabel}>{feat.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Optimization card */}
          <Animated.View entering={FadeInUp.duration(400).delay(380)} style={styles.optimizedCard}>
            <View style={styles.optimizedRow1}>
              <View style={styles.optimizedLeft}>
                <Ionicons name="flash" size={18} color="#10B981" />
                <Text style={styles.optimizedTitle}>Route Optimized</Text>
              </View>
              <Text style={styles.savedText}>-12 min</Text>
            </View>
            <Text style={styles.optimizedMeta}>3 stops - Minimal detour</Text>
            <View style={styles.progressWrap}>
              <View style={styles.progressBg}>
                <Text style={styles.progressLabel}>Original: 45 min</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <Animated.View style={[styles.progressBar, animatedBar]} />
                <Text style={styles.progressLabelGreen}>Optimized: 33 min</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeIn.duration(300).delay(480)} style={styles.footer}>
          <OnboardingProgressBar step={2} />
          <View style={styles.footerRow}>
            <PaginationDots activeStep={2} />
            <OnboardingCta label="Next" onPress={() => router.push('/onboarding/ready')} />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  },
  titleAccent: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    color: '#14B8A6',
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
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.base,
    marginBottom: Spacing.xl,
  },
  featureBadge: {
    alignItems: 'center',
    width: 140,
    gap: Spacing.sm,
  },
  featureIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#1A2332',
    textAlign: 'center',
  },
  optimizedCard: {
    width: '100%',
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Layout.radiusLarge,
    padding: Spacing.lg,
  },
  optimizedRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  optimizedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optimizedTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#1A2332',
  },
  savedText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#10B981',
  },
  optimizedMeta: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: '#6B7280',
    marginBottom: Spacing.md,
  },
  progressWrap: {
    gap: Spacing.xs,
  },
  progressBg: {
    height: 20,
    width: PROGRESS_WIDTH,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  progressBarContainer: {
    height: 20,
    width: PROGRESS_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: '#9CA3AF',
  },
  progressLabelGreen: {
    position: 'absolute',
    left: Spacing.sm,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#FFFFFF',
  },
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
});
