/**
 * Spacing System - Agentic Mobile Map
 * 
 * 4px grid-based spacing for consistent layouts.
 * Follows modern design systems (Tailwind, Material Design).
 * 
 * Design Philosophy:
 * - Base unit: 4px (0.25rem)
 * - Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
 * - Named semantically for common use cases
 * - Mobile-optimized touch targets (min 44px)
 */

/**
 * BASE SPACING SCALE - 4px grid
 * Use these for margins, padding, gaps
 */
export const Spacing = {
  /** 4px - Minimal spacing */
  xs: 4,
  /** 8px - Tight spacing, icon padding */
  sm: 8,
  /** 12px - Small gaps */
  md: 12,
  /** 16px - Default spacing, comfortable gaps */
  base: 16,
  /** 20px - Medium spacing */
  lg: 20,
  /** 24px - Large spacing, section gaps */
  xl: 24,
  /** 32px - Extra large spacing */
  '2xl': 32,
  /** 40px - Huge spacing */
  '3xl': 40,
  /** 48px - Screen padding */
  '4xl': 48,
  /** 64px - Major section separation */
  '5xl': 64,
} as const;

/**
 * SEMANTIC SPACING - Named for common use cases
 * Use these for consistent spacing across similar elements
 */
export const SemanticSpacing = {
  // Screen & container spacing
  screenPadding: Spacing.lg,           // 20px - Main screen horizontal padding
  screenPaddingVertical: Spacing.xl,   // 24px - Main screen vertical padding
  containerPadding: Spacing.base,      // 16px - Card/container internal padding
  sectionGap: Spacing['2xl'],          // 32px - Between major sections
  
  // Component spacing
  buttonPadding: Spacing.base,         // 16px - Button internal padding
  inputPadding: Spacing.md,            // 12px - Input field padding
  cardPadding: Spacing.base,           // 16px - Card internal padding
  messageBubblePadding: Spacing.md,    // 12px - Chat bubble padding
  
  // List & grid spacing
  listItemGap: Spacing.md,             // 12px - Between list items
  gridGap: Spacing.base,               // 16px - Grid item spacing
  chipGap: Spacing.sm,                 // 8px - Between chips/tags
  
  // Icon spacing
  iconMargin: Spacing.sm,              // 8px - Space around icons
  iconPadding: Spacing.xs,             // 4px - Icon button padding
  
  // Text spacing
  textGap: Spacing.sm,                 // 8px - Between text elements
  paragraphGap: Spacing.base,          // 16px - Between paragraphs
  headingMarginBottom: Spacing.md,     // 12px - Below headings
} as const;

/**
 * TOUCH TARGET SIZES - iOS/Android guidelines
 * Minimum 44x44pt (iOS) / 48x48dp (Android)
 */
export const TouchTarget = {
  /** 44px - iOS minimum touch target */
  minIOS: 44,
  /** 48px - Android minimum touch target */
  minAndroid: 48,
  /** 56px - Comfortable touch target */
  comfortable: 56,
  /** 64px - Large touch target (FAB, primary actions) */
  large: 64,
} as const;

/**
 * LAYOUT DIMENSIONS - Common component sizes
 */
export const Layout = {
  // Header heights
  headerHeight: 60,                    // Main app header
  tabBarHeight: 64,                    // Bottom tab navigation
  statusBarHeight: 44,                 // iOS status bar (notch devices)
  
  // Input heights
  inputHeight: TouchTarget.minAndroid, // 48px - Text input default
  inputHeightLarge: TouchTarget.comfortable, // 56px - Large input
  searchBarHeight: 52,                 // Search bar
  
  // Button heights
  buttonHeight: TouchTarget.minAndroid,     // 48px - Default button
  buttonHeightLarge: TouchTarget.comfortable, // 56px - Large CTA button
  buttonHeightSmall: 36,               // Small button
  
  // Message bubble constraints
  messageBubbleMaxWidth: '80%',        // Chat bubble max width
  messageBubbleMinHeight: 40,          // Minimum bubble height
  
  // Border radius
  radiusSmall: 4,                      // Subtle rounding
  radiusMedium: 8,                     // Default rounding
  radiusLarge: 12,                     // Cards, containers
  radiusXLarge: 16,                    // Modal, bottom sheets
  radiusFull: 9999,                    // Pills, circular buttons
  
  // Border widths
  borderThin: 1,                       // Hairline borders
  borderMedium: 2,                     // Default borders
  borderThick: 4,                      // Emphasized borders
  
  // Shadows & elevation
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 8,
  shadowOpacity: 0.1,
  elevationLow: 2,
  elevationMedium: 4,
  elevationHigh: 8,
} as const;

/**
 * BORDER RADIUS - Convenience alias for Layout radius values
 * Use in styles: borderRadius: BorderRadius.lg
 */
export const BorderRadius = {
  sm: Layout.radiusSmall,
  md: Layout.radiusMedium,
  lg: Layout.radiusLarge,
  xl: Layout.radiusXLarge,
  full: Layout.radiusFull,
} as const;

/**
 * ANIMATION DURATIONS - Consistent timing
 * See animations.ts for full animation configurations
 */
export const Duration = {
  /** 150ms - Quick transitions */
  fast: 150,
  /** 250ms - Standard transitions */
  normal: 250,
  /** 350ms - Slow, emphasized transitions */
  slow: 350,
  /** 500ms - Very slow, dramatic transitions */
  slower: 500,
} as const;

/**
 * Z-INDEX LAYERS - Stacking order
 * Prevents z-index conflicts across components
 */
export const ZIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

/**
 * Spacing utility functions
 */
export const SpacingUtils = {
  /**
   * Get spacing value by name
   * @param size - Spacing size name
   * @returns Spacing value in pixels
   */
  getSpacing: (size: keyof typeof Spacing): number => {
    return Spacing[size];
  },

  /**
   * Create spacing with multiplier
   * @param baseSize - Base spacing size
   * @param multiplier - Multiply by this factor
   * @returns Calculated spacing value
   */
  multiply: (baseSize: keyof typeof Spacing, multiplier: number): number => {
    return Spacing[baseSize] * multiplier;
  },

  /**
   * Get responsive padding based on screen width
   * @param screenWidth - Current screen width
   * @returns Padding value
   */
  getResponsivePadding: (screenWidth: number): number => {
    if (screenWidth < 375) return Spacing.base;      // Small phones
    if (screenWidth < 768) return Spacing.lg;        // Standard phones
    return Spacing.xl;                               // Tablets/large phones
  },

  /**
   * Create shadow style object
   * @param elevation - Elevation level (low, medium, high)
   * @returns React Native shadow style
   */
  getShadowStyle: (elevation: 'low' | 'medium' | 'high') => {
    const elevationMap = {
      low: Layout.elevationLow,
      medium: Layout.elevationMedium,
      high: Layout.elevationHigh,
    };

    return {
      shadowColor: '#000',
      shadowOffset: Layout.shadowOffset,
      shadowOpacity: Layout.shadowOpacity,
      shadowRadius: Layout.shadowRadius,
      elevation: elevationMap[elevation],
    };
  },
} as const;

/**
 * Type definitions for spacing system
 */
export type SpacingValue = typeof Spacing[keyof typeof Spacing];
export type TouchTargetSize = typeof TouchTarget[keyof typeof TouchTarget];
export type BorderRadius = typeof Layout['radiusSmall' | 'radiusMedium' | 'radiusLarge' | 'radiusXLarge' | 'radiusFull'];
export type ElevationLevel = 'low' | 'medium' | 'high';
