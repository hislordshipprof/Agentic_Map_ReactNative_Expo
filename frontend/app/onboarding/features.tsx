/**
 * Onboarding Screen 2: Features
 * 
 * Highlights key features:
 * "We find stops on your way"
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, TextStyles, Spacing, Layout, TouchTarget } from '@/theme';

export default function FeaturesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={styles.content}
        entering={FadeInDown.duration(600).delay(200)}
      >
        {/* Icon/Illustration placeholder */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🛑</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>We Find Stops On Your Way</Text>

        {/* Description */}
        <Text style={styles.description}>
          Add Starbucks, gas stations, or groceries. We'll optimize your route automatically.
        </Text>

        {/* Feature list */}
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Smart stop suggestions</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Minimal detours</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Auto-optimized routes</Text>
          </View>
        </View>
      </Animated.View>

      {/* Footer with pagination and Next button */}
      <View style={styles.footer}>
        <View style={styles.pagination}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
        
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => router.push('/onboarding/ready')}
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
    backgroundColor: Colors.status.minimal,
    opacity: 0.2,
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
  featureList: {
    gap: Spacing.base,
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderRadius: Layout.radiusLarge,
    gap: Spacing.md,
  },
  featureIcon: {
    fontSize: 20,
    color: Colors.status.noDetour,
  },
  featureText: {
    ...TextStyles.body,
    color: Colors.ui.text.primary,
    flex: 1,
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
