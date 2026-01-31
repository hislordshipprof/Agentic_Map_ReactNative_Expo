/**
 * FeatureCards - "Voice Assistant" + "Multi-Stop" side by side
 *
 * White/light cards with small colored icon badges, title + subtitle.
 * Matches the design mockup: light card bg with teal/purple accent circles.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FeatureCards: React.FC = () => {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Voice Assistant Card */}
      <AnimatedPressable
        entering={FadeInDown.delay(100).duration(400)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface.card,
            borderColor: colors.border.light,
            shadowColor: colors.effects.shadow,
          },
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push('/voice-assistant')}
      >
        <View style={[styles.iconBadge, { backgroundColor: `${colors.primary.teal}18` }]}>
          <Ionicons name="mic" size={20} color={colors.primary.teal} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
          Voice Assistant
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.text.secondary }]}>
          Talk to plan your route
        </Text>
      </AnimatedPressable>

      {/* Multi-Stop Card */}
      <AnimatedPressable
        entering={FadeInDown.delay(200).duration(400)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: `${colors.accent.purple}0D`,
            borderColor: `${colors.accent.purple}20`,
            shadowColor: colors.effects.shadow,
          },
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push('/text-chat')}
      >
        <View style={[styles.iconBadge, { backgroundColor: `${colors.accent.purple}18` }]}>
          <Ionicons name="git-branch-outline" size={20} color={colors.accent.purple} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
          Multi-Stop
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.text.secondary }]}>
          Plan optimized routes
        </Text>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.base,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
  },
});
