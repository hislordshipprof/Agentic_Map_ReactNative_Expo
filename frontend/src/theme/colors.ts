/**
 * Color System - Agentic Mobile Map
 * 
 * Map-inspired color palette designed for conversational routing UI.
 * Follows requirements-frontend.md Phase 1.1, 3.3 and frontend-design principles.
 * 
 * Design Philosophy:
 * - Route-centric blues (navigation primary)
 * - Status-based greens/yellows/reds (stop classifications)
 * - High contrast for accessibility
 * - Vibrant but not overwhelming
 */

export const Colors = {
  /**
   * PRIMARY COLORS - Route & Navigation
   * Used for: Route polylines, primary actions, user messages
   */
  primary: {
    blue: '#2563EB',        // Route line, primary buttons
    lightBlue: '#DBEAFE',   // Route highlight backgrounds
    darkBlue: '#1E40AF',    // Active states, pressed buttons
  },

  /**
   * STATUS COLORS - Stop Classifications
   * Maps to DetourStatus from requirements-backend.md:
   * - NO_DETOUR (0-50m): Green
   * - MINIMAL (≤25% buffer): Light green
   * - ACCEPTABLE (26-75% buffer): Amber
   * - NOT_RECOMMENDED (>75% buffer): Red
   */
  status: {
    noDetour: '#10B981',      // Emerald 500 - Perfect stops
    minimal: '#34D399',       // Emerald 400 - Great stops
    acceptable: '#FBBF24',    // Amber 400 - Okay stops
    notRecommended: '#EF4444', // Red 500 - Avoid stops
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
  },

  /**
   * SPECIAL EFFECTS - Glassmorphism, overlays
   */
  effects: {
    glassBg: 'rgba(255, 255, 255, 0.8)',      // Frosted glass background
    glassBlur: 'rgba(255, 255, 255, 0.6)',    // Glass blur overlay
    shadow: 'rgba(0, 0, 0, 0.1)',             // Soft shadow
    shadowDark: 'rgba(0, 0, 0, 0.25)',        // Prominent shadow
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
