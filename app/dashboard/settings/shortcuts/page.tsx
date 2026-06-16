'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Keyboard, RotateCcw, Check, X, AlertCircle, Pencil,
  Plus, Trash2, Package, Link2, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  ShortcutAction,
  ShortcutMap,
  SHORTCUT_LABELS,
  DEFAULT_SHORTCUTS,
  loadShortcuts,
  saveShortcuts,
  resetShortcuts,
  CustomShortcut,
  loadCustomShortcuts,
  saveCustomShortcuts,
} from '@/lib/shortcuts';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

const ACTIONS = Object.keys(SHORTCUT_LABELS) as ShortcutAction[];
const BLOCKED_KEYS = new Set(['Escape', 'Tab', 'Enter', 'Backspace', 'Delete']);

function normalizeKey(e: KeyboardEvent): string | null {
  if (BLOCKED_KEYS.has(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey)  parts.push('Ctrl');
  if (e.altKey)   parts.push('Alt');
  if (e.shiftKey && e.key.length > 1) parts.push('Shift');
  parts.push(e.key);
  return parts.join('+');
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Key-capture input ──────────────────────────────────────────────────────────
interface KeyCaptureProps {
  value: string | null;
  onChange: (key: string) => void;
  conflict?: string | null;
}

function KeyCapture({ value, onChange, conflict }: KeyCaptureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setActive(false); return; }
      const key = normalizeKey(e);
      if (key) { onChange(key); setActive(false); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [active, onChange]);

  useEffect(() => { if (active) ref.current?.focus(); }, [active]);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onClick={() => setActive(true)}
      onBlur={() => setActive(false)}
      className={cn(
        'h-9 min-w-[110px] flex items-center justify-center rounded-lg border-2 text-sm font-mono px-3 cursor-pointer select-none outline-none transition-all',
        active
          ? 'border-primary border-dashed bg-primary/10 text-primary animate-pulse'
          : conflict
            ? 'border-destructive bg-destructive/10 text-destructive'
            : value
              ? 'border-border bg-muted text-foreground'
              : 'border-dashed border-muted-foreground/40 text-muted-foreground'
      )}
    >
      {active ? 'Press a key…' : (value ?? 'Click to set')}
    </div>
  );
}

// ── Product search ─────────────────────────────────────────────────────────────
interface ProductPickerProps {
  value: { id: number; name: string; sku: string } | null;
  onSelect: (p: { id: number; name: string; sku: string }) => void;
}

function ProductPicker({ value, onSelect }: ProductPickerProps) {
  const [q, setQ]           = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const timerRef              = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((query: string) => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/store/products', { search: query, per_page: 8 });
        setResults((res.data as any)?.data ?? []);
      } catch {
        setResults([]);
      } finally { setLoading(false); }
    }, 280);
  }, []);

  function pick(p: any) {
    onSelect({ id: p.id, name: p.name, sku: p.sku ?? '' });
    setQ('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border bg-muted text-sm">
          <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1">{value.name}</span>
          <button onClick={() => onSelect({ id: 0, name: '', sku: '' })} className="text-muted-foreground hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            placeholder="Search product…"
            value={q}
            onChange={e => { setQ(e.target.value); search(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="h-9 pr-8"
          />
          <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {loading && <p className="text-xs text-muted-foreground px-3 py-2">Searching…</p>}
          {results.map((p: any) => (
            <button
              key={p.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              onMouseDown={() => pick(p)}
            >
              <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate">{p.name}</span>
              {p.sku && <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ShortcutsPage() {
  // Built-in shortcuts
  const [map, setMap]         = useState<ShortcutMap>(() => loadShortcuts());
  const [editing, setEditing] = useState<ShortcutAction | null>(null);
  const [builtinPending, setBuiltinPending] = useState<string | null>(null);
  const [builtinConflict, setBuiltinConflict] = useState<string | null>(null);
  const capRef = useRef<HTMLDivElement>(null);

  // Custom shortcuts
  const [customs, setCustoms]   = useState<CustomShortcut[]>(() => loadCustomShortcuts());
  const [showForm, setShowForm] = useState(false);

  // New custom shortcut form state
  const [newKey, setNewKey]         = useState<string | null>(null);
  const [newAction, setNewAction]   = useState<'add_product' | 'open_page'>('add_product');
  const [newLabel, setNewLabel]     = useState('');
  const [newProduct, setNewProduct] = useState<{ id: number; name: string; sku: string } | null>(null);
  const [newUrl, setNewUrl]         = useState('');
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);

  // All keys currently in use (for conflict detection)
  const usedKeys = [
    ...Object.values(map),
    ...customs.map(c => c.key),
  ];

  // ── Built-in shortcut editing ──────────────────────────────────────────────
  useEffect(() => {
    if (!editing) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { cancelBuiltinEdit(); return; }
      const key = normalizeKey(e);
      if (!key) return;
      const conflict = (Object.keys(map) as ShortcutAction[]).find(a => a !== editing && map[a] === key)
        ?? customs.find(c => c.key === key)?.label ?? null;
      setBuiltinConflict(conflict ? String(conflict) : null);
      setBuiltinPending(key);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [editing, map, customs]);

  useEffect(() => { if (editing) capRef.current?.focus(); }, [editing]);

  function cancelBuiltinEdit() { setEditing(null); setBuiltinPending(null); setBuiltinConflict(null); }

  function confirmBuiltinEdit() {
    if (!editing || !builtinPending) return;
    const next = { ...map, [editing]: builtinPending };
    setMap(next); saveShortcuts(next);
    cancelBuiltinEdit();
    toast.success('Shortcut updated');
  }

  function handleReset() {
    setMap(resetShortcuts());
    toast.success('Shortcuts reset to defaults');
  }

  // ── Custom shortcut form ───────────────────────────────────────────────────
  function openAddForm() {
    setEditingCustomId(null);
    setNewKey(null); setNewAction('add_product');
    setNewLabel(''); setNewProduct(null); setNewUrl('');
    setShowForm(true);
  }

  function openEditForm(cs: CustomShortcut) {
    setEditingCustomId(cs.id);
    setNewKey(cs.key);
    setNewAction(cs.action);
    setNewLabel(cs.label);
    setNewProduct(cs.product_id ? { id: cs.product_id, name: cs.product_name ?? '', sku: cs.product_sku ?? '' } : null);
    setNewUrl(cs.url ?? '');
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false); setEditingCustomId(null);
    setNewKey(null); setNewLabel(''); setNewProduct(null); setNewUrl('');
  }

  function saveCustom() {
    if (!newKey) { toast.error('Set a key binding first'); return; }
    if (newAction === 'add_product' && !newProduct?.id) { toast.error('Select a product'); return; }
    if (newAction === 'open_page'   && !newUrl.trim())  { toast.error('Enter a URL'); return; }

    const label = newLabel.trim() || (
      newAction === 'add_product' ? `Add ${newProduct?.name}` : `Go to ${newUrl}`
    );

    const entry: CustomShortcut = {
      id:           editingCustomId ?? uid(),
      key:          newKey,
      label,
      action:       newAction,
      product_id:   newAction === 'add_product' ? newProduct?.id   : undefined,
      product_name: newAction === 'add_product' ? newProduct?.name : undefined,
      product_sku:  newAction === 'add_product' ? newProduct?.sku  : undefined,
      url:          newAction === 'open_page'   ? newUrl.trim()     : undefined,
    };

    const next = editingCustomId
      ? customs.map(c => c.id === editingCustomId ? entry : c)
      : [...customs, entry];

    setCustoms(next); saveCustomShortcuts(next);
    cancelForm();
    toast.success(editingCustomId ? 'Shortcut updated' : 'Custom shortcut added');
  }

  function deleteCustom(id: string) {
    const next = customs.filter(c => c.id !== id);
    setCustoms(next); saveCustomShortcuts(next);
    toast.success('Shortcut removed');
  }

  // Key conflict check for custom form
  const customKeyConflict = newKey
    ? usedKeys.filter((_, i) => {
        // exclude the key being edited
        if (editingCustomId) {
          const idx = customs.findIndex(c => c.id === editingCustomId);
          if (idx >= 0 && i === Object.values(map).length + idx) return false;
        }
        return true;
      }).some((k, i) => {
        if (editingCustomId) {
          const base = Object.values(map);
          if (i < base.length) return base[i] === newKey;
          const ci = i - base.length;
          return customs[ci]?.id !== editingCustomId && customs[ci]?.key === newKey;
        }
        return k === newKey;
      })
    : false;

  return (
    <div className="max-w-2xl space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Keyboard className="h-6 w-6 text-primary" />
            Keyboard Shortcuts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Remap built-in POS shortcuts and create your own custom ones.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-3.5 w-3.5" /> Reset defaults
        </Button>
      </div>

      {/* ── Built-in shortcuts ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Built-in shortcuts</h2>
        <div className="rounded-xl border bg-card divide-y">
          {ACTIONS.map(action => {
            const isEditing  = editing === action;
            const currentKey = map[action];
            const isDefault  = currentKey === DEFAULT_SHORTCUTS[action];

            return (
              <div key={action} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{SHORTCUT_LABELS[action]}</p>
                  {!isDefault && (
                    <p className="text-[11px] text-muted-foreground">
                      Default: <kbd className="font-mono bg-muted px-1 rounded">{DEFAULT_SHORTCUTS[action]}</kbd>
                    </p>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div
                      ref={capRef}
                      tabIndex={0}
                      className={cn(
                        'h-9 min-w-[120px] flex items-center justify-center rounded-lg border-2 border-dashed text-sm font-mono px-3 outline-none transition-colors',
                        builtinPending
                          ? builtinConflict
                            ? 'border-destructive bg-destructive/10 text-destructive'
                            : 'border-primary bg-primary/10 text-primary'
                          : 'border-muted-foreground/40 text-muted-foreground animate-pulse'
                      )}
                    >
                      {builtinPending ?? 'Press a key…'}
                    </div>
                    {builtinConflict && (
                      <span className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Conflict
                      </span>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary"
                      disabled={!builtinPending || !!builtinConflict} onClick={confirmBuiltinEdit}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelBuiltinEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button onClick={() => { setEditing(action); setBuiltinPending(null); setBuiltinConflict(null); }}
                    className="flex items-center gap-2 group" title="Click to change">
                    <kbd className={cn(
                      'font-mono text-sm px-3 py-1 rounded-lg border transition-colors',
                      isDefault ? 'bg-muted border-border' : 'bg-primary/10 border-primary/30 text-primary'
                    )}>
                      {currentKey}
                    </kbd>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Custom shortcuts ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custom shortcuts</h2>
          {!showForm && (
            <Button size="sm" onClick={openAddForm} className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" /> Add shortcut
            </Button>
          )}
        </div>

        {/* Custom shortcut list */}
        {customs.length > 0 && (
          <div className="rounded-xl border bg-card divide-y">
            {customs.map(cs => (
              <div key={cs.id} className="flex items-center gap-3 px-4 py-3">
                <kbd className="font-mono text-sm px-3 py-1 rounded-lg border bg-primary/10 border-primary/30 text-primary whitespace-nowrap">
                  {cs.key}
                </kbd>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cs.label}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    {cs.action === 'add_product'
                      ? <><Package className="h-3 w-3" /> Add product to cart</>
                      : <><Link2 className="h-3 w-3" /> {cs.url}</>
                    }
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => openEditForm(cs)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteCustom(cs.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {customs.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No custom shortcuts yet. Add one to speed up your checkout flow.
          </div>
        )}

        {/* Add / Edit form */}
        {showForm && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold">{editingCustomId ? 'Edit shortcut' : 'New custom shortcut'}</p>

            {/* Key binding */}
            <div className="space-y-1.5">
              <Label className="text-xs">Key binding</Label>
              <KeyCapture
                value={newKey}
                onChange={k => setNewKey(k)}
                conflict={customKeyConflict ? 'conflict' : null}
              />
              {customKeyConflict && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> This key is already used by another shortcut
                </p>
              )}
            </div>

            {/* Action type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setNewAction('add_product'); setNewUrl(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors',
                    newAction === 'add_product'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Package className="h-4 w-4" /> Add product to cart
                </button>
                <button
                  onClick={() => { setNewAction('open_page'); setNewProduct(null); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors',
                    newAction === 'open_page'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Link2 className="h-4 w-4" /> Go to page
                </button>
              </div>
            </div>

            {/* Action-specific fields */}
            {newAction === 'add_product' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Product</Label>
                <ProductPicker
                  value={newProduct?.id ? newProduct : null}
                  onSelect={p => {
                    if (!p.id) { setNewProduct(null); return; }
                    setNewProduct(p);
                    if (!newLabel) setNewLabel(`Add ${p.name}`);
                  }}
                />
              </div>
            )}

            {newAction === 'open_page' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Page URL</Label>
                <Input
                  placeholder="/dashboard/reports"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="h-9"
                />
              </div>
            )}

            {/* Label */}
            <div className="space-y-1.5">
              <Label className="text-xs">Label <span className="text-muted-foreground">(optional — shown in shortcuts popup)</span></Label>
              <Input
                placeholder={newAction === 'add_product' && newProduct ? `Add ${newProduct.name}` : 'My shortcut'}
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Form actions */}
            <div className="flex gap-2 pt-1">
              <Button onClick={saveCustom} disabled={!newKey || customKeyConflict} className="gap-2">
                <Check className="h-4 w-4" /> {editingCustomId ? 'Update' : 'Add shortcut'}
              </Button>
              <Button variant="outline" onClick={cancelForm}>Cancel</Button>
            </div>
          </div>
        )}
      </section>

      {/* ── Fixed keys ── */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fixed (not configurable)</p>
        <div className="flex flex-wrap gap-4">
          {[['Escape', 'Close any modal'], ['Enter', 'Confirm in dialogs']].map(([k, l]) => (
            <div key={k} className="flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="font-mono bg-muted border px-2 py-0.5 rounded text-[11px]">{k}</kbd>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
