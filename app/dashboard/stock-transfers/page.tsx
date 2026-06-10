'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Loader2, ArrowRight, X as XIcon, Send, PackageCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Product } from '@/types';

interface Transfer { id: number; transfer_number: string; from_branch_id: number; to_branch_id: number; transfer_date: string; status: string; items_count?: number; }
const STATUS_VARIANT: Record<string, any> = { draft: 'outline', in_transit: 'warning', received: 'success', cancelled: 'destructive' };

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/stock-transfers', { per_page: 20 });
      setTransfersgetItems((res as any));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: number, action: 'send' | 'receive') => {
    try {
      await apiClient.post(`/store/stock-transfers/${id}/${action}`);
      toast.success(action === 'send' ? 'Transfer dispatched.' : 'Transfer received. Stock updated.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-4xl font-bold tracking-tight">Stock Transfers</h1><p className="text-muted-foreground mt-1">Move stock between branches</p></div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" />New Transfer</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        : transfers.length === 0 ? <p className="text-center py-16 text-muted-foreground">No stock transfers yet.</p>
        : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transfer #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">From → To Branch</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>{transfers.map(t => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-mono font-medium">{t.transfer_number}</td>
                <td className="px-4 py-3">Branch {t.from_branch_id} <ArrowRight className="inline h-3.5 w-3.5 mx-1 text-muted-foreground" /> Branch {t.to_branch_id}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.transfer_date}</td>
                <td className="px-4 py-3">{t.items_count ?? 0}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[t.status] ?? 'outline'} className="capitalize">{t.status.replace('_', ' ')}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    {t.status === 'draft' && <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(t.id, 'send')}><Send className="h-3 w-3" />Send</Button>}
                    {t.status === 'in_transit' && <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(t.id, 'receive')}><PackageCheck className="h-3 w-3" />Receive</Button>}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      {showCreate && <QuickCreateTransfer onClose={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function QuickCreateTransfer({ onClose }: { onClose: () => void }) {
  const [fromBranch, setFromBranch] = useState('1');
  const [toBranch, setToBranch] = useState('2');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProd, setSearchProd] = useState('');
  const [items, setItems] = useState<{ product_id: number; name: string; sku: string; quantity_sent: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); return; }
    try { const r = await apiClient.get('/store/products', { search: q, per_page: 8 }); setProductsgetItems((r as any)); }
    catch { setProducts([]); }
  }, []);

  const addItem = (p: Product) => {
    if (items.some(i => i.product_id === p.id)) return;
    setItems(prev => [...prev, { product_id: p.id, name: p.name, sku: p.sku, quantity_sent: '1' }]);
    setSearchProd(''); setProducts([]);
  };

  const save = async () => {
    if (fromBranch === toBranch) return toast.error('From and To branches must be different.');
    if (items.length === 0) return toast.error('Add at least one item.');
    setSaving(true);
    try {
      await apiClient.post('/store/stock-transfers', {
        from_branch_id: parseInt(fromBranch),
        to_branch_id: parseInt(toBranch),
        transfer_date: transferDate,
        items: items.map(i => ({ product_id: i.product_id, quantity_sent: parseFloat(i.quantity_sent) })),
      });
      toast.success('Transfer created.');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">New Stock Transfer</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="space-y-1.5"><Label>From Branch</Label><Input value={fromBranch} onChange={e => setFromBranch(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>To Branch</Label><Input value={toBranch} onChange={e => setToBranch(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} /></div>
        </div>
        <div className="relative mb-3">
          <Input value={searchProd} onChange={e => { setSearchProd(e.target.value); searchProducts(e.target.value); }} placeholder="Search product…" className="h-9" />
          {products.length > 0 && (
            <Card className="absolute top-10 left-0 right-0 z-10 divide-y shadow-lg">
              {products.map(p => (
                <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 text-left text-sm">
                  <span className="font-medium flex-1">{p.name}</span><span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                </button>
              ))}
            </Card>
          )}
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-center mb-2 bg-muted/20 rounded-lg px-3 py-2">
            <p className="flex-1 text-sm font-medium truncate">{item.name}</p>
            <Input type="number" value={item.quantity_sent} onChange={e => setItems(p => p.map((ii,i) => i===idx?{...ii,quantity_sent:e.target.value}:ii))} className="w-20 h-7 text-xs" />
            <button onClick={() => setItems(p => p.filter((_,i) => i!==idx))} className="text-destructive/60 hover:text-destructive"><XIcon className="h-4 w-4" /></button>
          </div>
        ))}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1 gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Create</Button>
        </div>
      </Card>
    </div>
  );
}

