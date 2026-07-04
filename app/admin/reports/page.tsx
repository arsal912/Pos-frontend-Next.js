'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, AlertTriangle, TrendingDown, RefreshCw,
  Loader2, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReportSummary from '@/components/reports/ReportSummary';
import ReportTable from '@/components/reports/ReportTable';
import ReportChart from '@/components/reports/ReportChart';
import ReportDateRangePicker from '@/components/reports/ReportDateRangePicker';
import type { ReportResult } from '@/types';

const ADMIN_REPORTS = [
  { slug: 'admin-platform-revenue', label: 'Platform Revenue',  icon: TrendingUp,    desc: 'Revenue across all stores by plan' },
  { slug: 'admin-stores-health',    label: 'Stores Health',     icon: BarChart3,     desc: 'Per-store health, MRR, activity' },
  { slug: 'admin-stores-at-risk',   label: 'Stores at Risk',    icon: AlertTriangle, desc: 'Declining, inactive, failing stores' },
  { slug: 'admin-churn',            label: 'Churn Report',      icon: TrendingDown,  desc: 'Cancelled subs, MRR lost' },
  { slug: 'admin-plan-migrations',  label: 'Plan Migrations',   icon: RefreshCw,     desc: 'Upgrades and downgrades' },
];

export default function AdminReportsPage() {
  const [activeSlug, setActiveSlug] = useState('admin-platform-revenue');
  const [dateRange, setDateRange] = useState('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const run = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const filters: any = { date_range: dateRange };
      if (dateRange === 'custom') { filters.date_from = dateFrom; filters.date_to = dateTo; }
      const res = await apiClient.post(`/admin/reports/${activeSlug}/run`, filters);
      setResult(res.data as any);
      setPage(1);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [activeSlug, dateRange, dateFrom, dateTo]);

  useEffect(() => { run(); }, [run]);

  const doExport = async (format: 'pdf' | 'excel' | 'csv') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    try {
      const filters: any = { date_range: dateRange, format };
      if (dateRange === 'custom') { filters.date_from = dateFrom; filters.date_to = dateTo; }
      const res = await fetch(`/api/backend/admin/reports/${activeSlug}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(filters),
      });
      const blob = await res.blob();
      const ext  = {pdf:'pdf',excel:'xlsx',csv:'csv'}[format];
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `admin-${activeSlug}-${new Date().toISOString().slice(0,10)}.${ext}`;
      a.click();
    } catch { toast.error('Export failed.'); }
  };

  const currentReport = ADMIN_REPORTS.find(r => r.slug === activeSlug);
  const rows = result?.rows ?? [];
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const lastPage = Math.ceil(rows.length / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Platform Reports</h1>
        <p className="text-muted-foreground mt-1">Super-admin analytics across all tenant stores</p>
      </div>

      {/* Report selector */}
      <div className="flex flex-wrap gap-2">
        {ADMIN_REPORTS.map(r => {
          const Icon = r.icon;
          return (
            <button key={r.slug} onClick={() => setActiveSlug(r.slug)}
              className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                activeSlug === r.slug ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:border-primary/30')}>
              <Icon className="h-4 w-4 flex-shrink-0"/>
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters + export */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-48">
            <ReportDateRangePicker
              value={dateRange}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(preset, from, to) => { setDateRange(preset); if (from) setDateFrom(from); if (to) setDateTo(to); }}
            />
          </div>
          <div className="flex gap-1.5 self-end">
            {(['pdf','excel','csv'] as const).map(fmt => (
              <Button key={fmt} variant="outline" size="sm" onClick={() => doExport(fmt)} className="uppercase text-xs">
                <Download className="h-3.5 w-3.5 mr-1"/>{fmt}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Report output */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>
      ) : result ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-2xl">{currentReport?.label}</h2>
              <p className="text-muted-foreground text-sm">{currentReport?.desc}</p>
            </div>
            {result.meta && (
              <div className="text-xs text-muted-foreground text-right">
                <p>{result.meta.row_count} rows</p>
                <p>{new Date(result.meta.generated_at).toLocaleTimeString()}</p>
              </div>
            )}
          </div>

          {/* Summary */}
          {result.summary?.length > 0 && <ReportSummary cards={result.summary}/>}

          {/* Chart */}
          {result.chart_data && (
            <Card className="p-5">
              <ReportChart data={result.chart_data}/>
            </Card>
          )}

          {/* Table */}
          {rows.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <p className="font-display font-bold">Data ({rows.length} rows)</p>
                {lastPage > 1 && (
                  <div className="flex gap-2 items-center">
                    <Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="gap-1"><ChevronLeft className="h-4 w-4"/>Prev</Button>
                    <span className="text-sm">{page}/{lastPage}</span>
                    <Button variant="outline" size="sm" disabled={page>=lastPage} onClick={()=>setPage(p=>p+1)} className="gap-1">Next<ChevronRight className="h-4 w-4"/></Button>
                  </div>
                )}
              </div>
              <div className="p-4">
                <ReportTable
                  columns={result.columns ?? []}
                  rows={pagedRows}
                  totals={page === 1 ? result.totals : undefined}
                />
              </div>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
