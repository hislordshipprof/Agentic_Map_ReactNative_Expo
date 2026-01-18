/**
 * Onboarding Screen 3: Ready
 * 
 * Final screen with CTA to start using the app
 * "Optimize in 1-2 turns"
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, TextStyles, Spacing, Layout, TouchTarget } from '@/theme';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';

export default function ReadyScreen() {
  const router = useRouter();

  const handleGetStarted = async () => {
    try {
      // Mark onboarding as complete
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.warn('Error saving onboarding status:', error);
    }
    // Navigate to main app
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={styles.content}
        entering={FadeInDown.duration(600).delay(200)}
      >
        {/* Icon/Illustration placeholder */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🚀</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Optimize in 1-2 Turns</Text>

        {/* Description */}
        <Text style={styles.description}>
          No more manual planning. Say what you need, and we'll create the perfect route.
        </Text>

        {/* Value proposition */}
        <View style={styles.valueCard}>
          <View style={styles.valueRow}>
            <Text style={styles.oldWay}>5-6 manual steps</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.newWay}>1-2 turns</Text>
          </View>
        </View>

        {/* CTA Button */}
        <TouchableOpacity 
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Progress indicator */}
      <View style={styles.footer}>
        <View style={styles.pagination}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// Shadow style (defined separately to avoid circular reference)
const buttonShadow = {
  shadowColor: Colors.primary.blue,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 4,
};

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
    backgroundColor: Colors.semantic.success,
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
  valueCard: {
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Layout.radiusLarge,
    marginBottom: Spacing['2xl'],
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  oldWay: {
    ...TextStyles.body,
    color: Colors.ui.text.tertiary,
    textDecorationLine: 'line-through',
  },
  arrow: {
    ...TextStyles.h3,
    color: Colors.primary.blue,
  },
  newWay: {
    ...TextStyles.bodyBold,
    color: Colors.semantic.success,
    fontSize: 18,
  },
  button: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.base,
    borderRadius: Layout.radiusLarge,
    minHeight: TouchTarget.minAndroid,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    ...buttonShadow,
  },
  buttonText: {
    ...TextStyles.buttonLarge,
    color: Colors.ui.text.onPrimary,
  },
  footer: {
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
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
});
