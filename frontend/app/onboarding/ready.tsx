/** Onboarding 3: Navigate with Ease – journey at a glance, Get Started. */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  FontSize,
  Spacing,
  Layout,
} from '@/theme';
import { Skip, PaginationDots, OnboardingCta, OnboardingProgressBar, RouteGridCard } from '@/components/Onboarding';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';

export default function ReadyScreen() {
  const router = useRouter();

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
    router.replace('/(tabs)');
  };

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
          <Animated.Text
            entering={FadeInDown.duration(400).delay(60)}
            style={styles.title}
          >
            Navigate with Ease
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.duration(400).delay(140)}
            style={styles.subtitle}
          >
            See your entire journey at a glance.{'\n'}Every stop, perfectly planned.
          </Animated.Text>

          <RouteGridCard />

          <Animated.View
            entering={SlideInUp.springify().damping(18).stiffness(120).delay(400)}
            style={styles.journeyCard}
          >
            <View style={styles.journeyLeft}>
              <Ionicons name="navigate" size={24} color={Colors.primary.teal} style={styles.journeyIcon} />
              <View>
                <Text style={styles.journeyTitle}>Your Journey</Text>
                <View style={styles.journeyMeta}>
                  <Ionicons name="time-outline" size={14} color={Colors.dark.text.secondary} />
                  <Text style={styles.journeyMetaText}>22 min</Text>
                </View>
                <Text style={styles.journeyMetaText}>4 stops • miles</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeIn.duration(300).delay(480)} style={styles.footer}>
          <OnboardingProgressBar step={3} />
          <View style={styles.footerRow}>
            <PaginationDots activeStep={3} />
            <OnboardingCta label="Get Started" onPress={handleGetStarted} />
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
    marginBottom: Spacing.xl,
  },
  journeyCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderRadius: Layout.radiusLarge,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  journeyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  journeyIcon: {
    marginRight: Spacing.xs,
  },
  journeyTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
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
    color: Colors.dark.text.secondary,
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
