'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Warehouse as WarehouseIcon, Plus, Pencil, Trash2, Check, X,
  Loader2, MapPin, Phone, User, Package, ToggleLeft, ToggleRight,
  Building2, Thermometer, Truck, ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

interface Branch    { id: number; name: string; code: string | null; is_main: boolean; }
interface Warehouse {
  id: number; name: string; code: string | null;
  branches: Branch[];
  type: 'storage' | 'distribution' | 'cold_storage' | 'retail';
  address: string | null; phone: string | null; manager: string | null;
  is_active: boolean;
  product_count: number; total_stock: number;
}

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  storage:      { label: 'Storage',       icon: Package,     color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950' },
  distribution: { label: 'Distribution',  icon: Truck,       color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' },
  cold_storage: { label: 'Cold Storage',  icon: Thermometer, color: 'text-cyan-600',   bg: 'bg-cyan-50 dark:bg-cyan-950' },
  retail:       { label: 'Retail',        icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
};

const EMPTY_FORM = {
  name: '', code: '', branch_ids: [] as number[], type: 'storage',
  address: '', phone: '', manager: '',
};

// ── Multi-select branch checkboxes ─────────────────────────────────────────────
function BranchMultiSelect({ branches, selected, onChange }: {
  branches: Branch[]; selected: number[]; onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }
  return (
    <div className="rounded-lg border divide-y max-h-44 overflow-y-auto">
      {branches.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">No branches yet.</p>
      )}
      {branches.map(b => (
        <label key={b.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
          <input
            type="checkbox"
            checked={selected.includes(b.id)}
            onChange={() => toggle(b.id)}
            className="h-4 w-4 rounded border"
          />
          <span className="text-sm flex-1">{b.name}</span>
          {b.is_main && <Badge variant="outline" className="text-[10px] py-0">Main</Badge>}
          {b.code && <span className="font-mono text-[10px] text-muted-foreground">{b.code}</span>}
        </label>
      ))}
    </div>
  );
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<number | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [whRes, brRes] = await Promise.all([
        apiClient.get('/store/warehouses'),
        apiClient.get('/store/branches'),
      ]);
      setWarehouses((whRes.data as any)?.warehouses ?? []);
      setBranches((brRes.data as any)?.branches ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(w: Warehouse) {
    setEditId(w.id);
    setForm({
      name: w.name, code: w.code ?? '', type: w.type,
      branch_ids: w.branches.map(b => b.id),
      address: w.address ?? '', phone: w.phone ?? '', manager: w.manager ?? '',
    });
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditId(null); }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await apiClient.put(`/store/warehouses/${editId}`, form);
        toast.success('Warehouse updated');
      } else {
        await apiClient.post('/store/warehouses', form);
        toast.success('Warehouse created');
      }
      cancelForm(); load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function toggleActive(w: Warehouse) {
    try {
      await apiClient.put(`/store/warehouses/${w.id}`, { is_active: !w.is_active });
      toast.success(w.is_active ? 'Deactivated' : 'Activated');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  async function handleDelete(w: Warehouse) {
    if (!confirm(`Delete warehouse "${w.name}"?`)) return;
    setDeleting(w.id);
    try {
      await apiClient.delete(`/store/warehouses/${w.id}`);
      toast.success('Warehouse deleted'); load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight flex items-center gap-3">
            <WarehouseIcon className="h-8 w-8 text-primary" /> Warehouses
          </h1>
          <p className="text-muted-foreground mt-1">
            Each warehouse can serve multiple branches, and each branch can use multiple warehouses.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Add Warehouse</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Warehouses',  value: warehouses.length },
          { label: 'Active',            value: warehouses.filter(w => w.is_active).length },
          { label: 'Total Stock Units', value: warehouses.reduce((s, w) => s + w.total_stock, 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : warehouses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-2">
          <WarehouseIcon className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No warehouses yet.</p>
          <Button variant="outline" onClick={openCreate} className="mt-2 gap-2"><Plus className="h-4 w-4" />Add first warehouse</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warehouses.map(w => {
            const meta = TYPE_META[w.type] ?? TYPE_META.storage;
            const Icon = meta.icon;
            return (
              <Card key={w.id} className={cn('p-5 space-y-4', !w.is_active && 'opacity-60')}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', meta.bg)}>
                      <Icon className={cn('h-5 w-5', meta.color)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{w.name}</p>
                        {w.code && <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{w.code}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px] py-0', meta.color)}>{meta.label}</Badge>
                        <Badge variant={w.is_active ? 'success' : 'secondary'} className="text-[10px] py-0">
                          {w.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleActive(w)}>
                      {w.is_active
                        ? <ToggleRight className="h-4 w-4 text-primary" />
                        : <ToggleLeft  className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(w)} disabled={deleting === w.id}>
                      {deleting === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Linked branches */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Linked Branches ({w.branches.length})
                  </p>
                  {w.branches.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No branches linked</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {w.branches.map(b => (
                        <span key={b.id} className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {b.name}
                          {b.is_main && <span className="text-primary text-[10px]">★</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="space-y-1 text-sm text-muted-foreground">
                  {w.address && <p className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /><span className="truncate">{w.address}</span></p>}
                  {w.phone   && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{w.phone}</p>}
                  {w.manager && <p className="flex items-center gap-1.5"><User  className="h-3.5 w-3.5" />{w.manager}</p>}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold">{w.product_count}</p>
                    <p className="text-[11px] text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{w.total_stock.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <p className="text-[11px] text-muted-foreground">Stock Units</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelForm} />
          <Card className="relative z-10 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">{editId ? 'Edit Warehouse' : 'New Warehouse'}</h2>
              <button onClick={cancelForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Warehouse" />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="WH-01" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full h-9 rounded-lg border bg-background text-sm px-3">
                  <option value="storage">Storage</option>
                  <option value="distribution">Distribution</option>
                  <option value="cold_storage">Cold Storage</option>
                  <option value="retail">Retail</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+92 300 0000000" />
              </div>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <Input value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))} placeholder="Manager name" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, Country" />
              </div>
            </div>

            {/* Branch multi-select */}
            <div className="space-y-1.5">
              <Label>
                Linked Branches
                <span className="text-muted-foreground font-normal text-xs ml-1">— select all branches this warehouse serves</span>
              </Label>
              <BranchMultiSelect
                branches={branches}
                selected={form.branch_ids}
                onChange={ids => setForm(f => ({ ...f, branch_ids: ids }))}
              />
              {form.branch_ids.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {form.branch_ids.length} branch{form.branch_ids.length > 1 ? 'es' : ''} selected
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={cancelForm} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editId ? 'Update' : 'Create Warehouse'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
