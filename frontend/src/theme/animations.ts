/**
 * Animation System - Agentic Mobile Map
 * 
 * Reusable animation configurations using react-native-reanimated.
 * Follows frontend-design skill: "Focus on high-impact moments with staggered reveals"
 * 
 * Design Philosophy:
 * - Spring physics for natural movement
 * - Staggered reveals for conversation messages
 * - Smooth confidence indicator transitions
 * - 60 FPS guaranteed (runs on UI thread)
 */

import {
  Easing,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
} from 'react-native-reanimated';
import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

/**
 * TIMING CONFIGURATIONS
 * Pre-configured timing curves for common animations
 */
export const TimingConfig = {
  /** Quick, snappy animations (150ms) */
  fast: {
    duration: 150,
    easing: Easing.out(Easing.cubic),
  } as WithTimingConfig,

  /** Standard animations (250ms) */
  normal: {
    duration: 250,
    easing: Easing.out(Easing.cubic),
  } as WithTimingConfig,

  /** Slow, emphasized animations (350ms) */
  slow: {
    duration: 350,
    easing: Easing.out(Easing.cubic),
  } as WithTimingConfig,

  /** Very slow, dramatic animations (500ms) */
  slower: {
    duration: 500,
    easing: Easing.inOut(Easing.cubic),
  } as WithTimingConfig,

  /** Linear timing (no easing) */
  linear: {
    duration: 250,
    easing: Easing.linear,
  } as WithTimingConfig,
} as const;

/**
 * SPRING CONFIGURATIONS
 * Physics-based spring animations for natural movement
 */
export const SpringConfig = {
  /** Gentle, smooth spring */
  gentle: {
    damping: 20,
    stiffness: 90,
    mass: 1,
  } as WithSpringConfig,

  /** Default spring - balanced */
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  } as WithSpringConfig,

  /** Bouncy, playful spring */
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 1,
  } as WithSpringConfig,

  /** Snappy, quick spring */
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  } as WithSpringConfig,

  /** Slow, heavy spring */
  slow: {
    damping: 25,
    stiffness: 50,
    mass: 1.5,
  } as WithSpringConfig,
} as const;

/**
 * ENTRANCE ANIMATIONS
 * Pre-configured entrance animations for common use cases
 */
export const EntranceAnimations = {
  /**
   * Fade in from opacity 0 to 1
   * @param duration - Animation duration (ms)
   * @returns Animation function
   */
  fadeIn: (duration = 250) =>
    withTiming(1, {
      duration,
      easing: Easing.out(Easing.ease),
    }),

  /**
   * Slide up + fade in (message bubbles)
   * @param distance - Slide distance in pixels
   * @param duration - Animation duration (ms)
   * @returns Animation config
   */
  slideUpFadeIn: (distance = 20, duration = 300) => ({
    opacity: withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
    transform: [
      {
        translateY: withTiming(0, {
          duration,
          easing: Easing.out(Easing.cubic),
        }),
      },
    ],
  }),

  /**
   * Scale up + fade in (buttons, icons)
   * @param duration - Animation duration (ms)
   * @returns Animation config
   */
  scaleUpFadeIn: (duration = 200) => ({
    opacity: withTiming(1, { duration }),
    transform: [
      {
        scale: withSpring(1, SpringConfig.gentle),
      },
    ],
  }),

  /**
   * Slide from right (user messages)
   * @param distance - Slide distance
   * @param duration - Animation duration (ms)
   * @returns Animation config
   */
  slideFromRight: (distance = 50, duration = 250) => ({
    opacity: withTiming(1, { duration }),
    transform: [
      {
        translateX: withTiming(0, {
          duration,
          easing: Easing.out(Easing.cubic),
        }),
      },
    ],
  }),

  /**
   * Slide from left (system messages)
   * @param distance - Slide distance
   * @param duration - Animation duration (ms)
   * @returns Animation config
   */
  slideFromLeft: (distance = 50, duration = 250) => ({
    opacity: withTiming(1, { duration }),
    transform: [
      {
        translateX: withTiming(0, {
          duration,
          easing: Easing.out(Easing.cubic),
        }),
      },
    ],
  }),

  /**
   * Staggered entrance for list items
   * @param index - Item index
   * @param delay - Base delay between items (ms)
   * @returns Animation with delay
   */
  staggered: (index: number, delay = 50) =>
    withDelay(
      index * delay,
      withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      })
    ),
} as const;

/**
 * EXIT ANIMATIONS
 * Pre-configured exit animations
 */
export const ExitAnimations = {
  /**
   * Fade out to opacity 0
   * @param duration - Animation duration (ms)
   * @returns Animation function
   */
  fadeOut: (duration = 200) =>
    withTiming(0, {
      duration,
      easing: Easing.in(Easing.ease),
    }),

  /**
   * Slide down + fade out
   * @param distance - Slide distance in pixels
   * @param duration - Animation duration (ms)
   * @returns Animation config
   */
  slideDownFadeOut: (distance = 20, duration = 200) => ({
    opacity: withTiming(0, { duration }),
    transform: [
      {
        translateY: withTiming(distance, {
          duration,
          easing: Easing.in(Easing.cubic),
        }),
      },
    ],
  }),

  /**
   * Scale down + fade out
   * @param duration - Animation duration (ms)
   * @returns Animation config
   */
  scaleDownFadeOut: (duration = 200) => ({
    opacity: withTiming(0, { duration }),
    transform: [
      {
        scale: withTiming(0.8, { duration }),
      },
    ],
  }),
} as const;

/**
 * CONTINUOUS ANIMATIONS
 * Looping animations for loading states, indicators
 */
export const ContinuousAnimations = {
  /**
   * Pulse animation (confidence indicator)
   * @param minScale - Minimum scale
   * @param maxScale - Maximum scale
   * @param duration - Animation duration (ms)
   * @returns Repeating animation
   */
  pulse: (minScale = 0.95, maxScale = 1.05, duration = 1000) =>
    withRepeat(
      withSequence(
        withTiming(maxScale, { duration: duration / 2 }),
        withTiming(minScale, { duration: duration / 2 })
      ),
      -1, // Infinite repeat
      true // Reverse
    ),

  /**
   * Breathing animation (subtle scale)
   * @param duration - Animation duration (ms)
   * @returns Repeating animation
   */
  breathe: (duration = 2000) =>
    withRepeat(
      withSequence(
        withTiming(1.02, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    ),

  /**
   * Rotate animation (loading spinner)
   * @param duration - Full rotation duration (ms)
   * @returns Repeating rotation
   */
  rotate: (duration = 1000) =>
    withRepeat(
      withTiming(360, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false
    ),

  /**
   * Shimmer loading animation
   * @param duration - Animation duration (ms)
   * @returns Repeating shimmer
   */
  shimmer: (duration = 1500) =>
    withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    ),
} as const;

/**
 * GESTURE ANIMATIONS
 * For interactive gestures (swipe, drag, etc.)
 */
export const GestureAnimations = {
  /**
   * Spring back animation after swipe
   * @returns Spring config
   */
  springBack: () =>
    withSpring(0, SpringConfig.bouncy),

  /**
   * Snap to position with spring
   * @param position - Target position
   * @returns Spring animation
   */
  snapTo: (position: number) =>
    withSpring(position, SpringConfig.snappy),

  /**
   * Rubber band effect at boundaries
   * @param resistance - Resistance factor (0-1)
   * @returns Damped value
   */
  rubberBand: (value: number, boundary: number, resistance = 0.5) => {
    'worklet';
    const diff = value - boundary;
    if (diff > 0) {
      return boundary + diff * resistance;
    }
    return value;
  },
} as const;

/**
 * SPECIALIZED ANIMATIONS
 * Domain-specific animations for our app
 */
export const SpecializedAnimations = {
  /**
   * Message bubble entrance (slide up + fade)
   * Optimized for conversation UI
   * @param isUser - Is this a user message?
   * @param index - Message index for stagger
   * @returns Animation config
   */
  messageBubbleEntrance: (isUser: boolean, index = 0) => {
    const direction = isUser ? 50 : -50; // Right for user, left for system
    return {
      opacity: withDelay(index * 30, withTiming(1, TimingConfig.normal)),
      transform: [
        {
          translateX: withDelay(
            index * 30,
            withSpring(0, SpringConfig.gentle)
          ),
        },
        {
          translateY: withDelay(
            index * 30,
            withTiming(0, TimingConfig.normal)
          ),
        },
      ],
    };
  },

  /**
   * Confidence indicator pulse (based on confidence level)
   * @param confidence - Confidence score (0-1)
   * @returns Pulse animation (faster for low confidence)
   */
  confidencePulse: (confidence: number) => {
    const duration = confidence >= 0.8 ? 2000 : confidence >= 0.6 ? 1500 : 1000;
    return ContinuousAnimations.pulse(0.95, 1.05, duration);
  },

  /**
   * Route marker pop-in animation
   * @param delay - Stagger delay (ms)
   * @returns Pop-in animation
   */
  markerPopIn: (delay = 0) => ({
    opacity: withDelay(delay, withTiming(1, { duration: 300 })),
    transform: [
      {
        scale: withDelay(delay, withSpring(1, SpringConfig.bouncy)),
      },
    ],
  }),
} as const;

/**
 * Animation utility functions
 */
export const AnimationUtils = {
  /**
   * Create staggered delay for list items
   * @param index - Item index
   * @param baseDelay - Base delay between items
   * @returns Delay in ms
   */
  getStaggerDelay: (index: number, baseDelay = 50): number => {
    return index * baseDelay;
  },

  /**
   * Interpolate value based on confidence
   * @param confidence - Confidence score (0-1)
   * @param lowValue - Value for low confidence
   * @param highValue - Value for high confidence
   * @returns Interpolated value
   */
  interpolateByConfidence: (
    confidence: number,
    lowValue: number,
    highValue: number
  ): number => {
    'worklet';
    return lowValue + (highValue - lowValue) * confidence;
  },
} as const;

/**
 * Type definitions for animation system
 */
export type TimingConfigName = keyof typeof TimingConfig;
export type SpringConfigName = keyof typeof SpringConfig;
export type EntranceAnimation = keyof typeof EntranceAnimations;
export type ExitAnimation = keyof typeof ExitAnimations;
