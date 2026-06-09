/**
 * Offline cart — fully local, IndexedDB-backed.
 * Used when the device is offline OR as a fallback when the server cart is unavailable.
 *
 * Key: a single active cart is stored in `store_meta` under key 'active_offline_cart'.
 */

import { getDb, type CachedProduct, type CachedCustomer } from './db';

export interface OfflineCartItem {
  local_id:             string;   // uuid4 — client-only, never sent to server
  product_id:           number;
  variant_id:           number | null;
  product_name:         string;
  sku:                  string;
  barcode:              string | null;
  quantity:             number;
  unit_price:           number;   // selling price
  tax_rate:             number;   // percentage, e.g. 17
  tax_inclusive:        boolean;
  discount_amount:      number;   // per-line discount
  line_subtotal:        number;   // unit_price × qty
  line_tax:             number;   // tax on this line
  line_total:           number;   // after discount + tax
  tracks_stock:         boolean;
  allow_negative_stock: boolean;
  cached_stock:         number;   // stock at time of add (for validation)
}

export interface OfflineCartCustomer {
  id:                     number;
  name:                   string;
  phone:                  string | null;
  code:                   string;
  customer_group_id:      number | null;
  loyalty_points_balance: number;
  outstanding_balance:    number;
  credit_limit:           number | null;
  allow_credit_at_pos:    boolean;
}

export interface OfflineCart {
  version:          number;    // schema version
  store_id:         number;
  device_uuid:      string;
  customer:         OfflineCartCustomer | null;
  items:            OfflineCartItem[];
  discount_type:    'fixed' | 'percent' | null;
  discount_value:   number;
  discount_reason:  string;
  // Computed totals (recalculated on every mutation)
  subtotal:         number;
  discount_amount:  number;
  tax_amount:       number;
  total:            number;
  created_at:       number; // Date.now()
  updated_at:       number;
}

const CART_META_KEY = 'active_offline_cart';
let seq = 0;

// ── Persistence ────────────────────────────────────────────────────────────

export async function saveOfflineCart(storeId: number, cart: OfflineCart): Promise<void> {
  const db = getDb(storeId);
  await db.store_meta.put({ key: CART_META_KEY, value: cart as any });
}

export async function loadOfflineCart(storeId: number): Promise<OfflineCart | null> {
  const db  = getDb(storeId);
  const row = await db.store_meta.get(CART_META_KEY);
  return row?.value ? (row.value as unknown as OfflineCart) : null;
}

export async function clearOfflineCart(storeId: number): Promise<void> {
  const db = getDb(storeId);
  await db.store_meta.delete(CART_META_KEY);
}

// ── Cart construction ─────────────────────────────────────────────────────

export function newOfflineCart(storeId: number, deviceUUID: string): OfflineCart {
  return {
    version: 1, store_id: storeId, device_uuid: deviceUUID,
    customer: null, items: [],
    discount_type: null, discount_value: 0, discount_reason: '',
    subtotal: 0, discount_amount: 0, tax_amount: 0, total: 0,
    created_at: Date.now(), updated_at: Date.now(),
  };
}

// ── Mutations (all return a NEW cart — immutable update pattern) ──────────

export function addItemToCart(
  cart:    OfflineCart,
  product: CachedProduct,
  variantId?: number | null,
): { cart: OfflineCart; stockWarning: string | null } {
  const variant  = variantId ? product.variants?.find(v => v.id === variantId) : null;
  const price    = variant ? (variant.price ?? product.price) : product.price;
  const stock    = variant ? variant.current_stock : product.current_stock;
  const sku      = variant ? (variant.sku ?? product.sku) : product.sku;
  const barcode  = variant ? (variant.barcode ?? product.barcode) : product.barcode;
  const name     = variant ? `${product.name} - ${variant.name}` : product.name;

  let stockWarning: string | null = null;

  // Check if same item already in cart
  const existing = cart.items.find(i =>
    i.product_id === product.id && i.variant_id === (variantId ?? null)
  );

  let newItems: OfflineCartItem[];
  if (existing) {
    const newQty = existing.quantity + 1;
    if (product.tracks_stock && !product.allow_negative_stock && newQty > stock) {
      stockWarning = `Only ${stock} in stock (you have ${existing.quantity})`;
    }
    newItems = cart.items.map(item =>
      item.local_id === existing.local_id
        ? recalcItem({ ...item, quantity: newQty })
        : item
    );
  } else {
    if (product.tracks_stock && !product.allow_negative_stock && stock <= 0) {
      stockWarning = `Out of stock`;
    }
    const newItem: OfflineCartItem = recalcItem({
      local_id:             `cli-${++seq}-${Date.now()}`,
      product_id:           product.id,
      variant_id:           variantId ?? null,
      product_name:         name,
      sku,
      barcode:              barcode ?? null,
      quantity:             1,
      unit_price:           price,
      tax_rate:             product.tax_rate,
      tax_inclusive:        product.tax_inclusive,
      discount_amount:      0,
      line_subtotal:        0,
      line_tax:             0,
      line_total:           0,
      tracks_stock:         product.tracks_stock,
      allow_negative_stock: product.allow_negative_stock,
      cached_stock:         stock,
    });
    newItems = [...cart.items, newItem];
  }

  return { cart: recalcCart({ ...cart, items: newItems }), stockWarning };
}

export function updateItemQty(
  cart:    OfflineCart,
  localId: string,
  delta:   number,
): OfflineCart {
  const newItems = cart.items
    .map(item => {
      if (item.local_id !== localId) return item;
      const qty = Math.max(0, item.quantity + delta);
      return recalcItem({ ...item, quantity: qty });
    })
    .filter(item => item.quantity > 0);
  return recalcCart({ ...cart, items: newItems });
}

export function removeItem(cart: OfflineCart, localId: string): OfflineCart {
  return recalcCart({ ...cart, items: cart.items.filter(i => i.local_id !== localId) });
}

export function setCartCustomer(cart: OfflineCart, customer: CachedCustomer | null): OfflineCart {
  if (!customer) return recalcCart({ ...cart, customer: null });
  return recalcCart({
    ...cart,
    customer: {
      id:                     customer.id,
      name:                   customer.name,
      phone:                  customer.phone ?? null,
      code:                   customer.code,
      customer_group_id:      customer.customer_group_id ?? null,
      loyalty_points_balance: customer.loyalty_points_balance,
      outstanding_balance:    customer.outstanding_balance,
      credit_limit:           customer.credit_limit ?? null,
      allow_credit_at_pos:    customer.allow_credit_at_pos,
    },
  });
}

export function setCartDiscount(
  cart:   OfflineCart,
  type:   'fixed' | 'percent' | null,
  value:  number,
  reason: string,
): OfflineCart {
  return recalcCart({ ...cart, discount_type: type, discount_value: value, discount_reason: reason });
}

// ── Calculation helpers ────────────────────────────────────────────────────

function recalcItem(item: OfflineCartItem): OfflineCartItem {
  const subtotal = round2(item.unit_price * item.quantity);
  const net      = round2(subtotal - item.discount_amount);
  let tax        = 0;
  if (!item.tax_inclusive && item.tax_rate > 0) {
    tax = round2(net * (item.tax_rate / 100));
  }
  return { ...item, line_subtotal: subtotal, line_tax: tax, line_total: round2(net + tax) };
}

function recalcCart(cart: OfflineCart): OfflineCart {
  const subtotal   = round2(cart.items.reduce((s, i) => s + i.line_subtotal, 0));
  let discAmount   = 0;
  if (cart.discount_type === 'percent') discAmount = round2(subtotal * (cart.discount_value / 100));
  else if (cart.discount_type === 'fixed') discAmount = round2(Math.min(cart.discount_value, subtotal));

  const taxAmount  = round2(cart.items.reduce((s, i) => s + i.line_tax, 0));
  const total      = round2(subtotal - discAmount + taxAmount);

  return { ...cart, subtotal, discount_amount: discAmount, tax_amount: taxAmount, total, updated_at: Date.now() };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
