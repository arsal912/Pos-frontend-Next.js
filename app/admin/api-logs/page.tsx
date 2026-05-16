'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertCircle, Clock, Activity, X, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiLog } from '@/types';

export default function AdminApiLogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApiLog | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    method: '',
    errors_only: false,
    slow_only: false,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ApiLog[]>('/admin/api-logs', {
        search: filters.search || undefined,
        method: filters.method || undefined,
        errors_only: filters.errors_only || undefined,
        slow_only: filters.slow_only || undefined,
        per_page: 50,
      });
      setLogs(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handlePurge = async () => {
    const days = prompt('Delete logs older than how many days?', '30');
    if (!days) return;
    try {
      const res = await apiClient.post<{ deleted_count: number }>('/admin/api-logs/purge', { days: Number(days) });
      toast.success(`Deleted ${res.data.deleted_count} log entries`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const methodColor = (m: string) => ({
    GET: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    POST: 'bg-green-500/10 text-green-600 border-green-500/20',
    PUT: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    PATCH: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
  }[m] || 'bg-gray-500/10 text-gray-600 border-gray-500/20');

  const statusColor = (s: number | null) => {
    if (!s) return 'secondary';
    if (s >= 500) return 'destructive';
    if (s >= 400) return 'warning';
    if (s >= 300) return 'secondary';
    return 'success';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">API Logs</h1>
          <p className="text-muted-foreground mt-1">Debug user journeys and API issues</p>
        </div>
        <Button variant="outline" onClick={handlePurge}>
          <Trash2 className="h-4 w-4" />
          Purge Old Logs
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search endpoint or error..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>
          <select
            value={filters.method}
            onChange={e => setFilters({ ...filters, method: e.target.value })}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <div className="flex items-center gap-2">
            <Switch
              checked={filters.errors_only}
              onCheckedChange={(e) => setFilters({ ...filters, errors_only: e })}
              id="errors"
            />
            <Label htmlFor="errors" className="text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3 text-destructive" />Errors only</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={filters.slow_only}
              onCheckedChange={(e) => setFilters({ ...filters, slow_only: e })}
              id="slow"
            />
            <Label htmlFor="slow" className="text-xs flex items-center gap-1"><Clock className="h-3 w-3 text-warning" />Slow (&gt;1s)</Label>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No log entries found</p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log, i) => (
            <motion.button
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.01 }}
              onClick={() => setSelected(log)}
              className="w-full text-left"
            >
              <Card className="p-3 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 flex-wrap font-mono text-xs">
                  <span className={`px-2 py-0.5 rounded border font-semibold ${methodColor(log.method)}`}>{log.method}</span>
                  <Badge variant={statusColor(log.response_status) as any}>{log.response_status ?? '—'}</Badge>
                  <span className="flex-1 truncate text-foreground">{log.endpoint.replace(/https?:\/\/[^/]+/, '')}</span>
                  <span className="text-muted-foreground">{log.duration_ms}ms</span>
                  <span className="text-muted-foreground">{formatRelativeTime(log.created_at)}</span>
                </div>
                {log.exception && (
                  <p className="mt-2 text-xs text-destructive truncate">⚠ {log.exception}</p>
                )}
              </Card>
            </motion.button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="sticky top-0 bg-card border-b p-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Request Detail</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-5 font-mono text-xs">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><p className="text-muted-foreground mb-1">Method & Endpoint</p><p className="font-semibold break-all">{selected.method} {selected.endpoint}</p></div>
                <div><p className="text-muted-foreground mb-1">Status</p><Badge variant={statusColor(selected.response_status) as any}>{selected.response_status}</Badge></div>
                <div><p className="text-muted-foreground mb-1">Duration</p><p className="font-semibold">{selected.duration_ms}ms</p></div>
                <div><p className="text-muted-foreground mb-1">IP</p><p className="font-semibold">{selected.ip_address}</p></div>
                {selected.user && <div><p className="text-muted-foreground mb-1">User</p><p>{selected.user.name} ({selected.user.email})</p></div>}
                {selected.store && <div><p className="text-muted-foreground mb-1">Store</p><p>{selected.store.name}</p></div>}
              </div>

              {selected.exception && (
                <div>
                  <p className="text-muted-foreground mb-1">Exception</p>
                  <pre className="bg-destructive/5 border border-destructive/20 p-3 rounded-lg text-destructive whitespace-pre-wrap">{selected.exception}</pre>
                </div>
              )}

              {(selected as any).request_payload && Object.keys((selected as any).request_payload).length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">Request Payload</p>
                  <pre className="bg-muted/30 p-3 rounded-lg overflow-x-auto">{JSON.stringify((selected as any).request_payload, null, 2)}</pre>
                </div>
              )}

              {(selected as any).response_body && (
                <div>
                  <p className="text-muted-foreground mb-1">Response Body</p>
                  <pre className="bg-muted/30 p-3 rounded-lg overflow-x-auto max-h-80">{JSON.stringify((selected as any).response_body, null, 2)}</pre>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
