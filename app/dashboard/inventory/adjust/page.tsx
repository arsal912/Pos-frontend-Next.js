'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Product } from '@/types';

interface AdjustItem {
  product_id: number;
  variant_id: number | null;
  product_name: string;
  sku: string;
  current_qty: number;
  quantity_after: string;
}

export default function StockAdjustPage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState('1');
  const [reason, setReason] = useState<string>('count_correction');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<AdjustItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await apiClient.get('/store/products', { search: q, per_page: 8, is_active: 'true' });
      setSearchResults(getItems(res));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const addItem = async (product: Product, variantId?: number) => {
    const alreadyAdded = items.some(i => i.product_id === product.id && i.variant_id === (variantId ?? null));
    if (alreadyAdded) { toast.info('Already in the adjustment list.'); return; }

    // Fetch current stock
    try {
      const res = await apiClient.get(`/store/inventory/products/${product.id}`);
      const branches = (res.data as any)?.stock_by_branch ?? [];
      const branchStock = branches.find((b: any) => String(b.branch_id) === branchId);
      const currentQty = branchStock ? Number(branchStock.quantity) : 0;

      setItems(prev => [...prev, {
        product_id: product.id,
        variant_id: variantId ?? null,
        product_name: product.name,
        sku: product.sku,
        current_qty: currentQty,
        quantity_after: String(currentQty),
      }]);
    } catch {
      setItems(prev => [...prev, {
        product_id: product.id,
        variant_id: variantId ?? null,
        product_name: product.name,
        sku: product.sku,
        current_qty: 0,
        quantity_after: '0',
      }]);
    }

    setProductSearch('');
    setSearchResults([]);
  };

  const handleSave = async (submit: boolean) => {
    if (items.length === 0) return toast.error('Add at least one product.');
    setSaving(true);
    try {
      await apiClient.post('/store/stock-adjustments', {
        branch_id: parseInt(branchId),
        reason,
        notes: notes || undefined,
        submit,
        items: items.map(i => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          quantity_after: parseFloat(i.quantity_after) || 0,
        })),
      });
      toast.success(submit ? 'Adjustment submitted and applied.' : 'Adjustment saved as draft.');
      router.push('/dashboard/inventory');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/inventory"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div><h1 className="font-display text-3xl font-bold tracking-tight">Stock Adjustment</h1></div>
      </div>

      <Card className="p-6 space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Branch ID</Label>
            <Input value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="1" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              {['count_correction','damage','loss','expired','other'].map(r => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
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
            <Input value={productSearch} onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }}
              placeholder="Search by name or SKU…" className="pl-9 h-9" />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {searchResults.length > 0 && (
            <Card className="divide-y shadow-lg">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => addItem(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 text-left transition-colors">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                  </div>
                  <Plus className="h-4 w-4 ml-auto text-muted-foreground" />
                </button>
              ))}
            </Card>
          )}
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
              <span className="col-span-5">Product</span>
              <span className="col-span-2 text-right">Current</span>
              <span className="col-span-3 text-right">New Qty</span>
              <span className="col-span-2 text-right">Diff</span>
            </div>
            {items.map((item, idx) => {
              const diff = (parseFloat(item.quantity_after) || 0) - item.current_qty;
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/20 rounded-lg px-2 py-2">
                  <div className="col-span-5">
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                  </div>
                  <span className="col-span-2 text-right font-mono text-sm text-muted-foreground">{item.current_qty.toFixed(2)}</span>
                  <div className="col-span-3">
                    <Input type="number" value={item.quantity_after} min="0" step="0.001"
                      onChange={e => setItems(prev => prev.map((ii, i) => i === idx ? { ...ii, quantity_after: e.target.value } : ii))}
                      className="h-8 text-right font-mono text-sm" />
                  </div>
                  <div className="col-span-1 text-right">
                    <span className={diff >= 0 ? 'text-success text-sm font-mono' : 'text-destructive text-sm font-mono'}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                    </span>
                  </div>
                  <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="col-span-1 flex justify-end text-destructive/60 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || items.length === 0} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save as Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving || items.length === 0} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Submit & Apply
          </Button>
        </div>
      </Card>
    </div>
  );
}

