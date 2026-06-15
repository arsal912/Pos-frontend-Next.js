'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingDown, RefreshCw, Loader2, Building2,
  DollarSign, Calendar, BarChart2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StoreStat {
  store_id: number; store_name: string;
  total: number; this_month: number; count: number;
  top_category: string | null;
}

interface Platform {
  total: number; this_month: number; this_year: number;
  by_category: Record<string, number>;
  by_method: Record<string, number>;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
  cheque: 'Cheque', other: 'Other',
};

const METHOD_COLORS: Record<string, string> = {
  cash: '#10b981', card: '#6366f1', bank_transfer: '#8b5cf6',
  cheque: '#f59e0b', other: '#94a3b8',
};

export default function AdminExpensesPage() {
  const [data,     setData]     = useState<{ platform: Platform; stores: StoreStat[] } | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/expenses/overview');
      setData(res.data as any);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) =>
    n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return (
    <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  const { platform, stores } = data ?? { platform: { total:0,this_month:0,this_year:0,by_category:{},by_method:{} }, stores:[] };

  const topCategories   = Object.entries(platform.by_category).sort((a,b) => b[1]-a[1]).slice(0,8);
  const topMethods      = Object.entries(platform.by_method).sort((a,b) => b[1]-a[1]);
  const maxCatValue     = topCategories[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Platform-wide operating costs across all stores</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total (All Time)',  value: platform.total,      icon: DollarSign, color: 'text-green-600'  },
          { label: 'This Month',        value: platform.this_month, icon: Calendar,   color: 'text-blue-600'   },
          { label: 'This Year',         value: platform.this_year,  icon: BarChart2,  color: 'text-violet-600' },
        ].map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn('h-4 w-4', s.color)} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="font-display font-bold text-2xl font-mono">{fmt(s.value)}</p>
          </Card>
        ))}
      </div>

      {/* Category breakdown + Method breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* By Category */}
        <Card className="p-5">
          <h3 className="font-display font-bold mb-4">By Category</h3>
          {topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-2.5">
              {topCategories.map(([cat, total]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{cat}</span>
                    <span className="font-mono text-muted-foreground">{fmt(total)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full"
                      style={{ width: `${(total/maxCatValue)*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* By Payment Method */}
        <Card className="p-5">
          <h3 className="font-display font-bold mb-4">By Payment Method</h3>
          {topMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-3">
              {topMethods.map(([method, total]) => {
                const pct = platform.total > 0 ? Math.round((total/platform.total)*100) : 0;
                return (
                  <div key={method} className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: METHOD_COLORS[method] ?? '#94a3b8' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-0.5">
                        <span>{METHOD_LABELS[method] ?? method}</span>
                        <span className="font-mono text-muted-foreground">{fmt(total)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${pct}%`,
                          backgroundColor: METHOD_COLORS[method] ?? '#94a3b8',
                        }} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Per-store breakdown */}
      <div>
        <h2 className="font-display font-bold mb-3">Store Breakdown</h2>
        {stores.length === 0 ? (
          <Card className="p-8 text-center">
            <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
            <p className="text-muted-foreground">No expense data across any store.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {stores.map((s, i) => (
              <motion.div key={s.store_id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.03 }}>
                <Card className="overflow-hidden">
                  <button onClick={() => setExpanded(e => e===s.store_id ? null : s.store_id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/20 transition-colors">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{s.store_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.count} expenses
                        {s.top_category && <> · Top: <span className="font-medium">{s.top_category}</span></>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono font-bold text-sm">{fmt(s.total)}</p>
                      <p className="text-xs text-muted-foreground">This month: {fmt(s.this_month)}</p>
                    </div>
                    {expanded===s.store_id
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {expanded===s.store_id && (
                      <motion.div initial={{ height:0 }} animate={{ height:'auto' }} exit={{ height:0 }}
                        className="overflow-hidden border-t bg-muted/5">
                        <div className="p-4 grid sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">All Time</p>
                            <p className="font-bold font-mono">{fmt(s.total)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">This Month</p>
                            <p className="font-bold font-mono">{fmt(s.this_month)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Top Category</p>
                            <p className="font-bold">{s.top_category ?? '—'}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
