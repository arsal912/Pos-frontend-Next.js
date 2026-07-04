'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2, Eye, Star, X, Save, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

interface Template {
  id: number;
  name: string;
  type: 'thermal' | 'a4';
  header_text: string | null;
  footer_text: string | null;
  show_logo: boolean;
  show_tax_breakdown: boolean;
  show_qr_code: boolean;
  custom_css: string | null;
  is_default: boolean;
  is_active: boolean;
}

const MERGE_TAGS = [
  '{{store.name}}', '{{store.address}}', '{{store.phone}}',
  '{{sale.number}}', '{{sale.date}}', '{{cashier.name}}', '{{customer.name}}',
];

const emptyTemplate = (type: 'thermal' | 'a4' = 'thermal'): Partial<Template> => ({
  name: '', type, header_text: '', footer_text: 'Thank you for your purchase!',
  show_logo: true, show_tax_breakdown: true, show_qr_code: false, custom_css: '', is_default: false, is_active: true,
});

export default function ReceiptSettingsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/receipt-templates');
      setTemplates((res.data as any)?.templates ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = (type: 'thermal' | 'a4' = 'thermal') => {
    setEditing(emptyTemplate(type));
    setEditingId(null);
    setPreviewId(null);
  };

  const openEdit = (t: Template) => {
    setEditing({ ...t });
    setEditingId(t.id);
    loadPreview(t.id);
  };

  const loadPreview = async (id: number) => {
    setPreviewId(id);
    setLoadingPreview(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`/api/backend/store/receipt-templates/${id}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPreviewHtml(await res.text());
    } catch { setPreviewHtml('<p style="padding:16px;color:#666;">Preview unavailable</p>'); }
    finally { setLoadingPreview(false); }
  };

  const upd = (k: keyof Template, v: any) => setEditing(e => e ? { ...e, [k]: v } : null);

  const insertMergeTag = (tag: string, field: 'header_text' | 'footer_text') => {
    upd(field, ((editing as any)?.[field] ?? '') + tag);
  };

  const save = async () => {
    if (!editing?.name) return toast.error('Name is required.');
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.put(`/store/receipt-templates/${editingId}`, editing);
        toast.success('Template updated.');
      } else {
        const res = await apiClient.post('/store/receipt-templates', editing);
        const newId = (res.data as any)?.template?.id;
        if (newId) loadPreview(newId);
        toast.success('Template created.');
      }
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const del = async (t: Template) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try { await apiClient.delete(`/store/receipt-templates/${t.id}`); toast.success('Deleted.'); load(); if (editingId === t.id) setEditing(null); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const setDefault = async (t: Template) => {
    try { await apiClient.put(`/store/receipt-templates/${t.id}`, { is_default: true }); load(); toast.success('Set as default.'); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-display text-4xl font-bold tracking-tight">Receipt Templates</h1><p className="text-muted-foreground mt-1">Customize how receipts look for thermal and A4 printing</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate('thermal')} className="gap-2"><Plus className="h-4 w-4" />Thermal</Button>
          <Button onClick={() => openCreate('a4')} className="gap-2"><Plus className="h-4 w-4" />A4</Button>
        </div>
      </div>

      <Card className="p-4 flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 border-dashed">
        <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <p>
          Your store name, logo, address, and phone shown on receipts come from{' '}
          <Link href="/dashboard/settings" className="text-primary hover:underline">General Settings</Link>.
          A platform-wide footer note also prints at the very bottom of every receipt — set by the platform
          admin, shown in the preview below, but not editable here.
        </p>
      </Card>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Template list */}
        <div className="lg:col-span-3 space-y-3">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          : templates.length === 0 ? <Card className="p-6 text-center text-muted-foreground text-sm">No templates yet. Create one to get started.</Card>
          : templates.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className={`p-4 cursor-pointer transition-all ${editingId === t.id ? 'border-primary ring-1 ring-primary/30' : 'hover:border-primary/30'}`}
                onClick={() => openEdit(t)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">{t.type}</Badge>
                      {t.is_default && <Badge variant="success" className="text-xs gap-0.5"><Star className="h-2.5 w-2.5" />Default</Badge>}
                      {!t.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!t.is_default && <button onClick={e => { e.stopPropagation(); setDefault(t); }} className="text-muted-foreground hover:text-warning-foreground"><Star className="h-3.5 w-3.5" /></button>}
                    <button onClick={e => { e.stopPropagation(); del(t); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Editor + Preview */}
        {editing ? (
          <div className="lg:col-span-9 grid lg:grid-cols-2 gap-6">
            {/* Form */}
            <Card className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold">{editingId ? 'Edit Template' : 'New Template'}</h2>
                <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-1.5"><Label>Name *</Label><Input value={editing.name ?? ''} onChange={e => upd('name', e.target.value)} placeholder="Template name" /></div>

              <div className="space-y-1.5">
                <Label>Header Text</Label>
                <textarea value={editing.header_text ?? ''} onChange={e => upd('header_text', e.target.value)} rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" placeholder="e.g. Thank you for shopping!" />
                <div className="flex flex-wrap gap-1">
                  {MERGE_TAGS.slice(0,4).map(t => (
                    <button key={t} onClick={() => insertMergeTag(t, 'header_text')} className="text-[10px] bg-muted px-1.5 py-0.5 rounded hover:bg-primary/10 font-mono">{t}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Footer Text</Label>
                <textarea value={editing.footer_text ?? ''} onChange={e => upd('footer_text', e.target.value)} rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" placeholder="e.g. Return policy info" />
              </div>

              <div className="space-y-2">
                {[
                  ['show_logo', 'Show store logo'],
                  ['show_tax_breakdown', 'Show tax breakdown'],
                  ['show_qr_code', 'Show QR code on receipt'],
                  ['is_default', 'Set as default for this type'],
                  ['is_active', 'Active'],
                ].map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between">
                    <Label className="text-sm">{label}</Label>
                    <Switch checked={!!(editing as any)[field]} onCheckedChange={v => upd(field as any, v)} />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>Custom CSS</Label>
                <textarea value={editing.custom_css ?? ''} onChange={e => upd('custom_css', e.target.value)} rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono resize-none" placeholder=".bold { font-weight: bold; }" />
              </div>

              <Button onClick={save} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Save Changes' : 'Create Template'}
              </Button>
            </Card>

            {/* Live preview */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Live Preview</span>
                {loadingPreview && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
              </div>
              {previewHtml ? (
                <iframe srcDoc={previewHtml} className="w-full h-[calc(80vh-60px)]" title="Receipt Preview" sandbox="allow-same-origin" />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  {editingId ? 'Loading preview…' : 'Preview available after saving'}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-9 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Select a template to edit, or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
