'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  type OfflineCart,
  type OfflineCartItem,
  type OfflineCartCustomer,
  newOfflineCart,
  addItemToCart,
  updateItemQty,
  removeItem,
  setCartCustomer,
  setCartDiscount,
  saveOfflineCart,
  loadOfflineCart,
} from '@/lib/offline/cart';
import {
  type OfflinePayment,
  type OfflineCompletionResult,
  validateOfflineCart,
  completeOfflineSale,
  type OfflineValidationError,
} from '@/lib/offline/offline-sale';
import { getOrCreateDeviceUUID } from '@/lib/offline/device';
import type { CachedProduct, CachedCustomer } from '@/lib/offline/db';

export type { OfflineCart, OfflineCartItem, OfflineCompletionResult, OfflineValidationError, OfflinePayment };

export interface UseOfflineCartReturn {
  cart:          OfflineCart | null;
  isReady:       boolean;
  addProduct:    (product: CachedProduct, variantId?: number | null) => { stockWarning: string | null };
  updateQty:     (localId: string, delta: number) => void;
  removeItem:    (localId: string) => void;
  setCustomer:   (customer: CachedCustomer | null) => void;
  setDiscount:   (type: 'fixed' | 'percent' | null, value: number, reason: string) => void;
  clearCart:     () => void;
  validate:      (payments: OfflinePayment[]) => OfflineValidationError[];
  completeSale:  (payments: OfflinePayment[]) => Promise<OfflineCompletionResult>;
}

export function useOfflineCart(): UseOfflineCartReturn {
  const user    = useAuthStore(s => s.user);
  const storeId = user?.store?.id;

  const [cart,    setCart]    = useState<OfflineCart | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Load persisted cart on mount
  useEffect(() => {
    if (!storeId || typeof window === 'undefined') return;
    (async () => {
      try {
        const saved = await loadOfflineCart(storeId);
        if (saved) {
          setCart(saved);
        } else {
          const uuid = await getOrCreateDeviceUUID(storeId);
          setCart(newOfflineCart(storeId, uuid));
        }
      } catch {
        const uuid = await getOrCreateDeviceUUID(storeId).catch(() => 'unknown');
        setCart(newOfflineCart(storeId!, uuid));
      } finally {
        setIsReady(true);
      }
    })();
  }, [storeId]);

  // Persist on every change
  const mutate = useCallback((newCart: OfflineCart) => {
    setCart(newCart);
    if (storeId) saveOfflineCart(storeId, newCart).catch(() => {});
  }, [storeId]);

  const ensureCart = useCallback(async (): Promise<OfflineCart> => {
    if (cart) return cart;
    const uuid   = await getOrCreateDeviceUUID(storeId!);
    const fresh  = newOfflineCart(storeId!, uuid);
    mutate(fresh);
    return fresh;
  }, [cart, storeId, mutate]);

  const addProduct = useCallback((product: CachedProduct, variantId?: number | null) => {
    if (!cart || !storeId) return { stockWarning: null };
    const { cart: updated, stockWarning } = addItemToCart(cart, product, variantId);
    mutate(updated);
    return { stockWarning };
  }, [cart, storeId, mutate]);

  const updateQtyFn = useCallback((localId: string, delta: number) => {
    if (!cart) return;
    mutate(updateItemQty(cart, localId, delta));
  }, [cart, mutate]);

  const removeItemFn = useCallback((localId: string) => {
    if (!cart) return;
    mutate(removeItem(cart, localId));
  }, [cart, mutate]);

  const setCustomerFn = useCallback((customer: CachedCustomer | null) => {
    if (!cart) return;
    mutate(setCartCustomer(cart, customer));
  }, [cart, mutate]);

  const setDiscountFn = useCallback((type: 'fixed' | 'percent' | null, value: number, reason: string) => {
    if (!cart) return;
    mutate(setCartDiscount(cart, type, value, reason));
  }, [cart, mutate]);

  const clearCartFn = useCallback(async () => {
    if (!storeId) return;
    const uuid = await getOrCreateDeviceUUID(storeId);
    mutate(newOfflineCart(storeId, uuid));
  }, [storeId, mutate]);

  const validateFn = useCallback((payments: OfflinePayment[]) => {
    if (!cart) return [{ type: 'empty' as const, message: 'No cart', can_override: false }];
    return validateOfflineCart(cart, payments);
  }, [cart]);

  const completeSaleFn = useCallback(async (payments: OfflinePayment[]): Promise<OfflineCompletionResult> => {
    const c = cart ?? await ensureCart();
    if (!storeId) throw new Error('No store context');
    return completeOfflineSale(storeId, c, payments);
  }, [cart, storeId, ensureCart]);

  return {
    cart,
    isReady,
    addProduct,
    updateQty:    updateQtyFn,
    removeItem:   removeItemFn,
    setCustomer:  setCustomerFn,
    setDiscount:  setDiscountFn,
    clearCart:    clearCartFn,
    validate:     validateFn,
    completeSale: completeSaleFn,
  };
}
