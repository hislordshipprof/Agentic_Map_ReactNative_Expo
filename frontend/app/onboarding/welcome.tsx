/** Onboarding 1: Just Say Where – voice/plain-English input, no menus. */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  ColorUtils,
  FontFamily,
  FontSize,
  Spacing,
  Layout,
} from '@/theme';
import { Skip, PaginationDots, OnboardingCta, PulsatingRings } from '@/components/Onboarding';
import { ActionChip, ActionChipGroup } from '@/components/Common';

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
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.ringsWrap}
          >
            <PulsatingRings size={140}>
              <View style={styles.chatIconWrap}>
                <Ionicons name="chatbubble-outline" size={56} color={Colors.primary.teal} />
              </View>
            </PulsatingRings>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.title}
          >
            Just Say Where
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.duration(400).delay(180)}
            style={styles.subtitleRow}
          >
            <View style={styles.subtitleBlock}>
              <Text style={styles.subtitle}>Tell us your destination in plain English</Text>
              <Text style={styles.subtitle}>No more tapping through menus.</Text>
            </View>
            <View style={styles.locationPinWrap}>
              <Pressable style={({ pressed }) => [styles.locationPin, pressed && styles.locationPinPressed]}>
                <Ionicons name="location-outline" size={20} color={Colors.primary.teal} />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(400).delay(260)}
            style={styles.exampleCard}
          >
            <Text style={styles.exampleText} numberOfLines={2}>
              Take me home with stops at Starbucks and Walmart
            </Text>
            <Pressable style={({ pressed }) => [styles.micBtn, pressed && styles.micBtnPressed]}>
              <Ionicons name="mic-outline" size={22} color={Colors.primary.teal} />
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(350).delay(340)}>
            <ActionChipGroup direction="horizontal" wrap gap={Spacing.sm}>
              <ActionChip label="Home" onPress={() => {}} variant="suggested" />
              <ActionChip label="Work" onPress={() => {}} variant="suggested" />
              <ActionChip label="Grocery store" onPress={() => {}} variant="suggested" />
            </ActionChipGroup>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeIn.duration(300).delay(400)} style={styles.footer}>
          <PaginationDots activeStep={1} />
          <OnboardingCta label="Next" onPress={() => router.push('/onboarding/features')} />
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
  ringsWrap: {
    marginBottom: Spacing.xl,
  },
  chatIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.2),
    justifyContent: 'center',
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
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.sm,
  },
  subtitleBlock: {
    flex: 1,
  },
  subtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  locationPinWrap: {
    marginLeft: Spacing.sm,
  },
  locationPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPinPressed: {
    opacity: 0.8,
  },
  exampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderRadius: Layout.radiusLarge,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  exampleText: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '500',
    color: Colors.dark.text.primary,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtnPressed: {
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingTop: Spacing.base,
  },
});
