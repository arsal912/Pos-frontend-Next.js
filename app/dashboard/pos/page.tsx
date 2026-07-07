'use client';

import {
  useEffect, useState, useCallback, useRef, useMemo, KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { loadShortcuts, loadCustomShortcuts } from '@/lib/shortcuts';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, ShoppingCart, X, Plus, Minus, Trash2, User, Tag,
  Pause, Loader2, Package, Keyboard, Gift, CreditCard, Camera,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CustomerModal from '@/components/pos/CustomerModal';
import BarcodeScannerModal from '@/components/pos/BarcodeScannerModal';
import PaymentModal from '@/components/pos/PaymentModal';
import ReceiptScreen from '@/components/pos/ReceiptScreen';
import { SyncIndicator } from '@/components/pos/SyncIndicator';
import { InstallBanner } from '@/components/pos/InstallBanner';
import { useDeviceRegistration } from '@/hooks/useDeviceRegistration';
import { useSwUpdate } from '@/hooks/useSwUpdate';
import { useSyncService } from '@/hooks/useSyncService';
import { useOfflineProducts, useOfflineCategories, lookupOfflineProductByBarcode, isStale, staleLabel } from '@/lib/offline/hooks';
import { useOfflineCart, type OfflineCompletionResult } from '@/hooks/useOfflineCart';
import type { OfflinePayment } from '@/lib/offline/offline-sale';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useAuthStore } from '@/store/auth';
import type { Sale, SaleItem, Product, Category, Customer, PaymentMethod, HoldSale } from '@/types';

const CART_KEY = 'pos_draft_sale_id';

export default function PosPage() {
  const router = useRouter();
  const [sale, setSale]             = useState<Sale | null>(null);
  const [saleLoading, setSaleLoading] = useState(true);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Phase 6 — offline completion state
  const [offlineResult, setOfflineResult] = useState<OfflineCompletionResult | null>(null);

  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [productSearch, setProductSearch]   = useState('');
  const [productPage, setProductPage]       = useState(1);
  const [productMeta, setProductMeta]       = useState<any>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [showCustomer, setShowCustomer]   = useState(false);
  const [showScanner, setShowScanner]     = useState(false);
  const [showPayment, setShowPayment]     = useState(false);
  const [showHolds, setShowHolds]         = useState(false);
  const [showDiscount, setShowDiscount]   = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showRedeem, setShowRedeem]       = useState(false);
  const [editItem, setEditItem]           = useState<SaleItem | null>(null);
  const [holds, setHolds]                 = useState<HoldSale[]>([]);
  const [holdName, setHoldName]           = useState('');
  const [redeemPoints, setRedeemPoints]   = useState('');
  const [redeemingPoints, setRedeemingPoints] = useState(false);
  const [loyaltyEarnedLastSale, setLoyaltyEarnedLastSale] = useState<{points:number;balance_after:number}|null>(null);

  const [discountType, setDiscountType]   = useState<'fixed' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  const searchRef     = useRef<HTMLInputElement>(null);
  const lastKeyTime   = useRef(0);
  const barcodeBuffer = useRef('');
  const SCAN_THRESHOLD = 100;

  const holdsModalRef  = useRef<HTMLDivElement>(null);
  const redeemModalRef = useRef<HTMLDivElement>(null);
  const pageRef        = useRef<HTMLDivElement>(null);
  useFocusTrap(holdsModalRef, showHolds);
  useFocusTrap(redeemModalRef, showRedeem);
  // Keeps Tab cycling within the POS work area only — never into the dashboard
  // sidebar and never out to the browser chrome (address bar, extensions, etc).
  useFocusTrap(pageRef, !saleLoading);

  // Phase 6 — device registry + offline sync
  const user    = useAuthStore(s => s.user);
  const storeId = user?.store?.id;
  const device  = useDeviceRegistration();
  const sync    = useSyncService();

  // Offline-first data — reads directly from IndexedDB, updates reactively
  const offlineProducts   = useOfflineProducts(storeId, { search: productSearch, categoryId: activeCategory });
  const offlineCategories = useOfflineCategories(storeId);

  // Reliable connection detection (active HTTP probe, not just navigator.onLine)
  const { isOnline }         = useConnectionStatus();
  // Service worker update detection (edge case J)
  const { updateAvailable, applyUpdate } = useSwUpdate();
  const offlineCartHook = useOfflineCart();

  // Determine display data: prefer IndexedDB when populated, fall back to API
  const displayProducts = useMemo(() => {
    const base = offlineProducts != null ? (offlineProducts ?? []) : products;
    return productSearch
      ? base.filter((p: any) => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
      : base;
  }, [offlineProducts, products, productSearch]);
  const displayCategories = offlineCategories != null ? (offlineCategories ?? []) : categories;
  const usingOfflineData  = offlineProducts != null;

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    apiClient.get('/store/categories').then(r => setCategories((r.data as any)?.categories ?? [])).catch(() => {});

    (async () => {
      setSaleLoading(true);
      try {
        // Try to resume a saved draft (survives page refresh)
        const savedId = typeof window !== 'undefined' ? localStorage.getItem(CART_KEY) : null;
        if (savedId) {
          try {
            const res = await apiClient.get(`/store/sales/${savedId}`);
            const existing = (res.data as any)?.sale;
            if (existing && existing.status === 'draft') {
              setSale(existing);
              setSaleLoading(false);
              setTimeout(() => searchRef.current?.focus(), 200);
              return;
            }
          } catch { /* not found or completed — fall through to new sale */ }
          localStorage.removeItem(CART_KEY);
        }
        await createNewSale();
      } catch { await createNewSale().catch(() => {}); }
      finally {
        setSaleLoading(false);
        setTimeout(() => searchRef.current?.focus(), 300);
      }
    })();
  }, []);

  // ── Products ────────────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await apiClient.get('/store/products', {
        search: productSearch || undefined,
        category_id: activeCategory || undefined,
        is_active: 'true',
        page: productPage, per_page: 20,
      });
      setProducts(getItems(res));
      setProductMeta((res as any).meta?.pagination ?? null);
    } catch { /* ignore */ }
    finally { setLoadingProducts(false); }
  }, [productSearch, activeCategory, productPage]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── Sale helpers ─────────────────────────────────────────────────────────────

  const createNewSale = async () => {
    const res = await apiClient.post('/store/pos/sales', { branch_id: 1 });
    const s = (res.data as any)?.sale;
    setSale({ ...s, items: [], payments: [] });
    localStorage.setItem(CART_KEY, String(s.id));
  };

  // ── Product add ──────────────────────────────────────────────────────────────

  const addProductToCart = async (product: any, variantId?: number | null) => {
    // Offline: add to local IndexedDB cart
    if (!navigator.onLine) {
      const { stockWarning } = offlineCartHook.addProduct(product, variantId);
      if (stockWarning) toast.warning(`Stock warning: ${stockWarning}. Added anyway.`);
      return;
    }
    if (!sale) return;
    try {
      const res = await apiClient.post(`/store/pos/sales/${sale.id}/items`, {
        product_id: product.id,
        variant_id: variantId ?? undefined,
      });
      setSale((res.data as any)?.sale ?? sale);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleBarcodeScan = async (barcode: string) => {
    // Try IndexedDB first (instant, works offline)
    if (storeId) {
      const cached = await lookupOfflineProductByBarcode(storeId, barcode);
      if (cached) {
        await addProductToCart(cached as any);
        setProductSearch('');
        return;
      }
    }
    // Fallback: API (online only)
    if (!navigator.onLine) { toast.error('Product not in cache. Connect to internet to look up new products.'); return; }
    try {
      const res = await apiClient.get('/store/products/lookup', { barcode });
      const data = res.data as any;
      if (data.product) { await addProductToCart(data.product, data.variant?.id); setProductSearch(''); }
      else toast.error('Product not found: ' + barcode);
    } catch { toast.error('Product not found.'); }
  };

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    if (e.key === 'Enter') {
      const isScan = now - lastKeyTime.current < SCAN_THRESHOLD && barcodeBuffer.current.length >= 3;
      if (isScan) { e.preventDefault(); handleBarcodeScan(barcodeBuffer.current); }
      barcodeBuffer.current = '';
    } else if (e.key.length === 1) {
      if (now - lastKeyTime.current > SCAN_THRESHOLD) barcodeBuffer.current = '';
      barcodeBuffer.current += e.key;
    }
    lastKeyTime.current = now;
  };

  // ── Cart operations ──────────────────────────────────────────────────────────

  const updateItemQty = async (item: SaleItem, delta: number) => {
    if (!sale) return;
    try {
      const res = await apiClient.put(`/store/pos/sales/${sale.id}/items/${item.id}`, { quantity: Math.max(0.001, Number(item.quantity) + delta) });
      setSale((res.data as any)?.sale ?? sale);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const removeItem = async (item: SaleItem) => {
    if (!sale) return;
    try {
      const res = await apiClient.delete(`/store/pos/sales/${sale.id}/items/${item.id}`);
      setSale((res.data as any)?.sale ?? sale);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const updateEditItem = async () => {
    if (!sale || !editItem) return;
    try {
      const res = await apiClient.put(`/store/pos/sales/${sale.id}/items/${editItem.id}`, {
        quantity: Number(editItem.quantity),
        unit_price: Number(editItem.unit_price),
        discount_amount: Number(editItem.discount_amount),
      });
      setSale((res.data as any)?.sale ?? sale);
      setEditItem(null);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const attachCustomer = async (customer: any) => {
    if (!navigator.onLine) {
      // Offline: attach to local cart (customer may come from Dexie — CachedCustomer shape)
      offlineCartHook.setCustomer(customer);
      setShowCustomer(false);
      toast.success(`${customer.name} attached (offline).`);
      return;
    }
    if (!sale) return;
    try {
      const res = await apiClient.post(`/store/pos/sales/${sale.id}/customer`, { customer_id: customer.id });
      setSale((res.data as any)?.sale ?? sale);
      setShowCustomer(false);
      toast.success(`${customer.name} attached.`);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const applyDiscount = async () => {
    if (!discountValue) return;

    // Offline: apply to local cart
    if (!isOnline) {
      offlineCartHook.setDiscount(discountType, parseFloat(discountValue), discountReason);
      setShowDiscount(false);
      return;
    }

    if (!sale) return;
    try {
      const res = await apiClient.post(`/store/pos/sales/${sale.id}/discount`, {
        discount_amount: parseFloat(discountValue),
        discount_type: discountType,
        discount_reason: discountReason || undefined,
      });
      setSale((res.data as any)?.sale ?? sale);
      setShowDiscount(false);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleRedeemPoints = async () => {
    if (!sale || !redeemPoints || !customer?.id) return;
    const pts = parseFloat(redeemPoints);
    if (pts <= 0) return toast.error('Enter valid points to redeem.');
    setRedeemingPoints(true);
    try {
      // Add loyalty_points payment to the sale
      const rsValue = pts; // 1 point = 1 Rs (configurable via settings; simplified here)
      await apiClient.post(`/store/pos/sales/${sale.id}/payments`, {
        method: 'loyalty_points',
        amount: rsValue,
        notes: `Redeemed ${pts} loyalty points`,
      });
      // Refresh sale
      const refreshed = await apiClient.get(`/store/sales/${sale.id}`);
      setSale((refreshed.data as any)?.sale ?? sale);
      setShowRedeem(false);
      setRedeemPoints('');
      toast.success(`${pts} points redeemed — Rs ${rsValue.toFixed(2)} off`);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setRedeemingPoints(false); }
  };

  const handlePayments = async (payments: { method: PaymentMethod; amount: number }[]) => {
    if (!sale) return;
    for (const p of payments) await apiClient.post(`/store/pos/sales/${sale.id}/payments`, p);
    const res = await apiClient.post(`/store/pos/sales/${sale.id}/complete`);
    const earned = (res.data as any)?.loyalty_earned;
    if (earned) setLoyaltyEarnedLastSale(earned);
    setCompletedSale((res.data as any)?.sale);
    setShowPayment(false);
    localStorage.removeItem(CART_KEY);
  };

  // Offline sale completion
  const handleOfflinePayments = async (payments: OfflinePayment[]) => {
    try {
      const result = await offlineCartHook.completeSale(payments);
      setOfflineResult(result);
      setShowPayment(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Offline sale failed. Check your data.');
    }
  };

  const startNewSale = async () => {
    setCompletedSale(null);
    setOfflineResult(null);
    setSale(null);
    setLoyaltyEarnedLastSale(null);
    setSaleLoading(true);
    try { await createNewSale(); }
    finally { setSaleLoading(false); setTimeout(() => searchRef.current?.focus(), 200); }
  };

  const holdCurrentSale = async () => {
    if (!sale?.items?.length) return toast.error('Cart is empty.');
    const name = holdName || sale.customer?.name || `Hold ${new Date().toLocaleTimeString()}`;
    try {
      await apiClient.post('/store/pos/hold', { name, data: { sale_id: sale.id, items: sale.items }, customer_id: sale.customer_id, branch_id: sale.branch_id });
      toast.success(`Held as "${name}".`);
      setHoldName(''); setShowHolds(false);
      await createNewSale();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const loadHolds = async () => {
    try { const res = await apiClient.get('/store/pos/hold'); setHolds((res.data as any)?.holds ?? []); }
    catch { setHolds([]); }
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const sc      = loadShortcuts();
    const customs = loadCustomShortcuts();

    // Build full key string matching what shortcuts settings page stores
    const pressedKey = (e: globalThis.KeyboardEvent): string => {
      const parts: string[] = [];
      if (e.ctrlKey)  parts.push('Ctrl');
      if (e.altKey)   parts.push('Alt');
      if (e.shiftKey && e.key.length > 1) parts.push('Shift');
      parts.push(e.key);
      return parts.join('+');
    };

    const h = (e: globalThis.KeyboardEvent) => {
      // Escape must always close whatever's open, even while typing in a
      // search/amount/reason field — that's where focus sits most of the time.
      if (e.key === 'Escape') {
        setShowCustomer(false); setShowPayment(false); setShowHolds(false);
        setShowDiscount(false); setShowShortcuts(false); setShowRedeem(false);
        setShowScanner(false);
        setEditItem(null);
        // Return focus to the scanner input so keyboard-only flow can continue.
        setTimeout(() => searchRef.current?.focus(), 0);
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = pressedKey(e);

      // Built-in shortcuts
      if (key === sc.search)   { e.preventDefault(); searchRef.current?.focus(); return; }
      if (key === sc.customer) { e.preventDefault(); setShowCustomer(true); return; }
      if (key === sc.discount) { e.preventDefault(); setShowDiscount(s => !s); return; }
      if (key === sc.pay)      { e.preventDefault(); if (sale?.items?.length) setShowPayment(true); return; }
      if (key === sc.hold)     { e.preventDefault(); loadHolds(); setShowHolds(true); return; }
      if (key === sc.help)     { e.preventDefault(); setShowShortcuts(s => !s); return; }

      // Custom shortcuts
      const custom = customs.find(c => c.key === key);
      if (!custom) return;
      e.preventDefault();
      if (custom.action === 'add_product' && custom.product_id) {
        addProductToCart({ id: custom.product_id, name: custom.product_name });
        toast.success(`Added: ${custom.product_name}`);
      }
      if (custom.action === 'open_page' && custom.url) {
        router.push(custom.url);
      }
    };

    // Scoped to the POS work area only — a keystroke made while focus is in the
    // dashboard sidebar (or anywhere else outside this page) must not trigger these.
    const container = pageRef.current;
    container?.addEventListener('keydown', h);
    return () => container?.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale, router]);

  // ── Computed — switch between online (server) cart and offline (IndexedDB) cart ──

  const offlineMode = !isOnline;
  const oc          = offlineCartHook.cart; // offline cart shorthand

  // Items and totals — from offline cart when offline, server cart when online
  const items     = offlineMode ? (oc?.items ?? []) as any[] : (sale?.items ?? []);
  const customer  = offlineMode ? (oc?.customer ?? null)     : (sale?.customer ?? null);
  const total     = offlineMode ? (oc?.total  ?? 0)          : Number(sale?.total  ?? 0);
  const itemCount = offlineMode
    ? items.reduce((s: number, i: any) => s + Number(i.quantity), 0)
    : items.reduce((s: number, i: any) => s + Number(i.quantity), 0);

  if (saleLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div ref={pageRef} className="relative h-[calc(100vh-2rem)] flex gap-4 overflow-hidden -m-6 md:-m-10 p-3">

      {/* ── SW update banner (edge case J) ────────────────────────────────── */}
      {updateAvailable && (
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-primary text-primary-foreground px-4 py-2 text-sm">
          <span>A new version of the POS is available.</span>
          <button onClick={applyUpdate} className="font-semibold underline hover:no-underline flex-shrink-0">
            Update now
          </button>
        </div>
      )}

      {/* ── Initial sync blocking overlay ──────────────────────────────────── */}
      {sync.isInitialSync && (
        <div className="absolute inset-0 z-50 bg-background/95 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-display font-bold text-xl">Setting up offline mode</p>
            <p className="text-muted-foreground text-sm mt-1">{sync.progress ?? 'Downloading data…'}</p>
          </div>
          <p className="text-xs text-muted-foreground">This only happens once. Future loads are instant.</p>
        </div>
      )}

      {/* ── LEFT: Product picker ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 gap-3 overflow-hidden">
        {/* Sync indicator + search row */}
        <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input ref={searchRef} value={productSearch}
            onChange={e => { setProductSearch(e.target.value); setProductPage(1); }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Scan barcode or search products… (F2)"
            className="pl-10 h-12 text-base shadow-sm" />
          {productSearch && (
            <button onClick={() => { setProductSearch(''); setProductPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button onClick={() => setShowScanner(true)} title="Scan with camera"
          className="h-12 w-12 flex-shrink-0 rounded-xl border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
          <Camera className="h-5 w-5" />
        </button>
        {/* Sync status pill */}
        <SyncIndicator sync={sync} />
        </div>{/* end flex items-center gap-2 */}

        {/* Category filter — from offline cache when available */}
        <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
          {[{ id: null, name: 'All' } as any, ...displayCategories].map((c: any) => (
            <button key={c.id ?? 'all'} onClick={() => { setActiveCategory(c.id ?? null); setProductPage(1); }}
              className={cn('px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors',
                activeCategory === (c.id ?? null) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Show spinner only when using API (not offline cache) and loading */}
          {!usingOfflineData && loadingProducts ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : displayProducts.length === 0 ? (
            <div className="text-center py-12"><Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No products{productSearch ? ` matching "${productSearch}"` : ''}</p></div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-3">
                {displayProducts.map((p: any, i: number) => {
                  const stock   = p.current_stock ?? p.total_stock ?? 0;
                  const inStock = stock > 0 || !p.track_stock || !p.tracks_stock || p.allow_negative_stock;
                  const stale   = p.cached_at && isStale(p.cached_at) && !isOnline;
                  const price   = p.selling_price ?? p.price ?? 0;
                  return (
                    <motion.button key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => inStock ? addProductToCart(p) : toast.warning('Out of stock')}
                      className={cn('text-left p-3 rounded-xl border bg-card hover:shadow-md transition-all active:scale-95 relative',
                        !inStock && 'opacity-50 cursor-not-allowed')}>
                      {!inStock && <span className="absolute top-1.5 right-1.5 text-[9px] bg-destructive text-white px-1 py-0.5 rounded">Out</span>}
                      {stale && <span className="absolute top-1.5 left-1.5 text-[9px] bg-amber-400 text-amber-900 px-1 py-0.5 rounded" title={`Data from ${staleLabel(p.cached_at)}`}>stale</span>}
                      {p.is_weightable && <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-primary text-primary-foreground px-1 py-0.5 rounded">Wt</span>}
                      <div className="aspect-square rounded-lg bg-muted mb-2 overflow-hidden">
                        {p.primary_image?.path ? (
                          <img src={`/api/backend/store/files/${p.primary_image.path}`} alt={p.name} className="w-full h-full object-cover" />
                        ) : p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
                        )}
                      </div>
                      <p className="font-medium text-sm leading-tight line-clamp-2">{p.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-primary font-bold text-sm">{Number(price).toFixed(2)}</p>
                        {p.tracks_stock && <span className={cn('text-[10px] font-mono', stock <= 0 ? 'text-destructive' : stock <= 5 ? 'text-amber-500' : 'text-muted-foreground')}>{stock}</span>}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              {!usingOfflineData && productMeta && productMeta.last_page > 1 && (
                <div className="flex justify-center gap-2 pb-2">
                  <Button variant="outline" size="sm" disabled={productPage <= 1} onClick={() => setProductPage(p => p - 1)}>Prev</Button>
                  <span className="text-sm flex items-center px-2">{productPage}/{productMeta.last_page}</span>
                  <Button variant="outline" size="sm" disabled={productPage >= productMeta.last_page} onClick={() => setProductPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart ────────────────────────────────────────────────────────── */}
      <div className="w-[360px] flex-shrink-0 flex flex-col bg-card border rounded-2xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-display font-bold">Cart</span>
            {itemCount > 0 && <Badge variant="default" className="h-5 px-1.5 text-xs">{Math.round(itemCount)}</Badge>}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <button onClick={() => setShowCustomer(true)}
              className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                customer ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              <User className="h-3.5 w-3.5" />
              {customer ? customer.name.split(' ')[0] : 'Walk-in (F3)'}
            </button>
            {customer && (
              <div className="flex gap-1.5">
                {(customer.loyalty_points_balance ?? 0) > 0 && (
                  <button onClick={() => setShowRedeem(true)}
                    className="flex items-center gap-0.5 text-[10px] text-success hover:underline">
                    <Gift className="h-2.5 w-2.5" />{Number(customer.loyalty_points_balance).toFixed(0)} pts
                  </button>
                )}
                {(customer.outstanding_balance ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                    <CreditCard className="h-2.5 w-2.5" />{Number(customer.outstanding_balance).toFixed(2)} owed
                  </span>
                )}
                {customer && 'group' in customer && customer.group && (
                  <span className="text-[10px] px-1.5 rounded-full font-medium"
                    style={{background:customer.group.color+'20',color:customer.group.color}}>
                    {customer.group.name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : items.map((item: any) => {
            // Support both server items (item.id) and offline items (item.local_id)
            const itemKey = item.local_id ?? item.id;
            return (
            <div key={itemKey} className="rounded-xl border bg-background p-2.5">
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                </div>
                <p className="font-bold text-sm flex-shrink-0">{Number(item.line_total).toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => offlineMode ? offlineCartHook.updateQty(itemKey, -1) : updateItemQty(item, -1)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono text-sm">{Number(item.quantity) % 1 === 0 ? Number(item.quantity) : Number(item.quantity).toFixed(2)}</span>
                  <button onClick={() => offlineMode ? offlineCartHook.updateQty(itemKey, 1) : updateItemQty(item, 1)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex gap-1">
                  {!offlineMode && <button onClick={() => setEditItem(editItem?.id === item.id ? null : { ...item })}
                    className="h-7 px-2 rounded-lg border text-xs hover:bg-muted">Edit</button>}
                  <button onClick={() => offlineMode ? offlineCartHook.removeItem(itemKey) : removeItem(item)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-destructive/10 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {editItem?.id === item.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-2 border-t mt-2 grid grid-cols-3 gap-1.5">
                      {[['Price', 'unit_price'], ['Qty', 'quantity'], ['Disc', 'discount_amount']].map(([label, field]) => (
                        <div key={field}>
                          <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                          <Input type="number" value={(editItem as any)[field]}
                            onChange={e => setEditItem({ ...editItem, [field]: parseFloat(e.target.value) || 0 } as SaleItem)}
                            className="h-7 text-xs" />
                        </div>
                      ))}
                    </div>
                    <Button size="sm" className="w-full h-7 mt-1.5 text-xs" onClick={updateEditItem}>Apply</Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            );
          })}
        </div>

        {/* Discount bar */}
        <AnimatePresence>
          {showDiscount && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t">
              <div className="px-4 py-2.5 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Discount (F4)</p>
                <div className="flex gap-1.5">
                  <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="h-8 rounded-md border bg-background px-2 text-sm w-20">
                    <option value="percent">%</option><option value="fixed">Fixed</option>
                  </select>
                  <Input value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="Amount" className="h-8 text-sm flex-1" />
                  <Input value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="Reason" className="h-8 text-sm flex-1" />
                  <Button size="sm" className="h-8" onClick={applyDiscount}>Apply</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Totals — sources differ between online (sale) and offline (oc) */}
        <div className="border-t px-4 py-3 space-y-1">
          {offlineMode && <div className="text-[10px] text-amber-600 flex items-center gap-1 mb-1">⚡ Offline mode</div>}
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{Number(offlineMode ? oc?.subtotal : sale?.subtotal ?? 0).toFixed(2)}</span></div>
          {Number(offlineMode ? oc?.tax_amount : sale?.tax_amount ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span className="font-mono">{Number(offlineMode ? oc?.tax_amount : sale?.tax_amount ?? 0).toFixed(2)}</span></div>}
          {Number(offlineMode ? oc?.discount_amount : sale?.discount_amount ?? 0) > 0 && <div className="flex justify-between text-sm text-success"><span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />Discount</span><span className="font-mono">-{Number(offlineMode ? oc?.discount_amount : sale?.discount_amount ?? 0).toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-xl pt-1.5 border-t"><span>Total</span><span className="font-mono text-primary">{total.toFixed(2)}</span></div>
        </div>

        {/* Actions */}
        <div className="px-3 pb-3 grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowDiscount(s => !s)}>
            <Tag className="h-3.5 w-3.5" />Disc
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={async () => { await loadHolds(); setShowHolds(true); }}>
            <Pause className="h-3.5 w-3.5" />Hold
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs text-destructive"
            onClick={async () => {
              if (!sale || !confirm('Void this cart?')) return;
              try { await apiClient.post(`/store/pos/sales/${sale.id}/void`); localStorage.removeItem(CART_KEY); await createNewSale(); }
              catch (err) { toast.error(getErrorMessage(err)); }
            }}>
            <X className="h-3.5 w-3.5" />Void
          </Button>
          <Button className="col-span-3 h-12 text-base font-bold gap-2" disabled={items.length === 0} onClick={() => setShowPayment(true)}>
            <ShoppingCart className="h-5 w-5" />Pay — {loadShortcuts().pay}
          </Button>
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <button onClick={() => setShowShortcuts(s => !s)} className="fixed bottom-4 left-4 z-30 h-8 w-8 rounded-full bg-muted border flex items-center justify-center text-muted-foreground hover:text-foreground">
        <Keyboard className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {showShortcuts && (() => {
          const sc = loadShortcuts();
          const cs = loadCustomShortcuts();
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-14 left-4 z-30 bg-popover border shadow-xl rounded-xl p-4 w-64 max-h-96 overflow-y-auto">
              <p className="font-bold text-sm mb-2">Shortcuts</p>
              {([
                [sc.search,   'Search'],
                [sc.customer, 'Customer'],
                [sc.discount, 'Discount'],
                [sc.pay,      'Pay'],
                [sc.hold,     'Hold'],
                ['Esc',       'Close'],
                [sc.help,     'This'],
              ] as [string, string][]).map(([k, l]) => (
                <div key={l} className="flex justify-between text-xs py-0.5">
                  <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{k}</kbd>
                  <span className="text-muted-foreground">{l}</span>
                </div>
              ))}
              {cs.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1">Custom</p>
                  {cs.map(c => (
                    <div key={c.id} className="flex justify-between text-xs py-0.5">
                      <kbd className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">{c.key}</kbd>
                      <span className="text-muted-foreground truncate ml-2">{c.label}</span>
                    </div>
                  ))}
                </>
              )}
              <a href="/dashboard/settings/shortcuts" className="block mt-3 text-[10px] text-primary hover:underline">
                Customize shortcuts →
              </a>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Hold sales modal */}
      <AnimatePresence>
        {showHolds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHolds(false)} />
            <motion.div ref={holdsModalRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md">
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4"><h2 className="font-display font-bold text-lg">Parked Sales</h2><button onClick={() => setShowHolds(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button></div>
                {items.length > 0 && (
                  <div className="flex gap-2 mb-4 p-3 bg-muted/30 rounded-xl">
                    <Input value={holdName} onChange={e => setHoldName(e.target.value)} placeholder="Hold name (optional)" className="h-8 text-sm flex-1" />
                    <Button size="sm" className="h-8 gap-1" onClick={holdCurrentSale}><Pause className="h-3.5 w-3.5" />Hold</Button>
                  </div>
                )}
                {holds.length === 0 ? <p className="text-center py-6 text-muted-foreground text-sm">No parked sales.</p>
                  : holds.map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border mb-2">
                      <div className="flex-1 min-w-0"><p className="font-medium text-sm">{h.name}</p><p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleTimeString()}</p></div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={async () => { await apiClient.delete(`/store/pos/hold/${h.id}`); loadHolds(); }}>Delete</Button>
                    </div>
                  ))}
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCustomer && <CustomerModal onSelect={attachCustomer} onClose={() => setShowCustomer(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showScanner && (
          <BarcodeScannerModal
            onScan={(code) => { setShowScanner(false); handleBarcodeScan(code); }}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Payment modal — online or offline paths */}
      <AnimatePresence>
        {showPayment && !isOnline && offlineCartHook.cart && offlineCartHook.cart.items.length > 0 && (
          <PaymentModal
            isOffline
            offlineTotal={offlineCartHook.cart.total}
            onPayOffline={handleOfflinePayments}
            onClose={() => setShowPayment(false)}
          />
        )}
        {showPayment && isOnline && sale && (
          <PaymentModal sale={sale} onPay={handlePayments} onClose={() => setShowPayment(false)} />
        )}
      </AnimatePresence>

      {/* Receipt — online or offline */}
      <AnimatePresence>
        {completedSale && (
          <ReceiptScreen sale={completedSale} onNewSale={startNewSale} loyaltyEarned={loyaltyEarnedLastSale} />
        )}
        {offlineResult && offlineCartHook.cart && (
          <ReceiptScreen offlineResult={offlineResult} offlineCart={offlineCartHook.cart} onNewSale={startNewSale} />
        )}
      </AnimatePresence>

      {/* Loyalty Redeem Modal */}
      <AnimatePresence>
        {showRedeem && customer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowRedeem(false)}/>
            <motion.div ref={redeemModalRef} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} className="relative z-10 w-full max-w-sm">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="h-5 w-5 text-success"/>
                  <h2 className="font-display font-bold">Redeem Loyalty Points</h2>
                </div>
                <div className="bg-success/10 rounded-xl p-3 mb-4 text-center">
                  <p className="text-2xl font-display font-bold text-success">{Number(customer.loyalty_points_balance??0).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">points available</p>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="space-y-1.5">
                    <Label>Points to redeem</Label>
                    <Input type="number" min="0" max={Number(customer.loyalty_points_balance??0)} value={redeemPoints} onChange={e=>setRedeemPoints(e.target.value)} placeholder="0"/>
                  </div>
                  {redeemPoints && parseFloat(redeemPoints) > 0 && (
                    <div className="text-sm text-center text-muted-foreground">
                      = <strong className="text-success">{parseFloat(redeemPoints).toFixed(2)} Rs</strong> discount
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={()=>setShowRedeem(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleRedeemPoints}
                    disabled={redeemingPoints || !redeemPoints || !isOnline}
                    className="flex-1 gap-2"
                    title={!isOnline ? 'Loyalty redemption requires internet — use "Loyalty Points" payment method instead' : undefined}>
                    {redeemingPoints && <Loader2 className="h-4 w-4 animate-spin"/>}
                    {!isOnline ? 'Requires internet' : 'Apply Discount'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PWA install prompt — shown once on first visit via Chrome/Edge */}
      <InstallBanner />
    </div>
  );
}

