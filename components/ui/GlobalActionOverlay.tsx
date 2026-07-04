'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLoadingStore } from '@/store/loading';

const SHOW_DELAY_MS = 200;
// Safety valve: the axios instance has no request timeout, and some actions
// (exports, bulk imports) legitimately take a while. Don't let a hung or
// just-slow request block the whole page forever — after this long, drop
// back to a small non-blocking pill instead. The underlying request keeps
// running either way; this only affects whether we're blocking clicks.
const MAX_BLOCK_MS = 20_000;

/**
 * Blocks the whole page (so a second click can't fire a duplicate request)
 * and shows a "Working…" pill while any write request (POST/PUT/PATCH/DELETE)
 * is in flight — driven by the axios interceptors in lib/api.ts, so no page
 * needs its own saving/loading state just to get this feedback.
 *
 * Delayed by SHOW_DELAY_MS so near-instant actions don't flash the overlay.
 */
export function GlobalActionOverlay() {
  const activeMutations = useLoadingStore((s) => s.activeMutations);
  const [visible, setVisible] = useState(false);
  const [blocking, setBlocking] = useState(true);

  useEffect(() => {
    if (activeMutations > 0) {
      const showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      const unblockTimer = setTimeout(() => setBlocking(false), MAX_BLOCK_MS);
      return () => { clearTimeout(showTimer); clearTimeout(unblockTimer); };
    }
    setVisible(false);
    setBlocking(true);
  }, [activeMutations]);

  if (!visible) return null;

  const pill = (
    <div className="flex items-center gap-2.5 rounded-full border bg-card px-4 py-2.5 shadow-xl">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm font-medium">Working…</span>
    </div>
  );

  if (!blocking) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none" aria-live="polite">
        {pill}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center pb-8 bg-background/10 cursor-wait sm:items-center sm:pb-0"
      aria-live="polite"
      aria-busy="true"
    >
      {pill}
    </div>
  );
}
