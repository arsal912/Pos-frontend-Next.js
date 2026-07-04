'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Mail, MessageCircle, CheckCircle2, XCircle,
  SkipForward, DollarSign, Users, ShieldAlert, Settings,
  Loader2, RefreshCw, ChevronDown, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Provider {
  id: number;
  channel: 'sms' | 'email' | 'whatsapp';
  provider_slug: string;
  is_active: boolean;
  is_default: boolean;
  updated_at: string;
}

interface Platform {
  total_sent: number;
  total_failed: number;
  total_skipped: number;
  total_cost: number;
  by_channel: Record<string, number>;
  opt_out_total: number;
}

interface StoreStat {
  store_id: number;
  store_name: string;
  sent: number;
  failed: number;
  skipped: number;
  cost: number;
  opt_outs: number;
  by_channel: Record<string, number>;
}

interface OverviewData {
  providers: Provider[];
  platform: Platform;
  stores: StoreStat[];
  window_days: number;
}

interface StoreLog {
  id: number;
  recipient: string;
  channel: string;
  type: string;
  subject: string | null;
  status: string;
  provider: string | null;
  cost: number | null;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  campaign_id: number | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CH_ICON = { sms: MessageSquare, email: Mail, whatsapp: MessageCircle };
const CH_COLOR = { sms: 'text-blue-500', email: 'text-green-500', whatsapp: 'text-emerald-500' };
const CH_BG   = { sms: 'bg-blue-50',    email: 'bg-green-50',    whatsapp: 'bg-emerald-50' };

const STATUS_DOT: Record<string, string> = {
  sent:    'bg-green-500',
  queued:  'bg-blue-500',
  failed:  'bg-red-500',
  skipped: 'bg-amber-400',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ProviderCard({ p }: { p: Provider }) {
  const Icon = CH_ICON[p.channel];
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl border', p.is_active ? '' : 'opacity-50')}>
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', CH_BG[p.channel])}>
        <Icon className={cn('h-4 w-4', CH_COLOR[p.channel])} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{p.provider_slug}</p>
        <p className="text-xs text-muted-foreground capitalize">{p.channel}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {p.is_default && <Badge className="text-xs bg-primary/10 text-primary">default</Badge>}
        <span className={cn('h-2 w-2 rounded-full', p.is_active ? 'bg-green-500' : 'bg-red-400')} />
      </div>
    </div>
  );
}

function StoreRow({
  s, onExpand, expanded, logs, logsLoading,
}: {
  s: StoreStat;
  onExpand: () => void;
  expanded: boolean;
  logs: StoreLog[] | null;
  logsLoading: boolean;
}) {
  const total = (s.sent + s.failed + s.skipped) || 1;
  const sentPct = Math.round((s.sent / total) * 100);

  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={onExpand}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{s.store_name}</p>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            <span className="text-green-600">{s.sent} sent</span>
            {s.failed   > 0 && <span className="text-red-500">{s.failed} failed</span>}
            {s.skipped  > 0 && <span className="text-amber-500">{s.skipped} skipped</span>}
            {s.opt_outs > 0 && <span>{s.opt_outs} opt-outs</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(['sms', 'email', 'whatsapp'] as const).map(ch => {
            const Icon = CH_ICON[ch];
            return s.by_channel[ch] > 0 ? (
              <span key={ch} className="flex items-center gap-1">
                <Icon className={cn('h-3 w-3', CH_COLOR[ch])} /> {s.by_channel[ch]}
              </span>
            ) : null;
          })}
          <span className="font-mono">${s.cost.toFixed(4)}</span>
        </div>

        <div className="w-24">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${sentPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 text-right">{sentPct}% ok</p>
        </div>

        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t bg-muted/10">
            {logsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !logs || logs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No recent logs</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-muted/20">
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Recipient</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Channel</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Type</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Status</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Provider</th>
                    <th className="px-4 py-2 text-right text-muted-foreground font-medium">Cost</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Time</th>
                  </tr></thead>
                  <tbody>
                    {logs.slice(0, 30).map(l => (
                      <tr key={l.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-2 font-mono">{l.recipient}</td>
                        <td className="px-4 py-2 capitalize">{l.channel}</td>
                        <td className="px-4 py-2 capitalize text-muted-foreground">{l.type}</td>
                        <td className="px-4 py-2">
                          <span className="flex items-center gap-1">
                            <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', STATUS_DOT[l.status] ?? 'bg-muted')} />
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{l.provider ?? '—'}</td>
                        <td className="px-4 py-2 text-right font-mono">{l.cost != null ? `$${l.cost}` : '—'}</td>
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(l.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length > 30 && (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    Showing 30 of {logs.length} recent logs
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCommunicationsPage() {
  const [data, setData]       = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStore, setExpandedStore]       = useState<number | null>(null);
  const [storeLogs, setStoreLogs]               = useState<Record<number, StoreLog[]>>({});
  const [storeLogsLoading, setStoreLogsLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/communications/overview');
      setData(res.data as any as OverviewData);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStore = async (storeId: number) => {
    if (expandedStore === storeId) { setExpandedStore(null); return; }
    setExpandedStore(storeId);
    if (storeLogs[storeId]) return;

    setStoreLogsLoading(storeId);
    try {
      const res = await apiClient.get(`/admin/communications/stores/${storeId}/logs`);
      setStoreLogs(prev => ({ ...prev, [storeId]: (res.data as any)?.logs ?? [] }));
    } catch { setStoreLogs(prev => ({ ...prev, [storeId]: [] })); }
    finally { setStoreLogsLoading(null); }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!data) return null;

  const { platform, providers, stores } = data;
  const noProviders = providers.filter(p => !p.is_active);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide activity across all stores — last {data.window_days} days
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Link href="/admin/communications-providers">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-3.5 w-3.5" /> Providers
            </Button>
          </Link>
        </div>
      </div>

      {/* Inactive provider warning */}
      {noProviders.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>
            {noProviders.length} provider{noProviders.length > 1 ? 's are' : ' is'} inactive:{' '}
            {noProviders.map(p => p.provider_slug).join(', ')}.{' '}
            <Link href="/admin/communications-providers" className="underline font-medium">Configure now →</Link>
          </span>
        </div>
      )}

      {/* Platform stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Sent',        value: platform.total_sent,    icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Failed',      value: platform.total_failed,  icon: XCircle,      color: 'text-red-500'   },
          { label: 'Skipped',     value: platform.total_skipped, icon: SkipForward,  color: 'text-amber-500' },
          { label: 'SMS',         value: platform.by_channel.sms ?? 0,      icon: MessageSquare,  color: 'text-blue-500'    },
          { label: 'Email',       value: platform.by_channel.email ?? 0,    icon: Mail,           color: 'text-green-500'   },
          { label: 'WhatsApp',    value: platform.by_channel.whatsapp ?? 0, icon: MessageCircle,  color: 'text-emerald-500' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <s.icon className={cn('h-5 w-5 mx-auto mb-1', s.color)} />
            <p className="font-display font-bold text-xl">{s.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Cost + Opt-outs */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Platform Cost (30d)</p>
          </div>
          <p className="font-display font-bold text-2xl">${platform.total_cost.toFixed(4)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Estimated provider charges</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Total Opt-outs</p>
          </div>
          <p className="font-display font-bold text-2xl">{platform.opt_out_total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Across all stores &amp; channels</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Delivery Rate</p>
          </div>
          <p className="font-display font-bold text-2xl">
            {platform.total_sent + platform.total_failed > 0
              ? Math.round((platform.total_sent / (platform.total_sent + platform.total_failed)) * 100)
              : 100}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Sent / (sent + failed)</p>
        </Card>
      </div>

      {/* Provider status */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold">Active Providers</h2>
          <Link href="/admin/communications-providers" className="text-xs text-primary hover:underline">
            Manage →
          </Link>
        </div>
        {providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No providers configured.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {providers.map(p => <ProviderCard key={p.id} p={p} />)}
          </div>
        )}
      </Card>

      {/* Per-store breakdown */}
      <div>
        <h2 className="font-display font-bold mb-3">Store Breakdown</h2>
        {stores.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No store data available.</Card>
        ) : (
          <div className="space-y-2">
            {stores.map(s => (
              <StoreRow
                key={s.store_id}
                s={s}
                onExpand={() => toggleStore(s.store_id)}
                expanded={expandedStore === s.store_id}
                logs={storeLogs[s.store_id] ?? null}
                logsLoading={storeLogsLoading === s.store_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
