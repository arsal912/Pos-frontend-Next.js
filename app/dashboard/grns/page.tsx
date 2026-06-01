'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Loader2, CheckCircle2, X as XIcon, Package2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Grn, Supplier, PurchaseOrder, Product } from '@/types';

export default function GrnsPage() {
  const searchParams = useSearchParams();
  const [grns, setGrns] = useState<Grn[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(!!searchParams.get('po_id'));
  const defaultPoId = searchParams.get('po_id') ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/grns', { page, per_page: 20 });
      setGrns((res as any).data?.data ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-4xl font-bold tracking-tight">Goods Received Notes</h1><p className="text-muted-foreground mt-1">Record incoming stock from suppliers</p></div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" />New GRN</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        : grns.length === 0 ? <div className="text-center py-16"><Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No GRNs yet. Receive goods from a supplier or PO.</p></div>
        : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">GRN #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">PO Ref</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Supplier</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody>{grns.map(g => (
              <tr key={g.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-mono font-medium">{g.grn_number}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{g.purchase_order?.po_number ?? '—'}</td>
                <td className="px-4 py-3">{g.supplier?.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{g.received_date}</td>
                <td className="px-4 py-3">{g.items_count ?? 0}</td>
                <td className="px-4 py-3"><Badge variant={g.status === 'received' ? 'success' : 'warning'} className="capitalize">{g.status}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      {showCreate && <QuickCreateGrn defaultPoId={defaultPoId} onClose={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function QuickCreateGrn({ defaultPoId, onClose }: { defaultPoId?: string; onClose: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProd, setSearchProd] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('1');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [poId, setPoId] = useState(defaultPoId ?? '');
  const [status, setStatus] = useState('received');
  const [items, setItems] = useState<{ product_id: number; name: string; sku: string; quantity_received: string; unit_cost: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/store/suppliers', { per_page: 100 }).then(r => setSuppliers((r as any).data?.data ?? [])).catch(() => {});
  }, []);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); return; }
    try { const r = await apiClient.get('/store/products', { search: q, per_page: 8 }); setProducts((r as any).data?.data ?? []); }
    catch { setProducts([]); }
  }, []);

  const addItem = (p: Product) => {
    if (items.some(i => i.product_id === p.id)) return;
    setItems(prev => [...prev, { product_id: p.id, name: p.name, sku: p.sku, quantity_received: '1', unit_cost: String(p.cost_price) }]);
    setSearchProd(''); setProducts([]);
  };

  const save = async () => {
    if (items.length === 0) return toast.error('Add at least one item.');
    setSaving(true);
    try {
      const endpoint = poId ? `/store/purchase-orders/${poId}/grns` : '/store/grns';
      await apiClient.post(endpoint, {
        supplier_id: supplierId ? parseInt(supplierId) : undefined,
        branch_id: parseInt(branchId),
        received_date: receivedDate,
        status,
        items: items.map(i => ({ product_id: i.product_id, quantity_received: parseFloat(i.quantity_received), unit_cost: parseFloat(i.unit_cost) })),
      });
      toast.success('GRN created. Stock updated.');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">New GRN</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="h-4 w-4" /></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1.5"><Label>Supplier</Label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">No supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Branch ID</Label><Input value={branchId} onChange={e => setBranchId(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Received Date</Label><Input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="draft">Draft</option>
              <option value="received">Received (updates stock)</option>
            </select>
          </div>
        </div>

        <div className="relative mb-3">
          <Input value={searchProd} onChange={e => { setSearchProd(e.target.value); searchProducts(e.target.value); }} placeholder="Search product…" className="h-9" />
          {products.length > 0 && (
            <Card className="absolute top-10 left-0 right-0 z-10 divide-y shadow-lg">
              {products.map(p => (
                <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 text-left text-sm">
                  <span className="font-medium flex-1">{p.name}</span><span className="font-mono text-muted-foreground text-xs">{p.sku}</span>
                </button>
              ))}
            </Card>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-2 mb-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-muted/20 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.name}</p></div>
                <Input type="number" value={item.quantity_received} onChange={e => setItems(p => p.map((ii,i) => i===idx?{...ii,quantity_received:e.target.value}:ii))} className="w-20 h-7 text-xs" placeholder="Qty" />
                <Input type="number" value={item.unit_cost} onChange={e => setItems(p => p.map((ii,i) => i===idx?{...ii,unit_cost:e.target.value}:ii))} className="w-24 h-7 text-xs" placeholder="Cost" />
                <button onClick={() => setItems(p => p.filter((_,i) => i!==idx))} className="text-destructive/60 hover:text-destructive"><XIcon className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1 gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Create GRN</Button>
        </div>
      </Card>
    </div>
  );
}
