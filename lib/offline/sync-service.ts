/**
 * OfflineSyncService — pulls server data into IndexedDB.
 *
 * Call order: manifest → decide full vs incremental → products + customers + reference
 * All writes use bulkPut so partial re-sync is safe (upsert semantics).
 */

import { getDb, type CachedProduct, type CachedCustomer, type CachedCategory, type CachedTaxRate, type CachedUnit, type StoreMeta } from './db';
import { apiClient } from '@/lib/api';

export interface SyncResult {
  products_synced:  number;
  customers_synced: number;
  reference_synced: boolean;
  duration_ms:      number;
  synced_at:        string;
  error?:           string;
}

const LAST_FULL_SYNC_KEY         = 'last_full_sync';
const LAST_PRODUCT_SYNC_KEY      = 'last_product_sync';
const LAST_CUSTOMER_SYNC_KEY     = 'last_customer_sync';
const LAST_REFERENCE_SYNC_KEY    = 'last_reference_sync';
const PRODUCT_COUNT_KEY          = 'cached_product_count';
const CUSTOMER_COUNT_KEY         = 'cached_customer_count';

export class OfflineSyncService {
  constructor(private readonly storeId: number) {}

  private get db() { return getDb(this.storeId); }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Full sync: clear + repopulate all tables. Used on first load. */
  async fullSync(onProgress?: (msg: string) => void): Promise<SyncResult> {
    const t0 = Date.now();
    let productsSynced  = 0;
    let customersSynced = 0;
    let referenceSynced = false;

    try {
      onProgress?.('Syncing reference data...');
      await this.syncReference();
      referenceSynced = true;

      onProgress?.('Downloading products...');
      productsSynced  = await this.syncProducts(null);

      onProgress?.('Downloading customers...');
      customersSynced = await this.syncCustomers(null);

      const now = new Date().toISOString();
      await this.db.device_info.bulkPut([
        { key: LAST_FULL_SYNC_KEY,      value: now },
        { key: LAST_PRODUCT_SYNC_KEY,   value: now },
        { key: LAST_CUSTOMER_SYNC_KEY,  value: now },
        { key: LAST_REFERENCE_SYNC_KEY, value: now },
        { key: PRODUCT_COUNT_KEY,       value: productsSynced },
        { key: CUSTOMER_COUNT_KEY,      value: customersSynced },
      ]);

      const result: SyncResult = {
        products_synced:  productsSynced,
        customers_synced: customersSynced,
        reference_synced: referenceSynced,
        duration_ms:      Date.now() - t0,
        synced_at:        now,
      };

      await this.writeSyncLog('full', 'success', result);
      onProgress?.(`Sync complete — ${productsSynced} products, ${customersSynced} customers`);
      return result;

    } catch (err: any) {
      const result: SyncResult = {
        products_synced:  productsSynced,
        customers_synced: customersSynced,
        reference_synced: referenceSynced,
        duration_ms:      Date.now() - t0,
        synced_at:        new Date().toISOString(),
        error:            err?.message ?? 'Unknown error',
      };
      await this.writeSyncLog('full', 'error', result);
      throw err;
    }
  }

  /** Incremental sync: only fetch records updated since last sync. */
  async incrementalSync(): Promise<SyncResult> {
    const t0 = Date.now();
    let productsSynced  = 0;
    let customersSynced = 0;

    try {
      // Check manifest to decide if incremental is worth it
      const manifest = await this.fetchManifest();

      const lastProductSync  = await this.getKey(LAST_PRODUCT_SYNC_KEY);
      const lastCustomerSync = await this.getKey(LAST_CUSTOMER_SYNC_KEY);

      productsSynced  = await this.syncProducts(lastProductSync as string | null);
      customersSynced = await this.syncCustomers(lastCustomerSync as string | null);

      const now = new Date().toISOString();
      await this.db.device_info.bulkPut([
        { key: LAST_PRODUCT_SYNC_KEY,  value: now },
        { key: LAST_CUSTOMER_SYNC_KEY, value: now },
        { key: PRODUCT_COUNT_KEY,      value: manifest?.product_count  ?? productsSynced },
        { key: CUSTOMER_COUNT_KEY,     value: manifest?.customer_count ?? customersSynced },
      ]);

      const result: SyncResult = {
        products_synced:  productsSynced,
        customers_synced: customersSynced,
        reference_synced: false,
        duration_ms:      Date.now() - t0,
        synced_at:        now,
      };

      await this.writeSyncLog('incremental', 'success', result);
      return result;

    } catch (err: any) {
      const result: SyncResult = {
        products_synced:  productsSynced,
        customers_synced: customersSynced,
        reference_synced: false,
        duration_ms:      Date.now() - t0,
        synced_at:        new Date().toISOString(),
        error:            err?.message ?? 'Unknown error',
      };
      await this.writeSyncLog('incremental', 'error', result);
      throw err;
    }
  }

  /** True if the device has never done a full sync (IndexedDB is empty). */
  async needsFullSync(): Promise<boolean> {
    const lastSync = await this.getKey(LAST_FULL_SYNC_KEY);
    return !lastSync;
  }

  async getLastSyncAt(): Promise<Date | null> {
    const raw = await this.getKey(LAST_FULL_SYNC_KEY) ?? await this.getKey(LAST_PRODUCT_SYNC_KEY);
    return raw ? new Date(raw as string) : null;
  }

  async getCachedCounts(): Promise<{ products: number; customers: number }> {
    const [p, c] = await Promise.all([
      this.db.products.count(),
      this.db.customers.count(),
    ]);
    return { products: p, customers: c };
  }

  async getStoreMeta(): Promise<Record<string, any>> {
    const rows = await this.db.store_meta.toArray();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async syncProducts(since: string | null): Promise<number> {
    const params: Record<string, string | number> = { limit: 1000 };
    if (since) params.since = since;

    const res  = await apiClient.get('/store/pos/sync/products', params);
    const data = (res.data as any);
    const products: CachedProduct[] = (data?.products ?? []).map((p: any) => ({
      ...p,
      cached_at: Date.now(),
    }));

    if (products.length > 0) {
      await this.db.products.bulkPut(products);
    }
    return products.length;
  }

  private async syncCustomers(since: string | null): Promise<number> {
    const params: Record<string, string | number> = { limit: 500 };
    if (since) params.since = since;

    const res  = await apiClient.get('/store/pos/sync/customers', params);
    const data = (res.data as any);
    const customers: CachedCustomer[] = (data?.customers ?? []).map((c: any) => ({
      ...c,
      cached_at: Date.now(),
    }));

    if (customers.length > 0) {
      await this.db.customers.bulkPut(customers);
    }
    return customers.length;
  }

  private async syncReference(): Promise<void> {
    const res  = await apiClient.get('/store/pos/sync/reference');
    const data = (res.data as any);

    const db = this.db;

    await Promise.all([
      data.categories?.length     && db.categories.bulkPut(data.categories),
      data.units?.length          && db.units.bulkPut(data.units),
      data.tax_rates?.length      && db.tax_rates.bulkPut(data.tax_rates),
    ]);

    // Store meta as key-value pairs
    if (data.store_meta) {
      const kvRows: StoreMeta[] = Object.entries(data.store_meta).map(([key, value]) => ({
        key,
        value: value as string | number | boolean | null | object,
      }));
      await db.store_meta.bulkPut(kvRows);
    }
  }

  private async fetchManifest(): Promise<any> {
    try {
      const res = await apiClient.get('/store/pos/sync/manifest');
      return res.data;
    } catch {
      return null;
    }
  }

  private async getKey(key: string): Promise<string | number | boolean | null | object | undefined> {
    const row = await this.db.device_info.get(key);
    return row?.value;
  }

  private async writeSyncLog(
    type: 'full' | 'incremental',
    status: 'success' | 'error' | 'partial',
    result: SyncResult,
  ): Promise<void> {
    await this.db.sync_log.add({
      type,
      status,
      products_synced:  result.products_synced,
      customers_synced: result.customers_synced,
      sales_uploaded:   0,
      error:            result.error ?? null,
      duration_ms:      result.duration_ms,
      created_at:       Date.now(),
    });
  }
}

// ── Singleton per store ────────────────────────────────────────────────────

const instances = new Map<number, OfflineSyncService>();

export function getSyncService(storeId: number): OfflineSyncService {
  if (!instances.has(storeId)) {
    instances.set(storeId, new OfflineSyncService(storeId));
  }
  return instances.get(storeId)!;
}
