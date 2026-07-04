/**
 * Device identity management for offline POS.
 *
 * Each browser/tab that opens the POS screen gets a UUID persisted in IndexedDB.
 * The UUID is registered with the server to create an audit trail of which
 * physical device created which offline sales.
 */

import { getDb } from './db';
import { apiClient } from '@/lib/api';

const DEVICE_UUID_KEY   = 'device_uuid';
const DEVICE_ID_KEY     = 'device_id';
const DEVICE_NAME_KEY   = 'device_name';

/** Generate a UUID v4 without external dependencies. */
function generateUUIDv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Derive the short ID used in offline sale numbers (last 6 chars of UUID, uppercase). */
export function shortDeviceId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(-6).toUpperCase();
}

// ── Device UUID (persisted in IndexedDB) ────────────────────────────────────

export async function getOrCreateDeviceUUID(storeId: number): Promise<string> {
  const db  = getDb(storeId);
  const row = await db.device_info.get(DEVICE_UUID_KEY);
  if (row?.value) return row.value as string;

  const uuid = generateUUIDv4();
  await db.device_info.put({ key: DEVICE_UUID_KEY, value: uuid });
  return uuid;
}

export async function getDeviceId(storeId: number): Promise<number | null> {
  const db  = getDb(storeId);
  const row = await db.device_info.get(DEVICE_ID_KEY);
  return row?.value != null ? Number(row.value) : null;
}

export async function getDeviceName(storeId: number): Promise<string> {
  const db  = getDb(storeId);
  const row = await db.device_info.get(DEVICE_NAME_KEY);
  return (row?.value as string) ?? 'POS Terminal';
}

// ── Server registration ───────────────────────────────────────────────────────

export interface DeviceRegistration {
  device_id: number;
  device_uuid: string;
  device_name: string;
  registered_at: string;
  is_active: boolean;
  sync_endpoint: string;
}

/**
 * Register (or re-register) this device with the server.
 * Idempotent — safe to call on every POS load.
 */
export async function registerDevice(storeId: number): Promise<DeviceRegistration | null> {
  try {
    const uuid = await getOrCreateDeviceUUID(storeId);
    const name = await getDeviceName(storeId);

    const res = await apiClient.post<DeviceRegistration>('/store/pos/devices/register', {
      device_uuid: uuid,
      device_name: name,
      user_agent:  typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    const data = res.data as any as DeviceRegistration;

    // Persist server-assigned ID
    const db = getDb(storeId);
    await db.device_info.bulkPut([
      { key: DEVICE_ID_KEY,   value: data.device_id },
      { key: DEVICE_NAME_KEY, value: data.device_name },
    ]);

    return data;
  } catch {
    return null; // offline — registration will retry on next load
  }
}

/**
 * Heartbeat ping — updates last_seen_at on server.
 * Called every 5 minutes when POS is open and online.
 */
export async function pingDevice(storeId: number): Promise<void> {
  try {
    const deviceId = await getDeviceId(storeId);
    if (!deviceId) return;

    // Report pending offline sale count so the server can surface it in admin views
    const db = getDb(storeId);
    const pendingCount = await db.pending_sales
      .where('status').equals('pending_sync')
      .count();

    await apiClient.post(`/store/pos/devices/${deviceId}/ping`, {
      pending_count: pendingCount,
    });
  } catch {
    // non-critical, ignore
  }
}

// ── Offline sale number generation ────────────────────────────────────────────

const SEQ_KEY = 'offline_sale_sequence';

/**
 * Generate the next offline sale number: OFF-{DEVICE_SHORT_ID}-{6-digit-seq}
 * Uses atomic IndexedDB increment to avoid duplicates.
 */
export async function nextOfflineSaleNumber(storeId: number): Promise<string> {
  const db  = getDb(storeId);
  const uuid = await getOrCreateDeviceUUID(storeId);
  const short = shortDeviceId(uuid);

  // Atomic increment via Dexie transaction
  let seq = 1;
  await db.transaction('rw', db.device_info, async () => {
    const row = await db.device_info.get(SEQ_KEY);
    seq = row?.value ? Number(row.value) + 1 : 1;
    await db.device_info.put({ key: SEQ_KEY, value: seq });
  });

  return `OFF-${short}-${String(seq).padStart(6, '0')}`;
}
