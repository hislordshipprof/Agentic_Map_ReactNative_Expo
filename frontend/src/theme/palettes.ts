/**
 * Dual Theme Palettes - Agentic Mobile Map
 *
 * Light (default) and Dark color palettes sharing primary, status,
 * confidence, and map sections; diverging on background, surface, text,
 * border, effects, and message sections.
 */

/** Shared primary accent colors (identical in both themes) */
const sharedPrimary = {
  teal: '#14B8A6',
  tealLight: '#5EEAD4',
  tealDark: '#0D9488',
  emerald: '#10B981',
  blue: '#2563EB',
  lightBlue: '#DBEAFE',
  darkBlue: '#1E40AF',
} as const;

/** Shared status colors (identical in both themes) */
const sharedStatus = {
  noDetour: '#10B981',
  minimal: '#34D399',
  acceptable: '#FBBF24',
  notRecommended: '#EF4444',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.15)',
} as const;

/** Shared confidence colors (identical in both themes) */
const sharedConfidence = {
  high: '#10B981',
  medium: '#F59E0B',
  low: '#EF4444',
} as const;

/** Shared map element colors (identical in both themes) */
const sharedMap = {
  start: '#10B981',
  stop: '#7C3AED',
  destination: '#EF4444',
  polyline: '#14B8A6',
  polylineActive: '#0D9488',
} as const;

/** Accent colors shared across themes */
const sharedAccent = {
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
  purpleDark: '#6D28D9',
} as const;

// ---------------------------------------------------------------------------
// Light Palette
// ---------------------------------------------------------------------------

export const LightColors = {
  primary: sharedPrimary,
  status: sharedStatus,
  confidence: sharedConfidence,
  map: sharedMap,
  accent: sharedAccent,

  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFB',
    tertiary: '#F1F5F9',
  },

  surface: {
    card: '#FFFFFF',
    elevated: '#F3F5F7',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  text: {
    primary: '#1A2332',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    accent: '#0D9488',
    inverse: '#FFFFFF',
  },

  border: {
    default: '#E5E7EB',
    light: '#F3F4F6',
    divider: '#F3F4F6',
  },

  effects: {
    shadow: 'rgba(0, 0, 0, 0.08)',
    shadowMedium: 'rgba(0, 0, 0, 0.12)',
    shadowDeep: 'rgba(0, 0, 0, 0.2)',
    glassBg: 'rgba(255, 255, 255, 0.9)',
    glassBorder: 'rgba(0, 0, 0, 0.06)',
    glowTeal: 'rgba(20, 184, 166, 0.2)',
    glowPurple: 'rgba(124, 58, 237, 0.2)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  message: {
    user: '#1E293B',
    userText: '#FFFFFF',
    system: '#F3F4F6',
    systemText: '#1A2332',
    systemBorder: '#E5E7EB',
  },

  chip: {
    default: {
      background: '#F3F4F6',
      border: '#E5E7EB',
      text: '#1A2332',
    },
    active: {
      background: 'rgba(20, 184, 166, 0.1)',
      border: 'rgba(20, 184, 166, 0.4)',
      text: '#0D9488',
    },
    suggested: {
      background: 'rgba(20, 184, 166, 0.08)',
      border: 'rgba(20, 184, 166, 0.25)',
      text: '#0D9488',
    },
  },

  gradients: {
    primary: ['#14B8A6', '#0D9488'] as readonly string[],
    background: ['#FFFFFF', '#F8FAFB'] as readonly string[],
    tealGlow: ['rgba(20, 184, 166, 0.08)', 'transparent'] as readonly string[],
  },

  tabBar: {
    background: '#FFFFFF',
    active: '#14B8A6',
    inactive: '#9CA3AF',
    border: '#E5E7EB',
  },

  input: {
    background: '#F3F5F7',
    border: '#E5E7EB',
    text: '#1A2332',
    placeholder: '#9CA3AF',
  },
} as const;

// ---------------------------------------------------------------------------
// Dark Palette
// ---------------------------------------------------------------------------

export const DarkColors = {
  primary: sharedPrimary,
  status: sharedStatus,
  confidence: sharedConfidence,
  map: sharedMap,
  accent: sharedAccent,

  background: {
    primary: '#0F1419',
    secondary: '#1A1F26',
    tertiary: '#242B33',
  },

  surface: {
    card: '#1A1F26',
    elevated: '#242B33',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    accent: '#5EEAD4',
    inverse: '#1A2332',
  },

  border: {
    default: '#2D3640',
    light: '#3D4650',
    divider: '#242B33',
  },

  effects: {
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowMedium: 'rgba(0, 0, 0, 0.4)',
    shadowDeep: 'rgba(0, 0, 0, 0.6)',
    glassBg: 'rgba(26, 31, 38, 0.8)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glowTeal: 'rgba(20, 184, 166, 0.4)',
    glowPurple: 'rgba(124, 58, 237, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  message: {
    user: '#1E293B',
    userText: '#FFFFFF',
    system: '#242B33',
    systemText: '#FFFFFF',
    systemBorder: '#2D3640',
  },

  chip: {
    default: {
      background: 'rgba(45, 54, 64, 0.8)',
      border: 'rgba(255, 255, 255, 0.1)',
      text: '#FFFFFF',
    },
    active: {
      background: 'rgba(20, 184, 166, 0.2)',
      border: 'rgba(20, 184, 166, 0.5)',
      text: '#5EEAD4',
    },
    suggested: {
      background: 'rgba(94, 234, 212, 0.1)',
      border: 'rgba(94, 234, 212, 0.3)',
      text: '#5EEAD4',
    },
  },

  gradients: {
    primary: ['#14B8A6', '#0D9488'] as readonly string[],
    background: ['#0A1A1F', '#0F1419'] as readonly string[],
    tealGlow: ['rgba(20, 184, 166, 0.15)', 'transparent'] as readonly string[],
  },

  tabBar: {
    background: '#1A1F26',
    active: '#14B8A6',
    inactive: '#6B7280',
    border: '#2D3640',
  },

  input: {
    background: '#242B33',
    border: '#2D3640',
    text: '#FFFFFF',
    placeholder: '#6B7280',
  },
} as const;

/** The shape of a theme palette (both Light and Dark conform to this) */
export type ThemePalette = typeof LightColors;
