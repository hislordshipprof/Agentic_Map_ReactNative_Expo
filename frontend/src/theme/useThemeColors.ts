/**
 * useThemeColors - Agentic Mobile Map
 *
 * Convenience hook to access the current theme palette.
 *
 * Usage:
 * ```ts
 * const colors = useThemeColors();
 * // colors.background.primary, colors.text.primary, etc.
 * ```
 */

import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from './ThemeContext';
import type { ThemePalette } from './palettes';

/** Returns the active color palette (light or dark). */
export function useThemeColors(): ThemePalette {
  const { colors } = useContext(ThemeContext);
  return colors;
}

/** Returns the full theme context: theme mode, colors, toggle, etc. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
