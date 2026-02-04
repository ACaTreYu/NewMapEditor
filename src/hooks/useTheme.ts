/**
 * useTheme - Win98 color scheme management hook
 *
 * Provides Win98 color scheme toggle (standard, high-contrast, desert) with:
 * - localStorage persistence
 * - Automatic class application to document.documentElement
 */

import { useState, useEffect, useCallback } from 'react';

export type Win98Scheme = 'standard' | 'high-contrast' | 'desert';

const STORAGE_KEY = 'win98-scheme';

/**
 * Get the stored scheme preference from localStorage
 */
function getStoredScheme(): Win98Scheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'standard' || stored === 'high-contrast' || stored === 'desert') {
      return stored;
    }
  } catch {
    // localStorage not available or error
  }
  return 'standard';
}

/**
 * Apply scheme class to document
 */
function applyScheme(scheme: Win98Scheme): void {
  const root = document.documentElement;
  root.classList.remove('theme-high-contrast', 'theme-desert');

  // Standard scheme uses default :root values (no class needed)
  if (scheme === 'high-contrast') {
    root.classList.add('theme-high-contrast');
  } else if (scheme === 'desert') {
    root.classList.add('theme-desert');
  }
}

export interface UseThemeReturn {
  /** Current Win98 color scheme (standard, high-contrast, or desert) */
  scheme: Win98Scheme;
  /** Set the color scheme */
  setScheme: (scheme: Win98Scheme) => void;
}

/**
 * Hook for managing Win98 color schemes
 *
 * @returns Scheme state and setter
 *
 * @example
 * const { scheme, setScheme } = useTheme();
 *
 * // Cycle through schemes
 * const cycleScheme = () => {
 *   const order: Win98Scheme[] = ['standard', 'high-contrast', 'desert'];
 *   const next = (order.indexOf(scheme) + 1) % 3;
 *   setScheme(order[next]);
 * };
 */
export function useTheme(): UseThemeReturn {
  const [scheme, setSchemeState] = useState<Win98Scheme>(getStoredScheme);

  // Apply scheme class when scheme changes
  useEffect(() => {
    applyScheme(scheme);
  }, [scheme]);

  // Persist scheme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, scheme);
    } catch {
      // localStorage not available
    }
  }, [scheme]);

  const setScheme = useCallback((newScheme: Win98Scheme) => {
    setSchemeState(newScheme);
  }, []);

  return {
    scheme,
    setScheme,
  };
}
