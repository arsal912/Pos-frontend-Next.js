'use client';

import {
  useEffect, useState, useCallback, useRef, KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, ShoppingCart, X, Plus, Minus, Trash2, User, Tag,
  Pause, Loader2, Package, Keyboard,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CustomerModal from '@/components/pos/CustomerModal';
import PaymentModal from '@/components/pos/PaymentModal';
import ReceiptScreen from '@/components/pos/ReceiptScreen';
import type { Sale, SaleItem, Product, Category, Customer, PaymentMethod, HoldSale } from '@/types';

const CART_KEY = 'pos_draft_sale_id';

export default function PosPage() {
  const [sale, setSale]             = useState<Sale | null>(null);
  const [saleLoading, setSaleLoading] = useState(true);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [productSearch, setProductSearch]   = useState('');
  const [productPage, setProductPage]       = useState(1);
  const [productMeta, setProductMeta]       = useState<any>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [showCustomer, setShowCustomer] = useState(false);
  const [showPayment, setShowPayment]   = useState(false);
  const [showHolds, setShowHolds]       = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [editItem, setEditItem]         = useState<SaleItem | null>(null);
  const [holds, setHolds]               = useState<HoldSale[]>([]);
  const [holdName, setHoldName]         = useState('');

  const [discountType, setDiscountType]   = useState<'fixed' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  const searchRef     = useRef<HTMLInputElement>(null);
  const lastKeyTime   = useRef(0);
  const barcodeBuffer = useRef('');
  const SCAN_THRESHOLD = 100;

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
      setProducts((res as any).data?.data ?? []);
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

  const addProductToCart = async (product: Product, variantId?: number) => {
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
    try {
      const res = await apiClient.get('/store/products/lookup', { barcode });
      const data = res.data as any;
      if (data.product) { await addProductToCart(data.product, data.variant?.id); setProductSearch(''); }
      else toast.error('Product not found for: ' + barcode);
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

  const attachCustomer = async (customer: Customer) => {
    if (!sale) return;
    try {
      const res = await apiClient.post(`/store/pos/sales/${sale.id}/customer`, { customer_id: customer.id });
      setSale((res.data as any)?.sale ?? sale);
      setShowCustomer(false);
      toast.success(`${customer.name} attached.`);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const applyDiscount = async () => {
    if (!sale || !discountValue) return;
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

  const handlePayments = async (payments: { method: PaymentMethod; amount: number }[]) => {
    if (!sale) return;
    for (const p of payments) await apiClient.post(`/store/pos/sales/${sale.id}/payments`, p);
    const res = await apiClient.post(`/store/pos/sales/${sale.id}/complete`);
    setCompletedSale((res.data as any)?.sale);
    setShowPayment(false);
    localStorage.removeItem(CART_KEY);
  };

  const startNewSale = async () => {
    setCompletedSale(null);
    setSale(null);
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
    const h = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F3') { e.preventDefault(); setShowCustomer(true); }
      if (e.key === 'F4') { e.preventDefault(); setShowDiscount(s => !s); }
      if (e.key === 'F5') { e.preventDefault(); if (sale?.items?.length) setShowPayment(true); }
      if (e.key === 'F8') { e.preventDefault(); loadHolds(); setShowHolds(true); }
      if (e.key === '?')  { e.preventDefault(); setShowShortcuts(s => !s); }
      if (e.key === 'Escape') {
        setShowCustomer(false); setShowPayment(false); setShowHolds(false);
        setShowDiscount(false); setShowShortcuts(false); setEditItem(null);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [sale]);

  // ── Computed ─────────────────────────────────────────────────────────────────

  const items     = sale?.items ?? [];
  const customer  = sale?.customer ?? null;
  const total     = Number(sale?.total ?? 0);
  const itemCount = items.reduce((s, i) => s + Number(i.quantity), 0);

  if (saleLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="relative h-[calc(100vh-2rem)] flex gap-4 overflow-hidden -m-6 md:-m-10 p-3">

      {/* ── LEFT: Product picker ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 gap-3 overflow-hidden">
        <div className="relative">
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

        <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
          {[{ id: null, name: 'All' }, ...categories].map(c => (
            <button key={c.id ?? 'all'} onClick={() => { setActiveCategory(c.id); setProductPage(1); }}
              className={cn('px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors',
                activeCategory === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingProducts ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-12"><Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No products</p></div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-3">
                {products.map((p, i) => {
                  const inStock = (p.total_stock ?? 0) > 0 || !p.track_stock || p.allow_negative_stock;
                  return (
                    <motion.button key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      onClick={() => inStock ? addProductToCart(p) : toast.warning('Out of stock')}
                      className={cn('text-left p-3 rounded-xl border bg-card hover:shadow-md transition-all active:scale-95 relative',
                        !inStock && 'opacity-50 cursor-not-allowed')}>
                      {!inStock && <span className="absolute top-1.5 right-1.5 text-[9px] bg-destructive text-white px-1 py-0.5 rounded">Out</span>}
                      <div className="aspect-square rounded-lg bg-muted mb-2 overflow-hidden">
                        {p.primary_image ? (
                          <img src={`/api/backend/store/files/${p.primary_image.path}`} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
                        )}
                      </div>
                      <p className="font-medium text-sm leading-tight line-clamp-2">{p.name}</p>
                      <p className="text-primary font-bold text-sm mt-1">{Number(p.selling_price).toFixed(2)}</p>
                    </motion.button>
                  );
                })}
              </div>
              {productMeta && productMeta.last_page > 1 && (
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
          <button onClick={() => setShowCustomer(true)}
            className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              customer ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            <User className="h-3.5 w-3.5" />
            {customer ? customer.name.split(' ')[0] : 'Walk-in (F3)'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : items.map(item => (
            <div key={item.id} className="rounded-xl border bg-background p-2.5">
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                </div>
                <p className="font-bold text-sm flex-shrink-0">{Number(item.line_total).toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => updateItemQty(item, -1)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono text-sm">{Number(item.quantity) % 1 === 0 ? Number(item.quantity) : Number(item.quantity).toFixed(2)}</span>
                  <button onClick={() => updateItemQty(item, 1)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditItem(editItem?.id === item.id ? null : { ...item })}
                    className="h-7 px-2 rounded-lg border text-xs hover:bg-muted">Edit</button>
                  <button onClick={() => removeItem(item)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-destructive/10 text-destructive">
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
          ))}
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

        {/* Totals */}
        <div className="border-t px-4 py-3 space-y-1">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{Number(sale?.subtotal ?? 0).toFixed(2)}</span></div>
          {Number(sale?.tax_amount ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span className="font-mono">{Number(sale?.tax_amount ?? 0).toFixed(2)}</span></div>}
          {Number(sale?.discount_amount ?? 0) > 0 && <div className="flex justify-between text-sm text-success"><span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />Discount</span><span className="font-mono">-{Number(sale?.discount_amount ?? 0).toFixed(2)}</span></div>}
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
            <ShoppingCart className="h-5 w-5" />Pay — F5
          </Button>
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <button onClick={() => setShowShortcuts(s => !s)} className="fixed bottom-4 left-4 z-30 h-8 w-8 rounded-full bg-muted border flex items-center justify-center text-muted-foreground hover:text-foreground">
        <Keyboard className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-14 left-4 z-30 bg-popover border shadow-xl rounded-xl p-4 w-56">
            <p className="font-bold text-sm mb-2">Shortcuts</p>
            {[['F2','Search'],['F3','Customer'],['F4','Discount'],['F5','Pay'],['F8','Hold'],['Esc','Close'],['?','This']].map(([k,l]) => (
              <div key={k} className="flex justify-between text-xs py-0.5">
                <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{k}</kbd>
                <span className="text-muted-foreground">{l}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hold sales modal */}
      <AnimatePresence>
        {showHolds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHolds(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md">
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
        {showPayment && sale && <PaymentModal sale={sale} onPay={handlePayments} onClose={() => setShowPayment(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {completedSale && <ReceiptScreen sale={completedSale} onNewSale={startNewSale} />}
      </AnimatePresence>
    </div>
  );
}
