'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Loader2, Eye, Send, X as XIcon, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PurchaseOrder, Supplier, Product } from '@/types';

const STATUS_VARIANT: Record<string, any> = {
  draft: 'outline', sent: 'warning', partially_received: 'warning',
  received: 'success', cancelled: 'destructive',
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/purchase-orders', { status: status || undefined, page, per_page: 20 });
      setOrders(getItems(res));
      setMeta((res as any).meta?.pagination ?? null);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async (id: number) => {
    try { await apiClient.post(`/store/purchase-orders/${id}/send`); toast.success('PO sent.'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this purchase order?')) return;
    try { await apiClient.post(`/store/purchase-orders/${id}/cancel`); toast.success('PO cancelled.'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-4xl font-bold tracking-tight">Purchase Orders</h1><p className="text-muted-foreground mt-1">Manage supplier purchase orders</p></div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" />New PO</Button>
      </div>

      <Card className="p-4">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {['draft','sent','partially_received','received','cancelled'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        : orders.length === 0 ? <p className="text-center py-16 text-muted-foreground">No purchase orders yet.</p>
        : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">PO #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Supplier</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>{orders.map(po => (
              <tr key={po.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-mono font-medium">{po.po_number}</td>
                <td className="px-4 py-3">{po.supplier?.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{po.order_date}</td>
                <td className="px-4 py-3 text-right font-mono">{Number(po.total).toFixed(2)}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[po.status] ?? 'outline'} className="capitalize">{po.status.replace('_', ' ')}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    {po.status === 'draft' && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleSend(po.id)}>
                        <Send className="h-3 w-3" />Send
                      </Button>
                    )}
                    {po.status === 'sent' && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                        <Link href={`/dashboard/grns?po_id=${po.id}`}>Receive</Link>
                      </Button>
                    )}
                    {['draft','sent','partially_received'].includes(po.status) && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleCancel(po.id)}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      {/* Quick Create PO drawer */}
      {showCreate && <QuickCreatePO onClose={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function QuickCreatePO({ onClose }: { onClose: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProd, setSearchProd] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('1');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<{ product_id: number; name: string; sku: string; quantity_ordered: string; unit_cost: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/store/suppliers', { per_page: 100 }).then(r => setSuppliers(getItems(r))).catch(() => {});
  }, []);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); return; }
    try {
      const r = await apiClient.get('/store/products', { search: q, per_page: 8 });
      setProducts(getItems(r));
    } catch { setProducts([]); }
  }, []);

  const addItem = (p: Product) => {
    if (items.some(i => i.product_id === p.id)) return;
    setItems(prev => [...prev, { product_id: p.id, name: p.name, sku: p.sku, quantity_ordered: '1', unit_cost: String(p.cost_price) }]);
    setSearchProd(''); setProducts([]);
  };

  const save = async () => {
    if (!supplierId) return toast.error('Select a supplier.');
    if (items.length === 0) return toast.error('Add at least one item.');
    setSaving(true);
    try {
      await apiClient.post('/store/purchase-orders', {
        supplier_id: parseInt(supplierId),
        branch_id: parseInt(branchId),
        order_date: orderDate,
        items: items.map(i => ({ product_id: i.product_id, quantity_ordered: parseFloat(i.quantity_ordered), unit_cost: parseFloat(i.unit_cost) })),
      });
      toast.success('Purchase order created.');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">New Purchase Order</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="h-4 w-4" /></button>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label>Supplier *</Label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Select…</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Branch ID</Label><Input value={branchId} onChange={e => setBranchId(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Order Date</Label><Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} /></div>
        </div>

        <div className="relative mb-3">
          <Input value={searchProd} onChange={e => { setSearchProd(e.target.value); searchProducts(e.target.value); }} placeholder="Search product to add…" className="h-9" />
          {products.length > 0 && (
            <Card className="absolute top-10 left-0 right-0 z-10 divide-y shadow-lg">
              {products.map(p => (
                <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 text-left text-sm">
                  <span className="font-medium flex-1">{p.name}</span>
                  <span className="font-mono text-muted-foreground text-xs">{p.sku}</span>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </Card>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-2 mb-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-muted/20 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{item.sku}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <div><p className="text-[10px] text-muted-foreground mb-0.5">Qty</p>
                    <Input type="number" value={item.quantity_ordered} onChange={e => setItems(p => p.map((ii,i) => i===idx?{...ii,quantity_ordered:e.target.value}:ii))} className="w-20 h-7 text-xs" /></div>
                  <div><p className="text-[10px] text-muted-foreground mb-0.5">Cost</p>
                    <Input type="number" value={item.unit_cost} onChange={e => setItems(p => p.map((ii,i) => i===idx?{...ii,unit_cost:e.target.value}:ii))} className="w-24 h-7 text-xs" /></div>
                </div>
                <button onClick={() => setItems(p => p.filter((_,i) => i!==idx))} className="text-destructive/60 hover:text-destructive flex-shrink-0"><XIcon className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="text-right text-sm font-mono text-muted-foreground pr-1">
              Total: {items.reduce((s,i) => s + (parseFloat(i.quantity_ordered)||0) * (parseFloat(i.unit_cost)||0), 0).toFixed(2)}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1 gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Create PO</Button>
        </div>
      </Card>
    </div>
  );
}

