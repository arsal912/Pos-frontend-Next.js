'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Loader2, Shield, ShieldCheck, X,
  ChevronDown, ChevronRight, Check, Copy, Sparkles,
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoreRole {
  id: number; name: string; description: string | null; color: string;
  is_system: boolean; is_custom: boolean; store_id: number | null;
  permissions_count: number; permissions: string[];
}
type PermissionGroups = Record<string, string[]>;

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
  '#f59e0b','#84cc16','#10b981','#06b6d4','#3b82f6',
];

// Quick templates for common custom roles
const ROLE_TEMPLATES = [
  {
    name: 'Accountant',
    description: 'Financial reporting and expense management',
    color: '#06b6d4',
    permissions: ['view-reports','export-reports','view-profit-loss','manage-expenses','view-sales'],
  },
  {
    name: 'Sales Staff',
    description: 'POS sales and basic customer service',
    color: '#10b981',
    permissions: ['view-products','create-sales','view-sales','view-customers','manage-customers','view-loyalty'],
  },
  {
    name: 'Supervisor',
    description: 'Oversees operations, reports, and staff',
    color: '#8b5cf6',
    permissions: ['view-products','create-sales','view-sales','refund-sales','view-inventory',
      'view-customers','manage-customers','view-reports','view-users','manage-expenses'],
  },
  {
    name: 'Warehouse',
    description: 'Manages stock, GRNs and transfers',
    color: '#f59e0b',
    permissions: ['view-products','edit-products','view-inventory','manage-inventory','transfer-stock','view-suppliers'],
  },
];

// ── Permission Matrix ─────────────────────────────────────────────────────────

function PermissionMatrix({ groups, selected, onChange }: {
  groups: PermissionGroups; selected: string[]; onChange: (p: string[]) => void;
}) {
  const toggle = (p: string) =>
    onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p]);

  const toggleGroup = (perms: string[]) => {
    const allIn = perms.every(p => selected.includes(p));
    onChange(allIn ? selected.filter(p => !perms.includes(p)) : [...new Set([...selected, ...perms])]);
  };

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, perms]) => {
        const checked = perms.filter(p => selected.includes(p)).length;
        const all     = perms.length;
        const allIn   = checked === all;
        const someIn  = checked > 0 && checked < all;
        return (
          <div key={group}>
            {/* Group header */}
            <button onClick={() => toggleGroup(perms)}
              className="flex items-center gap-2 w-full text-left mb-2 group">
              <div className={cn(
                'h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                allIn  ? 'bg-primary border-primary'
                       : someIn ? 'border-primary bg-primary/10'
                                : 'border-muted-foreground/30 group-hover:border-primary/50'
              )}>
                {allIn  && <Check className="h-2.5 w-2.5 text-white" />}
                {someIn && <div className="h-1.5 w-1.5 rounded-sm bg-primary" />}
              </div>
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">{group}</span>
              <span className="ml-auto text-xs text-muted-foreground font-mono">{checked}/{all}</span>
            </button>
            {/* Individual permissions */}
            <div className="grid grid-cols-2 gap-1 pl-6">
              {perms.map(p => {
                const on = selected.includes(p);
                return (
                  <label key={p} className={cn(
                    'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-all select-none',
                    on ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                       : 'text-muted-foreground hover:bg-muted/50 border border-transparent'
                  )}>
                    <input type="checkbox" checked={on} onChange={() => toggle(p)} className="hidden" />
                    <div className={cn('h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center',
                      on ? 'bg-primary border-primary' : 'border-muted-foreground/30')}>
                      {on && <Check className="h-2 w-2 text-white" />}
                    </div>
                    <span className="truncate">{p.replace(/-/g, ' ')}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Role Form Modal ────────────────────────────────────────────────────────────

function RoleModal({ role, permGroups, allRoles, onClose, onSaved }: {
  role:      StoreRole | null;
  permGroups: PermissionGroups;
  allRoles:  StoreRole[];
  onClose:   () => void;
  onSaved:   () => void;
}) {
  const isNew = !role;

  const [step,     setStep]    = useState<'template' | 'form'>(isNew ? 'template' : 'form');
  const [name,     setName]    = useState(role?.name.replace(/-/g, ' ') ?? '');
  const [desc,     setDesc]    = useState(role?.description ?? '');
  const [color,    setColor]   = useState(role?.color ?? '#6366f1');
  const [perms,    setPerms]   = useState<string[]>(role?.permissions ?? []);
  const [saving,   setSaving]  = useState(false);

  const allPerms = Object.values(permGroups).flat();

  // Apply a template or copy-from-role
  const applyTemplate = (t: typeof ROLE_TEMPLATES[0]) => {
    setName(t.name); setDesc(t.description); setColor(t.color); setPerms(t.permissions);
    setStep('form');
  };
  const copyFromRole = (r: StoreRole) => {
    setPerms(r.permissions); setColor(r.color);
    setStep('form');
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Role name is required.');
    setSaving(true);
    try {
      if (isNew) {
        await apiClient.post('/store/roles', {
          name: name.trim(), description: desc || undefined, color, permissions: perms,
        });
        toast.success(`Role "${name}" created.`);
      } else {
        if (!role!.is_system) {
          await apiClient.put(`/store/roles/${role!.id}`, {
            name: name.trim(), description: desc || undefined, color,
          });
        } else {
          // System role — only update description + color
          await apiClient.put(`/store/roles/${role!.id}`, {
            description: desc || undefined, color,
          });
        }
        await apiClient.put(`/store/roles/${role!.id}/permissions`, { permissions: perms });
        toast.success('Role updated.');
      }
      onSaved();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-10 p-4 overflow-y-auto">
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-2xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {/* Live role badge preview */}
            <div className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: color + '25' }}>
              <Shield className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">
                {isNew ? (step === 'template' ? 'Choose a Starting Point' : 'Create Custom Role') : `Edit: ${role!.name.replace(/-/g,' ')}`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isNew && step === 'template' ? 'Pick a template or start from scratch' : `${perms.length} of ${allPerms.length} permissions selected`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Template step (new role only) */}
        {isNew && step === 'template' && (
          <div className="p-6 space-y-4">
            {/* Quick templates */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Templates</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {ROLE_TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => applyTemplate(t)}
                    className="flex items-start gap-3 p-3 rounded-xl border hover:border-primary/40 hover:bg-primary/5 text-left transition-all group">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: t.color + '20' }}>
                      <Shield className="h-4 w-4" style={{ color: t.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t.permissions.length} permissions</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Copy from existing */}
            {allRoles.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Copy from existing role
                </p>
                <div className="flex flex-wrap gap-2">
                  {allRoles.map(r => (
                    <button key={r.id} onClick={() => copyFromRole(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors">
                      <Copy className="h-3 w-3 text-muted-foreground" />
                      <span className="capitalize">{r.name.replace(/-/g,' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start from scratch */}
            <Button variant="outline" onClick={() => setStep('form')} className="w-full gap-2">
              <Sparkles className="h-4 w-4" />Start from scratch
            </Button>
          </div>
        )}

        {/* Form step */}
        {(step === 'form' || !isNew) && (
          <div className="p-6 space-y-5">
            {/* Name + Color */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role Name *</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Floor Manager"
                  disabled={!isNew && role?.is_system}
                />
                {!isNew && role?.is_system && (
                  <p className="text-xs text-muted-foreground">System role — name cannot be changed</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Badge Color</Label>
                <div className="flex gap-2 flex-wrap pt-1">
                  {ROLE_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={cn(
                        'h-7 w-7 rounded-full transition-all border-2',
                        color === c ? 'scale-125 border-foreground shadow-md' : 'border-transparent hover:scale-110'
                      )}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="What does this role do?" />
            </div>

            {/* Quick select all / clear */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Permissions <span className="text-muted-foreground font-normal text-xs">({perms.length} selected)</span></Label>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                    onClick={() => setPerms(allPerms)}>Select all</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                    onClick={() => setPerms([])}>Clear</Button>
                </div>
              </div>
              <div className="border rounded-xl p-4 bg-muted/5 max-h-72 overflow-y-auto">
                <PermissionMatrix groups={permGroups} selected={perms} onChange={setPerms} />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {(step === 'form' || !isNew) && (
          <div className="flex items-center gap-3 px-6 py-4 border-t">
            {isNew && (
              <Button variant="ghost" size="sm" onClick={() => setStep('template')} className="mr-auto text-xs">
                ← Back to templates
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2 min-w-28">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isNew ? 'Create Role' : 'Save Changes'}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Role Row ──────────────────────────────────────────────────────────────────

function RoleRow({ role, expanded, onExpand, onEdit, onDelete, deleting }: {
  role: StoreRole; expanded: boolean; onExpand: () => void;
  onEdit: () => void; onDelete: (() => void) | null; deleting: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-3.5">
        {/* Expand area */}
        <button onClick={onExpand} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: role.color + '20' }}>
            <Shield className="h-4 w-4" style={{ color: role.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm capitalize">{role.name.replace(/-/g, ' ')}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: role.color + '15', color: role.color }}>
                {role.permissions_count} permissions
              </span>
              {role.is_system && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  built-in
                </span>
              )}
            </div>
            {role.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{role.description}</p>
            )}
          </div>
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
            {role.is_system ? 'Permissions' : 'Edit'}
          </Button>
          {onDelete && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
              onClick={onDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded permissions */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} className="overflow-hidden">
            <div className="border-t px-4 py-3 bg-muted/5">
              {role.permissions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No permissions assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map(p => (
                    <span key={p} className="text-xs bg-background border rounded-full px-2 py-0.5 text-muted-foreground">
                      {p.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const [roles,      setRoles]      = useState<StoreRole[]>([]);
  const [permGroups, setPermGroups] = useState<PermissionGroups>({});
  const [loading,    setLoading]    = useState(true);
  const [editRole,   setEditRole]   = useState<StoreRole | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [expanded,   setExpanded]   = useState<number | null>(null);
  const [deleting,   setDeleting]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permRes] = await Promise.all([
        apiClient.get('/store/roles'),
        apiClient.get('/store/roles/permissions'),
      ]);
      setRoles((rolesRes.data as any)?.roles ?? []);
      setPermGroups((permRes.data as any)?.permission_groups ?? {});
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditRole(null); setModalOpen(true); };
  const openEdit = (r: StoreRole) => { setEditRole(r); setModalOpen(true); };

  const handleDelete = async (r: StoreRole) => {
    if (!confirm(`Delete "${r.name.replace(/-/g,' ')}"?\n\nStaff with this role will lose all associated permissions.`)) return;
    setDeleting(r.id);
    try {
      await apiClient.delete(`/store/roles/${r.id}`);
      toast.success('Role deleted.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(null); }
  };

  const systemRoles = roles.filter(r => r.is_system);
  const customRoles = roles.filter(r => r.is_custom);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground mt-1">
            Control what each staff member can access · built-in roles + custom roles for your store
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 flex-shrink-0 shadow-md">
          <Plus className="h-4 w-4" />Create Custom Role
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* ── Custom Roles ─────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Custom Roles
                {customRoles.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({customRoles.length})</span>
                )}
              </h2>
            </div>

            {customRoles.length === 0 ? (
              // Empty state — guides user to create their first custom role
              <Card className="p-8 border-dashed border-2 text-center hover:border-primary/40 transition-colors cursor-pointer group"
                onClick={openNew}>
                <div className="h-12 w-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-6 w-6 text-violet-600" />
                </div>
                <h3 className="font-semibold mb-1">No custom roles yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                  Create roles tailored to your store — like "Accountant", "Warehouse", or "Supervisor" — with exactly the permissions they need.
                </p>
                <Button variant="outline" className="gap-2 group-hover:border-primary group-hover:text-primary">
                  <Plus className="h-4 w-4" />Create your first custom role
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {customRoles.map(role => (
                  <RoleRow key={role.id} role={role}
                    expanded={expanded === role.id}
                    onExpand={() => setExpanded(e => e === role.id ? null : role.id)}
                    onEdit={() => openEdit(role)}
                    onDelete={() => handleDelete(role)}
                    deleting={deleting === role.id} />
                ))}
                {/* Add another */}
                <button onClick={openNew}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <Plus className="h-4 w-4" />Add another custom role
                </button>
              </div>
            )}
          </div>

          {/* ── Built-in Roles ────────────────────────────────── */}
          <div>
            <h2 className="font-display font-bold flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Built-in Roles
              <span className="text-xs font-normal text-muted-foreground">
                — cannot be deleted · click Edit to customise permissions
              </span>
            </h2>
            <div className="space-y-2">
              {systemRoles.map(role => (
                <RoleRow key={role.id} role={role}
                  expanded={expanded === role.id}
                  onExpand={() => setExpanded(e => e === role.id ? null : role.id)}
                  onEdit={() => openEdit(role)}
                  onDelete={null}
                  deleting={false} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <RoleModal
            role={editRole}
            permGroups={permGroups}
            allRoles={roles}
            onClose={() => setModalOpen(false)}
            onSaved={() => { setModalOpen(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
