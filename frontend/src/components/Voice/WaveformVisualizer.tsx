/**
 * WaveformVisualizer - Animated audio level visualization
 *
 * Per FINAL_REQUIREMENTS.md - Voice Mode UI:
 * - Animated bars showing audio levels
 * - Smooth animations using react-native-reanimated
 * - Responds to real-time audio level input
 *
 * Design: Teal gradient bars with glassmorphism effect
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme';

/**
 * Props for WaveformVisualizer
 */
interface WaveformVisualizerProps {
  /** Whether the visualizer is active */
  isActive: boolean;
  /** Audio level (0-1) */
  audioLevel: number;
  /** Number of bars to display */
  barCount?: number;
  /** Height of the visualizer */
  height?: number;
  /** Width of the visualizer */
  width?: number;
  /** Custom style */
  style?: ViewStyle;
  /** Bar color (default: teal gradient) */
  color?: 'teal' | 'emerald' | 'white';
}

/**
 * Single animated bar component
 */
interface AnimatedBarProps {
  index: number;
  totalBars: number;
  audioLevel: number;
  isActive: boolean;
  maxHeight: number;
  color: 'teal' | 'emerald' | 'white';
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
  index,
  totalBars,
  audioLevel,
  isActive,
  maxHeight,
  color,
}) => {
  const height = useSharedValue(4);

  // Calculate target height based on audio level and bar position
  useEffect(() => {
    if (!isActive) {
      height.value = withSpring(4, { damping: 20, stiffness: 300 });
      return;
    }

    // Create wave effect - middle bars are taller
    const centerDistance = Math.abs(index - (totalBars - 1) / 2);
    const positionFactor = 1 - (centerDistance / (totalBars / 2)) * 0.4;

    // Add some randomness for natural feel
    const randomFactor = 0.8 + Math.random() * 0.4;

    // Calculate final height
    const targetHeight = Math.max(
      4,
      audioLevel * maxHeight * positionFactor * randomFactor
    );

    height.value = withSpring(targetHeight, {
      damping: 12,
      stiffness: 200,
      mass: 0.5,
    });
  }, [audioLevel, isActive, index, totalBars, maxHeight, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  // Get gradient colors based on color prop
  const gradientColors = useMemo((): [string, string] => {
    switch (color) {
      case 'emerald':
        return [Colors.primary.emerald, Colors.status.success];
      case 'white':
        return ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'];
      default:
        return [Colors.primary.tealLight, Colors.primary.teal];
    }
  }, [color]);

  return (
    <Animated.View style={[styles.barContainer, animatedStyle]}>
      <LinearGradient
        colors={gradientColors}
        style={styles.barGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  );
};

/**
 * WaveformVisualizer Component
 */
export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  audioLevel,
  barCount = 5,
  height = 40,
  width = 80,
  style,
  color = 'teal',
}) => {
  // Create bars array
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => i);
  }, [barCount]);

  return (
    <View
      style={[
        styles.container,
        { width, height },
        style,
      ]}
    >
      <View style={styles.barsContainer}>
        {bars.map((_, index) => (
          <AnimatedBar
            key={index}
            index={index}
            totalBars={barCount}
            audioLevel={audioLevel}
            isActive={isActive}
            maxHeight={height}
            color={color}
          />
        ))}
      </View>
    </View>
  );
};

/**
 * Circular waveform variant (around mic button)
 */
interface CircularWaveformProps {
  isActive: boolean;
  audioLevel: number;
  size?: number;
  color?: 'teal' | 'emerald';
  style?: ViewStyle;
}

export const CircularWaveform: React.FC<CircularWaveformProps> = ({
  isActive,
  audioLevel,
  size = 100,
  color = 'teal',
  style,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Scale based on audio level
      const targetScale = 1 + audioLevel * 0.3;
      scale.value = withSpring(targetScale, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(0.6 + audioLevel * 0.4, { duration: 100 });
    } else {
      scale.value = withSpring(1, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, audioLevel, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const ringColor = color === 'emerald'
    ? Colors.primary.emerald
    : Colors.primary.tealLight;

  return (
    <Animated.View
      style={[
        styles.circularWaveform,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ringColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

/**
 * Compact inline waveform for status indicator
 */
interface InlineWaveformProps {
  isActive: boolean;
  audioLevel: number;
  style?: ViewStyle;
}

export const InlineWaveform: React.FC<InlineWaveformProps> = ({
  isActive,
  audioLevel,
  style,
}) => {
  return (
    <WaveformVisualizer
      isActive={isActive}
      audioLevel={audioLevel}
      barCount={3}
      height={16}
      width={24}
      color="white"
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
  },
  barContainer: {
    width: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barGradient: {
    flex: 1,
    borderRadius: 2,
  },
  circularWaveform: {
    position: 'absolute',
    borderWidth: 2,
  },
});

export default WaveformVisualizer;
