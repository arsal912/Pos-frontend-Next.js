'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, Loader2, Users,
  Phone, Mail, ChevronLeft, ChevronRight, X, Eye,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Customer } from '@/types';

type CustomerForm = {
  name: string; email: string; phone: string; company: string;
  city: string; country: string; date_of_birth: string;
  gender: string; credit_limit: string; notes: string; is_active: boolean;
};

const emptyForm = (): CustomerForm => ({
  name: '', email: '', phone: '', company: '', city: '', country: '',
  date_of_birth: '', gender: '', credit_limit: '', notes: '', is_active: true,
});

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; customer: Customer | null }>({ open: false, customer: null });
  const [form, setForm] = useState<CustomerForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/customers', {
        search: search || undefined,
        page, per_page: 20,
      });
      setCustomers((res as any).data?.data ?? []);
      setMeta((res as any).meta?.pagination ?? null);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm()); setModal({ open: true, customer: null }); };
  const openEdit = (c: Customer) => {
    setForm({
      name: c.name, email: c.email ?? '', phone: c.phone ?? '',
      company: c.company ?? '', city: c.city ?? '', country: c.country ?? '',
      date_of_birth: c.date_of_birth ?? '', gender: c.gender ?? '',
      credit_limit: c.credit_limit != null ? String(c.credit_limit) : '',
      notes: c.notes ?? '', is_active: c.is_active,
    });
    setModal({ open: true, customer: c });
  };
  const close = () => setModal({ open: false, customer: null });

  const upd = (k: keyof CustomerForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required.');
    setSaving(true);
    try {
      const body: any = {
        name: form.name, email: form.email || undefined,
        phone: form.phone || undefined, company: form.company || undefined,
        city: form.city || undefined, country: form.country || undefined,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : undefined,
        notes: form.notes || undefined, is_active: form.is_active,
      };

      if (modal.customer) {
        await apiClient.put(`/store/customers/${modal.customer.id}`, body);
        toast.success('Customer updated.');
      } else {
        await apiClient.post('/store/customers', body);
        toast.success('Customer created.');
      }
      close(); load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;
    setDeleting(customer.id);
    try {
      await apiClient.delete(`/store/customers/${customer.id}`);
      toast.success('Customer deleted.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your customer database</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Add Customer</Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, phone, email…" className="pl-9 h-9" />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No customers yet.</p>
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="h-4 w-4" />Add First Customer</Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">City</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credit Limit</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.name}</p>
                        {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {c.phone && (
                          <p className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />{c.phone}
                          </p>
                        )}
                        {c.email && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />{c.email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.city ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {c.credit_limit != null ? Number(c.credit_limit).toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.is_active ? 'success' : 'outline'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                            <Link href={`/dashboard/customers/${c.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleDelete(c)} disabled={deleting === c.id}>
                            {deleting === c.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">Total: {meta.total} customers</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1">
                    <ChevronLeft className="h-4 w-4" />Prev
                  </Button>
                  <span className="text-sm flex items-center px-2">{page} / {meta.last_page}</span>
                  <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)} className="gap-1">
                    Next<ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-xl">
              <Card className="p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-lg">
                    {modal.customer ? 'Edit Customer' : 'New Customer'}
                  </h2>
                  <button onClick={close} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Ahmed Khan" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="+92 300 0000000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="customer@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company</Label>
                    <Input value={form.company} onChange={e => upd('company', e.target.value)} placeholder="ABC Trading Co." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={form.city} onChange={e => upd('city', e.target.value)} placeholder="Karachi" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.date_of_birth} onChange={e => upd('date_of_birth', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <select value={form.gender} onChange={e => upd('gender', e.target.value)}
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Credit Limit</Label>
                    <Input type="number" min="0" step="0.01" value={form.credit_limit}
                      onChange={e => upd('credit_limit', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Notes</Label>
                    <Input value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Optional notes" />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch checked={form.is_active} onCheckedChange={v => upd('is_active', v)} />
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
                  <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {modal.customer ? 'Save Changes' : 'Create Customer'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
