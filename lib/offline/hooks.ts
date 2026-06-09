/**
 * Offline-first data hooks for the POS screen.
 *
 * Return semantics:
 *   undefined  → Dexie query not yet resolved (initial render)
 *   null       → Cache is empty; caller should fall back to API
 *   T[]        → Data from IndexedDB cache — instant, no network
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type CachedProduct, type CachedCustomer, type CachedCategory, type CachedTaxRate, type CachedUnit } from './db';

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

// ── Products ───────────────────────────────────────────────────────────────

export interface OfflineProductFilters {
  search?:     string;
  categoryId?: number | null;
  limit?:      number;
}

/**
 * Reactive product list from IndexedDB.
 * Returns undefined while loading, null if cache is empty (use API fallback),
 * or a CachedProduct array.
 */
export function useOfflineProducts(
  storeId: number | undefined,
  filters: OfflineProductFilters,
): CachedProduct[] | null | undefined {
  const { search, categoryId, limit = 200 } = filters;

  return useLiveQuery(async () => {
    if (!storeId) return undefined;
    const db    = getDb(storeId);
    const count = await db.products.count();
    if (count === 0) return null; // cache empty → signal caller to use API

    const lower = (search ?? '').toLowerCase().trim();

    let results: CachedProduct[];

    if (lower) {
      // Dexie filter() scans all rows — fast enough for ≤2000 products in memory
      results = await db.products
        .filter(p =>
          p.name_lower.includes(lower) ||
          (p.barcode ?? '').toLowerCase().includes(lower) ||
          (p.sku     ?? '').toLowerCase().includes(lower)
        )
        .limit(limit)
        .toArray();

      if (categoryId) results = results.filter(p => p.category_id === categoryId);
    } else if (categoryId) {
      results = await db.products
        .where('category_id').equals(categoryId)
        .limit(limit)
        .toArray();
    } else {
      results = await db.products.orderBy('name_lower').limit(limit).toArray();
    }

    return results;
  }, [storeId, search ?? '', categoryId ?? 0, limit]);
}

/**
 * Instant barcode/SKU lookup from IndexedDB.
 * Returns null if not in cache.
 */
export function useOfflineProductByBarcode(
  storeId: number | undefined,
  barcode:  string | undefined,
): CachedProduct | null | undefined {
  return useLiveQuery(async () => {
    if (!storeId || !barcode) return undefined;
    const db = getDb(storeId);
    return (
      (await db.products.where('barcode').equals(barcode).first()) ??
      (await db.products.where('sku').equals(barcode).first()) ??
      null
    );
  }, [storeId, barcode ?? '']);
}

// ── Customers ──────────────────────────────────────────────────────────────

/**
 * Reactive customer search from IndexedDB.
 * Searches name_lower, phone, and code.
 */
export function useOfflineCustomers(
  storeId: number | undefined,
  search:  string,
  limit = 30,
): CachedCustomer[] | null | undefined {
  return useLiveQuery(async () => {
    if (!storeId) return undefined;
    const db    = getDb(storeId);
    const count = await db.customers.count();
    if (count === 0) return null;

    const lower = search.toLowerCase().trim();
    if (!lower) return db.customers.orderBy('name_lower').limit(limit).toArray();

    return db.customers
      .filter(c =>
        c.name_lower.includes(lower) ||
        (c.phone ?? '').includes(lower) ||
        (c.code  ?? '').toLowerCase().includes(lower) ||
        (c.email ?? '').toLowerCase().includes(lower)
      )
      .limit(limit)
      .toArray();
  }, [storeId, search, limit]);
}

export async function lookupOfflineCustomerByPhone(
  storeId: number,
  phone:   string,
): Promise<CachedCustomer | null> {
  const db = getDb(storeId);
  return (await db.customers.where('phone').equals(phone).first()) ?? null;
}

export async function lookupOfflineProductByBarcode(
  storeId: number,
  barcode: string,
): Promise<CachedProduct | null> {
  const db = getDb(storeId);
  return (
    (await db.products.where('barcode').equals(barcode).first()) ??
    (await db.products.where('sku').equals(barcode).first()) ??
    null
  );
}

// ── Reference ─────────────────────────────────────────────────────────────

export function useOfflineCategories(
  storeId: number | undefined,
): CachedCategory[] | null | undefined {
  return useLiveQuery(async () => {
    if (!storeId) return undefined;
    const db    = getDb(storeId);
    const count = await db.categories.count();
    if (count === 0) return null;
    return db.categories.toArray();
  }, [storeId]);
}

export function useOfflineTaxRates(
  storeId: number | undefined,
): CachedTaxRate[] | null | undefined {
  return useLiveQuery(async () => {
    if (!storeId) return undefined;
    const db    = getDb(storeId);
    const count = await db.tax_rates.count();
    if (count === 0) return null;
    return db.tax_rates.toArray();
  }, [storeId]);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns true if cached_at timestamp is older than 4 hours. */
export function isStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > STALE_THRESHOLD_MS;
}

/** Human-readable stale label, e.g. "6h ago". */
export function staleLabel(cachedAt: number): string {
  const ms = Date.now() - cachedAt;
  if (ms < 3_600_000)  return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
