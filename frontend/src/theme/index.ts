/**
 * Theme System - Agentic Mobile Map
 * 
 * Centralized theme export for consistent styling across the app.
 * Import this file to access all theme tokens.
 * 
 * Usage:
 * ```typescript
 * import { Colors, Typography, Spacing, Animations } from '@/theme';
 * ```
 */

// Core theme modules
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './animations';

// Re-export commonly used items for convenience
export { Colors, ColorUtils } from './colors';
export { 
  FontFamily, 
  FontWeight, 
  FontSize, 
  TextStyles, 
  TypographyUtils 
} from './typography';
export { 
  Spacing, 
  SemanticSpacing, 
  TouchTarget, 
  Layout, 
  SpacingUtils 
} from './spacing';
export {
  TimingConfig,
  SpringConfig,
  EntranceAnimations,
  ExitAnimations,
  ContinuousAnimations,
  SpecializedAnimations,
  AnimationUtils,
} from './animations';

/**
 * Complete theme object
 * Use this when you need the entire theme in one object
 */
import { Colors, ColorUtils } from './colors';
import { FontFamily, FontWeight, FontSize, TextStyles, TypographyUtils } from './typography';
import { Spacing, SemanticSpacing, TouchTarget, Layout, SpacingUtils } from './spacing';
import {
  TimingConfig,
  SpringConfig,
  EntranceAnimations,
  ExitAnimations,
  ContinuousAnimations,
  SpecializedAnimations,
  AnimationUtils,
} from './animations';

export const Theme = {
  colors: Colors,
  typography: {
    fontFamily: FontFamily,
    fontWeight: FontWeight,
    fontSize: FontSize,
    textStyles: TextStyles,
    utils: TypographyUtils,
  },
  spacing: {
    base: Spacing,
    semantic: SemanticSpacing,
    touchTarget: TouchTarget,
    layout: Layout,
    utils: SpacingUtils,
  },
  animations: {
    timing: TimingConfig,
    spring: SpringConfig,
    entrance: EntranceAnimations,
    exit: ExitAnimations,
    continuous: ContinuousAnimations,
    specialized: SpecializedAnimations,
    utils: AnimationUtils,
  },
  utils: {
    color: ColorUtils,
    typography: TypographyUtils,
    spacing: SpacingUtils,
    animation: AnimationUtils,
  },
} as const;

export type ThemeType = typeof Theme;
