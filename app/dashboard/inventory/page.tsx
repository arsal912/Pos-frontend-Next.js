'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, Package, Loader2,
  ChevronLeft, ChevronRight, History, SlidersHorizontal,
  Plus, Minus, X, Save,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StatusFilter = '' | 'out' | 'low';

interface InventoryRow {
  id: number; product_id: number; variant_id: number | null; branch_id: number;
  quantity: number; reserved_quantity: number; available?: number;
  stock_value?: number; stock_status?: string;
  product?: { id: number; name: string; sku: string; cost_price: string; low_stock_threshold: number | null };
  variant?: { id: number; name: string; sku: string } | null;
}

interface Branch { id: number; name: string; code: string; is_main: boolean; }

const STATUS_STYLES: Record<string, string> = {
  in_stock: 'bg-green-100 text-green-700',
  low:      'bg-amber-100 text-amber-700',
  out:      'bg-red-100 text-red-700',
};

// ── Quick Adjust Modal ────────────────────────────────────────────────────────

function QuickAdjustModal({ item, branches, onClose, onSaved }: {
  item: InventoryRow; branches: Branch[]; onClose: () => void; onSaved: () => void;
}) {
  const [branchId, setBranchId] = useState(String(item.branch_id));
  const [newQty,   setNewQty]   = useState(Number(item.quantity).toFixed(3));
  const [reason,   setReason]   = useState('count_correction');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const current = Number(item.quantity);
  const next    = parseFloat(newQty) || 0;
  const diff    = next - current;

  const handleSave = async () => {
    if (!newQty || isNaN(next)) return toast.error('Enter a valid quantity.');
    setSaving(true);
    try {
      await apiClient.post('/store/stock-adjustments', {
        branch_id: parseInt(branchId), reason,
        notes: notes || undefined,
        submit: true,
        items: [{ product_id: item.product_id, variant_id: item.variant_id, quantity_after: next }],
      });
      toast.success('Stock updated.');
      onSaved();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Adjust Stock</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="bg-muted/30 rounded-xl p-3 text-sm">
          <p className="font-semibold">{item.product?.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{item.product?.sku}{item.variant ? ` · ${item.variant.name}` : ''}</p>
          <p className="text-xs mt-1 text-muted-foreground">Current: <strong className="text-foreground">{current.toFixed(3)}</strong></p>
        </div>

        {branches.length > 1 && (
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>New Quantity</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0"
              onClick={() => setNewQty(v => Math.max(0, (parseFloat(v)||0) - 1).toFixed(3))}>
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Input type="number" value={newQty} min="0" step="0.001"
              onChange={e => setNewQty(e.target.value)}
              className="text-center font-mono text-lg font-bold" />
            <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0"
              onClick={() => setNewQty(v => ((parseFloat(v)||0) + 1).toFixed(3))}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {newQty !== '' && (
            <p className={cn('text-sm text-center font-medium', diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground')}>
              {diff > 0 ? `+${diff.toFixed(3)} added` : diff < 0 ? `${diff.toFixed(3)} removed` : 'No change'}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Reason</Label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            className="w-full h-9 rounded-md border bg-background px-3 text-sm">
            <option value="count_correction">Count Correction</option>
            <option value="damage">Damage / Spoilage</option>
            <option value="loss">Loss / Theft</option>
            <option value="expired">Expired</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Physical count on 11 Jun" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Apply
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [items,      setItems]      = useState<InventoryRow[]>([]);
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [meta,       setMeta]       = useState<any>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryRow | null>(null);

  const [search,     setSearch]     = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [branchId,   setBranchId]   = useState('');
  const [lowStock,   setLowStock]   = useState(false);
  const [status,     setStatus]     = useState<StatusFilter>('');
  const [page,       setPage]       = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, branchRes] = await Promise.all([
        apiClient.get('/store/inventory', {
          category_id: categoryId || undefined,
          branch_id:   branchId   || undefined,
          low_stock:   lowStock   || undefined,
          status:      status     || undefined,
          page, per_page: 25,
        }),
        apiClient.get('/store/branches'),
      ]);
      setItems(getItems(invRes));
      setMeta((invRes as any).meta?.pagination ?? null);
      setBranches(Array.isArray(branchRes.data) ? branchRes.data as Branch[] : []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [categoryId, branchId, lowStock, status, page]);

  useEffect(() => { load(); }, [load]);

  const filtered   = search
    ? items.filter(i =>
        i.product?.name.toLowerCase().includes(search.toLowerCase()) ||
        i.product?.sku.toLowerCase().includes(search.toLowerCase()))
    : items;
  const totalValue = items.reduce((s, i) => s + (i.stock_value ?? 0), 0);
  const outCount   = items.filter(i => i.stock_status === 'out').length;
  const lowCount   = items.filter(i => i.stock_status === 'low').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Current stock levels · click Adjust on any row to update</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/inventory/adjust"><SlidersHorizontal className="h-4 w-4" />Bulk Adjust</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/inventory/movements"><History className="h-4 w-4" />Movements</Link>
          </Button>
          <Button size="sm" onClick={load} disabled={loading} variant="outline" className="gap-1.5">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total SKUs',   value: meta?.total ?? 0,  color: 'text-primary' },
          { label: 'Out of Stock', value: outCount,           color: outCount > 0 ? 'text-destructive' : '' },
          { label: 'Low Stock',    value: lowCount,           color: lowCount > 0 ? 'text-amber-600'   : '' },
          { label: 'Total Value',  value: totalValue.toLocaleString('en', { minimumFractionDigits: 2 }), color: 'text-green-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn('font-display font-bold text-xl mt-0.5 text-foreground', s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or SKU…" className="pl-9 h-9" />
          </div>
          {branches.length > 1 && (
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }}
              className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">All branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select value={status} onChange={e => { setStatus(e.target.value as StatusFilter); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All status</option>
            <option value="out">Out of stock</option>
            <option value="low">Low stock</option>
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }} className="rounded" />
            Low stock only
          </label>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoryId(''); setStatus(''); setLowStock(false); setPage(1); }}>
            Reset
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground font-medium">No inventory records yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              First, enable <strong>Track Stock</strong> on your products. Then use{' '}
              <Link href="/dashboard/inventory/adjust" className="text-primary underline">Bulk Adjust</Link>{' '}
              or click <strong>Adjust</strong> on any product row to set quantities.
            </p>
            <div className="mt-4">
              <Button asChild size="sm" className="gap-2">
                <Link href="/dashboard/inventory/adjust"><SlidersHorizontal className="h-4 w-4" />Set Opening Stock</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Variant</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">In Stock</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reserved</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Available</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Value</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.01, 0.2) }}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.product?.name ?? `Product #${item.product_id}`}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.product?.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{item.variant?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{Number(item.quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs">{Number(item.reserved_quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-600 font-medium">{Number(item.available ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{(item.stock_value ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap', STATUS_STYLES[item.stock_status ?? 'in_stock'])}>
                          {item.stock_status === 'out' ? 'Out of stock' : item.stock_status === 'low' ? 'Low stock' : 'In stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" asChild>
                            <Link href={`/dashboard/inventory/movements?product_id=${item.product_id}`}>History</Link>
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                            onClick={() => setAdjustItem(item)}>
                            Adjust
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">Total: {meta.total}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1"><ChevronLeft className="h-4 w-4" />Prev</Button>
                  <span className="text-sm flex items-center px-2">{page}/{meta.last_page}</span>
                  <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)} className="gap-1">Next<ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Quick Adjust Modal */}
      <AnimatePresence>
        {adjustItem && (
          <QuickAdjustModal
            item={adjustItem}
            branches={branches}
            onClose={() => setAdjustItem(null)}
            onSaved={() => { setAdjustItem(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
