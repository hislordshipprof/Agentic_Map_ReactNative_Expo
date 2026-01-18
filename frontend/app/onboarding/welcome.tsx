/**
 * Onboarding Screen 1: Welcome
 * 
 * Introduces the app's core value proposition:
 * "Plan your journey in 1-2 conversational turns"
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, TextStyles, Spacing, Layout, TouchTarget } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={styles.content}
        entering={FadeInDown.duration(600).delay(200)}
      >
        {/* Icon/Illustration placeholder */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🗺️</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Say Where You Want to Go</Text>

        {/* Description */}
        <Text style={styles.description}>
          Skip the manual steps. Just tell us your destination and we'll handle the rest.
        </Text>

        {/* Example */}
        <View style={styles.exampleCard}>
          <Text style={styles.exampleLabel}>Try saying:</Text>
          <Text style={styles.exampleText}>
            "Take me home via Starbucks"
          </Text>
        </View>
      </Animated.View>

      {/* Footer with pagination and Next button */}
      <View style={styles.footer}>
        <View style={styles.pagination}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => router.push('/onboarding/features')}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: Layout.radiusFull,
    backgroundColor: Colors.primary.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  icon: {
    fontSize: 64,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.ui.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  description: {
    ...TextStyles.bodyLarge,
    color: Colors.ui.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    lineHeight: 24,
  },
  exampleCard: {
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: Layout.radiusLarge,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.blue,
  },
  exampleLabel: {
    ...TextStyles.caption,
    color: Colors.ui.text.tertiary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exampleText: {
    ...TextStyles.bodyLarge,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Layout.radiusFull,
    backgroundColor: Colors.ui.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary.blue,
  },
  nextButton: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.base,
    borderRadius: Layout.radiusLarge,
    minHeight: TouchTarget.minAndroid,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  nextButtonText: {
    ...TextStyles.buttonLarge,
    color: Colors.ui.text.onPrimary,
  },
});
