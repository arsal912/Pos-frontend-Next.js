'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare, Mail, MessageCircle, Plus, Pencil, Trash2,
  Copy, Lock, Search, Loader2, X, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Channel = 'sms' | 'email' | 'whatsapp';
type TemplateType = 'transactional' | 'marketing' | 'reminder' | 'birthday' | 'manual';

interface TemplateVariable {
  key: string;
  label: string;
  example?: string;
}

interface MessageTemplate {
  id: number;
  name: string;
  description: string | null;
  channel: Channel;
  type: TemplateType;
  subject: string | null;
  body: string;
  variables: TemplateVariable[] | null;
  is_active: boolean;
  is_system: boolean;
  whatsapp_template_name: string | null;
}

const CHANNEL_META: Record<Channel, { label: string; icon: React.ElementType; color: string }> = {
  sms:      { label: 'SMS',      icon: MessageSquare, color: 'text-blue-500' },
  email:    { label: 'Email',    icon: Mail,          color: 'text-green-500' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-500' },
};

const TYPE_COLORS: Record<TemplateType, string> = {
  transactional: 'bg-blue-100 text-blue-700',
  marketing:     'bg-purple-100 text-purple-700',
  reminder:      'bg-amber-100 text-amber-700',
  birthday:      'bg-pink-100 text-pink-700',
  manual:        'bg-gray-100 text-gray-700',
};

const EMPTY_FORM = {
  name: '', description: '', channel: 'sms' as Channel, type: 'manual' as TemplateType,
  subject: '', body: '', whatsapp_template_name: '', is_active: true,
  variables: [] as TemplateVariable[],
};

function TemplateModal({
  template, onClose, onSaved,
}: {
  template: MessageTemplate | null;
  onClose: () => void;
  onSaved: (t: MessageTemplate) => void;
}) {
  const isNew  = !template;
  const locked = template?.is_system ?? false;

  const [form, setForm] = useState({
    name:                   template?.name ?? '',
    description:            template?.description ?? '',
    channel:                template?.channel ?? 'sms' as Channel,
    type:                   template?.type ?? 'manual' as TemplateType,
    subject:                template?.subject ?? '',
    body:                   template?.body ?? '',
    whatsapp_template_name: template?.whatsapp_template_name ?? '',
    is_active:              template?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name:                   form.name,
        description:            form.description || undefined,
        body:                   form.body,
        is_active:              form.is_active,
        ...(form.channel === 'email'    ? { subject: form.subject }                         : {}),
        ...(form.channel === 'whatsapp' ? { whatsapp_template_name: form.whatsapp_template_name } : {}),
        // Only send channel/type for new templates (system templates block changes to these)
        ...(isNew ? { channel: form.channel, type: form.type } : {}),
        ...(!isNew && !locked ? { type: form.type } : {}),
      };

      const res = isNew
        ? await apiClient.post('/store/message-templates', payload)
        : await apiClient.put(`/store/message-templates/${template!.id}`, payload);

      toast.success(isNew ? 'Template created.' : 'Template updated.');
      onSaved(res.data as any as MessageTemplate);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-display font-bold text-lg">
            {isNew ? 'New Template' : `Edit: ${template!.name}`}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">
          {locked && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <Lock className="h-4 w-4 flex-shrink-0" />
              System template — channel and type are locked. You can edit the body and name.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="When is this template used?" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Channel *</Label>
              <select disabled={!isNew}
                value={form.channel} onChange={e => set('channel', e.target.value as Channel)}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm disabled:opacity-60">
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <select disabled={locked && !isNew}
                value={form.type} onChange={e => set('type', e.target.value as TemplateType)}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm disabled:opacity-60">
                <option value="transactional">Transactional</option>
                <option value="marketing">Marketing</option>
                <option value="reminder">Reminder</option>
                <option value="birthday">Birthday</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>

          {form.channel === 'email' && (
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={e => set('subject', e.target.value)}
                placeholder="Your receipt from {{store_name}}" />
            </div>
          )}

          {form.channel === 'whatsapp' && (
            <div className="space-y-1.5">
              <Label>WhatsApp Template Name</Label>
              <Input value={form.whatsapp_template_name}
                onChange={e => set('whatsapp_template_name', e.target.value)}
                placeholder="pos_receipt (approved template name)" />
              <p className="text-xs text-muted-foreground">Leave blank to send as freeform message (only works within 24hr session window).</p>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Body *</Label>
              <span className="text-xs text-muted-foreground">Use {'{{'} variable_name {'}}'}  for placeholders</span>
            </div>
            <textarea required value={form.body} onChange={e => set('body', e.target.value)}
              rows={form.channel === 'email' ? 10 : 5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="h-4 w-4 rounded border" />
            <Label htmlFor="is_active" className="cursor-pointer">Active (available for use)</Label>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? 'Create Template' : 'Save Changes'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<Channel | ''>('');
  const [typeFilter, setTypeFilter] = useState<TemplateType | ''>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<MessageTemplate | null | 'new'>('new' as any);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [duping, setDuping] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/message-templates', {
        channel:  channelFilter || undefined,
        type:     typeFilter    || undefined,
        search:   search        || undefined,
        per_page: 100,
      });
      setTemplates(Array.isArray(res.data) ? (res.data as MessageTemplate[]) : []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [channelFilter, typeFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t: MessageTemplate) => { setEditing(t); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null as any); };

  const handleSaved = (t: MessageTemplate) => {
    setTemplates(prev => {
      const idx = prev.findIndex(p => p.id === t.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = t; return next; }
      return [t, ...prev];
    });
    closeModal();
  };

  const handleDelete = async (t: MessageTemplate) => {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    setDeleting(t.id);
    try {
      await apiClient.delete(`/store/message-templates/${t.id}`);
      setTemplates(prev => prev.filter(p => p.id !== t.id));
      toast.success('Template deleted.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(null); }
  };

  const handleDuplicate = async (t: MessageTemplate) => {
    setDuping(t.id);
    try {
      const res = await apiClient.post(`/store/message-templates/${t.id}/duplicate`);
      setTemplates(prev => [res.data as any as MessageTemplate, ...prev]);
      toast.success('Template duplicated. You can now edit the copy.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDuping(null); }
  };

  // Group by channel for display
  const grouped = (['sms', 'email', 'whatsapp'] as Channel[]).reduce((acc, ch) => {
    acc[ch] = templates.filter(t => !channelFilter || channelFilter === ch).filter(t => t.channel === ch);
    return acc;
  }, {} as Record<Channel, MessageTemplate[]>);

  const showChannel = (ch: Channel) => !channelFilter || channelFilter === ch;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Message Templates</h1>
          <p className="text-muted-foreground mt-1">Reusable templates for SMS, email and WhatsApp messages</p>
        </div>
        <Button onClick={openNew} className="gap-2 flex-shrink-0">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…" className="pl-9 h-9" />
          </div>
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value as any)}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All channels</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All types</option>
            <option value="transactional">Transactional</option>
            <option value="marketing">Marketing</option>
            <option value="reminder">Reminder</option>
            <option value="birthday">Birthday</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          {(['sms', 'email', 'whatsapp'] as Channel[]).map(ch => {
            const list = grouped[ch];
            if (!showChannel(ch) || list.length === 0) return null;
            const meta = CHANNEL_META[ch];
            const Icon = meta.icon;
            return (
              <div key={ch}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={cn('h-4 w-4', meta.color)} />
                  <h2 className="font-display font-bold">{meta.label}</h2>
                  <span className="text-xs text-muted-foreground">({list.length})</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map(t => (
                    <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Card className={cn('p-4 h-full flex flex-col gap-2', !t.is_active && 'opacity-50')}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-sm truncate">{t.name}</p>
                              {t.is_system && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                            </div>
                            {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                          </div>
                          <Badge className={cn('text-xs flex-shrink-0 capitalize', TYPE_COLORS[t.type])}>
                            {t.type}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-3 flex-1 font-mono bg-muted/30 rounded p-2">
                          {t.body.replace(/<[^>]+>/g, '').slice(0, 120)}{t.body.length > 120 ? '…' : ''}
                        </p>

                        <div className="flex items-center gap-1 pt-1">
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                            onClick={() => openEdit(t)}>
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                            onClick={() => handleDuplicate(t)} disabled={duping === t.id}>
                            {duping === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
                            Copy
                          </Button>
                          {!t.is_system && (
                            <Button variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-destructive ml-auto"
                              onClick={() => handleDelete(t)} disabled={deleting === t.id}>
                              {deleting === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}

          {templates.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No templates found. Create your first template.</p>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <TemplateModal
          template={editing as MessageTemplate | null}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
