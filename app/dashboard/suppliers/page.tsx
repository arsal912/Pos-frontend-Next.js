'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, Loader2, X, Truck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Supplier } from '@/types';

type SupplierForm = { name: string; company: string; email: string; phone: string; address: string; city: string; country: string; is_active: boolean; notes: string };
const emptyForm = (): SupplierForm => ({ name: '', company: '', email: '', phone: '', address: '', city: '', country: '', is_active: true, notes: '' });

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; supplier: Supplier | null }>({ open: false, supplier: null });
  const [form, setForm] = useState<SupplierForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/suppliers', { search: search || undefined, page, per_page: 20 });
      setSuppliers((res as any).data?.data ?? []);
      setMeta((res as any).meta?.pagination ?? null);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const open = (s?: Supplier) => {
    setForm(s ? { name: s.name, company: s.company ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '', city: s.city ?? '', country: s.country ?? '', is_active: s.is_active, notes: s.notes ?? '' } : emptyForm());
    setModal({ open: true, supplier: s ?? null });
  };
  const close = () => setModal({ open: false, supplier: null });

  const upd = (k: keyof SupplierForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name) return toast.error('Name is required.');
    setSaving(true);
    try {
      if (modal.supplier) { await apiClient.put(`/store/suppliers/${modal.supplier.id}`, form); toast.success('Supplier updated.'); }
      else { await apiClient.post('/store/suppliers', form); toast.success('Supplier created.'); }
      close(); load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const del = async (s: Supplier) => {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    try { await apiClient.delete(`/store/suppliers/${s.id}`); toast.success('Supplier deleted.'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="font-display text-4xl font-bold tracking-tight">Suppliers</h1><p className="text-muted-foreground mt-1">Manage vendors and suppliers</p></div>
        <Button onClick={() => open()} className="gap-2"><Plus className="h-4 w-4" />Add Supplier</Button>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or phone…" className="pl-9 h-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        : suppliers.length === 0 ? (
          <div className="text-center py-16"><Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No suppliers yet.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Supplier</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">City</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Orders</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>{suppliers.map(s => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3"><p className="font-medium">{s.name}</p>{s.company && <p className="text-xs text-muted-foreground">{s.company}</p>}</td>
                <td className="px-4 py-3"><p>{s.phone ?? '—'}</p>{s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.city ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.purchase_orders_count ?? 0}</td>
                <td className="px-4 py-3"><Badge variant={s.is_active ? 'success' : 'outline'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => open(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => del(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      <AnimatePresence>{modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-lg">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg">{modal.supplier ? 'Edit Supplier' : 'New Supplier'}</h2>
                <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Supplier name" /></div>
                <div className="space-y-1.5"><Label>Company</Label><Input value={form.company} onChange={e => upd('company', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => upd('phone', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => upd('email', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={e => upd('city', e.target.value)} /></div>
                <div className="sm:col-span-2 flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={v => upd('is_active', v)} /></div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
                <Button onClick={save} disabled={saving} className="flex-1 gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}</AnimatePresence>
    </div>
  );
}
