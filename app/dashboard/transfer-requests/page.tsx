'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeftRight, Loader2, Check, X, Send, PackageCheck,
  Clock, CheckCircle2, XCircle, Ban, Inbox, ArrowUpRight,
  Package, Store, Building2, AlertCircle, Plus, Warehouse,
  Search, Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

type Direction = 'all' | 'out' | 'in';

interface TransferReq {
  id: number;
  requesting_store_id: number;  requesting_store_name: string;
  source_store_id: number;      source_store_name: string;
  source_location_type: string; source_location_name: string;
  product_sku: string;          product_name: string;
  quantity_requested: number;   quantity_fulfilled: number | null;
  status: string;
  request_notes: string | null; response_notes: string | null;
  created_at: string;           actioned_at: string | null;
}

interface StoreOption  { id: number; name: string; city: string | null; }
interface LocationOpt  { id: number; name: string; code: string | null; type?: string; is_main?: boolean; locationType: 'branch' | 'warehouse'; }
interface SnapshotRow  { product_sku: string; product_name: string; quantity: number; location_name: string; location_type: string; location_id: number; }

const STATUS_META: Record<string, { label: string; icon: any; color: string; rowBg: string }> = {
  pending:    { label: 'Pending',    icon: Clock,        color: 'text-yellow-600 dark:text-yellow-400', rowBg: '' },
  approved:   { label: 'Approved',   icon: CheckCircle2, color: 'text-green-600 dark:text-green-400',   rowBg: '' },
  in_transit: { label: 'In Transit', icon: Send,         color: 'text-blue-600 dark:text-blue-400',     rowBg: 'bg-blue-50/30 dark:bg-blue-950/20' },
  completed:  { label: 'Completed',  icon: PackageCheck, color: 'text-green-700 dark:text-green-300',   rowBg: 'bg-green-50/30 dark:bg-green-950/20' },
  rejected:   { label: 'Rejected',   icon: XCircle,      color: 'text-destructive',                     rowBg: '' },
  cancelled:  { label: 'Cancelled',  icon: Ban,          color: 'text-muted-foreground',                rowBg: '' },
};

export default function TransferRequestsPage() {
  const [requests,    setRequests]    = useState<TransferReq[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [direction,   setDirection]   = useState<Direction>('all');
  const [status,      setStatus]      = useState('');
  const [acting,      setActing]      = useState<number | null>(null);
  const [showApprove, setShowApprove] = useState<TransferReq | null>(null);
  const [showSend,    setShowSend]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/network/requests', {
        direction, status: status || undefined, per_page: 100,
      });
      setRequests(getItems(res));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [direction, status]);

  useEffect(() => { load(); }, [load]);

  async function doAction(reqId: number, action: string, extra?: Record<string, any>) {
    setActing(reqId);
    try {
      await apiClient.post(`/store/network/requests/${reqId}/${action}`, extra ?? {});
      const labels: Record<string, string> = {
        approve: 'Request approved', reject: 'Request rejected',
        dispatch: 'Marked as in transit', complete: 'Transfer completed',
        cancel: 'Request cancelled',
      };
      toast.success(labels[action] ?? 'Done');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(null); setShowApprove(null); }
  }

  const pendingIn = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight flex items-center gap-3">
            <ArrowLeftRight className="h-8 w-8 text-primary" /> Transfer Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Send inventory to another store, or manage incoming requests from other stores.
          </p>
        </div>
        <Button onClick={() => setShowSend(true)} className="gap-2">
          <Send className="h-4 w-4" /> Send to Store
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
          {([
            ['all', 'All'],
            ['out', 'Sent by Me'],
            ['in', 'Incoming'],
          ] as [Direction, string][]).map(([d, label]) => (
            <button key={d} onClick={() => setDirection(d)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative',
                direction === d ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              {d === 'in' && <Inbox className="h-3 w-3 inline mr-1" />}
              {d === 'out' && <ArrowUpRight className="h-3 w-3 inline mr-1" />}
              {label}
              {d === 'in' && pendingIn > 0 && (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingIn}</span>
              )}
            </button>
          ))}
        </div>

        <select value={status} onChange={e => setStatus(e.target.value)}
          className="h-8 rounded-lg border bg-background text-sm px-2">
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground font-medium">No transfer requests yet.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button variant="outline" onClick={() => setShowSend(true)} className="gap-2">
              <Send className="h-4 w-4" /> Send stock to another store
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard/inventory/network" className="gap-2">
                <Search className="h-4 w-4 mr-1.5" /> Browse network to request stock
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const meta    = STATUS_META[req.status] ?? STATUS_META.pending;
            const Icon    = meta.icon;
            const isActing = acting === req.id;

            return (
              <Card key={req.id} className={cn('p-4', meta.rowBg)}>
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Status icon */}
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-muted', meta.color)}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{req.product_name}</p>
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{req.product_sku}</span>
                      <span className={cn('text-xs font-semibold', meta.color)}>{meta.label}</span>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <Store className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium text-foreground">{req.source_store_name}</span>
                      <span className="mx-0.5">→</span>
                      <Store className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium text-foreground">{req.requesting_store_name}</span>
                      <span className="text-muted-foreground">·</span>
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{req.source_location_name}</span>
                    </div>

                    {/* Quantities + date */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>Requested: <strong className="text-foreground">{Number(req.quantity_requested).toLocaleString()}</strong></span>
                      {req.quantity_fulfilled != null && (
                        <span className="text-green-600 dark:text-green-400">
                          Fulfilled: <strong>{Number(req.quantity_fulfilled).toLocaleString()}</strong>
                        </span>
                      )}
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>

                    {req.request_notes  && <p className="text-xs text-muted-foreground italic">Note: "{req.request_notes}"</p>}
                    {req.response_notes && <p className="text-xs text-muted-foreground italic">Response: "{req.response_notes}"</p>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap items-center">
                    {/* Source store: approve / reject pending */}
                    {req.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-200"
                          disabled={isActing} onClick={() => setShowApprove(req)}>
                          <Check className="h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30"
                          disabled={isActing} onClick={() => doAction(req.id, 'reject')}>
                          <X className="h-3 w-3" /> Reject
                        </Button>
                      </>
                    )}

                    {/* Source store: dispatch approved */}
                    {req.status === 'approved' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-blue-600 border-blue-200"
                        disabled={isActing} onClick={() => doAction(req.id, 'dispatch')}>
                        {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Mark Dispatched
                      </Button>
                    )}

                    {/* Requesting store: confirm receipt */}
                    {req.status === 'in_transit' && (
                      <Button size="sm" className="h-7 text-xs gap-1"
                        disabled={isActing} onClick={() => doAction(req.id, 'complete')}>
                        {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <PackageCheck className="h-3 w-3" />}
                        Confirm Receipt
                      </Button>
                    )}

                    {/* Cancel button for pending/approved */}
                    {['pending', 'approved'].includes(req.status) && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={isActing} title="Cancel" onClick={() => doAction(req.id, 'cancel')}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approve modal */}
      {showApprove && (
        <ApproveModal
          req={showApprove}
          onClose={() => setShowApprove(null)}
          onApprove={(qty, notes) => doAction(showApprove.id, 'approve', { quantity_fulfilled: qty, response_notes: notes })}
        />
      )}

      {/* Send to store modal */}
      {showSend && (
        <SendToStoreModal
          onClose={() => setShowSend(false)}
          onSent={() => { setShowSend(false); load(); toast.success('Outbound transfer created — destination store will confirm receipt.'); }}
        />
      )}
    </div>
  );
}

// ── Approve modal ──────────────────────────────────────────────────────────────
function ApproveModal({ req, onClose, onApprove }: {
  req: TransferReq; onClose: () => void; onApprove: (qty: number, notes: string) => void;
}) {
  const [qty,   setQty]   = useState(String(req.quantity_requested));
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Approve Transfer</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="bg-muted/30 rounded-xl p-3 text-sm space-y-1">
          <p className="font-semibold">{req.product_name} <span className="font-mono text-xs text-muted-foreground">{req.product_sku}</span></p>
          <p className="text-xs text-muted-foreground">Requested: <strong className="text-foreground">{req.quantity_requested}</strong> units from {req.requesting_store_name}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Quantity to fulfil</Label>
          <Input type="number" min="0.001" step="any" value={qty} onChange={e => setQty(e.target.value)} className="h-9" />
          {parseFloat(qty) < req.quantity_requested && parseFloat(qty) > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Partial fulfilment ({parseFloat(qty)} of {req.quantity_requested})
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Response notes (optional)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Will ship Monday" className="h-9" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onApprove(parseFloat(qty), notes)} disabled={!parseFloat(qty)} className="flex-1 gap-2">
            <Check className="h-4 w-4" /> Approve
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Send to Store modal ────────────────────────────────────────────────────────
function SendToStoreModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [step,          setStep]          = useState<1 | 2 | 3>(1);
  const [stores,        setStores]        = useState<StoreOption[]>([]);
  const [destStoreId,   setDestStoreId]   = useState('');
  const [locations,     setLocations]     = useState<LocationOpt[]>([]);
  const [destLocId,     setDestLocId]     = useState('');
  const [loadingLocs,   setLoadingLocs]   = useState(false);
  const [myInventory,   setMyInventory]   = useState<SnapshotRow[]>([]);
  const [invSearch,     setInvSearch]     = useState('');
  const [loadingInv,    setLoadingInv]    = useState(false);
  const [items,         setItems]         = useState<{ sku: string; name: string; qty: string; maxQty: number }[]>([]);
  const [notes,         setNotes]         = useState('');
  const [saving,        setSaving]        = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load stores on mount
  useEffect(() => {
    apiClient.get('/store/network/stores')
      .then(res => setStores((res.data as any)?.stores ?? []));
  }, []);

  // Load destination locations when store changes
  useEffect(() => {
    if (!destStoreId) { setLocations([]); return; }
    setLoadingLocs(true);
    apiClient.get(`/store/network/stores/${destStoreId}/locations`)
      .then(res => {
        const d = res.data as any;
        const branches:   LocationOpt[] = (d?.branches   ?? []).map((b: any) => ({ ...b, locationType: 'branch'    as const }));
        const warehouses: LocationOpt[] = (d?.warehouses ?? []).map((w: any) => ({ ...w, locationType: 'warehouse' as const }));
        setLocations([...branches, ...warehouses]);
        setDestLocId('');
      })
      .catch(() => setLocations([]))
      .finally(() => setLoadingLocs(false));
  }, [destStoreId]);

  // Search my own inventory
  function searchInventory(q: string) {
    setInvSearch(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setMyInventory([]); return; }
    timerRef.current = setTimeout(() => {
      setLoadingInv(true);
      apiClient.get('/store/network/my-inventory', { search: q })
        .then(res => setMyInventory((res.data as any)?.inventory ?? []))
        .catch(() => setMyInventory([]))
        .finally(() => setLoadingInv(false));
    }, 280);
  }

  function addItem(row: SnapshotRow) {
    if (items.some(i => i.sku === row.product_sku)) { toast.info('Already added'); return; }
    setItems(prev => [...prev, { sku: row.product_sku, name: row.product_name, qty: '1', maxQty: row.quantity }]);
    setInvSearch(''); setMyInventory([]);
  }

  const selectedLoc = locations.find(l => `${l.locationType}-${l.id}` === destLocId);
  const canProceed2 = !!destStoreId && !!destLocId;
  const canSend     = items.length > 0 && items.every(i => parseFloat(i.qty) > 0 && parseFloat(i.qty) <= i.maxQty);

  async function send() {
    if (!selectedLoc) return;
    setSaving(true);
    try {
      await apiClient.post('/store/network/send', {
        destination_store_id:      parseInt(destStoreId),
        destination_location_type: selectedLoc.locationType,
        destination_location_id:   selectedLoc.id,
        destination_location_name: selectedLoc.name,
        notes: notes || undefined,
        items: items.map(i => ({
          product_sku:  i.sku,
          product_name: i.name,
          quantity:     parseFloat(i.qty),
        })),
      });
      onSent();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Send Inventory to Store
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5">
          {(['Destination', 'Products', 'Review'] as const).map((label, idx) => (
            <div key={label} className="flex items-center gap-1.5 flex-1">
              <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                step > idx + 1 ? 'bg-primary text-primary-foreground' :
                step === idx + 1 ? 'bg-primary/20 text-primary border border-primary' :
                'bg-muted text-muted-foreground')}>
                {step > idx + 1 ? <Check className="h-3 w-3" /> : idx + 1}
              </div>
              <span className={cn('text-xs font-medium', step === idx + 1 ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
              {idx < 2 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Destination ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Destination Store</Label>
              <select value={destStoreId} onChange={e => setDestStoreId(e.target.value)}
                className="w-full h-9 rounded-lg border bg-background text-sm px-3">
                <option value="">— Select store —</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ''}</option>)}
              </select>
              {stores.length === 0 && <p className="text-xs text-muted-foreground">No other active stores in the network.</p>}
            </div>

            {destStoreId && (
              <div className="space-y-1.5">
                <Label>Destination Location</Label>
                {loadingLocs ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading locations…
                  </div>
                ) : locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No active locations at this store.</p>
                ) : (
                  <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                    {locations.map(loc => (
                      <label key={`${loc.locationType}-${loc.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                        <input type="radio" name="destLoc"
                          checked={destLocId === `${loc.locationType}-${loc.id}`}
                          onChange={() => setDestLocId(`${loc.locationType}-${loc.id}`)}
                          className="h-4 w-4" />
                        {loc.locationType === 'warehouse'
                          ? <Warehouse className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          : <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{loc.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {loc.locationType}{loc.type ? ` · ${loc.type.replace('_', ' ')}` : ''}{loc.is_main ? ' · Main' : ''}
                          </p>
                        </div>
                        {loc.code && <span className="font-mono text-[10px] text-muted-foreground">{loc.code}</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button disabled={!canProceed2} onClick={() => setStep(2)} className="flex-1">
                Next: Add Products →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Products ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Search your inventory</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={invSearch} onChange={e => searchInventory(e.target.value)}
                  placeholder="Search by product name or SKU…" className="pl-9 h-9" />
                {loadingInv && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              {/* Search results dropdown */}
              {myInventory.length > 0 && (
                <Card className="divide-y shadow-lg max-h-44 overflow-y-auto">
                  {myInventory.map(row => (
                    <button key={`${row.product_sku}-${row.location_id}`}
                      onMouseDown={() => addItem(row)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/30 text-left text-sm">
                      <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{row.product_name}</p>
                        <p className="text-[11px] text-muted-foreground">{row.location_name} · {Number(row.quantity).toFixed(2)} available</p>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{row.product_sku}</span>
                    </button>
                  ))}
                </Card>
              )}
              {invSearch && myInventory.length === 0 && !loadingInv && (
                <p className="text-xs text-muted-foreground">No matching products with stock found.</p>
              )}
            </div>

            {/* Added items */}
            {items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items to send ({items.length})</p>
                {items.map((item, idx) => (
                  <div key={item.sku} className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
                    <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {item.sku} · max {item.maxQty.toFixed(2)}
                      </p>
                    </div>
                    <Input type="number" min="0.001" max={item.maxQty} step="any"
                      value={item.qty}
                      onChange={e => setItems(p => p.map((ii, i) => i === idx ? { ...ii, qty: e.target.value } : ii))}
                      className={cn('w-24 h-7 text-xs text-center',
                        parseFloat(item.qty) > item.maxQty ? 'border-destructive' : '')} />
                    <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
              <Button disabled={items.length === 0} onClick={() => setStep(3)} className="flex-1">
                Next: Review →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Send ── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-xl bg-muted/30 border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Send className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-semibold">Sending to:</span>
                <span>{stores.find(s => String(s.id) === destStoreId)?.name}</span>
                <span className="text-muted-foreground">→</span>
                {selectedLoc?.locationType === 'warehouse'
                  ? <Warehouse className="h-3.5 w-3.5 text-blue-500" />
                  : <Building2 className="h-3.5 w-3.5 text-muted-foreground" />}
                <span>{selectedLoc?.name}</span>
              </div>

              <div className="divide-y rounded-lg border bg-background overflow-hidden">
                {items.map(item => (
                  <div key={item.sku} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{item.sku}</p>
                    </div>
                    <span className="font-mono font-bold">{parseFloat(item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Dispatch note, tracking info, etc." className="h-9" />
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
              <strong>What happens next:</strong> The destination store will see this in their Transfer Requests and can confirm receipt when the goods arrive. Their inventory will be updated once they confirm.
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Back</Button>
              <Button onClick={send} disabled={saving || !canSend} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Transfer
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
