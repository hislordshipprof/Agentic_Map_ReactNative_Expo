/**
 * Color System - Agentic Mobile Map
 *
 * Modern dark theme with teal/emerald accents for conversational routing UI.
 * Inspired by glassmorphism design with smooth gradients.
 *
 * Design Philosophy:
 * - Dark backgrounds with teal/emerald accents (premium feel)
 * - Glassmorphism for cards and overlays
 * - High contrast for accessibility
 * - Smooth gradients for visual interest
 */

export const Colors = {
  /**
   * PRIMARY COLORS - Teal/Emerald Accent (Navigation focused)
   * Used for: CTAs, accent elements, active states
   */
  primary: {
    blue: '#2563EB',        // Route line, secondary actions
    lightBlue: '#DBEAFE',   // Route highlight backgrounds
    darkBlue: '#1E40AF',    // Active states, pressed buttons
    // Teal/Emerald accent (primary accent color)
    teal: '#14B8A6',        // Main accent color
    tealLight: '#5EEAD4',   // Lighter teal for highlights
    tealDark: '#0D9488',    // Darker teal for pressed states
    emerald: '#10B981',     // Emerald for success/positive
  },

  /**
   * DARK THEME - Backgrounds & Surfaces
   * Modern dark mode inspired by premium AI assistants
   */
  dark: {
    // Background layers (darkest to lightest)
    background: '#0F1419',      // Deepest background
    surface: '#1A1F26',         // Card backgrounds
    elevated: '#242B33',        // Elevated surfaces
    overlay: '#2D3640',         // Overlays, modals

    // Gradient backgrounds
    gradientStart: '#0F1419',   // Gradient start (darker)
    gradientMid: '#152125',     // Gradient middle (teal tint)
    gradientEnd: '#1A2A2E',     // Gradient end (teal tint)

    // Text on dark backgrounds
    text: {
      primary: '#FFFFFF',       // White text
      secondary: '#9CA3AF',     // Muted text (gray-400)
      tertiary: '#6B7280',      // Very muted (gray-500)
      accent: '#5EEAD4',        // Teal accent text
    },

    // Borders on dark
    border: '#2D3640',          // Subtle border
    borderLight: '#3D4650',     // Lighter border
    divider: '#242B33',         // Divider lines
  },

  /**
   * STATUS COLORS - Stop Classifications & General States
   * Maps to DetourStatus from requirements-backend.md:
   * - NO_DETOUR (0-50m): Green
   * - MINIMAL (≤25% buffer): Light green
   * - ACCEPTABLE (26-75% buffer): Amber
   * - NOT_RECOMMENDED (>75% buffer): Red
   */
  status: {
    // Detour status colors
    noDetour: '#10B981',      // Emerald 500 - Perfect stops
    minimal: '#34D399',       // Emerald 400 - Great stops
    acceptable: '#FBBF24',    // Amber 400 - Okay stops
    notRecommended: '#EF4444', // Red 500 - Avoid stops
    // General semantic status
    success: '#10B981',       // Success green
    successBg: 'rgba(16, 185, 129, 0.15)', // Success background
    warning: '#F59E0B',       // Warning amber
    warningBg: 'rgba(245, 158, 11, 0.15)', // Warning background
    error: '#EF4444',         // Error red
    errorBg: 'rgba(239, 68, 68, 0.15)',    // Error background
    info: '#3B82F6',          // Info blue
    infoBg: 'rgba(59, 130, 246, 0.15)',    // Info background
  },

  /**
   * CONFIDENCE COLORS - NLU Confidence Levels
   * Maps to NLU confidence routing from systemPrompt.md:
   * - HIGH (≥0.80): Green (execute immediately)
   * - MEDIUM (0.60-0.79): Orange (confirmation dialog)
   * - LOW (<0.60): Red (alternatives dialog)
   */
  confidence: {
    high: '#10B981',       // ≥0.80 - Green
    medium: '#F59E0B',     // 0.60-0.79 - Amber
    low: '#EF4444',        // <0.60 - Red
  },

  /**
   * UI ELEMENTS - Chat & Interface
   * Per requirements-frontend.md Phase 1.1:
   * - User messages on right (blue)
   * - System messages on left (gray)
   */
  ui: {
    // Message bubbles
    userMessage: '#2563EB',      // User bubble background (blue)
    systemMessage: '#F3F4F6',    // System bubble background (gray-100)
    
    // Backgrounds
    background: '#FFFFFF',       // Main screen background
    surface: '#F9FAFB',          // Cards, containers (gray-50)
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal backdrop
    
    // Text colors
    text: {
      primary: '#111827',        // Main text (gray-900)
      secondary: '#6B7280',      // Secondary text (gray-500)
      tertiary: '#9CA3AF',       // Tertiary text (gray-400)
      onPrimary: '#FFFFFF',      // Text on blue backgrounds
      onDark: '#FFFFFF',         // Text on dark backgrounds
    },
    
    // Borders & dividers
    border: '#E5E7EB',           // Borders (gray-200)
    divider: '#F3F4F6',          // Subtle dividers (gray-100)
  },

  /**
   * MAP ELEMENTS - Visual markers
   * Per requirements-frontend.md Phase 3.3:
   * - Green pin: Start location
   * - Blue pins: Stop waypoints (numbered)
   * - Red pin: Final destination
   */
  map: {
    start: '#10B981',            // Start marker (green)
    stop: '#2563EB',             // Stop markers (blue)
    destination: '#EF4444',      // Destination marker (red)
    polyline: '#2563EB',         // Route line (blue)
    polylineActive: '#1E40AF',   // Active route segment (dark blue)
  },

  /**
   * SEMANTIC COLORS - Feedback & States
   */
  semantic: {
    success: '#10B981',          // Success messages, confirmations
    warning: '#F59E0B',          // Warnings, cautions
    error: '#EF4444',            // Errors, failures
    info: '#3B82F6',             // Info messages, tips
  },

  /**
   * INTERACTIVE STATES - Buttons & touchables
   */
  interactive: {
    primaryDefault: '#2563EB',   // Primary button default
    primaryHover: '#1D4ED8',     // Primary button hover
    primaryPressed: '#1E40AF',   // Primary button pressed
    primaryDisabled: '#93C5FD',  // Primary button disabled
    
    secondaryDefault: '#F3F4F6', // Secondary button default
    secondaryHover: '#E5E7EB',   // Secondary button hover
    secondaryPressed: '#D1D5DB', // Secondary button pressed
  },

  /**
   * GRADIENTS - Backgrounds & effects
   * For splash screens, hero sections, ambient effects
   */
  gradients: {
    primary: ['#3B82F6', '#2563EB'],      // Blue gradient
    success: ['#34D399', '#10B981'],      // Green gradient
    sunset: ['#F59E0B', '#EF4444'],       // Amber to red
    map: ['#DBEAFE', '#BFDBFE', '#93C5FD'], // Light blue gradient
    // Dark theme gradients
    darkTeal: ['#0F1419', '#152125', '#1A2A2E'],  // Dark with teal tint
    darkPure: ['#0F1419', '#1A1F26', '#242B33'],  // Pure dark gradient
    tealGlow: ['#0D9488', '#14B8A6', '#5EEAD4'], // Teal glow effect
    // Radial gradients (for background effects)
    darkRadial: {
      colors: ['#1A2A2E', '#152125', '#0F1419'],
      center: { x: 0.5, y: 0 },
    },
  },

  /**
   * SPECIAL EFFECTS - Glassmorphism, overlays
   * Enhanced for dark theme with modern glass effects
   */
  effects: {
    // Light theme glass
    glassBg: 'rgba(255, 255, 255, 0.8)',
    glassBlur: 'rgba(255, 255, 255, 0.6)',
    // Dark theme glass (frosted dark)
    glassDark: 'rgba(26, 31, 38, 0.8)',         // Dark frosted glass
    glassDarkLight: 'rgba(36, 43, 51, 0.6)',    // Lighter dark glass
    glassDarkBorder: 'rgba(255, 255, 255, 0.1)', // Subtle white border
    // Teal glass effect
    glassTeal: 'rgba(20, 184, 166, 0.15)',      // Teal tinted glass
    glassTealBorder: 'rgba(94, 234, 212, 0.2)', // Teal border
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',              // Standard overlay
    overlayDark: 'rgba(0, 0, 0, 0.7)',          // Dark overlay for modals
    overlayLight: 'rgba(0, 0, 0, 0.3)',         // Light overlay
    // Shadows
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowDark: 'rgba(0, 0, 0, 0.25)',
    shadowDeep: 'rgba(0, 0, 0, 0.5)',           // Deep shadow for dark theme
    // Glow effects
    glowTeal: 'rgba(20, 184, 166, 0.4)',        // Teal glow
    glowEmerald: 'rgba(16, 185, 129, 0.4)',     // Emerald glow
  },

  /**
   * CHIP/BUTTON STYLES - For pill-shaped action chips
   */
  chips: {
    // Default chip (dark theme)
    default: {
      background: 'rgba(45, 54, 64, 0.8)',
      border: 'rgba(255, 255, 255, 0.1)',
      text: '#FFFFFF',
    },
    // Active/Selected chip
    active: {
      background: 'rgba(20, 184, 166, 0.2)',
      border: 'rgba(20, 184, 166, 0.5)',
      text: '#5EEAD4',
    },
    // Suggested action chip
    suggested: {
      background: 'rgba(94, 234, 212, 0.1)',
      border: 'rgba(94, 234, 212, 0.3)',
      text: '#5EEAD4',
    },
  },
} as const;

/**
 * Color utility functions
 */
export const ColorUtils = {
  /**
   * Get confidence color based on score
   * @param confidence - NLU confidence score (0-1)
   * @returns Hex color string
   */
  getConfidenceColor: (confidence: number): string => {
    if (confidence >= 0.80) return Colors.confidence.high;
    if (confidence >= 0.60) return Colors.confidence.medium;
    return Colors.confidence.low;
  },

  /**
   * Get status color based on detour classification
   * @param status - Detour status string
   * @returns Hex color string
   */
  getStatusColor: (status: 'NO_DETOUR' | 'MINIMAL' | 'ACCEPTABLE' | 'NOT_RECOMMENDED'): string => {
    switch (status) {
      case 'NO_DETOUR':
        return Colors.status.noDetour;
      case 'MINIMAL':
        return Colors.status.minimal;
      case 'ACCEPTABLE':
        return Colors.status.acceptable;
      case 'NOT_RECOMMENDED':
        return Colors.status.notRecommended;
      default:
        return Colors.ui.text.secondary;
    }
  },

  /**
   * Add alpha channel to hex color
   * @param hexColor - Hex color string
   * @param alpha - Alpha value (0-1)
   * @returns RGBA color string
   */
  withAlpha: (hexColor: string, alpha: number): string => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
};

/**
 * Type definitions for color system
 */
export type ColorPalette = typeof Colors;
export type PrimaryColor = keyof typeof Colors.primary;
export type StatusColor = keyof typeof Colors.status;
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type DetourStatus = 'NO_DETOUR' | 'MINIMAL' | 'ACCEPTABLE' | 'NOT_RECOMMENDED';
