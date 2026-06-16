'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Loader2, ArrowRight, X, Send, PackageCheck, Ban,
  ChevronRight, Package, Building2, Warehouse as WarehouseIcon,
  CheckCircle2, Clock, FileEdit, XCircle, Search,
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

// ── Types ──────────────────────────────────────────────────────────────────────
interface Branch  { id: number; name: string; code: string | null; is_main: boolean; }
interface WHouse  { id: number; name: string; code: string | null; }

interface TransferItem {
  id: number; product_id: number; variant_id: number | null;
  quantity_sent: number; quantity_received: number | null;
  product?: { id: number; name: string; sku: string; cost_price: string };
}

interface Transfer {
  id: number; transfer_number: string;
  from_branch_id: number | null;    from_warehouse_id: number | null;
  to_branch_id:   number | null;    to_warehouse_id:   number | null;
  transfer_date: string;            received_date: string | null;
  status: 'draft' | 'in_transit' | 'received' | 'cancelled';
  notes: string | null;
  items?: TransferItem[];
}

// unified location value: "b-{id}" for branch, "w-{id}" for warehouse
function parseLocValue(val: string): { branch_id: number | null; warehouse_id: number | null } {
  if (!val) return { branch_id: null, warehouse_id: null };
  const dash = val.indexOf('-');
  const type  = val.slice(0, dash);
  const id    = parseInt(val.slice(dash + 1));
  return type === 'w' ? { branch_id: null, warehouse_id: id } : { branch_id: id, warehouse_id: null };
}

function locName(
  branchId: number | null, warehouseId: number | null,
  branches: Branch[], warehouses: WHouse[]
): string {
  if (warehouseId) {
    const wh = warehouses.find(w => w.id === warehouseId);
    return wh ? `WH: ${wh.name}` : `Warehouse #${warehouseId}`;
  }
  const br = branches.find(b => b.id === branchId);
  return br ? br.name : `Branch #${branchId}`;
}

function isWarehouseId(warehouseId: number | null): boolean {
  return warehouseId !== null;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  draft:      { label: 'Draft',      icon: FileEdit,     color: 'text-muted-foreground' },
  in_transit: { label: 'In Transit', icon: Clock,        color: 'text-yellow-600 dark:text-yellow-400' },
  received:   { label: 'Received',   icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,      color: 'text-destructive' },
};

const STATUS_TABS = ['all', 'draft', 'in_transit', 'received', 'cancelled'];

// ── Location chip ──────────────────────────────────────────────────────────────
function LocChip({ label, isWarehouse }: { label: string; isWarehouse: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border font-medium',
      isWarehouse
        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        : 'bg-muted text-foreground border-border'
    )}>
      {isWarehouse
        ? <WarehouseIcon className="h-3 w-3" />
        : <Building2     className="h-3 w-3" />}
      {label}
    </span>
  );
}

// ── Location <select> with branch + warehouse optgroups ────────────────────────
function LocationSelect({
  value, onChange, branches, warehouses, label, exclude,
}: {
  value: string; onChange: (v: string) => void;
  branches: Branch[]; warehouses: WHouse[];
  label: string; exclude?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 rounded-lg border bg-background text-sm px-3"
      >
        <option value="">— Select —</option>
        {branches.length > 0 && (
          <optgroup label="Branches">
            {branches.map(b => {
              const val = `b-${b.id}`;
              return (
                <option key={val} value={val} disabled={val === exclude}>
                  {b.name}{b.is_main ? ' ★' : ''}{val === exclude ? ' (same as source)' : ''}
                </option>
              );
            })}
          </optgroup>
        )}
        {warehouses.length > 0 && (
          <optgroup label="Warehouses">
            {warehouses.map(w => {
              const val = `w-${w.id}`;
              return (
                <option key={val} value={val} disabled={val === exclude}>
                  {w.name}{val === exclude ? ' (same as source)' : ''}
                </option>
              );
            })}
          </optgroup>
        )}
      </select>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function StockTransfersPage() {
  const [transfers,  setTransfers]  = useState<Transfer[]>([]);
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WHouse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo,   setFilterTo]   = useState('');
  const [expanded,   setExpanded]   = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [receiving,  setReceiving]  = useState<Transfer | null>(null);
  const [acting,     setActing]     = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { per_page: 50 };
      if (tab !== 'all') params.status = tab;

      // parse filter values
      if (filterFrom) {
        const loc = parseLocValue(filterFrom);
        if (loc.warehouse_id) params.from_warehouse_id = loc.warehouse_id;
        else if (loc.branch_id) params.from_branch_id  = loc.branch_id;
      }
      if (filterTo) {
        const loc = parseLocValue(filterTo);
        if (loc.warehouse_id) params.to_warehouse_id = loc.warehouse_id;
        else if (loc.branch_id) params.to_branch_id  = loc.branch_id;
      }

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
      toast.success(action === 'send' ? 'Stock dispatched from source.' : 'Transfer cancelled.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(null); }
  }

  // counts for tab badges
  const counts = transfers.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // all location options for filter dropdown
  const allLocOptions = [
    ...branches.map(b => ({ val: `b-${b.id}`, label: b.name, isWh: false })),
    ...warehouses.map(w => ({ val: `w-${w.id}`, label: `WH: ${w.name}`, isWh: true })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground mt-1">
            Move inventory between your branches and warehouses within this store.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Transfer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status tabs */}
        <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
          {STATUS_TABS.map(s => {
            const count = s === 'all' ? transfers.length : (counts[s] ?? 0);
            return (
              <button key={s} onClick={() => setTab(s)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap',
                  tab === s ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}>
                {s.replace('_', ' ')}
                {count > 0 && (
                  <span className={cn('ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    tab === s ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Location filters */}
        {allLocOptions.length > 0 && (
          <>
            <select value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="h-8 rounded-lg border bg-background text-sm px-2">
              <option value="">All sources</option>
              {allLocOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
            <select value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="h-8 rounded-lg border bg-background text-sm px-2">
              <option value="">All destinations</option>
              {allLocOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </>
        )}

        {(filterFrom || filterTo) && (
          <button onClick={() => { setFilterFrom(''); setFilterTo(''); }}
            className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Package className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <p className="text-muted-foreground font-medium">No transfers found.</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Create a transfer to move stock between your branches or warehouses.
            </p>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Transfer
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-6" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transfer #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">From</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">To</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => {
                const meta    = STATUS_META[t.status] ?? STATUS_META.draft;
                const Icon    = meta.icon;
                const isOpen  = expanded === t.id;
                const isAct   = acting === t.id;
                const fromWH  = isWarehouseId(t.from_warehouse_id);
                const toWH    = isWarehouseId(t.to_warehouse_id);

                return [
                  /* Main row */
                  <tr key={t.id}
                    className={cn('border-b transition-colors cursor-pointer hover:bg-muted/20', isOpen && 'bg-muted/20')}
                    onClick={() => setExpanded(isOpen ? null : t.id)}>
                    <td className="pl-3">
                      <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-sm">{t.transfer_number}</td>
                    <td className="px-4 py-3">
                      <LocChip
                        label={locName(t.from_branch_id, t.from_warehouse_id, branches, warehouses)}
                        isWarehouse={fromWH}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <LocChip
                        label={locName(t.to_branch_id, t.to_warehouse_id, branches, warehouses)}
                        isWarehouse={toWH}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{t.transfer_date}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                      {t.items?.length ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-medium', meta.color)}>
                        <Icon className="h-3.5 w-3.5" />{meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 justify-end">
                        {t.status === 'draft' && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                              disabled={isAct}
                              onClick={() => handleAction(t.id, 'send')}>
                              {isAct ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              Send
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              disabled={isAct}
                              title="Cancel"
                              onClick={() => handleAction(t.id, 'cancel')}>
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {t.status === 'in_transit' && (
                          <Button size="sm" className="h-7 text-xs gap-1"
                            disabled={isAct}
                            onClick={() => setReceiving(t)}>
                            {isAct ? <Loader2 className="h-3 w-3 animate-spin" /> : <PackageCheck className="h-3 w-3" />}
                            Receive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>,

                  /* Expanded items */
                  isOpen && (
                    <tr key={`${t.id}-items`} className="bg-muted/10 border-b">
                      <td colSpan={8} className="px-8 py-4">
                        <TransferItemList transferId={t.id} preloaded={t.items} />
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modals */}
      {showCreate && (
        <CreateTransferModal
          branches={branches}
          warehouses={warehouses}
          onClose={() => { setShowCreate(false); load(); }}
        />
      )}
      {receiving && (
        <ReceiveModal
          transfer={receiving}
          branches={branches}
          warehouses={warehouses}
          onClose={() => { setReceiving(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Expanded item list — loads via GET /store/stock-transfers/{id} ─────────────
function TransferItemList({ transferId, preloaded }: { transferId: number; preloaded?: TransferItem[] }) {
  const [items,   setItems]   = useState<TransferItem[] | null>(preloaded ?? null);
  const [loading, setLoading] = useState(!preloaded);

  useEffect(() => {
    if (items !== null) return;
    apiClient.get(`/store/stock-transfers/${transferId}`)
      .then(res => setItems((res.data as any)?.transfer?.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [transferId, items]);

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading items…
    </div>
  );
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">No items.</p>;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items</p>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-4 bg-background rounded-lg px-3 py-2 border text-sm">
            <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 font-medium">{item.product?.name ?? `Product #${item.product_id}`}</span>
            {item.product?.sku && (
              <span className="font-mono text-[11px] text-muted-foreground">{item.product.sku}</span>
            )}
            <span className="text-xs text-muted-foreground">
              Sent: <strong className="text-foreground">{Number(item.quantity_sent).toFixed(2)}</strong>
            </span>
            {item.quantity_received !== null && (
              <span className={cn('text-xs font-medium',
                Number(item.quantity_received) < Number(item.quantity_sent)
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-green-600 dark:text-green-400'
              )}>
                Received: <strong>{Number(item.quantity_received).toFixed(2)}</strong>
                {Number(item.quantity_received) < Number(item.quantity_sent) && ' ⚠ shortage'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Create Transfer Modal ──────────────────────────────────────────────────────
function CreateTransferModal({ branches, warehouses, onClose }: {
  branches: Branch[]; warehouses: WHouse[]; onClose: () => void;
}) {
  const defaultFrom = branches[0] ? `b-${branches[0].id}` : '';
  const defaultTo   = branches[1] ? `b-${branches[1].id}` : warehouses[0] ? `w-${warehouses[0].id}` : '';

  const [fromLoc, setFromLoc] = useState(defaultFrom);
  const [toLoc,   setToLoc]   = useState(defaultTo);
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [notes,   setNotes]   = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [search,  setSearch]  = useState('');
  const [items,   setItems]   = useState<{ product_id: number; name: string; sku: string; qty: string }[]>([]);
  const [saving,  setSaving]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  function searchProducts(q: string) {
    setSearch(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setProducts([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const r = await apiClient.get('/store/products', { search: q, per_page: 8 });
        setProducts(getItems(r));
      } catch { setProducts([]); }
    }, 280);
  }

  function addItem(p: Product) {
    if (items.some(i => i.product_id === p.id)) { toast.info('Already added'); return; }
    setItems(prev => [...prev, { product_id: p.id, name: p.name, sku: p.sku, qty: '1' }]);
    setSearch(''); setProducts([]);
  }

  async function save() {
    if (!fromLoc || !toLoc)  { toast.error('Select source and destination'); return; }
    if (fromLoc === toLoc)   { toast.error('Source and destination must be different'); return; }
    if (items.length === 0)  { toast.error('Add at least one product'); return; }

    const from = parseLocValue(fromLoc);
    const to   = parseLocValue(toLoc);
    setSaving(true);
    try {
      await apiClient.post('/store/stock-transfers', {
        ...(from.branch_id    ? { from_branch_id:    from.branch_id    } : {}),
        ...(from.warehouse_id ? { from_warehouse_id: from.warehouse_id } : {}),
        ...(to.branch_id      ? { to_branch_id:      to.branch_id      } : {}),
        ...(to.warehouse_id   ? { to_warehouse_id:   to.warehouse_id   } : {}),
        transfer_date: date,
        notes:         notes || undefined,
        items: items.map(i => ({ product_id: i.product_id, quantity_sent: parseFloat(i.qty) || 1 })),
      });
      toast.success('Transfer created as draft — click Send to dispatch stock.');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  const fromWH = fromLoc.startsWith('w-');
  const toWH   = toLoc.startsWith('w-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xl">New Stock Transfer</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* Route selection */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <LocationSelect value={fromLoc} onChange={setFromLoc}
            branches={branches} warehouses={warehouses}
            label="From" exclude={toLoc} />

          <div className="flex items-center justify-center pb-1">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <LocationSelect value={toLoc} onChange={setToLoc}
            branches={branches} warehouses={warehouses}
            label="To" exclude={fromLoc} />

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Transfer Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
          </div>
        </div>

        {/* Route preview */}
        {fromLoc && toLoc && (
          <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2">
            <LocChip
              label={parseLocValue(fromLoc).warehouse_id
                ? (warehouses.find(w => w.id === parseLocValue(fromLoc).warehouse_id)?.name ?? '')
                : (branches.find(b => b.id === parseLocValue(fromLoc).branch_id)?.name ?? '')}
              isWarehouse={fromWH}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <LocChip
              label={parseLocValue(toLoc).warehouse_id
                ? (warehouses.find(w => w.id === parseLocValue(toLoc).warehouse_id)?.name ?? '')
                : (branches.find(b => b.id === parseLocValue(toLoc).branch_id)?.name ?? '')}
              isWarehouse={toWH}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer…" className="h-9" />
        </div>

        {/* Product search */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Add Products</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => searchProducts(e.target.value)}
              placeholder="Search by name or SKU…" className="pl-9 h-9" />
            {products.length > 0 && (
              <Card className="absolute top-10 left-0 right-0 z-10 divide-y shadow-lg max-h-44 overflow-y-auto">
                {products.map((p: any) => (
                  <button key={p.id} onMouseDown={() => addItem(p)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/30 text-left text-sm">
                    <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 font-medium truncate">{p.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{p.sku}</span>
                  </button>
                ))}
              </Card>
            )}
          </div>
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items ({items.length})</p>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <p className="flex-1 text-sm font-medium truncate">{item.name}</p>
                <span className="font-mono text-[11px] text-muted-foreground">{item.sku}</span>
                <Input type="number" min="0.001" step="any" value={item.qty}
                  onChange={e => setItems(p => p.map((ii, i) => i === idx ? { ...ii, qty: e.target.value } : ii))}
                  className="w-20 h-7 text-xs text-center" />
                <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                  className="text-muted-foreground hover:text-destructive flex-shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1 gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Transfer
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Receive Modal — confirm quantities per item ─────────────────────────────────
function ReceiveModal({ transfer, branches, warehouses, onClose }: {
  transfer: Transfer; branches: Branch[]; warehouses: WHouse[]; onClose: () => void;
}) {
  const [items,   setItems]   = useState<{ id: number; name: string; qty_sent: number; qty_received: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    // Use the dedicated show endpoint — no need to load all transfers
    apiClient.get(`/store/stock-transfers/${transfer.id}`)
      .then(res => {
        const t = (res.data as any)?.transfer;
        setItems((t?.items ?? []).map((i: TransferItem) => ({
          id:           i.id,
          name:         i.product?.name ?? `Product #${i.product_id}`,
          qty_sent:     Number(i.quantity_sent),
          qty_received: String(i.quantity_sent), // default to full quantity
        })));
      })
      .catch(() => toast.error('Could not load transfer items.'))
      .finally(() => setLoading(false));
  }, [transfer.id]);

  async function confirm() {
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

  const toLabel = locName(transfer.to_branch_id, transfer.to_warehouse_id, branches, warehouses);
  const toWH    = isWarehouseId(transfer.to_warehouse_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl">Receive Transfer</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              {transfer.transfer_number} → <LocChip label={toLabel} isWarehouse={toWH} />
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground px-1 pb-1 border-b">
                <span className="col-span-1">Product</span>
                <span className="text-center">Sent</span>
                <span className="text-center">Received</span>
              </div>
              {items.map((item, idx) => {
                const received = parseFloat(item.qty_received) || 0;
                const shortage = received < item.qty_sent;
                return (
                  <div key={item.id} className="grid grid-cols-3 items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
                    <p className="text-sm font-medium truncate col-span-1">{item.name}</p>
                    <p className="text-sm text-center text-muted-foreground">{item.qty_sent.toFixed(2)}</p>
                    <Input
                      type="number" min="0" step="any"
                      value={item.qty_received}
                      onChange={e => setItems(p => p.map((ii, i) => i === idx ? { ...ii, qty_received: e.target.value } : ii))}
                      className={cn('h-7 text-xs text-center', shortage && 'border-amber-400 text-amber-700 dark:text-amber-300')}
                    />
                  </div>
                );
              })}
            </div>
            {items.some(i => (parseFloat(i.qty_received) || 0) < i.qty_sent) && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                ⚠ Some quantities are less than sent — shortages will be recorded.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Stock will be added to <strong>{toLabel}</strong> exactly as entered above.
            </p>
          </>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={confirm} disabled={saving || loading} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
            Confirm Receipt
          </Button>
        </div>
      </Card>
    </div>
  );
}
