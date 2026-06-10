'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Product } from '@/types';

interface AdjustItem {
  product_id:     number;
  variant_id:     number | null;
  product_name:   string;
  sku:            string;
  current_qty:    number;
  quantity_after: string;
}

interface Branch { id: number; name: string; code: string; is_main: boolean; }

const REASONS = [
  { value: 'count_correction', label: 'Count Correction' },
  { value: 'damage',           label: 'Damage / Spoilage' },
  { value: 'loss',             label: 'Loss / Theft' },
  { value: 'expired',          label: 'Expired' },
  { value: 'other',            label: 'Other' },
];

export default function StockAdjustPage() {
  const router          = useRouter();
  const searchParams    = useSearchParams();
  const presetProductId = searchParams.get('product_id');

  const [branches,      setBranches]      = useState<Branch[]>([]);
  const [branchId,      setBranchId]      = useState('');
  const [reason,        setReason]        = useState('count_correction');
  const [notes,         setNotes]         = useState('');
  const [items,         setItems]         = useState<AdjustItem[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching,     setSearching]     = useState(false);

  // Load branches
  useEffect(() => {
    apiClient.get('/store/branches').then(res => {
      const list = Array.isArray(res.data) ? res.data as Branch[] : [];
      setBranches(list);
      const main = list.find(b => b.is_main) ?? list[0];
      if (main) setBranchId(String(main.id));
    }).catch(() => { setBranches([{ id: 1, name: 'Main Branch', code: 'MAIN', is_main: true }]); setBranchId('1'); });
  }, []);

  // Auto-load pre-set product from URL
  useEffect(() => {
    if (!presetProductId || items.length > 0) return;
    apiClient.get(`/store/products/${presetProductId}`)
      .then(res => { const p = (res.data as any)?.product; if (p) addItemFromProduct(p); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetProductId]);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try { const r = await apiClient.get('/store/products', { search: q, per_page: 8, is_active: 'true' }); setSearchResults(getItems(r)); }
    catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const addItemFromProduct = async (product: Product, variantId?: number) => {
    if (items.some(i => i.product_id === product.id && i.variant_id === (variantId ?? null))) {
      toast.info('Already added.'); return;
    }
    let currentQty = 0;
    try {
      const r = await apiClient.get(`/store/inventory/products/${product.id}`);
      const stocks = (r.data as any)?.stock_by_branch ?? [];
      const b = stocks.find((s: any) => String(s.branch_id) === branchId) ?? stocks[0];
      currentQty = b ? Number(b.quantity) : 0;
    } catch {}
    setItems(p => [...p, {
      product_id: product.id, variant_id: variantId ?? null,
      product_name: product.name, sku: product.sku,
      current_qty: currentQty, quantity_after: String(currentQty),
    }]);
    setProductSearch(''); setSearchResults([]);
  };

  const handleSave = async (submit: boolean) => {
    if (!items.length) return toast.error('Add at least one product.');
    if (!branchId)     return toast.error('Select a branch.');
    setSaving(true);
    try {
      await apiClient.post('/store/stock-adjustments', {
        branch_id: parseInt(branchId), reason, notes: notes || undefined, submit,
        items: items.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, quantity_after: parseFloat(i.quantity_after) || 0 })),
      });
      toast.success(submit ? 'Stock adjustment applied.' : 'Saved as draft.');
      router.push('/dashboard/inventory');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const totalDiff = items.reduce((s, i) => s + (parseFloat(i.quantity_after) || 0) - i.current_qty, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/inventory"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="font-display text-3xl font-bold">Stock Adjustment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Set correct quantities for one or more products</p>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        {/* Header */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Branch *</Label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}{b.is_main ? ' (Main)' : ''}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className="h-9" />
          </div>
        </div>

        {/* Product search */}
        <div className="space-y-2">
          <Label>Add Products</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={productSearch}
              onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }}
              placeholder="Search by name or SKU…" className="pl-9 h-9" />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {searchResults.length > 0 && (
            <Card className="divide-y shadow-lg">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => addItemFromProduct(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 text-left transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                  </div>
                  <Plus className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </button>
              ))}
            </Card>
          )}
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2 pb-1 border-b">
              <span className="col-span-5">Product</span>
              <span className="col-span-2 text-right">Current</span>
              <span className="col-span-3 text-right">New Qty</span>
              <span className="col-span-1 text-right">Diff</span>
              <span className="col-span-1" />
            </div>
            {items.map((item, idx) => {
              const diff = (parseFloat(item.quantity_after) || 0) - item.current_qty;
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/20 rounded-xl px-3 py-2.5">
                  <div className="col-span-5">
                    <p className="text-sm font-medium leading-tight">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                  </div>
                  <span className="col-span-2 text-right font-mono text-sm text-muted-foreground">{item.current_qty.toFixed(2)}</span>
                  <div className="col-span-3">
                    <Input type="number" value={item.quantity_after} min="0" step="0.001"
                      onChange={e => setItems(prev => prev.map((ii, i) => i === idx ? { ...ii, quantity_after: e.target.value } : ii))}
                      className="h-8 text-right font-mono text-sm" />
                  </div>
                  <div className="col-span-1 text-right">
                    <span className={diff >= 0 ? 'text-green-600 text-xs font-mono font-bold' : 'text-red-600 text-xs font-mono font-bold'}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                    </span>
                  </div>
                  <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                    className="col-span-1 flex justify-end text-destructive/50 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            <div className="flex justify-between text-sm px-2 pt-1 border-t text-muted-foreground">
              <span>{items.length} product{items.length !== 1 ? 's' : ''}</span>
              <span>Net change: <strong className={totalDiff >= 0 ? 'text-green-600' : 'text-red-600'}>{totalDiff >= 0 ? '+' : ''}{totalDiff.toFixed(2)}</strong></span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t items-center">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || !items.length} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving || !items.length} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Submit & Apply
          </Button>
          <p className="text-xs text-muted-foreground">"Submit & Apply" updates stock immediately.</p>
        </div>
      </Card>
    </div>
  );
}
