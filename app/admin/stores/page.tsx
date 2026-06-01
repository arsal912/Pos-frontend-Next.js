'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Eye, Ban, Play, KeyRound, Loader2, Store as StoreIcon, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

interface StoreItem {
  id: number;
  name: string;
  slug: string;
  email: string;
  status: string;
  is_active: boolean;
  users_count: number;
  branches_count: number;
  trial_ends_at: string | null;
  created_at: string;
  active_subscription?: { plan?: { name: string } };
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<StoreItem[]>('/admin/stores', {
        search: search || undefined,
        status: statusFilter || undefined,
        per_page: 50,
      });
      setStores(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await apiClient.put(`/admin/stores/${id}/status`, { status: newStatus });
      toast.success(`Store ${newStatus}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleImpersonate = async (id: number, name: string) => {
    if (!confirm(`Login as owner of "${name}"? You'll be signed in as them.`)) return;
    try {
      const res = await apiClient.post<{ token: string }>(`/admin/stores/${id}/impersonate`);
      localStorage.setItem('auth_token', res.data.token);
      toast.success('Impersonating store owner...');
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'destructive',
      expired: 'secondary',
    };
    return <Badge variant={map[status] ?? 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Stores</h1>
          <p className="text-muted-foreground mt-1">Manage all stores on the platform</p>
        </div>
      </div>

      <Card className="p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </select>
      </Card>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : stores.length === 0 ? (
        <Card className="p-12 text-center">
          <StoreIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No stores found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {stores.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className="p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-display font-bold text-primary">{store.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{store.name}</p>
                        {statusBadge(store.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{store.email} · {store.slug}</p>
                    </div>
                  </div>

                  <div className="hidden lg:flex items-center gap-6 text-xs text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground">{store.users_count}</p>
                      <p>Users</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{store.branches_count}</p>
                      <p>Branches</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{store.active_subscription?.plan?.name ?? '—'}</p>
                      <p>Plan</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{formatRelativeTime(store.created_at)}</p>
                      <p>Joined</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" asChild title="View details">
                      <Link href={`/admin/stores/${store.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Analytics">
                      <Link href={`/admin/stores/${store.id}/analytics`}><BarChart3 className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleImpersonate(store.id, store.name)} title="Login as owner">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    {store.status === 'suspended' ? (
                      <Button variant="ghost" size="icon" onClick={() => handleStatusChange(store.id, 'active')} title="Activate" className="text-success">
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleStatusChange(store.id, 'suspended')} title="Suspend" className="text-destructive">
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
