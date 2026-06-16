'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, Package, Loader2,
  ChevronLeft, ChevronRight, History, SlidersHorizontal,
  Plus, Minus, X, Save, Building2, Globe, ChevronDown, ChevronRight as ChevronRightIcon,
  ArrowLeftRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StatusFilter = '' | 'out' | 'low';
type ViewMode = 'flat' | 'grouped';

interface InventoryRow {
  id: number; product_id: number; variant_id: number | null;
  branch_id: number | null; warehouse_id: number | null;
  quantity: number; reserved_quantity: number; available?: number;
  stock_value?: number; stock_status?: string;
  product?: { id: number; name: string; sku: string; cost_price: string; low_stock_threshold: number | null };
  variant?: { id: number; name: string; sku: string } | null;
  warehouse?: { id: number; name: string; code: string | null } | null;
}

interface Branch { id: number; name: string; code: string | null; is_main: boolean; }
interface WHouse { id: number; name: string; code: string | null; }

// group rows by product+variant
interface ProductGroup {
  key: string;
  product_id: number;
  variant_id: number | null;
  productName: string;
  sku: string;
  variantName: string | null;
  totalQty: number;
  totalValue: number;
  worstStatus: string;
  locations: InventoryRow[];
}

const STATUS_STYLES: Record<string, string> = {
  in_stock: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  low:      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  out:      'bg-red-100  text-red-700  dark:bg-red-950  dark:text-red-400',
};
const STATUS_RANK: Record<string, number> = { out: 0, low: 1, in_stock: 2 };

function groupRows(rows: InventoryRow[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  for (const r of rows) {
    const key = `${r.product_id}-${r.variant_id ?? 'null'}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalQty   += Number(r.quantity);
      existing.totalValue += r.stock_value ?? 0;
      existing.locations.push(r);
      const rank = STATUS_RANK[r.stock_status ?? 'in_stock'] ?? 2;
      if (rank < STATUS_RANK[existing.worstStatus]) existing.worstStatus = r.stock_status ?? 'in_stock';
    } else {
      map.set(key, {
        key,
        product_id:  r.product_id,
        variant_id:  r.variant_id,
        productName: r.product?.name ?? `Product #${r.product_id}`,
        sku:         r.product?.sku  ?? '',
        variantName: r.variant?.name ?? null,
        totalQty:    Number(r.quantity),
        totalValue:  r.stock_value ?? 0,
        worstStatus: r.stock_status ?? 'in_stock',
        locations:   [r],
      });
    }
  }
  return Array.from(map.values());
}

// ── Quick Adjust Modal ─────────────────────────────────────────────────────────
function QuickAdjustModal({ item, branches, onClose, onSaved }: {
  item: InventoryRow; branches: Branch[]; onClose: () => void; onSaved: () => void;
}) {
  const [branchId, setBranchId] = useState(String(item.branch_id ?? branches[0]?.id ?? ''));
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

// ── Location chip ──────────────────────────────────────────────────────────────
function LocationChip({ row, branches }: { row: InventoryRow; branches: Branch[] }) {
  if (row.warehouse) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5">
        <Building2 className="h-3 w-3" />WH: {row.warehouse.name}
      </span>
    );
  }
  const branch = branches.find(b => b.id === row.branch_id);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 border">
      <Building2 className="h-3 w-3" />{branch?.name ?? `Branch #${row.branch_id}`}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [items,      setItems]      = useState<InventoryRow[]>([]);
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WHouse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [meta,       setMeta]       = useState<any>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryRow | null>(null);
  const [viewMode,   setViewMode]   = useState<ViewMode>('grouped');
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set());

  const [search,      setSearch]      = useState('');
  const [categoryId,  setCategoryId]  = useState('');
  const [branchId,    setBranchId]    = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lowStock,    setLowStock]    = useState(false);
  const [status,      setStatus]      = useState<StatusFilter>('');
  const [page,        setPage]        = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, branchRes, whRes] = await Promise.all([
        apiClient.get('/store/inventory', {
          category_id:  categoryId  || undefined,
          branch_id:    branchId    || undefined,
          warehouse_id: warehouseId || undefined,
          low_stock:    lowStock    || undefined,
          status:       status      || undefined,
          page, per_page: 50,
        }),
        apiClient.get('/store/branches'),
        apiClient.get('/store/warehouses'),
      ]);
      setItems(getItems(invRes));
      setMeta((invRes as any).meta?.pagination ?? null);
      setBranches((branchRes.data as any)?.branches ?? []);
      setWarehouses((whRes.data as any)?.warehouses ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [categoryId, branchId, warehouseId, lowStock, status, page]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? items.filter(i =>
        i.product?.name.toLowerCase().includes(search.toLowerCase()) ||
        i.product?.sku.toLowerCase().includes(search.toLowerCase()))
    : items;

  const totalValue = items.reduce((s, i) => s + (i.stock_value ?? 0), 0);
  const outCount   = items.filter(i => i.stock_status === 'out').length;
  const lowCount   = items.filter(i => i.stock_status === 'low').length;
  const groups     = groupRows(filtered);

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Stock counts per branch and warehouse</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/inventory/network"><Globe className="h-4 w-4" />Network Inventory</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/transfer-requests"><ArrowLeftRight className="h-4 w-4" />Transfer Requests</Link>
          </Button>
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

          {/* Branch filter */}
          {branches.length > 0 && (
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setWarehouseId(''); setPage(1); }}
              className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">All branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          {/* Warehouse filter */}
          {warehouses.length > 0 && (
            <select value={warehouseId} onChange={e => { setWarehouseId(e.target.value); setBranchId(''); setPage(1); }}
              className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">All warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}

          <select value={status} onChange={e => { setStatus(e.target.value as StatusFilter); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All status</option>
            <option value="out">Out of stock</option>
            <option value="low">Low stock</option>
          </select>

          {/* View mode toggle */}
          <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5 ml-auto">
            {(['grouped', 'flat'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                  viewMode === m ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {m === 'grouped' ? 'By Product' : 'Flat List'}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoryId(''); setBranchId(''); setWarehouseId(''); setStatus(''); setLowStock(false); setPage(1); }}>
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
              Enable <strong>Track Stock</strong> on your products, then use{' '}
              <Link href="/dashboard/inventory/adjust" className="text-primary underline">Bulk Adjust</Link>{' '}
              to set opening quantities.
            </p>
            <div className="mt-4">
              <Button asChild size="sm"><Link href="/dashboard/inventory/adjust"><SlidersHorizontal className="h-4 w-4 mr-2" />Set Opening Stock</Link></Button>
            </div>
          </div>
        ) : viewMode === 'grouped' ? (
          // ── GROUPED VIEW ────────────────────────────────────────────────────
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-8" />
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Stock</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Locations</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Value</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => {
                  const isOpen = expanded.has(g.key);
                  return [
                    <tr key={g.key}
                      className={cn('border-b hover:bg-muted/20 cursor-pointer transition-colors', isOpen && 'bg-muted/20')}
                      onClick={() => g.locations.length > 1 && toggleExpand(g.key)}>
                      <td className="pl-3 pr-0">
                        {g.locations.length > 1
                          ? <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', !isOpen && '-rotate-90')} />
                          : <span className="w-4 inline-block" />}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{g.productName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{g.sku}{g.variantName && ` · ${g.variantName}`}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-lg">{g.totalQty.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {g.locations.slice(0, 2).map(loc => (
                            <LocationChip key={loc.id} row={loc} branches={branches} />
                          ))}
                          {g.locations.length > 2 && <span className="text-[11px] text-muted-foreground">+{g.locations.length - 2} more</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{g.totalValue.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_STYLES[g.worstStatus ?? 'in_stock'])}>
                          {g.worstStatus === 'out' ? 'Out of stock' : g.worstStatus === 'low' ? 'Low stock' : 'In stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" asChild>
                            <Link href={`/dashboard/inventory/movements?product_id=${g.product_id}`}>History</Link>
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                            onClick={() => setAdjustItem(g.locations[0])}>Adjust</Button>
                        </div>
                      </td>
                    </tr>,

                    // ── Per-location breakdown (expanded) ───────────────────
                    isOpen && g.locations.map(loc => (
                      <tr key={`loc-${loc.id}`} className="bg-muted/10 border-b last:border-0">
                        <td colSpan={2} className="pl-10 pr-4 py-2">
                          <LocationChip row={loc} branches={branches} />
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">{Number(loc.quantity).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                          Res: {Number(loc.reserved_quantity).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">{(loc.stock_value ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', STATUS_STYLES[loc.stock_status ?? 'in_stock'])}>
                            {loc.stock_status === 'out' ? 'Out' : loc.stock_status === 'low' ? 'Low' : 'OK'}
                          </span>
                        </td>
                        <td className="px-4 py-2" />
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // ── FLAT VIEW ───────────────────────────────────────────────────────
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
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
                      <p className="text-xs text-muted-foreground font-mono">{item.product?.sku}{item.variant ? ` · ${item.variant.name}` : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <LocationChip row={item} branches={branches} />
                    </td>
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
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setAdjustItem(item)}>Adjust</Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">Total records: {meta.total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1"><ChevronLeft className="h-4 w-4" />Prev</Button>
              <span className="text-sm flex items-center px-2">{page}/{meta.last_page}</span>
              <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)} className="gap-1">Next<ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      <AnimatePresence>
        {adjustItem && (
          <QuickAdjustModal item={adjustItem} branches={branches}
            onClose={() => setAdjustItem(null)}
            onSaved={() => { setAdjustItem(null); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
