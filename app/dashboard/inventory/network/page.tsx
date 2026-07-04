'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe, Search, Loader2, Package, Building2, Store,
  ArrowRight, Plus, X, Check, AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

interface Snapshot {
  id: number;
  store_id: number; store_name: string;
  location_type: 'branch' | 'warehouse';
  location_id: number; location_name: string;
  product_sku: string; product_name: string;
  quantity: number; synced_at: string;
}

interface StoreOption { id: number; name: string; city: string | null; country: string; }

export default function NetworkInventoryPage() {
  const [snapshots,  setSnapshots]  = useState<Snapshot[]>([]);
  const [stores,     setStores]     = useState<StoreOption[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filterStore,setFilterStore]= useState('');
  const [filterSku,  setFilterSku]  = useState('');
  const [search,     setSearch]     = useState('');
  const [requesting, setRequesting] = useState<Snapshot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [snapRes, storeRes] = await Promise.all([
        apiClient.get('/store/network/inventory', {
          store_id:     filterStore || undefined,
          product_name: search      || undefined,
          per_page: 100,
        }),
        apiClient.get('/store/network/stores'),
      ]);
      setSnapshots(getItems(snapRes));
      setStores((storeRes.data as any)?.stores ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [filterStore, search]);

  useEffect(() => { load(); }, [load]);

  // Group by store
  const byStore = snapshots.reduce<Record<number, { store: string; items: Snapshot[] }>>((acc, s) => {
    if (!acc[s.store_id]) acc[s.store_id] = { store: s.store_name, items: [] };
    acc[s.store_id].items.push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight flex items-center gap-3">
            <Globe className="h-8 w-8 text-primary" /> Network Inventory
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse live inventory across all active stores in the network. Request a transfer if you need stock.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name or SKU…" className="pl-9 h-9" />
          </div>
          <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All stores</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterStore(''); }}>Reset</Button>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground font-medium">No network inventory available yet.</p>
          <p className="text-sm text-muted-foreground">Other stores will appear here once they have stock with SKUs set.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byStore).map(([storeId, { store, items }]) => (
            <div key={storeId} className="space-y-2">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">{store}</h2>
                <Badge variant="outline" className="text-[10px]">{items.length} SKUs available</Badge>
              </div>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Product</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Location</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Available</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Last Synced</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(snap => (
                      <tr key={snap.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium">{snap.product_name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{snap.product_sku}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border',
                            snap.location_type === 'warehouse'
                              ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            <Building2 className="h-3 w-3" />
                            {snap.location_type === 'warehouse' ? 'WH: ' : ''}{snap.location_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-lg">{Number(snap.quantity).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {snap.synced_at ? new Date(snap.synced_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => setRequesting(snap)}>
                            <Plus className="h-3 w-3" /> Request
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Request modal */}
      {requesting && (
        <RequestModal
          snapshot={requesting}
          onClose={() => setRequesting(null)}
          onSent={() => { setRequesting(null); toast.success('Transfer request sent!'); }}
        />
      )}
    </div>
  );
}

// ── Request Modal ──────────────────────────────────────────────────────────────
function RequestModal({ snapshot, onClose, onSent }: {
  snapshot: Snapshot; onClose: () => void; onSent: () => void;
}) {
  const [qty,   setQty]   = useState('1');
  const [notes, setNotes] = useState('');
  const [saving,setSaving]= useState(false);
  const maxQty = Number(snapshot.quantity);

  async function submit() {
    const q = parseFloat(qty);
    if (!q || q <= 0)      { toast.error('Enter a valid quantity'); return; }
    if (q > maxQty)        { toast.error(`Only ${maxQty} available`); return; }
    setSaving(true);
    try {
      await apiClient.post('/store/network/requests', {
        source_store_id:      snapshot.store_id,
        source_location_type: snapshot.location_type,
        source_location_id:   snapshot.location_id,
        source_location_name: snapshot.location_name,
        product_sku:          snapshot.product_sku,
        product_name:         snapshot.product_name,
        quantity_requested:   q,
        request_notes:        notes || undefined,
      });
      onSent();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xl">Request Transfer</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* Summary */}
        <div className="rounded-xl bg-muted/30 p-4 space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{snapshot.product_name}</span>
            <span className="font-mono text-xs text-muted-foreground">{snapshot.product_sku}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Store className="h-3.5 w-3.5" /> {snapshot.store_name}
            <ArrowRight className="h-3 w-3" />
            <Building2 className="h-3.5 w-3.5" /> {snapshot.location_name}
          </div>
          <p className="text-xs text-muted-foreground">Available: <strong className="text-foreground">{maxQty}</strong> units</p>
        </div>

        <div className="space-y-1.5">
          <Label>Quantity to Request</Label>
          <Input type="number" min="0.001" max={maxQty} step="any" value={qty}
            onChange={e => setQty(e.target.value)} className="h-9" />
          {parseFloat(qty) > maxQty && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Exceeds available stock
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for request…" className="h-9" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={submit} disabled={saving || parseFloat(qty) > maxQty} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Send Request
          </Button>
        </div>
      </Card>
    </div>
  );
}
