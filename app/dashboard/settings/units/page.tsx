'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Unit } from '@/types';

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; unit: Unit | null }>({ open: false, unit: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', short_code: '', is_decimal: false });

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await apiClient.get('/store/units'); setUnits((res.data as any)?.units ?? []); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (u?: Unit) => {
    setForm(u ? { name: u.name, short_code: u.short_code, is_decimal: u.is_decimal } : { name: '', short_code: '', is_decimal: false });
    setModal({ open: true, unit: u ?? null });
  };
  const close = () => setModal({ open: false, unit: null });

  const save = async () => {
    if (!form.name || !form.short_code) return toast.error('Name and short code are required.');
    setSaving(true);
    try {
      if (modal.unit) { await apiClient.put(`/store/units/${modal.unit.id}`, form); toast.success('Unit updated.'); }
      else { await apiClient.post('/store/units', form); toast.success('Unit created.'); }
      close(); load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const del = async (u: Unit) => {
    if (!confirm(`Delete unit "${u.name}"?`)) return;
    try { await apiClient.delete(`/store/units/${u.id}`); toast.success('Deleted.'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-4xl font-bold tracking-tight">Units</h1><p className="text-muted-foreground mt-1">Units of measurement for products</p></div>
        <Button onClick={() => open()} className="gap-2"><Plus className="h-4 w-4" />Add Unit</Button>
      </div>
      <Card className="overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        : units.length === 0 ? <p className="text-center py-16 text-muted-foreground">No units yet. Add "Piece", "Kg", "Litre" etc.</p>
        : <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Decimal</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>{units.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 font-mono text-xs bg-muted/30 rounded">{u.short_code}</td>
                <td className="px-4 py-3">{u.is_decimal ? '✓' : '—'}</td>
                <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => open(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => del(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>}
      </Card>

      <AnimatePresence>{modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-sm">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg">{modal.unit ? 'Edit Unit' : 'New Unit'}</h2>
                <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kilogram" /></div>
                <div className="space-y-1.5"><Label>Short Code *</Label><Input value={form.short_code} onChange={e => setForm(f => ({ ...f, short_code: e.target.value }))} placeholder="e.g. kg" /></div>
                <div className="flex items-center justify-between"><Label>Allow decimal quantities</Label><Switch checked={form.is_decimal} onCheckedChange={v => setForm(f => ({ ...f, is_decimal: v }))} /></div>
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
