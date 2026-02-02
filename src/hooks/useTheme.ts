/**
 * useTheme - Theme state management hook
 *
 * Provides three-way theme toggle (dark, light, system) with:
 * - localStorage persistence
 * - System preference detection
 * - Automatic class application to document.documentElement
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * Get the system's preferred color scheme
 */
function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the stored theme preference from localStorage
 */
function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage not available or error
  }
  return 'system';
}

/**
 * Calculate effective theme based on preference
 */
function getEffectiveTheme(theme: Theme): EffectiveTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply theme class to document
 */
function applyTheme(effectiveTheme: EffectiveTheme): void {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(`theme-${effectiveTheme}`);
}

export interface UseThemeReturn {
  /** Current theme preference (light, dark, or system) */
  theme: Theme;
  /** Computed theme being applied (light or dark) */
  effectiveTheme: EffectiveTheme;
  /** Set the theme preference */
  setTheme: (theme: Theme) => void;
}

/**
 * Hook for managing application theme
 *
 * @returns Theme state and setter
 *
 * @example
 * const { theme, effectiveTheme, setTheme } = useTheme();
 *
 * // Cycle through themes
 * const cycleTheme = () => {
 *   const order = ['system', 'light', 'dark'];
 *   const next = (order.indexOf(theme) + 1) % 3;
 *   setTheme(order[next]);
 * };
 */
export function useTheme(): UseThemeReturn {
  const [themeChoice, setThemeChoice] = useState<Theme>(getStoredTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    getEffectiveTheme(getStoredTheme())
  );

  // Apply theme class when effective theme changes
  useEffect(() => {
    applyTheme(effectiveTheme);
  }, [effectiveTheme]);

  // Persist theme choice to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeChoice);
    } catch {
      // localStorage not available
    }
  }, [themeChoice]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (themeChoice !== 'system') {
      setEffectiveTheme(themeChoice);
      return;
    }

    // Set initial value
    setEffectiveTheme(getSystemTheme());

    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setEffectiveTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeChoice]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeChoice(newTheme);
  }, []);

  return {
    theme: themeChoice,
    effectiveTheme,
    setTheme,
  };
}
