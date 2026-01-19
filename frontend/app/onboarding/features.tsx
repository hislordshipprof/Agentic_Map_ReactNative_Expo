/** Onboarding 2: Optimized Stops – best locations on your route, less detour, time saved. */

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
import {
  Colors,
  FontFamily,
  FontSize,
  Spacing,
  Layout,
} from '@/theme';
import { Skip, PaginationDots, OnboardingCta, OnboardingProgressBar, RouteDiagram } from '@/components/Onboarding';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';
const PROGRESS_WIDTH = 200;
const OPTIMIZED_RATIO = 33 / 45;

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
          <Animated.View
            entering={FadeInDown.duration(350).delay(80)}
            style={styles.badge}
          >
            <Ionicons name="flash" size={14} color="#FFF" />
            <Text style={styles.badgeText}>Smart Optimization</Text>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.duration(400).delay(140)}
            style={styles.title}
          >
            Optimized Stops
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.duration(400).delay(220)}
            style={styles.subtitle}
          >
            We find the best locations on your route.{'\n'}Less detours, more time saved.
          </Animated.Text>

          <RouteDiagram />

          <Animated.View
            entering={FadeInUp.duration(400).delay(380)}
            style={styles.optimizedCard}
          >
            <View style={styles.optimizedRow1}>
              <View style={styles.optimizedLeft}>
                <Ionicons name="flash" size={18} color={Colors.semantic.success} />
                <Text style={styles.optimizedTitle}>Route Optimized</Text>
              </View>
              <Text style={styles.savedText}>-12 min</Text>
            </View>
            <Text style={styles.optimizedMeta}>3 stops • Minimal detour</Text>
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
    backgroundColor: Colors.dark.background,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.semantic.success,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radiusFull,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  badgeText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#FFF',
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    color: Colors.dark.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  subtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  optimizedCard: {
    width: '100%',
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
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
    color: Colors.dark.text.primary,
  },
  savedText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.semantic.success,
  },
  optimizedMeta: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
    marginBottom: Spacing.md,
  },
  progressWrap: {
    gap: Spacing.xs,
  },
  progressBg: {
    height: 20,
    width: PROGRESS_WIDTH,
    backgroundColor: Colors.dark.elevated,
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
    backgroundColor: Colors.semantic.success,
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  progressLabelGreen: {
    position: 'absolute',
    left: Spacing.sm,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#FFF',
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
