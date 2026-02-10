/**
 * FeatureCards - "Voice Assistant" + "Multi-Stop" side by side
 *
 * Cards use linear gradients (reference: teal→lavender, lavender gradient).
 * Text left-aligned; icon and copy aligned for smooth layout.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FeatureCards: React.FC = () => {
  const router = useRouter();
  const colors = useThemeColors();
  const cardVoiceColors = [...colors.gradients.cardVoice];
  const cardMultiStopColors = [...colors.gradients.cardMultiStop];

  return (
    <View style={styles.container}>
      {/* Voice Assistant Card - linear gradient teal → lavender */}
      <AnimatedPressable
        entering={FadeInDown.delay(100).duration(400)}
        style={({ pressed }) => [styles.cardWrapper, pressed && styles.cardPressed]}
        onPress={() => router.push('/voice-assistant')}
      >
        <LinearGradient
          colors={cardVoiceColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { shadowColor: colors.effects.shadow }]}
        >
          <View style={[styles.iconBadge, { backgroundColor: colors.design.primaryBlue }]}>
            <Ionicons name="mic" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
            Voice Assistant
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.design.neutralGray }]}>
            Talk to plan your route
          </Text>
        </LinearGradient>
      </AnimatedPressable>

      {/* Multi-Stop Card - linear gradient lavender */}
      <AnimatedPressable
        entering={FadeInDown.delay(200).duration(400)}
        style={({ pressed }) => [styles.cardWrapper, pressed && styles.cardPressed]}
        onPress={() => router.push('/text-chat')}
      >
        <LinearGradient
          colors={cardMultiStopColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { shadowColor: colors.effects.shadow }]}
        >
          <View style={[styles.iconBadge, { backgroundColor: colors.design.primaryBlue }]}>
            <Ionicons name="git-branch-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
            Multi-Stop
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.design.neutralGray }]}>
            Plan optimized routes
          </Text>
        </LinearGradient>
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
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.base,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 120,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  cardPressed: {
    opacity: 0.9,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '700',
    textAlign: 'left',
  },
  cardSubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    lineHeight: 16,
    textAlign: 'left',
  },
});
