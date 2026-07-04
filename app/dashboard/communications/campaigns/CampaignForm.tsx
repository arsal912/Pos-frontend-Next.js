'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, ChevronDown, Users, UserCheck, Layers,
  MessageSquare, Mail, MessageCircle, Save, Send,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Channel = 'sms' | 'email' | 'whatsapp';
type TargetType = 'all_customers' | 'customer_group' | 'customer_segment';

interface MessageTemplate { id: number; name: string; channel: Channel; subject: string | null; body: string; }
interface CustomerGroup { id: number; name: string; }
interface CustomerSegment { id: number; name: string; customer_count_cached: number; }

interface Campaign {
  id?: number;
  name: string;
  description: string;
  channel: Channel;
  type: string;
  message_template_id: number | null;
  subject: string;
  body: string;
  variables: Record<string, string>;
  target_type: TargetType;
  target_id: number | null;
  scheduled_at: string;
}

const CHANNEL_ICONS = { sms: MessageSquare, email: Mail, whatsapp: MessageCircle };
const CHANNEL_COLORS = { sms: 'border-blue-300 bg-blue-50', email: 'border-green-300 bg-green-50', whatsapp: 'border-emerald-300 bg-emerald-50' };
const CHANNEL_ICON_COLORS = { sms: 'text-blue-600', email: 'text-green-600', whatsapp: 'text-emerald-600' };

const TARGET_META: Record<TargetType, { label: string; icon: React.ElementType; desc: string }> = {
  all_customers:    { label: 'All Customers',    icon: Users,      desc: 'Send to every active customer with consent' },
  customer_group:   { label: 'Customer Group',   icon: UserCheck,  desc: 'Send to a specific customer group' },
  customer_segment: { label: 'Segment',          icon: Layers,     desc: 'Send to customers matching a segment' },
};

const BLANK: Campaign = {
  name: '', description: '', channel: 'sms', type: 'marketing',
  message_template_id: null, subject: '', body: '',
  variables: {}, target_type: 'all_customers', target_id: null, scheduled_at: '',
};

export default function CampaignForm({ initial }: { initial?: Campaign }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<Campaign>(initial ?? BLANK);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);

  const set = <K extends keyof Campaign>(k: K, v: Campaign[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  // Load templates, groups, segments
  useEffect(() => {
    Promise.all([
      apiClient.get('/store/message-templates', { channel: form.channel, active_only: true, per_page: 100 }),
      apiClient.get('/store/customer-groups'),
      apiClient.get('/store/customer-segments'),
    ]).then(([tRes, gRes, sRes]) => {
      setTemplates(Array.isArray(tRes.data) ? (tRes.data as MessageTemplate[]) : []);
      setGroups((gRes.data as any)?.groups ?? []);
      setSegments((sRes.data as any)?.segments ?? []);
    }).catch(() => {});
  }, [form.channel]);

  // Reload templates when channel changes, clear template selection
  const handleChannelChange = (ch: Channel) => {
    setForm(f => ({ ...f, channel: ch, message_template_id: null, body: '', subject: '' }));
  };

  // Fill body/subject from selected template
  const handleTemplateChange = (id: number | null) => {
    const tpl = templates.find(t => t.id === id);
    setForm(f => ({
      ...f,
      message_template_id: id,
      body:    tpl?.body    ?? f.body,
      subject: tpl?.subject ?? f.subject,
    }));
  };

  // Estimate audience on key changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!form.channel) return;
      setEstimating(true);
      try {
        const res = await apiClient.post('/store/campaigns/estimate-audience', {
          channel:     form.channel,
          type:        form.type,
          target_type: form.target_type,
          target_id:   form.target_id ?? undefined,
        });
        setEstimatedCount((res.data as any)?.estimated_recipients ?? null);
      } catch { setEstimatedCount(null); }
      finally { setEstimating(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.channel, form.type, form.target_type, form.target_id]);

  const buildPayload = () => ({
    name:                 form.name,
    description:          form.description || undefined,
    channel:              form.channel,
    type:                 form.type,
    message_template_id:  form.message_template_id || undefined,
    subject:              form.subject || undefined,
    body:                 form.body,
    variables:            Object.keys(form.variables).length ? form.variables : undefined,
    target_type:          form.target_type,
    target_id:            form.target_id || undefined,
    scheduled_at:         form.scheduled_at || undefined,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = isEdit
        ? await apiClient.put(`/store/campaigns/${initial!.id}`, buildPayload())
        : await apiClient.post('/store/campaigns', buildPayload());
      toast.success(isEdit ? 'Campaign updated.' : 'Campaign saved as draft.');
      router.push('/dashboard/communications/campaigns');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleSaveLaunch = async () => {
    setLaunching(true);
    try {
      // Save first (or update), then launch
      const saveRes = isEdit
        ? await apiClient.put(`/store/campaigns/${initial!.id}`, buildPayload())
        : await apiClient.post('/store/campaigns', buildPayload());
      const campaignId = (saveRes.data as any)?.id ?? initial?.id;
      await apiClient.post(`/store/campaigns/${campaignId}/launch`);
      toast.success('Campaign launched! Messages are being queued.');
      router.push('/dashboard/communications/campaigns');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLaunching(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {isEdit ? `Edit: ${initial!.name}` : 'New Campaign'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEdit ? 'Update campaign details' : 'Create a bulk message campaign for your customers'}
        </p>
      </div>

      {/* ── Channel ── */}
      <Card className="p-5 space-y-3">
        <h3 className="font-display font-bold">Channel</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['sms', 'email', 'whatsapp'] as Channel[]).map(ch => {
            const Icon = CHANNEL_ICONS[ch];
            return (
              <button key={ch} type="button" disabled={isEdit}
                onClick={() => handleChannelChange(ch)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all',
                  form.channel === ch ? CHANNEL_COLORS[ch]+' border-2' : 'border hover:bg-muted/30',
                  isEdit && 'opacity-60 cursor-not-allowed'
                )}>
                <Icon className={cn('h-4 w-4', form.channel === ch ? CHANNEL_ICON_COLORS[ch] : 'text-muted-foreground')} />
                {ch === 'sms' ? 'SMS' : ch.charAt(0).toUpperCase()+ch.slice(1)}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Basics ── */}
      <Card className="p-5 space-y-4">
        <h3 className="font-display font-bold">Details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Campaign Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Eid Sale 2026" required />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              <option value="marketing">Marketing</option>
              <option value="reminder">Reminder</option>
              <option value="birthday">Birthday</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Internal note…" />
          </div>
        </div>
      </Card>

      {/* ── Message ── */}
      <Card className="p-5 space-y-4">
        <h3 className="font-display font-bold">Message</h3>

        <div className="space-y-1.5">
          <Label>Load from Template (optional)</Label>
          <select value={form.message_template_id ?? ''}
            onChange={e => handleTemplateChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">— Write custom message —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {form.channel === 'email' && (
          <div className="space-y-1.5">
            <Label>Subject *</Label>
            <Input value={form.subject} onChange={e => set('subject', e.target.value)}
              placeholder="Your subject — use {{customer_name}} etc." required />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Body *</Label>
            <span className="text-xs text-muted-foreground">
              {'{{customer_name}}'}, {'{{store_name}}'} etc. are replaced per recipient
            </span>
          </div>
          <textarea value={form.body} onChange={e => set('body', e.target.value)} required
            rows={form.channel === 'email' ? 10 : 5}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring" />
          {form.channel === 'sms' && (
            <p className="text-xs text-muted-foreground">
              {form.body.length} chars · ~{Math.ceil(form.body.length / 160)} SMS segment(s).
              {form.type === 'marketing' ? ' Include "Reply STOP to opt out".' : ''}
            </p>
          )}
        </div>

        {/* Static variables override */}
        <div className="space-y-1.5">
          <Label>Campaign Variables</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Set static values for template variables (e.g. offer_details, discount, valid_until).
            These are the same for all recipients. Customer name is resolved automatically.
          </p>
          <div className="space-y-2">
            {Object.entries(form.variables).map(([k, v]) => (
              <div key={k} className="flex gap-2 items-center">
                <Input value={k} readOnly className="w-40 font-mono text-xs h-8 bg-muted/30" />
                <span className="text-muted-foreground">=</span>
                <Input value={v} onChange={e => set('variables', { ...form.variables, [k]: e.target.value })}
                  className="flex-1 h-8 text-sm" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  onClick={() => {
                    const next = { ...form.variables };
                    delete next[k];
                    set('variables', next);
                  }}>×</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" type="button" className="h-7 text-xs gap-1"
              onClick={() => {
                const key = prompt('Variable name (without {{}}):');
                if (key && key.trim()) set('variables', { ...form.variables, [key.trim()]: '' });
              }}>
              + Add Variable
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Audience ── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Audience</h3>
          <div className="text-sm text-muted-foreground">
            {estimating ? <Loader2 className="h-4 w-4 animate-spin inline" /> :
              estimatedCount !== null ? (
                <span><strong>{estimatedCount}</strong> estimated recipients</span>
              ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(TARGET_META) as [TargetType, typeof TARGET_META[TargetType]][]).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <button key={key} type="button"
                onClick={() => setForm(f => ({ ...f, target_type: key, target_id: null }))}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition-all',
                  form.target_type === key
                    ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                    : 'hover:bg-muted/30'
                )}>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{meta.label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{meta.desc}</span>
              </button>
            );
          })}
        </div>

        {form.target_type === 'customer_group' && (
          <div className="space-y-1.5">
            <Label>Customer Group</Label>
            <select value={form.target_id ?? ''}
              onChange={e => set('target_id', e.target.value ? Number(e.target.value) : null)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">Select a group…</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        {form.target_type === 'customer_segment' && (
          <div className="space-y-1.5">
            <Label>Customer Segment</Label>
            <select value={form.target_id ?? ''}
              onChange={e => set('target_id', e.target.value ? Number(e.target.value) : null)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">Select a segment…</option>
              {segments.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.customer_count_cached} customers)
                </option>
              ))}
            </select>
          </div>
        )}

        {form.type === 'marketing' && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Marketing campaigns automatically filter to customers who have opted in to {form.channel} marketing.
          </p>
        )}
      </Card>

      {/* ── Schedule ── */}
      <Card className="p-5 space-y-3">
        <h3 className="font-display font-bold">Schedule</h3>
        <div className="space-y-1.5">
          <Label>Send At (optional — leave blank to launch manually)</Label>
          <Input type="datetime-local" value={form.scheduled_at}
            onChange={e => set('scheduled_at', e.target.value)}
            min={new Date().toISOString().slice(0,16)} />
          <p className="text-xs text-muted-foreground">Scheduling queues the dispatch job to run at the specified time.</p>
        </div>
      </Card>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleSave} disabled={saving || launching} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Save Changes' : 'Save as Draft'}
        </Button>
        <Button onClick={handleSaveLaunch} disabled={saving || launching} className="gap-2">
          {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isEdit ? 'Save & Launch' : 'Create & Launch Now'}
        </Button>
      </div>
    </div>
  );
}
