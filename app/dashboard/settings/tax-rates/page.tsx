'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { TaxRate } from '@/types';

type Form = { name: string; rate: string; is_inclusive: boolean; is_active: boolean };

export default function TaxRatesPage() {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; rate: TaxRate | null }>({ open: false, rate: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({ name: '', rate: '', is_inclusive: false, is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/tax-rates');
      setRates((res.data as any)?.tax_rates ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (rate?: TaxRate) => {
    setForm(rate ? { name: rate.name, rate: String(rate.rate), is_inclusive: rate.is_inclusive, is_active: rate.is_active } : { name: '', rate: '', is_inclusive: false, is_active: true });
    setModal({ open: true, rate: rate ?? null });
  };
  const close = () => setModal({ open: false, rate: null });

  const save = async () => {
    if (!form.name || !form.rate) return toast.error('Name and rate are required.');
    setSaving(true);
    try {
      const body = { name: form.name, rate: parseFloat(form.rate), is_inclusive: form.is_inclusive, is_active: form.is_active };
      if (modal.rate) { await apiClient.put(`/store/tax-rates/${modal.rate.id}`, body); toast.success('Tax rate updated.'); }
      else { await apiClient.post('/store/tax-rates', body); toast.success('Tax rate created.'); }
      close(); load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const del = async (r: TaxRate) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    try { await apiClient.delete(`/store/tax-rates/${r.id}`); toast.success('Deleted.'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-4xl font-bold tracking-tight">Tax Rates</h1><p className="text-muted-foreground mt-1">Manage tax rates for your products</p></div>
        <Button onClick={() => open()} className="gap-2"><Plus className="h-4 w-4" />Add Tax Rate</Button>
      </div>
      <Card className="overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        : rates.length === 0 ? <p className="text-center py-16 text-muted-foreground">No tax rates yet.</p>
        : <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rate</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>{rates.map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 font-mono">{r.rate}%</td>
                <td className="px-4 py-3"><Badge variant="outline">{r.is_inclusive ? 'Inclusive' : 'Exclusive'}</Badge></td>
                <td className="px-4 py-3"><Badge variant={r.is_active ? 'success' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => open(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => del(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>}
      </Card>

      <AnimatePresence>{modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg">{modal.rate ? 'Edit Tax Rate' : 'New Tax Rate'}</h2>
                <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. GST" /></div>
                <div className="space-y-1.5"><Label>Rate (%) *</Label><Input type="number" min="0" max="100" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="17.00" /></div>
                <div className="flex items-center justify-between"><Label>Inclusive (price includes tax)</Label><Switch checked={form.is_inclusive} onCheckedChange={v => setForm(f => ({ ...f, is_inclusive: v }))} /></div>
                <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /></div>
              </div>
              <div className="flex gap-2 mt-6">
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
