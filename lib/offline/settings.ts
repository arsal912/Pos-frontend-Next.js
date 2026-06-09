/**
 * Offline mode user-configurable settings, stored in IndexedDB store_meta.
 *
 * These are device-level preferences (not server-synced), so each device can
 * have its own configuration. The store owner sets them via /dashboard/settings/pos.
 */

import { getDb } from './db';

export interface OfflineSettings {
  cached_products_limit:        number;  // max products to cache (default 1000)
  cached_customers_limit:       number;  // max customers to cache (default 500)
  stale_warning_hours:          number;  // stale data threshold in hours (default 4)
  allow_offline_negative_stock: boolean; // override per-product allow_negative_stock offline
  allow_offline_credit_sales:   boolean; // allow on_credit payments when offline
}

const SETTINGS_KEY = 'offline_settings';

const DEFAULTS: OfflineSettings = {
  cached_products_limit:        1000,
  cached_customers_limit:       500,
  stale_warning_hours:          4,
  allow_offline_negative_stock: false,
  allow_offline_credit_sales:   true,
};

export async function getOfflineSettings(storeId: number): Promise<OfflineSettings> {
  try {
    const db  = getDb(storeId);
    const row = await db.store_meta.get(SETTINGS_KEY);
    if (!row?.value) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(row.value as Partial<OfflineSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveOfflineSettings(storeId: number, settings: Partial<OfflineSettings>): Promise<OfflineSettings> {
  const db       = getDb(storeId);
  const current  = await getOfflineSettings(storeId);
  const updated  = { ...current, ...settings };
  await db.store_meta.put({ key: SETTINGS_KEY, value: updated });
  return updated;
}

// ── Storage quota helpers ─────────────────────────────────────────────────

export interface StorageEstimate {
  usedMB:      number;
  quotaMB:     number;
  percentUsed: number;
  isNearLimit: boolean; // >80% used
}

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !('storage' in navigator) || !('estimate' in navigator.storage)) {
    return null;
  }
  try {
    const { usage = 0, quota = 1 } = await navigator.storage.estimate();
    const pct = quota > 0 ? Math.round((usage / quota) * 100) : 0;
    return {
      usedMB:      Math.round(usage   / 1_048_576),
      quotaMB:     Math.round(quota   / 1_048_576),
      percentUsed: pct,
      isNearLimit: pct >= 80,
    };
  } catch {
    return null;
  }
}
