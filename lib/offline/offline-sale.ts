/**
 * Offline sale completion.
 *
 * Takes a completed OfflineCart + payments → writes pending_sales + sync_queue to IndexedDB.
 * Also optimistically updates cached product stock and customer balances.
 *
 * D6 safety rules enforced here:
 *  - NEVER overwrite server data (only decrements local cache)
 *  - ALWAYS preserve offline-created sales until server confirms
 *  - Payments are TRUSTED (cashier took cash/card physically)
 *  - Returns/refunds REQUIRE online — blocked in PaymentModal
 */

import { getDb, type OfflineSalePayload } from './db';
import { type OfflineCart, type OfflineCartItem, clearOfflineCart } from './cart';
import { nextOfflineSaleNumber } from './device';

// ── Blocked payment methods offline (require internet / gateway redirect) ──
export const OFFLINE_BLOCKED_METHODS = ['jazzcash', 'easypaisa'] as const;

export type OfflinePayment = {
  method:    string;
  amount:    number;
  reference: string | null;
};

export interface OfflineCompletionResult {
  offline_reference: string;
  pending_sale_id:   number; // IndexedDB auto-increment ID
  total:             number;
  change_given:      number;
  loyalty_earned:    number;
}

export interface OfflineValidationError {
  type: 'stock' | 'credit' | 'empty' | 'customer_not_cached' | 'blocked_method';
  message: string;
  can_override: boolean; // cashier can proceed with confirmation
}

// ── Validation ────────────────────────────────────────────────────────────

export function validateOfflineCart(
  cart:     OfflineCart,
  payments: OfflinePayment[],
): OfflineValidationError[] {
  const errors: OfflineValidationError[] = [];

  if (cart.items.length === 0) {
    errors.push({ type: 'empty', message: 'Cart is empty.', can_override: false });
    return errors;
  }

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const hasCredit = payments.some(p => p.method === 'on_credit');

  // Check blocked payment methods
  for (const p of payments) {
    if ((OFFLINE_BLOCKED_METHODS as readonly string[]).includes(p.method)) {
      errors.push({
        type: 'blocked_method',
        message: `${p.method} requires internet. Use cash, card, or credit instead.`,
        can_override: false,
      });
    }
  }

  // Stock checks (overridable — cashier already committed the sale physically)
  for (const item of cart.items) {
    if (item.tracks_stock && !item.allow_negative_stock && item.quantity > item.cached_stock) {
      errors.push({
        type: 'stock',
        message: `${item.product_name}: only ${item.cached_stock} in stock (you're selling ${item.quantity}).`,
        can_override: true,
      });
    }
  }

  // On-credit validation
  if (hasCredit) {
    if (!cart.customer) {
      errors.push({ type: 'customer_not_cached', message: 'Credit sales require a customer.', can_override: false });
    } else if (!cart.customer.allow_credit_at_pos) {
      errors.push({ type: 'credit', message: `${cart.customer.name} does not have a credit limit set.`, can_override: false });
    } else if (cart.customer.credit_limit !== null) {
      const newBalance = cart.customer.outstanding_balance + cart.total;
      if (newBalance > cart.customer.credit_limit) {
        errors.push({
          type: 'credit',
          message: `Credit limit exceeded: ${cart.customer.name} (limit: ${cart.customer.credit_limit.toFixed(2)}, would reach: ${newBalance.toFixed(2)}).`,
          can_override: false,
        });
      }
    }
  }

  // Payment amount check (not needed if on_credit covers full amount)
  if (!hasCredit && totalPaid < cart.total - 0.01) {
    errors.push({
      type: 'credit',
      message: `Underpaid: total ${cart.total.toFixed(2)}, paid ${totalPaid.toFixed(2)}.`,
      can_override: false,
    });
  }

  return errors;
}

// ── Completion ─────────────────────────────────────────────────────────────

export async function completeOfflineSale(
  storeId:  number,
  cart:     OfflineCart,
  payments: OfflinePayment[],
): Promise<OfflineCompletionResult> {
  const db               = getDb(storeId);
  const offlineReference = await nextOfflineSaleNumber(storeId);
  const now              = new Date().toISOString();
  const timezone         = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const totalPaid   = payments.reduce((s, p) => s + p.amount, 0);
  const changeGiven = Math.max(0, totalPaid - cart.total);

  // Estimate loyalty earned (simple: 1 point per unit of total — server will reconcile)
  const loyaltyEarned = cart.customer ? Math.floor(cart.total) : 0;

  const payload: OfflineSalePayload = {
    offline_reference:  offlineReference,
    device_uuid:        cart.device_uuid,
    customer_id:        cart.customer?.id ?? null,
    items:              cart.items.map(item => ({
      product_id:      item.product_id,
      variant_id:      item.variant_id,
      name:            item.product_name,
      sku:             item.sku,
      quantity:        item.quantity,
      unit_price:      item.unit_price,
      discount_amount: item.discount_amount,
      tax_rate:        item.tax_rate,
      tax_amount:      item.line_tax,
      total:           item.line_total,
    })),
    payments: payments.map(p => ({
      method:    p.method as any,
      amount:    p.amount,
      reference: p.reference,
    })),
    subtotal:        cart.subtotal,
    tax_amount:      cart.tax_amount,
    discount_amount: cart.discount_amount,
    discount_type:   cart.discount_type,
    discount_reason: cart.discount_reason || null,
    total:           cart.total,
    paid_amount:     totalPaid,
    change_given:    changeGiven,
    notes:           null,
    client_created_at: now,
    client_timezone:   timezone,
  };

  // Write pending_sales + sync_queue in one transaction
  let pendingSaleId = 0;
  await db.transaction('rw', [db.pending_sales, db.sync_queue], async () => {
    pendingSaleId = await db.pending_sales.add({
      offline_reference: offlineReference,
      device_id:         cart.device_uuid,
      store_id:          storeId,
      sale_data:         payload,
      status:            'pending_sync',
      attempts:          0,
      last_attempt_at:   null,
      last_error:        null,
      real_sale_id:      null,
      real_sale_number:  null,
      has_conflicts:     false,
      conflict_detail:   null,
      created_at:        Date.now(),
      synced_at:         null,
    });

    await db.sync_queue.add({
      operation_type:  'sale_create',
      payload:         { pending_sale_id: pendingSaleId, offline_reference: offlineReference },
      attempts:        0,
      max_attempts:    10,
      last_attempt_at: null,
      last_error:      null,
      status:          'pending',
      priority:        'high',
      created_at:      Date.now(),
      synced_at:       null,
    });
  });

  // Optimistically update cached stock
  await decrementCachedStock(storeId, cart.items);

  // Optimistically update customer balances
  if (cart.customer) {
    await updateCachedCustomer(storeId, cart.customer.id, {
      creditIncrease: payments.some(p => p.method === 'on_credit') ? cart.total : 0,
      loyaltyEarned,
    });
  }

  // Clear the active cart from IndexedDB
  await clearOfflineCart(storeId);

  return {
    offline_reference: offlineReference,
    pending_sale_id:   pendingSaleId,
    total:             cart.total,
    change_given:      changeGiven,
    loyalty_earned:    loyaltyEarned,
  };
}

// ── Post-completion cache updates ─────────────────────────────────────────

async function decrementCachedStock(storeId: number, items: OfflineCartItem[]): Promise<void> {
  const db = getDb(storeId);
  await db.transaction('rw', db.products, async () => {
    for (const item of items) {
      if (!item.tracks_stock) continue;
      const p = await db.products.get(item.product_id);
      if (!p) continue;

      if (item.variant_id) {
        const updatedVariants = p.variants?.map(v =>
          v.id === item.variant_id
            ? { ...v, current_stock: Math.max(0, v.current_stock - item.quantity) }
            : v
        );
        await db.products.update(item.product_id, { variants: updatedVariants });
      } else {
        await db.products.update(item.product_id, {
          current_stock: Math.max(0, p.current_stock - item.quantity),
        });
      }
    }
  });
}

async function updateCachedCustomer(
  storeId:    number,
  customerId: number,
  changes:    { creditIncrease: number; loyaltyEarned: number },
): Promise<void> {
  const db = getDb(storeId);
  const c  = await db.customers.get(customerId);
  if (!c) return;

  await db.customers.update(customerId, {
    outstanding_balance:    c.outstanding_balance    + changes.creditIncrease,
    loyalty_points_balance: c.loyalty_points_balance + changes.loyaltyEarned,
  });
}
