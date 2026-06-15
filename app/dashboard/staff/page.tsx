'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, UserX, Loader2, Search, Shield,
  Mail, Phone, Clock, X, Eye, EyeOff,
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

interface StaffMember {
  id: number; name: string; email: string; phone: string | null;
  is_active: boolean; branch_id: number | null;
  last_login_at: string | null; created_at: string;
  roles: { id: number; name: string; color: string; is_system: boolean }[];
}
interface StoreRole { id: number; name: string; color: string; description: string | null; }

// ── Staff Form Modal ───────────────────────────────────────────────────────────

function StaffModal({ member, roles, onClose, onSaved }: {
  member: StaffMember | null; roles: StoreRole[];
  onClose: () => void; onSaved: () => void;
}) {
  const isNew = !member;
  const [name,     setName]     = useState(member?.name ?? '');
  const [email,    setEmail]    = useState(member?.email ?? '');
  const [phone,    setPhone]    = useState(member?.phone ?? '');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [roleName, setRoleName] = useState(member?.roles[0]?.name ?? 'cashier');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name is required.');
    if (isNew && !email.trim()) return toast.error('Email is required.');
    if (isNew && !password) return toast.error('Password is required for new staff.');
    setSaving(true);
    try {
      if (isNew) {
        await apiClient.post('/store/staff', { name, email, phone: phone||undefined, password, role_name: roleName });
        toast.success('Staff member created.');
      } else {
        await apiClient.put(`/store/staff/${member!.id}`, {
          name, phone: phone||undefined,
          password: password||undefined,
          role_name: roleName,
        });
        toast.success('Staff member updated.');
      }
      onSaved();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl">{isNew ? 'Add Staff Member' : 'Edit Staff'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full Name *</Label>
            <Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ahmed Hassan" />
          </div>
          {isNew && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="staff@yourstore.com" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+92 300 1234567" />
          </div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <select value={roleName} onChange={e=>setRoleName(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              {roles.filter(r => r.name !== 'store-owner' && r.name !== 'super-admin').map(r => (
                <option key={r.id} value={r.name}>{r.name.replace(/-/g,' ')}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{isNew ? 'Password *' : 'New Password (leave blank to keep)'}</Label>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder={isNew ? 'Min 8 characters' : 'Leave blank to keep current'}
                className="pr-9" />
              <button type="button" onClick={()=>setShowPw(v=>!v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? 'Create Staff' : 'Save Changes'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [staff,   setStaff]   = useState<StaffMember[]>([]);
  const [roles,   setRoles]   = useState<StoreRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [editing, setEditing] = useState<StaffMember | null | 'new'>('new' as any);
  const [modalOpen, setModalOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, rolesRes] = await Promise.all([
        apiClient.get('/store/staff'),
        apiClient.get('/store/roles'),
      ]);
      setStaff((staffRes.data as any)?.staff ?? []);
      setRoles((rolesRes.data as any)?.roles ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? staff.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.roles.some(r => r.name.includes(search.toLowerCase()))
      )
    : staff;

  const formatAgo = (ts: string | null) => {
    if (!ts) return 'Never';
    const d = Date.now() - new Date(ts).getTime();
    if (d < 3600_000) return `${Math.floor(d/60_000)}m ago`;
    if (d < 86400_000) return `${Math.floor(d/3600_000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const handleDeactivate = async (s: StaffMember) => {
    if (!confirm(`Deactivate ${s.name}? They will be logged out immediately.`)) return;
    setDeactivating(s.id);
    try {
      await apiClient.delete(`/store/staff/${s.id}`);
      toast.success('Staff member deactivated.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeactivating(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team — {staff.filter(s=>s.is_active).length} active · {staff.filter(s=>!s.is_active).length} inactive
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />Add Staff
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name, email or role…" className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {search ? 'No staff found matching your search.' : 'No staff members yet. Add your first team member.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff Member</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Last Login</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((member, i) => (
                  <motion.tr key={member.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.03 }}
                    className={cn('border-b last:border-0 hover:bg-muted/10', !member.is_active && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {member.roles.map(r => (
                          <span key={r.id} className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: r.color+'20', color: r.color }}>
                            <Shield className="h-2.5 w-2.5" />
                            {r.name.replace(/-/g,' ')}
                          </span>
                        ))}
                        {member.roles.length === 0 && <span className="text-xs text-muted-foreground">No role</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {member.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{member.phone}</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />{formatAgo(member.last_login_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => { setEditing(member); setModalOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {member.is_active && !member.roles.some(r=>r.name==='store-owner') && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleDeactivate(member)} disabled={deactivating===member.id}>
                            {deactivating===member.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <UserX className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {modalOpen && (
        <StaffModal
          member={editing as StaffMember | null}
          roles={roles}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}
