'use client';

/**
 * Detects when a new Service Worker version is available and prompts the user
 * to reload so the update takes effect.
 *
 * Edge case J: SW version mismatch.
 * When the app ships a new build, the SW cached in the browser is stale.
 * This hook detects the 'updatefound' event and surfaces a reload prompt.
 */

import { useCallback, useEffect, useState } from 'react';

export function useSwUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const handleUpdateFound = () => {
      const newWorker = reg?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        // New SW installed but not yet active — show prompt
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }
      });
    };

    navigator.serviceWorker.ready.then(r => {
      reg = r;
      reg.addEventListener('updatefound', handleUpdateFound);

      // Poll for updates every 5 minutes so long-running POS tabs catch updates
      pollTimer = setInterval(() => reg?.update().catch(() => {}), 5 * 60 * 1000);
    }).catch(() => {});

    // Also handle the case where a new SW controlled the page after a reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // SW just activated — page is running under the new version, no reload needed
      setUpdateAvailable(false);
    });

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      reg?.removeEventListener('updatefound', handleUpdateFound);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    // Tell the waiting SW to skip waiting, then reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }).catch(() => {});
    }
    window.location.reload();
  }, []);

  return { updateAvailable, applyUpdate };
}
