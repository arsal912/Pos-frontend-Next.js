'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  DollarSign, CheckCircle2, XCircle, RefreshCw, Download,
  Search, Filter, Loader2, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Payment {
  id: number;
  store_id: number;
  amount: number;
  currency: string;
  gateway: string;
  gateway_payment_id: string | null;
  status: string;
  invoice_number: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
  failure_reason: string | null;
  store: { id: number; name: string; email: string } | null;
  subscription: { plan: { name: string } } | null;
}

interface Meta { current_page: number; last_page: number; total: number; }

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'outline' }> = {
  completed: { label: 'Completed', variant: 'success' },
  failed:    { label: 'Failed',    variant: 'destructive' },
  pending:   { label: 'Pending',   variant: 'warning' },
  refunded:  { label: 'Refunded',  variant: 'outline' },
};

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function AdminPaymentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<number | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [gateway, setGateway] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pmtsRes, statsRes] = await Promise.all([
        apiClient.get('/admin/billing/payments', {
          search: search || undefined,
          status: status || undefined,
          gateway: gateway || undefined,
          page,
          per_page: 20,
        }),
        apiClient.get('/admin/billing/stats'),
      ]);
      setPayments((pmtsRes as any).data?.data ?? (pmtsRes as any).data ?? []);
      setMeta((pmtsRes as any).meta?.pagination ?? null);
      setStats((statsRes as any).data ?? null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status, gateway, page]);

  useEffect(() => { load(); }, [load]);

  const handleRefund = async (payment: Payment) => {
    if (!confirm(`Refund ${fmtMoney(payment.amount, payment.currency)} to ${payment.store?.name}?`)) return;
    setRefunding(payment.id);
    try {
      const res = await apiClient.post(`/admin/billing/payments/${payment.id}/refund`);
      toast.success((res as any).message ?? 'Payment refunded.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRefunding(null);
    }
  };

  const downloadInvoice = async (payment: Payment) => {
    if (!payment.invoice_number) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    try {
      const res = await fetch(`/api/backend/store/billing/payments/${payment.id}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${payment.invoice_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download invoice.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1">All platform-wide payment transactions</p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Revenue This Month', value: fmtMoney(stats.revenue_this_month ?? 0), icon: DollarSign, color: 'text-success' },
            { label: 'Total Transactions', value: stats.total_transactions ?? 0, icon: TrendingUp, color: 'text-primary' },
            { label: 'Success Rate', value: `${stats.success_rate ?? 0}%`, icon: CheckCircle2, color: 'text-success' },
            { label: 'Failed (7d)', value: stats.failed_payments_7d ?? 0, icon: AlertTriangle, color: 'text-destructive' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <s.icon className={cn('h-5 w-5 flex-shrink-0', s.color)} />
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="font-display font-bold text-lg leading-none mt-0.5">{s.value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Invoice # or transaction ID…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
          <select value={gateway} onChange={e => { setGateway(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All gateways</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">Easypaisa</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatus(''); setGateway(''); setPage(1); }} className="gap-1.5">
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
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No payments found.</div>
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const st = STATUS_CONFIG[p.status] ?? { label: p.status, variant: 'outline' as const };
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{p.store?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{p.store?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.subscription?.plan?.name ?? '—'}</td>
                        <td className="px-4 py-3 font-mono font-medium">{fmtMoney(p.amount, p.currency)}</td>
                        <td className="px-4 py-3 capitalize">{p.gateway}</td>
                        <td className="px-4 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{fmt(p.paid_at ?? p.refunded_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {p.invoice_number && p.status === 'completed' && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => downloadInvoice(p)}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {p.status === 'completed' && !p.refunded_at && (
                              <Button variant="ghost" size="sm"
                                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRefund(p)}
                                disabled={refunding === p.id}>
                                {refunding === p.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <><XCircle className="h-3.5 w-3.5 mr-1" />Refund</>}
                              </Button>
                            )}
                            {['jazzcash', 'easypaisa'].includes(p.gateway) && p.status === 'completed' && !p.refunded_at && (
                              <span className="text-[10px] text-muted-foreground ml-1">(manual)</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
    </div>
  );
}
