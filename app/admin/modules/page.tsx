'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Search, Puzzle, Lock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StoreItem {
  id: number;
  name: string;
  slug: string;
  status: string;
}

function getIcon(name: string) {
  if (!name) return Icons.Box;
  const iconName = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  return (Icons as any)[iconName] || Icons.Box;
}

export default function AdminModulesPage() {
  const searchParams = useSearchParams();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [storeModules, setStoreModules] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient.get<StoreItem[]>('/admin/stores', { per_page: 100 }).then(res => {
      setStores(res.data);
      const fromQuery = searchParams.get('store');
      const initial = fromQuery ? Number(fromQuery) : res.data[0]?.id;
      if (initial) setSelectedStoreId(initial);
      setLoading(false);
    });
  }, [searchParams]);

  useEffect(() => {
    if (!selectedStoreId) return;
    apiClient.get(`/admin/modules/store/${selectedStoreId}`).then(res => setStoreModules(res.data));
  }, [selectedStoreId]);

  const handleToggle = async (moduleId: number, enabled: boolean) => {
    if (!selectedStoreId) return;
    setUpdating(moduleId);
    try {
      await apiClient.put(`/admin/modules/store/${selectedStoreId}/module/${moduleId}`, {
        is_enabled: enabled,
      });
      const res = await apiClient.get(`/admin/modules/store/${selectedStoreId}`);
      setStoreModules(res.data);
      toast.success(enabled ? 'Module enabled' : 'Module disabled');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;

  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Modules</h1>
        <p className="text-muted-foreground mt-1">Enable or disable features for individual stores</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Stores sidebar */}
        <Card className="p-4 lg:col-span-3 h-fit lg:sticky lg:top-6">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search store..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {filteredStores.map(store => (
              <button
                key={store.id}
                onClick={() => setSelectedStoreId(store.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2',
                  selectedStoreId === store.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <div className="h-7 w-7 rounded-md bg-background/50 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {store.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{store.name}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Module matrix */}
        <div className="lg:col-span-9 space-y-4">
          {!storeModules ? (
            <Card className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></Card>
          ) : (
            <>
              <Card className="p-5 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold">{storeModules.store.name}</h2>
                    <p className="text-xs text-muted-foreground">Plan: {storeModules.store.plan ?? 'No plan'}</p>
                  </div>
                  <Badge variant="default">{Object.values(storeModules.modules).flat().length} modules</Badge>
                </div>
              </Card>

              {Object.entries(storeModules.modules).map(([category, modules]: [string, any]) => (
                <Card key={category} className="p-5">
                  <h3 className="font-display text-base font-bold mb-4 uppercase tracking-wider text-xs text-muted-foreground">
                    {category}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {modules.map((m: any, i: number) => {
                      const Icon = getIcon(m.icon);
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border transition-all',
                            m.is_enabled ? 'bg-success/5 border-success/20' : 'bg-muted/30 border-border',
                            m.has_store_override && 'ring-1 ring-primary/30'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                              m.is_enabled ? 'bg-success/10 text-success' : 'bg-muted-foreground/10 text-muted-foreground'
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm flex items-center gap-1.5">
                                {m.name}
                                {m.is_core && <Lock className="h-3 w-3 text-muted-foreground" />}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{m.in_plan ? 'In plan' : 'Custom'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {updating === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                              <Switch
                                checked={m.is_enabled}
                                onCheckedChange={(e) => handleToggle(m.id, e)}
                                disabled={m.is_core}
                              />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
