'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, Loader2, CalendarPlus, XCircle,
  RotateCcw, X, CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Subscription {
  id: number;
  status: string;
  payment_gateway: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  next_billing_at: string | null;
  cancelled_at: string | null;
  grace_period_ends_at: string | null;
  store: { id: number; name: string; email: string } | null;
  plan: { id: number; name: string } | null;
}

interface Meta { current_page: number; last_page: number; total: number; }

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  active: 'success', pending: 'warning', expired: 'destructive', cancelled: 'outline',
};

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(amount: number, currency = 'USD') {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}

type ModalAction = 'extend' | 'reactivate' | 'cancel' | null;

export default function AdminSubscriptionsPage() {
  const searchParams = useSearchParams();

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [modal, setModal] = useState<{ action: ModalAction; sub: Subscription } | null>(null);
  const [extendDays, setExtendDays] = useState('30');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [expiringDays, setExpiringDays] = useState(searchParams.get('expiring_days') ?? '');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/billing/subscriptions', {
        search: search || undefined,
        status: status || undefined,
        expiring_days: expiringDays || undefined,
        page,
        per_page: 20,
      });
      setSubs((res as any).data?.data ?? (res as any).data ?? []);
      setMeta((res as any).meta?.pagination ?? null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status, expiringDays, page]);

  useEffect(() => { load(); }, [load]);

  const openModal = (action: ModalAction, sub: Subscription) => {
    setExtendDays('30');
    setModal({ action, sub });
  };

  const closeModal = () => setModal(null);

  const handleExtend = async () => {
    if (!modal) return;
    setActing(modal.sub.id);
    try {
      const res = await apiClient.post(`/admin/billing/subscriptions/${modal.sub.id}/extend`, { days: parseInt(extendDays) });
      toast.success((res as any).message ?? 'Subscription extended.');
      closeModal();
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(null); }
  };

  const handleCancel = async () => {
    if (!modal) return;
    setActing(modal.sub.id);
    try {
      await apiClient.post(`/admin/billing/subscriptions/${modal.sub.id}/cancel`);
      toast.success('Subscription cancelled.');
      closeModal();
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(null); }
  };

  const handleReactivate = async () => {
    if (!modal) return;
    setActing(modal.sub.id);
    try {
      const res = await apiClient.post(`/admin/billing/subscriptions/${modal.sub.id}/reactivate`, { days: parseInt(extendDays) });
      toast.success((res as any).message ?? 'Subscription reactivated.');
      closeModal();
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Manage all store subscriptions across the platform</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search store name or email…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={expiringDays} onChange={e => { setExpiringDays(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">Any expiry</option>
            <option value="7">Expiring in 7 days</option>
            <option value="14">Expiring in 14 days</option>
            <option value="30">Expiring in 30 days</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatus(''); setExpiringDays(''); setPage(1); }} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : subs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No subscriptions found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Store</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gateway</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map(sub => (
                    <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{sub.store?.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{sub.store?.email}</p>
                      </td>
                      <td className="px-4 py-3">{sub.plan?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-mono">{fmtMoney(sub.amount, sub.currency)}</td>
                      <td className="px-4 py-3 capitalize">{sub.payment_gateway ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[sub.status] ?? 'outline'}>{sub.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          sub.ends_at && new Date(sub.ends_at) <= new Date(Date.now() + 7 * 86400000)
                            ? 'text-warning-foreground font-medium' : 'text-muted-foreground'
                        )}>
                          {fmt(sub.ends_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1"
                            onClick={() => openModal('extend', sub)}>
                            <CalendarPlus className="h-3.5 w-3.5" /> Extend
                          </Button>
                          {sub.status !== 'cancelled' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-destructive hover:text-destructive"
                              onClick={() => openModal('cancel', sub)}>
                              <XCircle className="h-3.5 w-3.5" /> Cancel
                            </Button>
                          )}
                          {['expired', 'cancelled'].includes(sub.status) && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-success"
                              onClick={() => openModal('reactivate', sub)}>
                              <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">Total: {meta.total}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <span className="text-sm flex items-center px-2">{page} / {meta.last_page}</span>
                  <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Action Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-lg capitalize">
                    {modal.action} subscription
                  </h2>
                  <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 mb-4 text-sm">
                  <p className="font-medium">{modal.sub.store?.name}</p>
                  <p className="text-muted-foreground">{modal.sub.plan?.name} · {modal.sub.payment_gateway}</p>
                </div>

                {modal.action === 'cancel' ? (
                  <p className="text-sm text-muted-foreground mb-5">
                    This will immediately cancel the subscription and revoke access. This action cannot be undone without reactivating.
                  </p>
                ) : (
                  <div className="space-y-2 mb-5">
                    <Label>Days to {modal.action === 'extend' ? 'extend' : 'grant'}</Label>
                    <Input type="number" min="1" max="365" value={extendDays}
                      onChange={e => setExtendDays(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      {modal.action === 'extend'
                        ? 'Adds days to the current expiry date. Marks expired subscriptions as active.'
                        : 'Reactivates the subscription for this many days from today.'}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
                  <Button
                    variant={modal.action === 'cancel' ? 'destructive' : 'default'}
                    disabled={acting === modal.sub.id}
                    className="flex-1 gap-2"
                    onClick={modal.action === 'extend' ? handleExtend : modal.action === 'cancel' ? handleCancel : handleReactivate}
                  >
                    {acting === modal.sub.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : modal.action === 'extend' ? <CalendarPlus className="h-4 w-4" />
                      : modal.action === 'cancel' ? <XCircle className="h-4 w-4" />
                      : <CheckCircle2 className="h-4 w-4" />}
                    {modal.action === 'extend' ? 'Extend' : modal.action === 'cancel' ? 'Yes, Cancel' : 'Reactivate'}
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
