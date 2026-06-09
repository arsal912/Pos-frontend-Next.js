'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Monitor, Smartphone, RefreshCw, Loader2, ShieldOff,
  Search, Clock, CheckCircle2, Upload, AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PosDevice {
  id: number;
  store_id: number;
  device_uuid: string;
  device_name: string | null;
  user_agent: string | null;
  last_seen_at: string | null;
  last_sync_at: string | null;
  pending_sales_count: number;
  is_active: boolean;
  status: 'online' | 'offline' | 'never_seen';
  deleted_at: string | null;
  store: { id: number; name: string; status: string } | null;
}

interface Summary {
  total_devices:    number;
  active_devices:   number;
  online_devices:   number;
  pending_total:    number;
}

function deviceIcon(ua: string | null) {
  if (!ua) return Monitor;
  return ua.toLowerCase().includes('mobile') || ua.toLowerCase().includes('android') ? Smartphone : Monitor;
}

const STATUS_DOT: Record<string, string> = {
  online:     'bg-green-500',
  offline:    'bg-gray-400',
  never_seen: 'bg-amber-400',
};

function formatAgo(ts: string | null) {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000)    return 'Just now';
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function AdminPosDevicesPage() {
  const [devices,      setDevices]     = useState<PosDevice[]>([]);
  const [summary,      setSummary]     = useState<Summary | null>(null);
  const [loading,      setLoading]     = useState(true);
  const [search,       setSearch]      = useState('');
  const [statusFilter, setStatusFilter]= useState('');
  const [deactivating, setDeactivating]= useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/pos-devices', {
        search:   search      || undefined,
        status:   statusFilter || undefined,
        per_page: 100,
      });
      const data = res.data as any;
      setDevices(data?.devices ?? []);
      setSummary(data?.summary ?? null);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDeactivate = async (d: PosDevice) => {
    if (!confirm(`Deactivate device "${d.device_name ?? d.device_uuid}" on store "${d.store?.name}"?\n\nThis will block all future syncs from this device.`)) return;
    setDeactivating(d.id);
    try {
      await apiClient.post(`/admin/pos-devices/${d.id}/deactivate`);
      toast.success('Device deactivated.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeactivating(null); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">POS Devices</h1>
          <p className="text-muted-foreground mt-1">All registered terminals across all stores</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total devices',    value: summary.total_devices,    color: 'text-foreground' },
            { label: 'Active',           value: summary.active_devices,   color: 'text-green-600'  },
            { label: 'Online now',       value: summary.online_devices,   color: 'text-blue-600'   },
            { label: 'Pending uploads',  value: summary.pending_total,    color: summary.pending_total > 0 ? 'text-amber-600' : 'text-foreground' },
          ].map(s => (
            <Card key={s.label} className="p-4 text-center">
              <p className={cn('font-display font-bold text-2xl', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or UUID…" className="pl-9 h-9" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="online">Online now</option>
            <option value="offline">Offline</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </Card>

      {/* Device table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : devices.length === 0 ? (
        <Card className="p-12 text-center">
          <Monitor className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No devices found.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Device</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Store</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last seen</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last sync</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Pending</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {devices.map((d, i) => {
                const Icon = deviceIcon(d.user_agent);
                return (
                  <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn('border-b last:border-0 hover:bg-muted/10', (!d.is_active || d.deleted_at) && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-36">{d.device_name ?? 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-36">{d.device_uuid.slice(-12)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{d.store?.name ?? '—'}</p>
                      <Badge className={cn('text-xs mt-0.5', d.store?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                        {d.store?.status ?? '?'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', d.deleted_at ? 'bg-red-400' : STATUS_DOT[d.status] ?? 'bg-gray-400')} />
                        <span className="capitalize text-xs">{d.deleted_at ? 'deactivated' : d.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatAgo(d.last_seen_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatAgo(d.last_sync_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.pending_sales_count > 0 ? (
                        <span className="flex items-center justify-center gap-0.5 text-amber-700 text-xs font-medium">
                          <Upload className="h-3 w-3" />{d.pending_sales_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.is_active && !d.deleted_at && (
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive"
                          onClick={() => handleDeactivate(d)} disabled={deactivating === d.id}>
                          {deactivating === d.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <ShieldOff className="h-3 w-3" />}
                          Deactivate
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
