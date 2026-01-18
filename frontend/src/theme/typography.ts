/**
 * Typography System - Agentic Mobile Map
 * 
 * Modern font system using DM Sans (geometric, clean alternative to Inter).
 * Follows frontend-design skill principles: distinctive, beautiful fonts.
 * 
 * Design Philosophy:
 * - DM Sans: Geometric clarity, excellent mobile readability
 * - Scale: Modular scale (1.25 ratio) for harmonious hierarchy
 * - Weights: Strategic use of 400, 500, 600, 700
 * - Line heights: Optimized for mobile screens
 */

/**
 * FONT FAMILIES
 * DM Sans - Primary font for all text
 * System fallbacks for immediate rendering
 */
export const FontFamily = {
  primary: 'DMSans',
  system: 'System',
  // Fallback stack for before custom fonts load
  fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

/**
 * FONT WEIGHTS
 * DM Sans supports: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
 */
export const FontWeight = {
  regular: '400' as const,      // Body text, descriptions
  medium: '500' as const,       // Emphasis, labels
  semibold: '600' as const,     // Subheadings, buttons
  bold: '700' as const,         // Headings, important text
} as const;

/**
 * FONT SIZES - Modular scale (base 16px, ratio 1.25)
 * Optimized for mobile screens with thumb-friendly touch targets
 */
export const FontSize = {
  xs: 12,      // Captions, tiny labels
  sm: 14,      // Secondary text, timestamps
  base: 16,    // Body text, message bubbles
  md: 18,      // Emphasized body text
  lg: 20,      // Subheadings, card titles
  xl: 24,      // Page titles, section headers
  '2xl': 28,   // Large headings
  '3xl': 32,   // Hero text, splash screens
  '4xl': 36,   // Display text (rare)
} as const;

/**
 * LINE HEIGHTS - Relative to font size
 * Tighter for headings, comfortable for body text
 */
export const LineHeight = {
  tight: 1.2,      // Headings, titles
  snug: 1.375,     // Subheadings
  normal: 1.5,     // Body text, paragraphs
  relaxed: 1.625,  // Long-form text (rare in our app)
} as const;

/**
 * LETTER SPACING - For fine-tuning readability
 * Generally minimal for geometric fonts like DM Sans
 */
export const LetterSpacing = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

/**
 * TEXT STYLES - Pre-configured combinations
 * Use these for consistent styling across the app
 */
export const TextStyles = {
  // HEADINGS
  h1: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['3xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  },
  h2: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['2xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  },
  h3: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.xl * LineHeight.snug,
    letterSpacing: LetterSpacing.normal,
  },
  h4: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.lg * LineHeight.snug,
    letterSpacing: LetterSpacing.normal,
  },

  // BODY TEXT
  bodyLarge: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.md * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  },
  body: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.base * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  },
  bodySmall: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.sm * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  },

  // EMPHASIZED TEXT
  bodyBold: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    lineHeight: FontSize.base * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  },
  bodyMedium: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.base * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  },

  // CAPTIONS & LABELS
  caption: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.xs * LineHeight.normal,
    letterSpacing: LetterSpacing.wide,
  },
  captionBold: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    lineHeight: FontSize.xs * LineHeight.normal,
    letterSpacing: LetterSpacing.wide,
  },
  label: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.sm * LineHeight.snug,
    letterSpacing: LetterSpacing.wide,
  },

  // BUTTONS
  button: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.base * LineHeight.tight,
    letterSpacing: LetterSpacing.wide,
  },
  buttonLarge: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.md * LineHeight.tight,
    letterSpacing: LetterSpacing.wide,
  },
  buttonSmall: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.sm * LineHeight.tight,
    letterSpacing: LetterSpacing.wide,
  },

  // CONVERSATION UI SPECIFIC
  messageBubble: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.base * LineHeight.normal,
    letterSpacing: LetterSpacing.normal,
  },
  timestamp: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.xs * LineHeight.snug,
    letterSpacing: LetterSpacing.normal,
  },

  // INPUT FIELDS
  input: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.base * LineHeight.snug,
    letterSpacing: LetterSpacing.normal,
  },
  inputLarge: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.md * LineHeight.snug,
    letterSpacing: LetterSpacing.normal,
  },
} as const;

/**
 * Typography utility functions
 */
export const TypographyUtils = {
  /**
   * Get text style by name
   * @param styleName - Name of the text style
   * @returns Text style object
   */
  getTextStyle: (styleName: keyof typeof TextStyles) => {
    return TextStyles[styleName];
  },

  /**
   * Create custom text style with overrides
   * @param baseStyle - Base text style to start from
   * @param overrides - Properties to override
   * @returns Combined text style object
   */
  createTextStyle: (
    baseStyle: keyof typeof TextStyles,
    overrides: Partial<typeof TextStyles.body>
  ) => {
    return {
      ...TextStyles[baseStyle],
      ...overrides,
    };
  },

  /**
   * Get font configuration for expo-font
   * @returns Font map for useFonts hook
   */
  getFontConfig: () => ({
    'DMSans-Regular': require('@expo-google-fonts/dm-sans').DMSans_400Regular,
    'DMSans-Medium': require('@expo-google-fonts/dm-sans').DMSans_500Medium,
    'DMSans-SemiBold': require('@expo-google-fonts/dm-sans').DMSans_600SemiBold,
    'DMSans-Bold': require('@expo-google-fonts/dm-sans').DMSans_700Bold,
  }),
} as const;

/**
 * Type definitions for typography system
 */
export type TextStyleName = keyof typeof TextStyles;
export type TextStyle = typeof TextStyles[TextStyleName];
export type FontWeightValue = typeof FontWeight[keyof typeof FontWeight];
export type FontSizeValue = typeof FontSize[keyof typeof FontSize];
