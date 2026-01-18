/**
 * Splash Screen Configuration - Agentic Mobile Map
 * 
 * Custom splash screen with branded colors and animated entrance.
 * Uses our theme's primary blue color.
 */

export const SplashConfig = {
  // Match theme primary blue
  backgroundColor: '#2563EB',
  
  // Brand colors
  colors: {
    primary: '#2563EB',
    light: '#DBEAFE',
    white: '#FFFFFF',
  },
  
  // Animation timings
  fadeInDuration: 500,
  displayDuration: 2000,
  fadeOutDuration: 300,
} as const;

export default SplashConfig;
