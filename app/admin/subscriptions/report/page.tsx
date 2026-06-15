'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, RefreshCw,
  Loader2, TrendingUp, DollarSign, Zap, Search,
  CheckCheck, Ban, RotateCcw, X, Users, Store,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StoreRow {
  store_id: number; store_name: string; store_email: string;
  store_status: string; plan_name: string;
  subscription_id: number | null;
  registered_at: string | null;                // store created_at
  amount: number; currency: string; billing_cycle: string | null;
  ends_at: string | null; next_billing_at: string | null;
  payment_gateway: string | null; sub_status: string;
  trial_ends_at: string | null;
  is_on_trial: boolean;
  trial_days_left: number | null;
  last_payment: { amount: number; paid_at: string; gateway: string } | null;
  days_until_expiry: number | null;
}

interface Summary {
  total_stores: number;
  paid: number; trial: number; free: number; pending: number;
  expiring: number; defaulter: number; cancelled: number; no_sub: number;
  mrr: number;
}

const BUCKETS = [
  { key: 'paid',      label: 'Paid',          icon: CheckCircle2, color: 'text-green-600',  badge: 'bg-green-100 text-green-700'  },
  { key: 'trial',     label: 'On Trial',      icon: Zap,          color: 'text-violet-600', badge: 'bg-violet-100 text-violet-700'},
  { key: 'expiring',  label: 'Expiring Soon', icon: Clock,        color: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700'  },
  { key: 'pending',   label: 'Pending',       icon: Clock,        color: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700'    },
  { key: 'defaulter', label: 'Defaulters',    icon: AlertTriangle,color: 'text-red-600',    badge: 'bg-red-100 text-red-700'      },
  { key: 'free',      label: 'Free Plan',     icon: Users,        color: 'text-slate-600',  badge: 'bg-slate-100 text-slate-700'  },
  { key: 'cancelled', label: 'Cancelled',     icon: XCircle,      color: 'text-gray-500',   badge: 'bg-gray-100 text-gray-600'    },
  { key: 'no_sub',    label: 'No Sub',        icon: Store,        color: 'text-muted-foreground', badge: 'bg-muted/30 text-muted-foreground' },
] as const;

// ── Mark Paid Modal ───────────────────────────────────────────────────────────

function MarkPaidModal({ row, onClose, onDone }: { row: StoreRow; onClose: () => void; onDone: () => void; }) {
  const [days,   setDays]   = useState(30);
  const [saving, setSaving] = useState(false);

  const newExpiry = new Date(Date.now() + days * 86400000)
    .toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  const handleSave = async () => {
    if (!row.subscription_id) return toast.error('No subscription found.');
    setSaving(true);
    try {
      const endpoint = row.sub_status === 'cancelled' ? 'reactivate' : 'extend';
      await apiClient.post(`/admin/billing/subscriptions/${row.subscription_id}/${endpoint}`, { days });
      toast.success(`${row.store_name} marked as paid — active until ${newExpiry}.`);
      onDone();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg">Mark as Paid</h3>
            <p className="text-sm text-muted-foreground">{row.store_name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
          <p className="font-medium text-green-800">Plan: {row.plan_name}</p>
          <p className="text-xs text-green-700 mt-0.5">
            {row.amount > 0 ? `${row.currency} ${row.amount.toFixed(2)} / ${row.billing_cycle}` : 'Free plan'}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Extend by (days)</Label>
          <div className="flex gap-2">
            {[7, 30, 90, 365].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  days === d ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/50')}>
                {d === 365 ? '1yr' : `${d}d`}
              </button>
            ))}
          </div>
          <Input type="number" value={days} min={1} max={730}
            onChange={e => setDays(Math.max(1, parseInt(e.target.value) || 30))}
            className="h-9 w-28 font-mono" />
          <p className="text-xs text-muted-foreground">
            New expiry: <strong className="text-foreground">{newExpiry}</strong>
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving}
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Confirm Payment
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SubscriptionReportPage() {
  const [data,      setData]      = useState<{ summary: Summary; report: Record<string, StoreRow[]>; period: string } | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [activeTab, setActiveTab] = useState<string>('paid');
  const [markPaidRow, setMarkPaidRow] = useState<StoreRow | null>(null);
  const [actioning,   setActioning]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/billing/subscription-report');
      setData(res.data as any);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkUnpaid = async (row: StoreRow) => {
    if (!row.subscription_id) return toast.error('No subscription found.');
    if (!confirm(`Mark "${row.store_name}" as unpaid?\n\nStatus will change to Pending.`)) return;
    setActioning(row.subscription_id);
    try {
      await apiClient.post(`/admin/billing/subscriptions/${row.subscription_id}/mark-unpaid`);
      toast.success(`${row.store_name} marked as unpaid.`);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActioning(null); }
  };

  const fmt     = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const ago     = (d: string | null) => {
    if (!d) return null;
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 3_600_000)  return `${Math.floor(ms/60_000)}m ago`;
    if (ms < 86_400_000) return `${Math.floor(ms/3_600_000)}h ago`;
    return `${Math.floor(ms/86_400_000)}d ago`;
  };

  const s        = data?.summary;
  const rows     = data?.report[activeTab] ?? [];
  const filtered = search
    ? rows.filter(r => r.store_name.toLowerCase().includes(search.toLowerCase()) || r.store_email.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const ab = BUCKETS.find(b => b.key === activeTab)!;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Subscription Report</h1>
          <p className="text-muted-foreground mt-1">
            {data ? `${data.period} · ${s?.total_stores} stores` : 'Loading…'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (<>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'MRR',          value:s?.mrr.toFixed(2) ?? '0',   icon:DollarSign,  cls:'bg-green-50 border-green-200 text-green-700'   },
            { label:'Active Paid',  value:String(s?.paid??0),         icon:TrendingUp,  cls:''                                               },
            { label:'On Trial',     value:String(s?.trial??0),        icon:Zap,         cls:'border-violet-200 text-violet-600'              },
            { label:'Defaulters',   value:String(s?.defaulter??0),    icon:AlertTriangle,cls:'border-red-200 text-red-600'                   },
          ].map(c => (
            <Card key={c.label} className={cn('p-4', c.cls)}>
              <div className="flex items-center gap-2 mb-1">
                <c.icon className="h-4 w-4" /><p className="text-xs">{c.label}</p>
              </div>
              <p className="font-display font-bold text-2xl">{c.value}</p>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {BUCKETS.map(b => {
            const count = (data?.summary[b.key as keyof Summary] ?? 0) as number;
            return (
              <button key={b.key}
                onClick={() => { setActiveTab(b.key); setSearch(''); }}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                  activeTab === b.key ? cn(b.color,'border-current bg-current/5') : 'hover:bg-muted/30')}>
                <b.icon className="h-3.5 w-3.5" />
                {b.label}
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full',
                  activeTab === b.key ? b.badge : 'bg-muted text-muted-foreground')}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/10">
            <div className="flex items-center gap-2">
              <ab.icon className={cn('h-4 w-4', ab.color)} />
              <span className={cn('font-semibold text-sm', ab.color)}>{ab.label}</span>
              <Badge className={cn('text-xs', ab.badge)}>{filtered.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…" className="pl-8 h-8 w-48 text-xs" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-14">
              <ab.icon className={cn('h-10 w-10 mx-auto mb-3 opacity-20', ab.color)} />
              <p className="text-muted-foreground">{search ? 'No stores match.' : `No stores in "${ab.label}".`}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/5">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Store</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Registered</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expiry / Trial End</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Payment</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gateway</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const expiredAgo  = row.days_until_expiry !== null && row.days_until_expiry < 0;
                    const expiringSoon = row.days_until_expiry !== null && row.days_until_expiry >= 0 && row.days_until_expiry <= 7;
                    const isBusy       = actioning === row.subscription_id;

                    return (
                      <motion.tr key={row.store_id}
                        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.02 }}
                        className="border-b last:border-0 hover:bg-muted/10">

                        {/* Store */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center font-bold text-primary text-sm">
                              {row.store_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate max-w-[160px]">{row.store_name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[160px]">{row.store_email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Registered date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm font-medium">{fmt(row.registered_at)}</p>
                          {row.is_on_trial && (
                            <p className="text-xs text-violet-600 font-medium mt-0.5">
                              🎯 {row.trial_days_left}d trial left
                            </p>
                          )}
                        </td>

                        {/* Plan */}
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ab.badge)}>
                            {row.plan_name}
                          </span>
                          {row.billing_cycle && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{row.billing_cycle}</p>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right">
                          {row.amount > 0
                            ? <span className="font-mono font-semibold">{row.currency} {row.amount.toFixed(2)}</span>
                            : <span className="text-xs text-muted-foreground">Free</span>}
                        </td>

                        {/* Expiry / Trial end date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {/* Trial: show trial_ends_at prominently */}
                          {row.is_on_trial && row.trial_ends_at ? (
                            <div>
                              <p className="font-semibold text-violet-700">{fmt(row.trial_ends_at)}</p>
                              <p className="text-xs text-violet-500">
                                Trial · {row.trial_days_left === 0 ? 'Ends today' : `${row.trial_days_left}d remaining`}
                              </p>
                            </div>
                          ) : row.ends_at ? (
                            <div>
                              <p className={cn('font-medium', expiredAgo ? 'text-red-600' : expiringSoon ? 'text-amber-600' : '')}>
                                {fmt(row.ends_at)}
                              </p>
                              <p className={cn('text-xs', expiredAgo ? 'text-red-400' : expiringSoon ? 'text-amber-500' : 'text-muted-foreground')}>
                                {expiredAgo
                                  ? `Expired ${Math.abs(row.days_until_expiry!)}d ago`
                                  : row.days_until_expiry === 0 ? 'Expires today'
                                  : `${row.days_until_expiry}d left`}
                              </p>
                            </div>
                          ) : row.trial_ends_at ? (
                            <div>
                              <p className="font-medium text-violet-600">{fmt(row.trial_ends_at)}</p>
                              <p className="text-xs text-violet-400">Trial ended</p>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>

                        {/* Last payment */}
                        <td className="px-4 py-3">
                          {row.last_payment ? (
                            <div>
                              <p className="text-green-600 font-semibold">{row.currency} {row.last_payment.amount.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">{ago(row.last_payment.paid_at)}</p>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">None this month</span>}
                        </td>

                        {/* Gateway */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground capitalize">{row.payment_gateway ?? '—'}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            {/* Mark Paid — for pending, trial, defaulter, expiring, free, cancelled */}
                            {['pending','trial','defaulter','expiring','free','cancelled'].includes(activeTab) && row.subscription_id && (
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => setMarkPaidRow(row)} disabled={isBusy}>
                                <CheckCheck className="h-3 w-3" />Mark Paid
                              </Button>
                            )}
                            {/* Mark Unpaid — for paid stores */}
                            {activeTab === 'paid' && row.subscription_id && (
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => handleMarkUnpaid(row)} disabled={isBusy}>
                                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                                Mark Unpaid
                              </Button>
                            )}
                            {/* Reactivate — for cancelled */}
                            {activeTab === 'cancelled' && row.subscription_id && (
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => setMarkPaidRow(row)} disabled={isBusy}>
                                <RotateCcw className="h-3 w-3" />Reactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </>)}

      {markPaidRow && (
        <MarkPaidModal
          row={markPaidRow}
          onClose={() => setMarkPaidRow(null)}
          onDone={() => { setMarkPaidRow(null); load(); }}
        />
      )}
    </div>
  );
}
