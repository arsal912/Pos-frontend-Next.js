import Dexie, { type Table } from 'dexie';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CachedProduct {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  name_lower: string; // normalized for case-insensitive search
  category_id: number | null;
  brand_id: number | null;
  price: number;
  cost: number | null;
  tax_rate: number;
  tax_inclusive: boolean;
  unit_id: number | null;
  tracks_stock: boolean;
  allow_negative_stock: boolean;
  is_weightable: boolean;
  weight_unit: 'g' | 'kg' | null; // meaningful only when is_weightable=true
  current_stock: number;
  image_url: string | null;
  variants: CachedVariant[];
  updated_at: string;
  cached_at: number; // Date.now() ms
}

export interface CachedVariant {
  id: number;
  product_id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  current_stock: number;
}

export interface CachedCustomer {
  id: number;
  code: string;
  name: string;
  name_lower: string;
  phone: string | null;
  email: string | null;
  customer_group_id: number | null;
  loyalty_points_balance: number;
  outstanding_balance: number;
  credit_limit: number | null;
  allow_credit_at_pos: boolean;
  updated_at: string;
  cached_at: number;
}

export interface CachedCategory {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
}

export interface CachedTaxRate {
  id: number;
  name: string;
  rate: number;
  is_default: boolean;
}

export interface CachedUnit {
  id: number;
  name: string;
  abbreviation: string;
}

export interface StoreMeta {
  key: string;
  value: string | number | boolean | null | object;
}

export interface PendingSale {
  id?: number;               // auto-incremented locally
  offline_reference: string; // OFF-{device_short_id}-{seq}
  device_id: string;         // device_uuid
  store_id: number;
  sale_data: OfflineSalePayload;
  status: 'pending_sync' | 'syncing' | 'synced' | 'failed_permanent';
  attempts: number;
  last_attempt_at: number | null;
  last_error: string | null;
  real_sale_id: number | null;
  real_sale_number: string | null;
  has_conflicts: boolean;
  conflict_detail: string | null;
  created_at: number; // Date.now()
  synced_at: number | null;
}

export interface OfflineSalePayload {
  offline_reference: string;
  device_uuid: string;
  customer_id: number | null;
  items: OfflineSaleItem[];
  payments: OfflineSalePayment[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  discount_type: 'percent' | 'fixed' | null;
  discount_reason: string | null;
  total: number;
  paid_amount: number;
  change_given: number;
  notes: string | null;
  client_created_at: string; // ISO string
  client_timezone: string;
}

export interface OfflineSaleItem {
  product_id: number;
  variant_id: number | null;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface OfflineSalePayment {
  method: 'cash' | 'card_manual' | 'on_credit' | 'loyalty_points' | 'bank_transfer' | 'other';
  amount: number;
  reference: string | null;
}

export interface SyncQueueItem {
  id?: number;
  operation_type: 'sale_create';
  payload: object;
  attempts: number;
  max_attempts: number;
  last_attempt_at: number | null;
  last_error: string | null;
  status: 'pending' | 'syncing' | 'synced' | 'failed_permanent';
  priority: 'high' | 'normal' | 'low';
  created_at: number;
  synced_at: number | null;
}

export interface SyncLogEntry {
  id?: number;
  type: 'full' | 'incremental' | 'upload';
  status: 'success' | 'error' | 'partial';
  products_synced: number;
  customers_synced: number;
  sales_uploaded: number;
  error: string | null;
  duration_ms: number;
  created_at: number;
}

export interface DeviceInfo {
  key: string; // 'device_uuid' | 'device_id' | 'device_name' | 'last_full_sync' | 'last_incremental_sync' | 'offline_sale_sequence'
  value: string | number | null;
}

// ── Dexie database ─────────────────────────────────────────────────────────────

export class OfflineDatabase extends Dexie {
  products!:     Table<CachedProduct,   number>;
  customers!:    Table<CachedCustomer,  number>;
  categories!:   Table<CachedCategory,  number>;
  tax_rates!:    Table<CachedTaxRate,   number>;
  units!:        Table<CachedUnit,      number>;
  store_meta!:   Table<StoreMeta,       string>;
  pending_sales!:Table<PendingSale,     number>;
  sync_queue!:   Table<SyncQueueItem,   number>;
  sync_log!:     Table<SyncLogEntry,    number>;
  device_info!:  Table<DeviceInfo,      string>;

  constructor(storeId: number) {
    super(`pos_offline_${storeId}`);

    this.version(1).stores({
      // Products: indexed by id, barcode, sku, and name_lower for search
      products:  'id, barcode, sku, name_lower, category_id, cached_at',
      // Customers: indexed by id, phone, code, and name_lower
      customers: 'id, phone, name_lower, code, cached_at',
      // Reference tables (small, fully cached)
      categories: 'id',
      tax_rates:  'id',
      units:      'id',
      // Key-value store for store metadata
      store_meta: 'key',
      // Offline sales queue — auto-increment id, indexed by status/created_at for sync ordering
      pending_sales: '++id, offline_reference, status, created_at',
      // Generic sync queue
      sync_queue: '++id, status, priority, operation_type, created_at',
      // Sync audit log
      sync_log: '++id, created_at',
      // Device configuration (key-value)
      device_info: 'key',
    });
  }
}

// ── Singleton per store ──────────────────────────────────────────────────────

const instances = new Map<number, OfflineDatabase>();

export function getDb(storeId: number): OfflineDatabase {
  if (!instances.has(storeId)) {
    instances.set(storeId, new OfflineDatabase(storeId));
  }
  return instances.get(storeId)!;
}

/** Wipe the entire offline DB for a store (recovery from corruption). */
export async function resetDb(storeId: number): Promise<void> {
  const db = instances.get(storeId);
  if (db) {
    await db.delete();
    instances.delete(storeId);
  }
  await new OfflineDatabase(storeId).open();
}
