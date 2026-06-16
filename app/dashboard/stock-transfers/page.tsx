'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Loader2, ArrowRight, X, Send, PackageCheck, Ban,
  ChevronDown, ChevronRight, Package, Building2, Calendar,
  CheckCircle2, Clock, FileEdit, XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Product } from '@/types';

interface Branch    { id: number; name: string; code: string | null; is_main: boolean; }
interface WHouse    { id: number; name: string; code: string | null; branch_id: number | null; }
interface TransferItem { id: number; product_id: number; variant_id: number | null; quantity_sent: number; quantity_received: number | null; product?: { id: number; name: string; sku: string }; }
interface Transfer {
  id: number; transfer_number: string;
  from_branch_id: number | null; from_warehouse_id: number | null;
  to_branch_id: number | null;   to_warehouse_id: number | null;
  transfer_date: string; received_date: string | null;
  status: 'draft' | 'in_transit' | 'received' | 'cancelled';
  notes: string | null;
  items?: TransferItem[];
}

// Unified location label helper
function locationLabel(
  branchId: number | null, warehouseId: number | null,
  branches: Branch[], warehouses: WHouse[]
): string {
  if (warehouseId) return `WH: ${warehouses.find(w => w.id === warehouseId)?.name ?? `#${warehouseId}`}`;
  if (branchId)    return branches.find(b => b.id === branchId)?.name ?? `Branch #${branchId}`;
  return '—';
}

const STATUS_META: Record<string, { label: string; icon: any; variant: string; color: string }> = {
  draft:      { label: 'Draft',      icon: FileEdit,    variant: 'outline',     color: 'text-muted-foreground' },
  in_transit: { label: 'In Transit', icon: Clock,       variant: 'warning',     color: 'text-yellow-600 dark:text-yellow-400' },
  received:   { label: 'Received',   icon: CheckCircle2,variant: 'success',     color: 'text-green-600 dark:text-green-400' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,     variant: 'destructive', color: 'text-destructive' },
};

const STATUS_TABS = ['all', 'draft', 'in_transit', 'received', 'cancelled'];

export default function StockTransfersPage() {
  const [transfers,   setTransfers]   = useState<Transfer[]>([]);
  const [branches,    setBranches]    = useState<Branch[]>([]);
  const [warehouses,  setWarehouses]  = useState<WHouse[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('all');
  const [filterFrom,  setFilterFrom]  = useState('');
  const [filterTo,    setFilterTo]    = useState('');
  const [expanded,    setExpanded]    = useState<number | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [showReceive, setShowReceive] = useState<Transfer | null>(null);
  const [acting,      setActing]      = useState<number | null>(null);

  const locLabel = (branchId: number | null, whId: number | null) =>
    locationLabel(branchId, whId, branches, warehouses);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { per_page: 50 };
      if (tab !== 'all')  params.status          = tab;
      if (filterFrom)     params.from_branch_id  = filterFrom;
      if (filterTo)       params.to_branch_id    = filterTo;
      const res = await apiClient.get('/store/stock-transfers', params);
      setTransfers(getItems(res));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [tab, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      apiClient.get('/store/branches'),
      apiClient.get('/store/warehouses'),
    ]).then(([brRes, whRes]) => {
      setBranches((brRes.data as any)?.branches ?? []);
      setWarehouses((whRes.data as any)?.warehouses ?? []);
    });
  }, []);

  async function handleAction(id: number, action: 'send' | 'cancel') {
    setActing(id);
    try {
      await apiClient.post(`/store/stock-transfers/${id}/${action}`);
      toast.success(action === 'send' ? 'Transfer dispatched — stock deducted from source.' : 'Transfer cancelled.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(null); }
  }

  const counts = {
    all:        transfers.length,
    draft:      transfers.filter(t => t.status === 'draft').length,
    in_transit: transfers.filter(t => t.status === 'in_transit').length,
    received:   transfers.filter(t => t.status === 'received').length,
    cancelled:  transfers.filter(t => t.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground mt-1">Move inventory between branches and warehouses</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Transfer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status tabs */}
        <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
          {STATUS_TABS.map(s => (
            <button key={s}
              onClick={() => setTab(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap',
                tab === s ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
              {counts[s as keyof typeof counts] > 0 && (
                <span className={cn('ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  tab === s ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>{counts[s as keyof typeof counts]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Branch filters */}
        <select value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
          className="h-8 rounded-lg border bg-background text-sm px-2 text-muted-foreground">
          <option value="">All source branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterTo} onChange={e => setFilterTo(e.target.value)}
          className="h-8 rounded-lg border bg-background text-sm px-2 text-muted-foreground">
          <option value="">All destination branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {(filterFrom || filterTo) && (
          <button onClick={() => { setFilterFrom(''); setFilterTo(''); }} className="text-xs text-muted-foreground hover:text-foreground">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Package className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No transfers found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-6" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transfer #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Route</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => {
                const meta = STATUS_META[t.status];
                const Icon = meta.icon;
                const isOpen = expanded === t.id;
                return [
                  <tr key={t.id} className={cn('border-b hover:bg-muted/20 cursor-pointer', isOpen && 'bg-muted/30')}
                    onClick={() => setExpanded(isOpen ? null : t.id)}>
                    <td className="pl-3"><ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-90')} /></td>
                    <td className="px-4 py-3 font-mono font-medium">{t.transfer_number}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {locLabel(t.from_branch_id, t.from_warehouse_id)}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {locLabel(t.to_branch_id, t.to_warehouse_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.transfer_date}</td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-medium', meta.color)}>
                        <Icon className="h-3.5 w-3.5" />{meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        {t.status === 'draft' && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                              disabled={acting === t.id}
                              onClick={() => handleAction(t.id, 'send')}>
                              {acting === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                              disabled={acting === t.id}
                              onClick={() => handleAction(t.id, 'cancel')}>
                              <Ban className="h-3 w-3" /> Cancel
                            </Button>
                          </>
                        )}
                        {t.status === 'in_transit' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-green-700"
                            disabled={acting === t.id}
                            onClick={() => setShowReceive(t)}>
                            <PackageCheck className="h-3 w-3" /> Receive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>,

                  // Expanded items row
                  isOpen && (
                    <tr key={`${t.id}-items`} className="bg-muted/10 border-b">
                      <td colSpan={6} className="px-8 py-4">
                        <TransferItems transferId={t.id} items={t.items} />
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        )}
      </Card>

      {showCreate && <CreateTransferModal branches={branches} warehouses={warehouses} onClose={() => { setShowCreate(false); load(); }} />}
      {showReceive && <ReceiveModal transfer={showReceive} onClose={() => { setShowReceive(null); load(); }} />}
    </div>
  );
}

// ── Lazy-loaded transfer items ─────────────────────────────────────────────────
function TransferItems({ transferId, items: initial }: { transferId: number; items?: TransferItem[] }) {
  const [items, setItems] = useState<TransferItem[] | null>(initial ?? null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || items) return;
    loaded.current = true;
    apiClient.get(`/store/stock-transfers`, { id: transferId, per_page: 1 })
      .then(res => {
        const ts = getItems(res) as Transfer[];
        const t = ts.find(x => x.id === transferId);
        if (t?.items) setItems(t.items);
      });
  }, [transferId, items]);

  if (!items) return <div className="flex gap-2 items-center text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading items…</div>;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No items.</p>;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items</p>
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-4 text-sm bg-background rounded-lg px-3 py-2 border">
          <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 font-medium">{item.product?.name ?? `Product #${item.product_id}`}</span>
          {item.product?.sku && <span className="font-mono text-[11px] text-muted-foreground">{item.product.sku}</span>}
          <span className="text-muted-foreground text-xs">Sent: <strong className="text-foreground">{item.quantity_sent}</strong></span>
          {item.quantity_received !== null && (
            <span className={cn('text-xs', Number(item.quantity_received) < Number(item.quantity_sent) ? 'text-yellow-600' : 'text-green-600')}>
              Received: <strong>{item.quantity_received}</strong>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Location picker — branch OR warehouse in one <select> ─────────────────────
function LocationSelect({ value, onChange, branches, warehouses, label }: {
  value: string; onChange: (v: string) => void;
  branches: Branch[]; warehouses: WHouse[]; label: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-9 rounded-lg border bg-background text-sm px-3">
        <option value="">— Select —</option>
        {branches.length > 0 && (
          <optgroup label="Branches">
            {branches.map(b => <option key={`b-${b.id}`} value={`b-${b.id}`}>{b.name}{b.is_main ? ' ★' : ''}</option>)}
          </optgroup>
        )}
        {warehouses.length > 0 && (
          <optgroup label="Warehouses">
            {warehouses.map(w => <option key={`w-${w.id}`} value={`w-${w.id}`}>WH: {w.name}</option>)}
          </optgroup>
        )}
      </select>
    </div>
  );
}

function parseLocation(val: string): { branch_id: number | null; warehouse_id: number | null } {
  if (!val) return { branch_id: null, warehouse_id: null };
  const [type, id] = val.split('-');
  return type === 'w'
    ? { branch_id: null,     warehouse_id: parseInt(id) }
    : { branch_id: parseInt(id), warehouse_id: null };
}

// ── Create transfer modal ──────────────────────────────────────────────────────
function CreateTransferModal({ branches, warehouses, onClose }: {
  branches: Branch[]; warehouses: WHouse[]; onClose: () => void;
}) {
  const [fromLoc, setFromLoc] = useState(branches[0] ? `b-${branches[0].id}` : '');
  const [toLoc,   setToLoc]   = useState(branches[1] ? `b-${branches[1].id}` : '');
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [notes,   setNotes]   = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [search,  setSearch]  = useState('');
  const [items,   setItems]   = useState<{ product_id: number; name: string; sku: string; qty: string }[]>([]);
  const [saving,  setSaving]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const searchProducts = (q: string) => {
    clearTimeout(timerRef.current);
    if (!q.trim()) { setProducts([]); return; }
    timerRef.current = setTimeout(async () => {
      try { const r = await apiClient.get('/store/products', { search: q, per_page: 8 }); setProducts(getItems(r)); }
      catch { setProducts([]); }
    }, 280);
  };

  function addItem(p: Product) {
    if (items.some(i => i.product_id === p.id)) { toast.info('Already added'); return; }
    setItems(prev => [...prev, { product_id: p.id, name: p.name, sku: p.sku, qty: '1' }]);
    setSearch(''); setProducts([]);
  }

  async function save() {
    if (!fromLoc || !toLoc) { toast.error('Select source and destination'); return; }
    if (fromLoc === toLoc)  { toast.error('Source and destination must be different'); return; }
    if (items.length === 0) { toast.error('Add at least one item'); return; }
    const from = parseLocation(fromLoc);
    const to   = parseLocation(toLoc);
    setSaving(true);
    try {
      await apiClient.post('/store/stock-transfers', {
        ...from.branch_id    ? { from_branch_id: from.branch_id }       : { from_warehouse_id: from.warehouse_id },
        ...to.branch_id      ? { to_branch_id: to.branch_id }           : { to_warehouse_id: to.warehouse_id },
        transfer_date: date,
        notes:         notes || undefined,
        items: items.map(i => ({ product_id: i.product_id, quantity_sent: parseFloat(i.qty) || 1 })),
      });
      toast.success('Transfer created as draft');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xl">New Stock Transfer</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <LocationSelect value={fromLoc} onChange={setFromLoc} branches={branches} warehouses={warehouses} label="From (Branch / Warehouse)" />
          <LocationSelect value={toLoc}   onChange={setToLoc}   branches={branches} warehouses={warehouses} label="To (Branch / Warehouse)" />
          <div className="space-y-1.5">
            <Label className="text-xs">Transfer Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" className="h-9" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Add Products</Label>
          <div className="relative">
            <Input value={search} onChange={e => { setSearch(e.target.value); searchProducts(e.target.value); }}
              placeholder="Search by name or SKU…" className="h-9" />
            {products.length > 0 && (
              <Card className="absolute top-10 left-0 right-0 z-10 divide-y shadow-lg max-h-40 overflow-y-auto">
                {products.map((p: any) => (
                  <button key={p.id} onMouseDown={() => addItem(p)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/30 text-left text-sm">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">{p.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{p.sku}</span>
                  </button>
                ))}
              </Card>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
                <p className="flex-1 text-sm font-medium truncate">{item.name}</p>
                <span className="font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                <Input type="number" min="0.001" step="any" value={item.qty}
                  onChange={e => setItems(p => p.map((ii, i) => i === idx ? { ...ii, qty: e.target.value } : ii))}
                  className="w-20 h-7 text-xs text-center" />
                <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="text-destructive/60 hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1 gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Transfer
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Receive modal — per-item quantity confirmation ─────────────────────────────
function ReceiveModal({ transfer, onClose }: { transfer: Transfer; onClose: () => void }) {
  const [items, setItems] = useState<{ id: number; name: string; qty_sent: number; qty_received: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    apiClient.get('/store/stock-transfers', { per_page: 100 })
      .then(res => {
        const all = getItems(res) as Transfer[];
        const t = all.find(x => x.id === transfer.id);
        const itemList = t?.items ?? transfer.items ?? [];
        setItems(itemList.map(i => ({
          id: i.id,
          name: i.product?.name ?? `Product #${i.product_id}`,
          qty_sent: Number(i.quantity_sent),
          qty_received: String(i.quantity_sent),
        })));
      })
      .finally(() => setLoading(false));
  }, [transfer]);

  async function save() {
    setSaving(true);
    try {
      await apiClient.post(`/store/stock-transfers/${transfer.id}/receive`, {
        items: items.map(i => ({ id: i.id, quantity_received: parseFloat(i.qty_received) || 0 })),
      });
      toast.success('Transfer received — stock added to destination.');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl">Receive Transfer</h2>
            <p className="text-sm text-muted-foreground">{transfer.transfer_number} — confirm quantities</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground px-1">
              <span className="col-span-1">Product</span><span className="text-right">Sent</span><span className="text-right">Received</span>
            </div>
            {items.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-3 items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
                <p className="text-sm font-medium truncate col-span-1">{item.name}</p>
                <p className="text-sm text-center text-muted-foreground">{item.qty_sent}</p>
                <Input type="number" min="0" step="any"
                  value={item.qty_received}
                  onChange={e => setItems(p => p.map((ii, i) => i === idx ? { ...ii, qty_received: e.target.value } : ii))}
                  className={cn('h-7 text-xs text-center',
                    parseFloat(item.qty_received) < item.qty_sent ? 'border-yellow-400 text-yellow-700' : ''
                  )} />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">You can enter less than sent quantity to record a shortage. Stock is added exactly as entered.</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving || loading} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
            Confirm Receipt
          </Button>
        </div>
      </Card>
    </div>
  );
}
