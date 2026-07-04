'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Package, DollarSign, Users, Percent,
  ArrowRight, Search, Loader2, Star,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ReportInfo } from '@/types';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  sales:     BarChart3,
  inventory: Package,
  financial: DollarSign,
  customer:  Users,
  tax:       Percent,
};

const CATEGORY_COLORS: Record<string, string> = {
  sales:     'from-primary/20 to-primary/5 border-primary/20',
  inventory: 'from-success/20 to-success/5 border-success/20',
  financial: 'from-warning/20 to-warning/5 border-warning/20',
  customer:  'from-accent/20 to-accent/5 border-accent/20',
  tax:       'from-destructive/20 to-destructive/5 border-destructive/20',
};

interface ReportGroup { category: string; reports: ReportInfo[]; }

function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  const set = (v: T) => { setState(v); localStorage.setItem(key, JSON.stringify(v)); };
  return [state, set];
}

export default function ReportsPage() {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useLocalStorage<string[]>('report_favorites', []);
  const [recentSlugs] = useLocalStorage<string[]>('report_recent', []);

  useEffect(() => {
    apiClient.get('/store/reports').then(res => {
      setGroups((res.data as any)?.reports ?? []);
    }).catch(err => toast.error(getErrorMessage(err))).finally(() => setLoading(false));
  }, []);

  const toggleFav = (slug: string) => {
    setFavorites(favorites.includes(slug) ? favorites.filter(f => f !== slug) : [...favorites, slug]);
  };

  const allReports = groups.flatMap(g => g.reports.filter(r => r.name !== 'Pipeline Test'));

  const filtered = search
    ? allReports.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()))
    : null;

  const favReports = allReports.filter(r => favorites.includes(r.slug));
  const recentReports = allReports.filter(r => recentSlugs.includes(r.slug)).slice(0, 4);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Reports & Insights</h1>
        <p className="text-muted-foreground mt-1">Data-driven insights for your store</p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" className="pl-9 h-10"/>
      </div>

      {/* Search results */}
      {filtered && (
        <div>
          <h2 className="font-display font-bold mb-3">Search Results</h2>
          {filtered.length === 0 ? <p className="text-muted-foreground">No reports found for "{search}"</p>
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(r => <ReportCard key={r.slug} report={r} isFav={favorites.includes(r.slug)} onToggleFav={toggleFav}/>)}
            </div>
          }
        </div>
      )}

      {!filtered && (
        <>
          {/* Favorites */}
          {favReports.length > 0 && (
            <div>
              <h2 className="font-display font-bold mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-warning-foreground"/>Favorites</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {favReports.map(r => <ReportCard key={r.slug} report={r} isFav={true} onToggleFav={toggleFav}/>)}
              </div>
            </div>
          )}

          {/* Recent */}
          {recentReports.length > 0 && (
            <div>
              <h2 className="font-display font-bold mb-3">Recently Viewed</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {recentReports.map(r => <ReportCard key={r.slug} report={r} compact isFav={favorites.includes(r.slug)} onToggleFav={toggleFav}/>)}
              </div>
            </div>
          )}

          {/* By category */}
          {groups.filter(g => g.reports.filter(r => r.name !== 'Pipeline Test').length > 0).map((group, gi) => {
            const Icon = CATEGORY_ICONS[group.category] ?? BarChart3;
            const visibleReports = group.reports.filter(r => r.name !== 'Pipeline Test');
            if (!visibleReports.length) return null;
            return (
              <motion.div key={group.category} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center', CATEGORY_COLORS[group.category] ?? '')}>
                    <Icon className="h-3.5 w-3.5"/>
                  </div>
                  <h2 className="font-display font-bold capitalize">{group.category} Reports</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleReports.map(r => <ReportCard key={r.slug} report={r} isFav={favorites.includes(r.slug)} onToggleFav={toggleFav}/>)}
                </div>
              </motion.div>
            );
          })}
        </>
      )}
    </div>
  );
}

function ReportCard({ report, compact = false, isFav, onToggleFav }: {
  report: ReportInfo; compact?: boolean; isFav: boolean; onToggleFav: (s: string) => void;
}) {
  return (
    <Link href={`/dashboard/reports/${report.slug}`} className="block group">
      <Card className="p-4 hover:shadow-md hover:border-primary/30 transition-all h-full relative">
        <button onClick={e => { e.preventDefault(); onToggleFav(report.slug); }}
          className="absolute top-3 right-3 text-muted-foreground hover:text-warning-foreground transition-colors">
          <Star className={cn('h-3.5 w-3.5', isFav ? 'fill-warning-foreground text-warning-foreground' : '')}/>
        </button>
        <p className="font-semibold text-sm pr-5">{report.name}</p>
        {!compact && report.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{report.category}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors"/>
        </div>
      </Card>
    </Link>
  );
}
