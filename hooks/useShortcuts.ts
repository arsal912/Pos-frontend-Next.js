'use client';

import { useState, useCallback } from 'react';
import {
  ShortcutMap,
  loadShortcuts,
  saveShortcuts,
  resetShortcuts,
} from '@/lib/shortcuts';

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(() => loadShortcuts());

  const update = useCallback((next: ShortcutMap) => {
    saveShortcuts(next);
    setShortcuts(next);
  }, []);

  const reset = useCallback(() => {
    const defaults = resetShortcuts();
    setShortcuts(defaults);
    return defaults;
  }, []);

  return { shortcuts, update, reset };
}
