'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Mail, MessageCircle, Save, Loader2,
  Trash2, Search, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'identity' | 'usage' | 'optouts';

interface CommSettings {
  sms_sender_id: string | null;
  email_from_address: string | null;
  email_from_name: string | null;
  store_physical_address: string | null;
}

interface ChannelUsage {
  sent_today: number;
  daily_quota: number;
  resets_at: string | null;
  sent_month: number;
}

interface UsageData {
  channels: {
    sms: ChannelUsage;
    email: ChannelUsage;
    whatsapp: ChannelUsage;
  };
  cost_this_month: number;
}

interface OptOut {
  id: number;
  channel: string;
  recipient: string;
  reason: string | null;
  opted_out_at: string;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  sms: MessageSquare, email: Mail, whatsapp: MessageCircle,
};

const CHANNEL_COLORS: Record<string, string> = {
  sms: 'text-blue-500', email: 'text-green-500', whatsapp: 'text-emerald-500',
};

function UsageBar({ label, icon: Icon, sent, quota, color }: {
  label: string; icon: React.ElementType; sent: number; quota: number; color: string;
}) {
  const pct = quota > 0 ? Math.min(100, Math.round((sent / quota) * 100)) : 0;
  const isHigh = pct >= 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className={cn('h-4 w-4', color)} />{label}
        </span>
        <span className={cn('font-mono text-xs', isHigh ? 'text-destructive' : 'text-muted-foreground')}>
          {sent} / {quota}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', isHigh ? 'bg-destructive' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CommunicationsSettingsPage() {
  const [tab, setTab] = useState<Tab>('identity');
  const [settings, setSettings] = useState<CommSettings>({ sms_sender_id: '', email_from_address: '', email_from_name: '', store_physical_address: '' });
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [optOuts, setOptOuts] = useState<OptOut[]>([]);
  const [optOutSearch, setOptOutSearch] = useState('');
  const [optOutChannel, setOptOutChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, uRes] = await Promise.all([
        apiClient.get('/store/communication-settings/settings'),
        apiClient.get('/store/communication-settings/usage'),
      ]);
      const s = (sRes.data as any)?.settings ?? {};
      setSettings({
        sms_sender_id:          s.sms_sender_id ?? '',
        email_from_address:     s.email_from_address ?? '',
        email_from_name:        s.email_from_name ?? '',
        store_physical_address: s.store_physical_address ?? '',
      });
      setUsage((uRes.data as any) ?? null);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  const loadOptOuts = useCallback(async () => {
    try {
      const res = await apiClient.get('/store/communication-settings/opt-outs', {
        search: optOutSearch || undefined,
        channel: optOutChannel || undefined,
        per_page: 50,
      });
      setOptOuts(Array.isArray(res.data) ? (res.data as OptOut[]) : []);
    } catch { setOptOuts([]); }
  }, [optOutSearch, optOutChannel]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (tab === 'optouts') loadOptOuts(); }, [tab, loadOptOuts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/store/communication-settings/settings', {
        sms_sender_id:          settings.sms_sender_id || undefined,
        email_from_address:     settings.email_from_address || undefined,
        email_from_name:        settings.email_from_name || undefined,
        store_physical_address: settings.store_physical_address || undefined,
      });
      toast.success('Communication settings saved.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDeleteOptOut = async (id: number) => {
    if (!confirm('Remove this opt-out? The recipient will be able to receive messages again.')) return;
    setDeleting(id);
    try {
      await apiClient.delete(`/store/communication-settings/opt-outs/${id}`);
      toast.success('Opt-out removed.');
      loadOptOuts();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'identity', label: 'Sender Identity' },
    { id: 'usage',    label: 'Quotas & Usage' },
    { id: 'optouts',  label: 'Opt-outs' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Communications</h1>
        <p className="text-muted-foreground mt-1">Configure how your store sends messages to customers</p>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Sender Identity ──────────────────────────────────────────────────── */}
      {tab === 'identity' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <h3 className="font-display font-bold">SMS</h3>
            </div>
            <div className="space-y-1.5">
              <Label>SMS Sender ID</Label>
              <Input
                value={settings.sms_sender_id ?? ''}
                onChange={e => setSettings(s => ({ ...s, sms_sender_id: e.target.value }))}
                placeholder="MYSTORE (alphanumeric, max 11 chars)"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">
                Some carriers require pre-approved sender IDs. Leave blank to use the platform's default number.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-green-500" />
              <h3 className="font-display font-bold">Email</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>From Name</Label>
                <Input
                  value={settings.email_from_name ?? ''}
                  onChange={e => setSettings(s => ({ ...s, email_from_name: e.target.value }))}
                  placeholder="My Store Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>From Email</Label>
                <Input
                  type="email"
                  value={settings.email_from_address ?? ''}
                  onChange={e => setSettings(s => ({ ...s, email_from_address: e.target.value }))}
                  placeholder="store@yourdomain.com"
                />
                <p className="text-xs text-muted-foreground">
                  Must be verified in the email provider dashboard.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Store Physical Address</Label>
              <textarea
                value={settings.store_physical_address ?? ''}
                onChange={e => setSettings(s => ({ ...s, store_physical_address: e.target.value }))}
                rows={3}
                placeholder="123 Street, City, Country (required in marketing email footers under CAN-SPAM/GDPR)"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Required for marketing email compliance (CAN-SPAM, CASL). Automatically included in email footers.
              </p>
            </div>
          </Card>

          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0" />
            WhatsApp sender number is managed at the platform level by your administrator.
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </motion.div>
      )}

      {/* ── Quotas & Usage ───────────────────────────────────────────────────── */}
      {tab === 'usage' && usage && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Cost summary */}
          <Card className="p-5">
            <p className="text-sm font-medium mb-1">This Month's Estimated Cost</p>
            <p className="font-display font-bold text-2xl">
              ${usage.cost_this_month.toFixed(4)}
              <span className="text-sm font-normal text-muted-foreground ml-2">USD</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Based on provider cost per message. Final cost may vary.</p>
          </Card>

          {/* Daily quota bars */}
          <Card className="p-5 space-y-5">
            <h3 className="font-display font-bold">Daily Quotas (today)</h3>
            {(['sms', 'email', 'whatsapp'] as const).map(ch => {
              const Icon = CHANNEL_ICONS[ch];
              const c    = usage.channels[ch];
              return (
                <UsageBar
                  key={ch}
                  label={ch.charAt(0).toUpperCase() + ch.slice(1)}
                  icon={Icon}
                  sent={c.sent_today}
                  quota={c.daily_quota}
                  color={CHANNEL_COLORS[ch]}
                />
              );
            })}
            <p className="text-xs text-muted-foreground">
              Daily quotas reset automatically at midnight (store timezone).
              Contact support to increase your quota.
            </p>
          </Card>

          {/* This month totals */}
          <Card className="p-5">
            <h3 className="font-display font-bold mb-4">Sent This Month</h3>
            <div className="grid grid-cols-3 gap-4">
              {(['sms', 'email', 'whatsapp'] as const).map(ch => {
                const Icon = CHANNEL_ICONS[ch];
                return (
                  <div key={ch} className="text-center">
                    <Icon className={cn('h-5 w-5 mx-auto mb-1', CHANNEL_COLORS[ch])} />
                    <p className="font-display font-bold text-xl">{usage.channels[ch].sent_month}</p>
                    <p className="text-xs text-muted-foreground capitalize">{ch}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {usage.channels.sms.sent_today >= usage.channels.sms.daily_quota && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-xl text-sm">
              <AlertTriangle className="h-4 w-4 text-warning-foreground flex-shrink-0" />
              <span>SMS daily quota reached. Messages will resume after midnight.</span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Opt-outs ─────────────────────────────────────────────────────────── */}
      {tab === 'optouts' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={optOutSearch} onChange={e => setOptOutSearch(e.target.value)}
                  placeholder="Search phone or email…" className="pl-9 h-9" />
              </div>
              <select value={optOutChannel} onChange={e => setOptOutChannel(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="">All channels</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {optOuts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
                <p className="text-muted-foreground">No opt-outs found.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recipient</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Opted Out</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>{optOuts.map(o => {
                  const Icon = CHANNEL_ICONS[o.channel] ?? MessageSquare;
                  return (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-sm">{o.recipient}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs">
                          <Icon className={cn('h-3.5 w-3.5', CHANNEL_COLORS[o.channel])} />
                          <span className="capitalize">{o.channel}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{o.reason ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(o.opted_out_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDeleteOptOut(o.id)} disabled={deleting === o.id}>
                          {deleting === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            )}
          </Card>

          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Removing an opt-out re-enables messaging for that recipient.
              Only do this if the customer has explicitly requested to re-subscribe.
              Misuse can result in provider account suspension.
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
