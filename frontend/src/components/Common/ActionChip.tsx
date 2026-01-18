/**
 * ActionChip Component - Agentic Mobile Map
 *
 * Pill-shaped action buttons for quick suggestions and actions.
 * Inspired by modern AI assistant interfaces.
 *
 * Features:
 * - Pill shape with glassmorphism
 * - Icon support (left or right)
 * - Multiple variants (default, active, suggested, outline)
 * - Press animation with haptic feedback
 * - Smooth hover/focus states
 */

import React, { useCallback } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Layout, FontFamily, FontSize, SpringConfig } from '@/theme';

/**
 * ActionChip Props
 */
export interface ActionChipProps {
  /** Chip label text */
  label: string;
  /** Press handler */
  onPress: () => void;
  /** Chip variant */
  variant?: 'default' | 'active' | 'suggested' | 'outline' | 'teal';
  /** Icon name (Ionicons) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Custom styles */
  style?: ViewStyle;
  /** Custom text styles */
  textStyle?: TextStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * ActionChip Component
 */
export const ActionChip: React.FC<ActionChipProps> = ({
  label,
  onPress,
  variant = 'default',
  icon,
  iconPosition = 'left',
  disabled = false,
  size = 'medium',
  style,
  textStyle,
}) => {
  // Animation values
  const scale = useSharedValue(1);

  // Press handlers
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, SpringConfig.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfig.bouncy);
  }, []);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'active':
        return {
          container: {
            backgroundColor: Colors.chips.active.background,
            borderColor: Colors.chips.active.border,
          },
          text: { color: Colors.chips.active.text },
          icon: Colors.chips.active.text,
        };
      case 'suggested':
        return {
          container: {
            backgroundColor: Colors.chips.suggested.background,
            borderColor: Colors.chips.suggested.border,
          },
          text: { color: Colors.chips.suggested.text },
          icon: Colors.chips.suggested.text,
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: Colors.dark.borderLight,
          },
          text: { color: Colors.dark.text.primary },
          icon: Colors.dark.text.primary,
        };
      case 'teal':
        return {
          container: {
            backgroundColor: Colors.primary.teal,
            borderColor: Colors.primary.teal,
          },
          text: { color: Colors.dark.text.primary },
          icon: Colors.dark.text.primary,
        };
      default:
        return {
          container: {
            backgroundColor: Colors.chips.default.background,
            borderColor: Colors.chips.default.border,
          },
          text: { color: Colors.chips.default.text },
          icon: Colors.chips.default.text,
        };
    }
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: Spacing.xs + 2,
          paddingHorizontal: Spacing.md,
          fontSize: FontSize.xs,
          iconSize: 14,
        };
      case 'large':
        return {
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.xl,
          fontSize: FontSize.base,
          iconSize: 20,
        };
      default:
        return {
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.base,
          fontSize: FontSize.sm,
          iconSize: 16,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const renderIcon = (position: 'left' | 'right') => {
    if (!icon || iconPosition !== position) return null;

    return (
      <Ionicons
        name={icon}
        size={sizeStyles.iconSize}
        color={disabled ? Colors.dark.text.tertiary : variantStyles.icon}
        style={position === 'left' ? styles.iconLeft : styles.iconRight}
      />
    );
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.container,
        variantStyles.container,
        {
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {renderIcon('left')}
      <Text
        style={[
          styles.label,
          variantStyles.text,
          { fontSize: sizeStyles.fontSize },
          disabled && styles.disabledText,
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {renderIcon('right')}
    </AnimatedTouchable>
  );
};

/**
 * ActionChipGroup - Container for multiple chips
 */
export interface ActionChipGroupProps {
  children: React.ReactNode;
  /** Horizontal or vertical layout */
  direction?: 'horizontal' | 'vertical';
  /** Wrap chips to next line */
  wrap?: boolean;
  /** Gap between chips */
  gap?: number;
  /** Custom styles */
  style?: ViewStyle;
}

export const ActionChipGroup: React.FC<ActionChipGroupProps> = ({
  children,
  direction = 'horizontal',
  wrap = true,
  gap = Spacing.sm,
  style,
}) => {
  return (
    <Animated.View
      style={[
        styles.group,
        direction === 'horizontal' ? styles.groupHorizontal : styles.groupVertical,
        wrap && styles.groupWrap,
        { gap },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Layout.radiusFull,
    borderWidth: 1,
  },
  label: {
    fontFamily: FontFamily.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: Spacing.xs,
  },
  iconRight: {
    marginLeft: Spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.dark.text.tertiary,
  },
  group: {
    alignItems: 'flex-start',
  },
  groupHorizontal: {
    flexDirection: 'row',
  },
  groupVertical: {
    flexDirection: 'column',
  },
  groupWrap: {
    flexWrap: 'wrap',
  },
});

export default ActionChip;
