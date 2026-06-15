'use client';

/**
 * ThemeSelector — color swatch grid for picking a UI theme.
 * Drop into any settings page. Reads/writes via useTheme().
 */

import { Check } from 'lucide-react';
import { useTheme } from '@/components/ui/ThemeProvider';
import { cn } from '@/lib/utils';

export function ThemeSelector({ className }: { className?: string }) {
  const { themeId, setTheme, themes } = useTheme();

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-medium">Theme Color</p>
      <div className="flex flex-wrap gap-3">
        {themes.map(t => (
          <button
            key={t.id}
            title={t.name}
            onClick={() => setTheme(t.id)}
            className={cn(
              'relative h-9 w-9 rounded-full border-2 transition-all duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              themeId === t.id
                ? 'border-foreground scale-110 shadow-lg'
                : 'border-transparent hover:border-muted-foreground/30'
            )}
            style={{ backgroundColor: t.hex }}
          >
            {themeId === t.id && (
              <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Current: <span className="font-medium text-foreground capitalize">{themes.find(t => t.id === themeId)?.name}</span>
        {' '}· Changes apply instantly and are saved to this browser.
      </p>
    </div>
  );
}
