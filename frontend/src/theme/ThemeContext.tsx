/**
 * Theme Context - Agentic Mobile Map
 *
 * Provides theme switching (light/dark) with AsyncStorage persistence.
 * Defaults to device color scheme, falls back to 'light'.
 */

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, type ThemePalette } from './palettes';

const THEME_STORAGE_KEY = '@agentic_map:theme';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemeMode;
  colors: ThemePalette;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

const defaultValue: ThemeContextValue = {
  theme: 'light',
  colors: LightColors,
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
};

export const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const deviceScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') {
          setThemeState(stored);
        } else if (deviceScheme === 'dark') {
          setThemeState('dark');
        }
      })
      .catch(() => {
        // Fall back to light
      })
      .finally(() => setIsLoaded(true));
  }, [deviceScheme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const colors = theme === 'dark' ? DarkColors : LightColors;
  const isDark = theme === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colors, toggleTheme, setTheme, isDark }),
    [theme, colors, toggleTheme, setTheme, isDark],
  );

  // Don't render children until theme is loaded to avoid flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
