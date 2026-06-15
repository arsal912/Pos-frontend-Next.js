/**
 * Theme color presets.
 * Each theme overrides --primary, --primary-foreground, --ring, and --accent.
 * Values are in HSL format (without the `hsl()` wrapper) to match Tailwind/shadcn convention.
 */

export interface ThemePreset {
  id:      string;
  name:    string;
  primary: string;  // HSL values e.g. "243 75% 59%"
  ring:    string;
  accent:  string;
  hex:     string;  // for color swatches
  darkPrimary?: string; // optional dark-mode override
}

export const THEMES: ThemePreset[] = [
  {
    id:      'indigo',
    name:    'Indigo',
    primary: '243 75% 59%',
    ring:    '243 75% 59%',
    accent:  '175 84% 32%',
    hex:     '#6366f1',
    darkPrimary: '243 75% 65%',
  },
  {
    id:      'violet',
    name:    'Violet',
    primary: '262 83% 58%',
    ring:    '262 83% 58%',
    accent:  '262 60% 40%',
    hex:     '#8b5cf6',
    darkPrimary: '262 83% 68%',
  },
  {
    id:      'blue',
    name:    'Blue',
    primary: '217 91% 60%',
    ring:    '217 91% 60%',
    accent:  '199 89% 48%',
    hex:     '#3b82f6',
    darkPrimary: '217 91% 70%',
  },
  {
    id:      'cyan',
    name:    'Cyan',
    primary: '188 94% 43%',
    ring:    '188 94% 43%',
    accent:  '188 80% 32%',
    hex:     '#06b6d4',
    darkPrimary: '188 94% 55%',
  },
  {
    id:      'green',
    name:    'Green',
    primary: '142 71% 45%',
    ring:    '142 71% 45%',
    accent:  '158 64% 32%',
    hex:     '#22c55e',
    darkPrimary: '142 71% 55%',
  },
  {
    id:      'emerald',
    name:    'Emerald',
    primary: '160 84% 39%',
    ring:    '160 84% 39%',
    accent:  '160 70% 28%',
    hex:     '#10b981',
    darkPrimary: '160 84% 52%',
  },
  {
    id:      'orange',
    name:    'Orange',
    primary: '25 95% 53%',
    ring:    '25 95% 53%',
    accent:  '25 80% 40%',
    hex:     '#f97316',
    darkPrimary: '25 95% 63%',
  },
  {
    id:      'rose',
    name:    'Rose',
    primary: '347 77% 50%',
    ring:    '347 77% 50%',
    accent:  '347 60% 38%',
    hex:     '#f43f5e',
    darkPrimary: '347 77% 62%',
  },
  {
    id:      'pink',
    name:    'Pink',
    primary: '330 81% 60%',
    ring:    '330 81% 60%',
    accent:  '330 65% 45%',
    hex:     '#ec4899',
    darkPrimary: '330 81% 70%',
  },
  {
    id:      'slate',
    name:    'Slate',
    primary: '215 28% 35%',
    ring:    '215 28% 35%',
    accent:  '215 20% 26%',
    hex:     '#475569',
    darkPrimary: '215 28% 55%',
  },
];

export const DEFAULT_THEME_ID = 'indigo';

export function getTheme(id: string): ThemePreset {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
