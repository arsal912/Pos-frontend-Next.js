'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PROBE_URL      = '/api/backend/health'; // maps to /api/v1/health via Next.js proxy
const PROBE_INTERVAL = 30_000; // 30 seconds

export interface ConnectionStatus {
  isOnline:    boolean;
  lastChecked: Date | null;
  latencyMs:   number | null;
}

/**
 * Reliable connection detection.
 *
 * `navigator.onLine` is unreliable — it can say "online" when connected to a
 * router with no internet. This hook combines the browser flag with an active
 * HTTP probe to /api/v1/health every 30s.
 */
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline:    typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChecked: null,
    latencyMs:   null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const probe = useCallback(async () => {
    const t0 = Date.now();
    try {
      const res = await fetch(PROBE_URL, {
        method:  'GET',
        cache:   'no-store',
        signal:  AbortSignal.timeout(5_000),
      });
      const latencyMs = Date.now() - t0;
      setStatus({ isOnline: res.ok, lastChecked: new Date(), latencyMs });
    } catch {
      setStatus(s => ({ ...s, isOnline: false, lastChecked: new Date(), latencyMs: null }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial probe
    probe();

    // Periodic probe
    timerRef.current = setInterval(probe, PROBE_INTERVAL);

    // Native online/offline events (fast reaction, then confirm with probe)
    const onOnline  = () => { setStatus(s => ({ ...s, isOnline: true  })); probe(); };
    const onOffline = () => { setStatus(s => ({ ...s, isOnline: false })); };

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [probe]);

  return status;
}
