'use client';

/**
 * ThemeProvider — applies the selected color theme by injecting CSS variable
 * overrides onto :root. Reads the chosen theme from localStorage on mount.
 *
 * Usage: wrap layout or page root with <ThemeProvider storeKey="dashboard_theme" />
 * Two separate keys allow admin and store-admin to have different themes.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEMES, DEFAULT_THEME_ID, getTheme, type ThemePreset } from '@/lib/themes';

interface ThemeContextValue {
  themeId:   string;
  theme:     ThemePreset;
  setTheme:  (id: string) => void;
  themes:    ThemePreset[];
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId:  DEFAULT_THEME_ID,
  theme:    getTheme(DEFAULT_THEME_ID),
  setTheme: () => {},
  themes:   THEMES,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(preset: ThemePreset) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const primary = isDark ? (preset.darkPrimary ?? preset.primary) : preset.primary;

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--ring',    preset.ring);
  root.style.setProperty('--accent',  preset.accent);
}

export function ThemeProvider({
  children,
  storageKey = 'pos_theme',
}: {
  children: React.ReactNode;
  storageKey?: string;
}) {
  const [themeId, setThemeIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID;
    return localStorage.getItem(storageKey) ?? DEFAULT_THEME_ID;
  });

  // Apply on mount + whenever themeId changes
  useEffect(() => {
    const preset = getTheme(themeId);
    applyTheme(preset);
  }, [themeId]);

  const setTheme = useCallback((id: string) => {
    setThemeIdState(id);
    localStorage.setItem(storageKey, id);
    applyTheme(getTheme(id));
  }, [storageKey]);

  const value: ThemeContextValue = {
    themeId,
    theme:   getTheme(themeId),
    setTheme,
    themes:  THEMES,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
