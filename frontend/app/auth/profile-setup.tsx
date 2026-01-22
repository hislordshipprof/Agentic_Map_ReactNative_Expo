/**
 * ProfileSetupScreen - Optional profile setup after authentication
 *
 * Features:
 * - Avatar upload with camera/gallery option
 * - Display name input
 * - Skip option to proceed without setup
 * - Animated success state
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateUser } from '@/redux/slices/authSlice';
import {
  Colors,
  ColorUtils,
  FontFamily,
  FontSize,
  Spacing,
  BorderRadius,
} from '@/theme';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatar, setAvatar] = useState<string | null>(user?.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);

  // Animations
  const avatarScale = useSharedValue(1);
  const inputFocus = useSharedValue(0);
  const successScale = useSharedValue(0);
  const confettiProgress = useSharedValue(0);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const inputBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolate(
      inputFocus.value,
      [0, 1],
      [
        // Convert hex to numeric for interpolation workaround
        0, 1
      ]
    ) === 1 ? Colors.primary.teal : Colors.effects.glassDarkBorder,
  }));

  const handleAvatarPress = () => {
    avatarScale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );

    Alert.alert(
      'Update Profile Photo',
      'Choose how you want to add a photo',
      [
        {
          text: 'Camera',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Gallery',
          onPress: () => pickImage('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    // Request permissions
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required to select photos.');
        return;
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
      avatarScale.value = withSequence(
        withSpring(1.1),
        withSpring(1)
      );
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Upload avatar to server and get URL
      // For now, just update local state
      dispatch(updateUser({
        displayName: displayName.trim(),
        photoURL: avatar || undefined,
      }));

      // Play success animation
      successScale.value = withSpring(1);
      confettiProgress.value = withTiming(1, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });

      // Navigate after animation
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 800);
    } catch (error) {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return '?';
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
        <View style={styles.content}>
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
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>
              Add a photo and name so other people{'\n'}can recognize you
            </Text>
          </Animated.View>

          {/* Avatar */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.avatarSection}>
            <Pressable onPress={handleAvatarPress}>
              <Animated.View style={[styles.avatarContainer, avatarAnimatedStyle]}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient
                    colors={[ColorUtils.withAlpha(Colors.primary.teal, 0.3), ColorUtils.withAlpha(Colors.primary.teal, 0.1)]}
                    style={styles.avatarPlaceholder}
                  >
                    <Text style={styles.avatarInitials}>{getInitials()}</Text>
                  </LinearGradient>
                )}

                {/* Camera Badge */}
                <View style={styles.cameraBadge}>
                  <LinearGradient
                    colors={[Colors.primary.teal, Colors.primary.tealDark]}
                    style={styles.cameraBadgeGradient}
                  >
                    <Ionicons name="camera" size={16} color={Colors.dark.text.primary} />
                  </LinearGradient>
                </View>
              </Animated.View>
            </Pressable>

            <Animated.Text entering={FadeIn.duration(300).delay(300)} style={styles.avatarHint}>
              Tap to add photo
            </Animated.Text>
          </Animated.View>

          {/* Name Input */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.inputSection}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <Animated.View style={[styles.inputWrapper, inputBorderStyle]}>
              <Ionicons name="person-outline" size={20} color={Colors.dark.text.tertiary} />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                onFocus={() => {
                  inputFocus.value = withSpring(1);
                }}
                onBlur={() => {
                  inputFocus.value = withSpring(0);
                }}
                placeholder="What should we call you?"
                placeholderTextColor={Colors.dark.text.tertiary}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
              />
              {displayName.length > 0 && (
                <Pressable onPress={() => setDisplayName('')}>
                  <Ionicons name="close-circle" size={20} color={Colors.dark.text.tertiary} />
                </Pressable>
              )}
            </Animated.View>
            <Text style={styles.inputHint}>
              {displayName.length}/30 characters
            </Text>
          </Animated.View>

          {/* Save Button */}
          <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.buttonSection}>
            <Pressable
              onPress={handleSave}
              disabled={!displayName.trim() || isSaving}
              style={({ pressed }) => [
                styles.primaryButton,
                (!displayName.trim() || isSaving) && styles.primaryButtonDisabled,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <LinearGradient
                colors={[Colors.primary.teal, Colors.primary.tealDark]}
                style={styles.primaryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isSaving ? (
                  <Text style={styles.primaryButtonText}>Saving...</Text>
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Save Profile</Text>
                    <Ionicons name="checkmark" size={20} color={Colors.dark.text.primary} />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Privacy Note */}
          <Animated.View entering={FadeIn.duration(300).delay(500)} style={styles.privacyNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.dark.text.tertiary} />
            <Text style={styles.privacyNoteText}>
              Your profile information is private and only visible to you
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
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
  content: {
    flex: 1,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'visible',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.primary.teal,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.effects.glassDarkBorder,
    borderStyle: 'dashed',
  },
  avatarInitials: {
    fontFamily: FontFamily.primary,
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary.tealLight,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow for elevation
    shadowColor: Colors.dark.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  cameraBadgeGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    marginTop: Spacing.md,
  },
  inputSection: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.dark.text.secondary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 56,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.primary,
  },
  inputHint: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  buttonSection: {
    marginTop: 'auto',
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
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
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  privacyNoteText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    textAlign: 'center',
  },
});
