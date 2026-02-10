/**
 * PlacesSetupScreen - "Set Your Places" onboarding step
 *
 * Inserted after profile-setup in the auth flow.
 * Lets users save Home and Work addresses with Google Places autocomplete.
 * Can be skipped - addresses are optional during onboarding.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  ColorUtils,
  FontFamily,
  FontSize,
  Spacing,
  BorderRadius,
} from '@/theme';
import { useUserAnchors } from '@/hooks';
import { userApi } from '@/services/api';
import { AddressInputModal } from '@/components/SavedPlaces';
import type { AnchorType } from '@/types/user';

interface PlaceState {
  address: string;
  location: { lat: number; lng: number } | null;
}

export default function PlacesSetupScreen() {
  const router = useRouter();
  const { setAnchor } = useUserAnchors();

  const [home, setHome] = useState<PlaceState>({ address: '', location: null });
  const [work, setWork] = useState<PlaceState>({ address: '', location: null });
  const [modalType, setModalType] = useState<AnchorType | null>(null);

  const handleSelect = useCallback(
    async (result: { location: { lat: number; lng: number }; address: string; name: string }) => {
      const type = modalType;
      if (!type) return;

      const state: PlaceState = { address: result.address, location: result.location };
      if (type === 'home') setHome(state);
      else setWork(state);

      setModalType(null);

      // Save to Redux + backend
      await setAnchor(type, result.location, type === 'home' ? 'Home' : 'Work', result.address);
      try {
        await userApi.saveAnchor({
          name: type === 'home' ? 'Home' : 'Work',
          location: result.location,
          address: result.address,
          type,
        });
      } catch {
        // Backend sync failed silently - Redux has the data
      }
    },
    [modalType, setAnchor],
  );

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const renderPlaceCard = (
    type: AnchorType,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    state: PlaceState,
    delay: number,
  ) => {
    const isSet = !!state.location;

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(delay)} key={type}>
        <Pressable
          onPress={() => setModalType(type)}
          style={({ pressed }) => [
            styles.placeCard,
            isSet && styles.placeCardSet,
            pressed && styles.placeCardPressed,
          ]}
        >
          <View style={styles.placeCardRow}>
            <View style={styles.placeIconCircle}>
              <Ionicons name={icon} size={24} color={Colors.primary.teal} />
            </View>
            <View style={styles.placeCardContent}>
              <Text style={styles.placeLabel}>{label}</Text>
              <Text style={styles.placeAddress} numberOfLines={1}>
                {isSet ? state.address : 'Tap to set address'}
              </Text>
            </View>
            {isSet ? (
              <Ionicons name="checkmark-circle" size={24} color={Colors.primary.teal} />
            ) : (
              <Ionicons name="add-circle-outline" size={24} color={Colors.dark.text.tertiary} />
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.dark.background, Colors.dark.gradientMid, Colors.dark.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Skip Button */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <View style={styles.headerSpacer} />
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.titleSection}>
            <View style={styles.titleIconCircle}>
              <Ionicons name="location" size={32} color={Colors.primary.teal} />
            </View>
            <Text style={styles.title}>Set your places</Text>
            <Text style={styles.subtitle}>
              Save your frequent destinations for{'\n'}faster routing
            </Text>
          </Animated.View>

          {/* Place Cards */}
          <View style={styles.cardsSection}>
            {renderPlaceCard('home', 'home-outline', 'Home', home, 200)}
            {renderPlaceCard('work', 'briefcase-outline', 'Work', work, 300)}
          </View>

          {/* Hint */}
          <Animated.View entering={FadeIn.duration(300).delay(400)} style={styles.hintSection}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.dark.text.tertiary} />
            <Text style={styles.hintText}>
              You can always add or change these later in the Saved tab
            </Text>
          </Animated.View>
        </ScrollView>

        {/* Continue Button */}
        <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.buttonSection}>
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <LinearGradient
              colors={[Colors.primary.teal, Colors.primary.tealDark]}
              style={styles.primaryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.dark.text.primary} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      <AddressInputModal
        visible={modalType !== null}
        anchorType={modalType ?? 'home'}
        onSelect={handleSelect}
        onClose={() => setModalType(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  headerSpacer: {
    width: 60,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.secondary,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  titleIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.dark.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  cardsSection: {
    gap: Spacing.base,
    marginBottom: Spacing.xl,
  },
  placeCard: {
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  placeCardSet: {
    borderColor: ColorUtils.withAlpha(Colors.primary.teal, 0.4),
  },
  placeCardPressed: {
    opacity: 0.8,
  },
  placeCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  placeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeCardContent: {
    flex: 1,
  },
  placeLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  placeAddress: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    marginTop: 2,
  },
  hintSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  hintText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    textAlign: 'center',
  },
  buttonSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
  },
  primaryButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
});
