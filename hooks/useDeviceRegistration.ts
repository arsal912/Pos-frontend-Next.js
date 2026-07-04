'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { registerDevice, pingDevice, getOrCreateDeviceUUID, getDeviceId } from '@/lib/offline/device';

const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface DeviceState {
  deviceUUID: string | null;
  deviceId: number | null;
  isRegistered: boolean;
  isRegistering: boolean;
}

/**
 * Handles device registration on first POS load and periodic pings.
 * Call this hook inside the POS page or a POS-specific layout.
 */
export function useDeviceRegistration(): DeviceState {
  const user    = useAuthStore(s => s.user);
  const storeId = user?.store?.id;

  const [state, setState] = useState<DeviceState>({
    deviceUUID:    null,
    deviceId:      null,
    isRegistered:  false,
    isRegistering: false,
  });

  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!storeId || typeof window === 'undefined') return;

    let cancelled = false;

    const init = async () => {
      setState(s => ({ ...s, isRegistering: true }));
      try {
        const uuid = await getOrCreateDeviceUUID(storeId);
        const existingId = await getDeviceId(storeId);

        setState(s => ({
          ...s,
          deviceUUID:   uuid,
          deviceId:     existingId,
          isRegistering: true,
        }));

        // Register/re-register with server
        const reg = await registerDevice(storeId);
        if (cancelled) return;

        if (reg) {
          setState({
            deviceUUID:    reg.device_uuid,
            deviceId:      reg.device_id,
            isRegistered:  reg.is_active,
            isRegistering: false,
          });
        } else {
          // Offline — use locally cached IDs
          setState(s => ({
            ...s,
            isRegistered:  !!existingId,
            isRegistering: false,
          }));
        }
      } catch {
        if (!cancelled) setState(s => ({ ...s, isRegistering: false }));
      }
    };

    init();

    // Periodic ping
    pingTimerRef.current = setInterval(() => {
      if (navigator.onLine) pingDevice(storeId);
    }, PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
  }, [storeId]);

  return state;
}
