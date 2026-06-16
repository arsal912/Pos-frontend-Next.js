'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Check, X, Loader2,
  MapPin, Phone, Mail, Package, Users, ToggleLeft, ToggleRight,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

interface WHouse { id: number; name: string; code: string | null; type: string; is_active: boolean; }
interface Branch {
  id: number; name: string; code: string | null;
  address: string | null; phone: string | null; email: string | null;
  is_main: boolean; is_active: boolean;
  users_count: number; product_count: number; total_stock: number;
  warehouses: WHouse[];
}

const EMPTY_FORM = {
  name: '', code: '', address: '', phone: '', email: '',
  is_main: false, warehouse_ids: [] as number[],
};

// ── Warehouse multi-select ─────────────────────────────────────────────────────
function WarehouseMultiSelect({ warehouses, selected, onChange }: {
  warehouses: WHouse[]; selected: number[]; onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }
  return (
    <div className="rounded-lg border divide-y max-h-44 overflow-y-auto">
      {warehouses.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">No warehouses yet. Create one first.</p>
      )}
      {warehouses.map(w => (
        <label key={w.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
          <input
            type="checkbox"
            checked={selected.includes(w.id)}
            onChange={() => toggle(w.id)}
            className="h-4 w-4 rounded border"
          />
          <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm flex-1">{w.name}</span>
          {w.code && <span className="font-mono text-[10px] text-muted-foreground">{w.code}</span>}
          <span className="text-[10px] text-muted-foreground capitalize">{w.type.replace('_', ' ')}</span>
        </label>
      ))}
    </div>
  );
}

export default function BranchesPage() {
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WHouse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<number | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [brRes, whRes] = await Promise.all([
        apiClient.get('/store/branches'),
        apiClient.get('/store/warehouses'),
      ]);
      setBranches((brRes.data as any)?.branches ?? []);
      setWarehouses((whRes.data as any)?.warehouses ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(b: Branch) {
    setEditId(b.id);
    setForm({
      name: b.name, code: b.code ?? '', address: b.address ?? '',
      phone: b.phone ?? '', email: b.email ?? '',
      is_main: b.is_main, warehouse_ids: b.warehouses.map(w => w.id),
    });
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditId(null); }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await apiClient.put(`/store/branches/${editId}`, form);
        toast.success('Branch updated');
      } else {
        await apiClient.post('/store/branches', form);
        toast.success('Branch created');
      }
      cancelForm(); load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function toggleActive(b: Branch) {
    try {
      await apiClient.put(`/store/branches/${b.id}`, { is_active: !b.is_active });
      toast.success(b.is_active ? 'Branch deactivated' : 'Branch activated');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  async function handleDelete(b: Branch) {
    if (!confirm(`Delete branch "${b.name}"? This cannot be undone.`)) return;
    setDeleting(b.id);
    try {
      await apiClient.delete(`/store/branches/${b.id}`);
      toast.success('Branch deleted'); load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" /> Branches
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage retail locations. Link multiple warehouses to each branch for flexible inventory flow.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Add Branch</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Branches',    value: branches.length },
          { label: 'Active',            value: branches.filter(b => b.is_active).length },
          { label: 'Total Stock Units', value: branches.reduce((s, b) => s + b.total_stock, 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map(b => (
            <Card key={b.id} className={cn('p-5 space-y-4', !b.is_active && 'opacity-60')}>
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    b.is_main ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{b.name}</p>
                      {b.is_main && <Badge variant="default" className="text-[10px] py-0">Main</Badge>}
                      {b.code && <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{b.code}</span>}
                    </div>
                    <Badge variant={b.is_active ? 'success' : 'secondary'} className="text-[10px] mt-0.5">
                      {b.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleActive(b)}>
                    {b.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  {!b.is_main && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(b)} disabled={deleting === b.id}>
                      {deleting === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Linked warehouses */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Linked Warehouses ({b.warehouses.length})
                </p>
                {b.warehouses.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No warehouses linked</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {b.warehouses.map(w => (
                      <span key={w.id} className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-0.5">
                        <WarehouseIcon className="h-3 w-3 text-muted-foreground" />
                        {w.name}
                        <span className="text-muted-foreground text-[10px] capitalize">{w.type.replace('_', ' ')}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-1 text-sm text-muted-foreground">
                {b.address && <p className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /><span className="truncate">{b.address}</span></p>}
                {b.phone   && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{b.phone}</p>}
                {b.email   && <p className="flex items-center gap-1.5"><Mail  className="h-3.5 w-3.5" />{b.email}</p>}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                {[
                  { label: 'Products',     value: b.product_count },
                  { label: 'Stock Units',  value: b.total_stock.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
                  { label: 'Staff',        value: b.users_count },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelForm} />
          <Card className="relative z-10 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">{editId ? 'Edit Branch' : 'New Branch'}</h2>
              <button onClick={cancelForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Branch Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Store, Downtown" />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="BR-01" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+92 300 0000000" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="branch@store.com" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, Country" />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_main}
                onChange={e => setForm(f => ({ ...f, is_main: e.target.checked }))}
                className="h-4 w-4 rounded border" />
              <span className="text-sm font-medium">Mark as main branch</span>
            </label>

            {/* Warehouse multi-select */}
            <div className="space-y-1.5">
              <Label>
                Linked Warehouses
                <span className="text-muted-foreground font-normal text-xs ml-1">— select all warehouses serving this branch</span>
              </Label>
              <WarehouseMultiSelect
                warehouses={warehouses}
                selected={form.warehouse_ids}
                onChange={ids => setForm(f => ({ ...f, warehouse_ids: ids }))}
              />
              {form.warehouse_ids.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {form.warehouse_ids.length} warehouse{form.warehouse_ids.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={cancelForm} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editId ? 'Update' : 'Create Branch'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
