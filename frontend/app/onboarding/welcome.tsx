/**
 * Onboarding 1: Ask Anything - AI assistant branding, light theme.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Spacing, Layout } from '@/theme';
import { Skip, PaginationDots, OnboardingCta, OnboardingProgressBar, PulsatingRings } from '@/components/Onboarding';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';

export default function WelcomeScreen() {
  const router = useRouter();

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
          {/* AI character area */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.ringsWrap}>
            <PulsatingRings size={140}>
              <View style={styles.chatIconWrap}>
                <Ionicons name="chatbubble-outline" size={56} color="#14B8A6" />
              </View>
            </PulsatingRings>
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(400).delay(100)} style={styles.title}>
            Ask Anything.
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(400).delay(160)} style={styles.titleAccent}>
            Get Answers Now.
          </Animated.Text>

          <Animated.Text entering={FadeInDown.duration(400).delay(220)} style={styles.subtitle}>
            Tell us your destination in plain English.{'\n'}No more tapping through menus.
          </Animated.Text>

          {/* Example card */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.exampleCard}>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleText} numberOfLines={2}>
                Take me home with stops at Starbucks and Walmart
              </Text>
              <View style={styles.micBtn}>
                <Ionicons name="mic-outline" size={22} color="#14B8A6" />
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeIn.duration(300).delay(400)} style={styles.footer}>
          <OnboardingProgressBar step={1} />
          <View style={styles.footerRow}>
            <PaginationDots activeStep={1} />
            <OnboardingCta label="Next" onPress={() => router.push('/onboarding/features')} />
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
  ringsWrap: {
    marginBottom: Spacing.xl,
  },
  chatIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
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
    marginBottom: Spacing['2xl'],
  },
  exampleCard: {
    width: '100%',
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Layout.radiusLarge,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  exampleText: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '500',
    color: '#1A2332',
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
