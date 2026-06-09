'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Monitor, Smartphone, RefreshCw, Loader2, Trash2,
  CheckCircle2, Clock, AlertTriangle, ShoppingCart,
  Activity, ChevronDown, ChevronRight, Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PosDevice {
  id: number;
  device_uuid: string;
  device_name: string | null;
  user_agent: string | null;
  last_seen_at: string | null;
  last_sync_at: string | null;
  pending_sales_count: number;
  is_active: boolean;
  status: 'online' | 'offline' | 'never_seen';
  created_at: string;
}

interface DeviceSyncStatus {
  device:                PosDevice;
  sales_synced_today:    number;
  sales_synced_30d:      number;
  unresolved_conflicts:  number;
  pending_sales_count:   number;
}

function deviceIcon(ua: string | null) {
  if (!ua) return Monitor;
  return ua.toLowerCase().includes('mobile') || ua.toLowerCase().includes('android') ? Smartphone : Monitor;
}

function StatusDot({ status }: { status: PosDevice['status'] }) {
  return (
    <span className={cn(
      'inline-block h-2 w-2 rounded-full flex-shrink-0',
      status === 'online'    && 'bg-green-500',
      status === 'offline'   && 'bg-gray-400',
      status === 'never_seen'&& 'bg-amber-400',
    )} />
  );
}

function formatAgo(ts: string | null) {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000)   return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function DevicesPage() {
  const [devices,      setDevices]      = useState<PosDevice[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState<number | null>(null);
  const [syncStatus,   setSyncStatus]   = useState<Record<number, DeviceSyncStatus>>({});
  const [loadingStatus,setLoadingStatus]= useState<number | null>(null);
  const [deactivating, setDeactivating] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/pos/devices');
      setDevices((res.data as any)?.devices ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (deviceId: number) => {
    if (expanded === deviceId) { setExpanded(null); return; }
    setExpanded(deviceId);
    if (syncStatus[deviceId]) return;

    setLoadingStatus(deviceId);
    try {
      const res = await apiClient.get(`/store/pos/devices/${deviceId}/sync-status`);
      setSyncStatus(p => ({ ...p, [deviceId]: res.data as any as DeviceSyncStatus }));
    } catch { /* show partial data */ }
    finally { setLoadingStatus(null); }
  };

  const handleDeactivate = async (d: PosDevice) => {
    if (!confirm(`Deactivate "${d.device_name ?? d.device_uuid}"?\n\nThe device will receive 403 on its next sync attempt.`)) return;
    setDeactivating(d.id);
    try {
      await apiClient.delete(`/store/pos/devices/${d.id}`);
      toast.success('Device deactivated.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeactivating(null); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">POS Devices</h1>
          <p className="text-muted-foreground mt-1">
            Registered tablets and terminals · click a device for sync health
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      <Card className="p-4 bg-amber-50 border-amber-200 text-sm text-amber-800 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Lost or stolen device?</p>
          <p className="text-xs mt-0.5 text-amber-700">
            Deactivate it below — the device will receive 403 on its next sync and cannot upload more sales.
          </p>
        </div>
      </Card>

      {loading && devices.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : devices.length === 0 ? (
        <Card className="p-12 text-center">
          <Monitor className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No devices registered yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Open the POS screen on any device to auto-register it.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {devices.map((d, i) => {
            const Icon = deviceIcon(d.user_agent);
            const ss   = syncStatus[d.id];
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={cn('overflow-hidden', !d.is_active && 'opacity-50')}>
                  {/* Header row */}
                  <button onClick={() => toggleExpand(d.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/20 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusDot status={d.status} />
                        <p className="font-semibold text-sm">{d.device_name ?? 'Unnamed Device'}</p>
                        {!d.is_active && <Badge variant="secondary" className="text-xs">Deactivated</Badge>}
                        {d.pending_sales_count > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            <Upload className="h-3 w-3" />{d.pending_sales_count} pending
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />Last seen: {formatAgo(d.last_seen_at)}
                        </span>
                        {d.last_sync_at && (
                          <span className="flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Last sync: {formatAgo(d.last_sync_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {d.is_active && (
                        <button onClick={e => { e.stopPropagation(); handleDeactivate(d); }}
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"
                          disabled={deactivating === d.id}>
                          {deactivating === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                      {expanded === d.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Expanded stats */}
                  <AnimatePresence>
                    {expanded === d.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="overflow-hidden border-t bg-muted/10">
                        {loadingStatus === d.id ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { label: 'Sales today',     value: ss?.sales_synced_today ?? '—',   icon: ShoppingCart },
                                { label: 'Sales (30d)',     value: ss?.sales_synced_30d   ?? '—',   icon: Activity     },
                                { label: 'Pending upload',  value: d.pending_sales_count,            icon: Upload       },
                                { label: 'Open conflicts',  value: ss?.unresolved_conflicts ?? '—', icon: AlertTriangle },
                              ].map(stat => (
                                <div key={stat.label} className="bg-background rounded-xl border p-3 text-center">
                                  <stat.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                  <p className="font-display font-bold text-lg">{stat.value}</p>
                                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono opacity-60 break-all">
                              UUID: {d.device_uuid}
                            </div>
                            {d.user_agent && (
                              <p className="text-xs text-muted-foreground truncate">{d.user_agent}</p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Devices auto-register when the POS screen is first opened on that browser/tablet.
      </p>
    </div>
  );
}
