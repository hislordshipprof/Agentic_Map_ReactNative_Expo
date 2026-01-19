/** Skip button for onboarding: top-right, marks complete and navigates to app. */

import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Spacing, SpringConfig } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SkipProps {
  onPress: () => void;
}

export const Skip: React.FC<SkipProps> = ({ onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.94, SpringConfig.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SpringConfig.gentle);
      }}
      style={[styles.root, animatedStyle]}
      accessibilityLabel="Skip onboarding"
      accessibilityRole="button"
    >
      <Text style={styles.text}>Skip</Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    zIndex: 10,
  },
  text: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.dark.text.secondary,
  },
});
