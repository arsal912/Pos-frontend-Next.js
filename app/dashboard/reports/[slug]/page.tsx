'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle, Calendar, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import ReportSummary from '@/components/reports/ReportSummary';
import ReportTable from '@/components/reports/ReportTable';
import ReportChart from '@/components/reports/ReportChart';
import ReportFilters from '@/components/reports/ReportFilters';
import ReportExportMenu from '@/components/reports/ReportExportMenu';
import type { ReportResult, ReportSchema } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';

function useLocalStorageValue<T>(key: string, initial: T): [T, (v: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  const set = (v: T) => { setState(v); localStorage.setItem(key, JSON.stringify(v)); };
  return [state, set];
}

export default function ReportViewerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [schema, setSchema] = useState<ReportSchema | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [recentSlugs, setRecentSlugs] = useLocalStorageValue<string[]>('report_recent', []);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ name: '', schedule: 'daily', emails: '', formats: 'pdf' });
  const [scheduling, setScheduling] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load schema
  useEffect(() => {
    setSchemaLoading(true);
    apiClient.get(`/store/reports/${slug}/schema`)
      .then(res => {
        const s = res.data as ReportSchema;
        setSchema(s);
        setFilters(s.default_filters ?? {});
      })
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setSchemaLoading(false));

    // Track recently viewed
    setRecentSlugs([slug, ...recentSlugs.filter(s => s !== slug)].slice(0, 10));
  }, [slug]);

  // Run report when filters change (debounced)
  const runReport = useCallback(async (f: Record<string, any>) => {
    if (!schema) return;
    setLoading(true);
    setError(null);
    try {
      const body = { ...f, compare: compare || undefined };
      const res = await apiClient.post(`/store/reports/${slug}/run`, body);
      setResult(res.data as any);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [slug, schema, compare]);

  useEffect(() => {
    if (!schema) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runReport(filters), 400);
    return () => clearTimeout(debounceRef.current);
  }, [filters, schema, runReport]);

  const handleFilterChange = (newFilters: Record<string, any>) => setFilters(newFilters);
  const handleReset = () => { setFilters(schema?.default_filters ?? {}); };

  const handleSchedule = async () => {
    if (!scheduleForm.name || !scheduleForm.emails) return;
    setScheduling(true);
    try {
      await apiClient.post('/store/reports/scheduled', {
        name: scheduleForm.name,
        report_slug: slug,
        filters,
        schedule: scheduleForm.schedule,
        recipient_emails: scheduleForm.emails.split(',').map((e: string) => e.trim()).filter(Boolean),
        formats: scheduleForm.formats.split(',').map((f: string) => f.trim()),
      });
      toast.success('Report scheduled successfully.');
      setShowSchedule(false);
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed to schedule.'); }
    finally { setScheduling(false); }
  };

  if (schemaLoading) return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>;
  if (error && !schema) return (
    <div className="text-center py-16">
      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3"/>
      <p className="text-muted-foreground">{error}</p>
    </div>
  );

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/reports"><ArrowLeft className="h-4 w-4"/></Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{schema?.name}</h1>
            {schema?.description && <p className="text-muted-foreground text-sm mt-0.5">{schema.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch id="compare" checked={compare} onCheckedChange={setCompare}/>
            <Label htmlFor="compare" className="text-sm cursor-pointer">Compare</Label>
          </div>
          {result && schema && (
            <ReportExportMenu slug={slug} filters={filters} reportName={schema.name}/>
          )}
          <Button variant="outline" size="sm" onClick={() => { setScheduleForm(f=>({...f,name:schema?.name??''})); setShowSchedule(true); }} className="gap-1.5">
            <Calendar className="h-3.5 w-3.5"/>Schedule
          </Button>
          <Button variant="ghost" size="sm" onClick={() => runReport(filters)} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}/>Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      {schema?.filter_schema && (
        <Card className="p-4">
          <ReportFilters
            schema={schema.filter_schema}
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
            loading={loading}
          />
        </Card>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0"/>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse"/>)}
          </div>
          <div className="h-64 rounded-xl bg-muted animate-pulse"/>
          <div className="h-48 rounded-xl bg-muted animate-pulse"/>
        </div>
      )}

      {/* Report content */}
      {result && (
        <div className="space-y-6">
          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {result.meta.date_from && (
              <Badge variant="outline" className="text-xs">
                {result.meta.date_from} → {result.meta.date_to}
              </Badge>
            )}
            <span>{result.meta.row_count} rows</span>
            <span>·</span>
            <span>Generated {new Date(result.meta.generated_at).toLocaleTimeString()}</span>
            {loading && <Loader2 className="h-3 w-3 animate-spin ml-1"/>}
          </div>

          {/* Summary cards */}
          {result.summary?.length > 0 && <ReportSummary cards={result.summary}/>}

          {/* Chart */}
          {result.chart_data && (
            <Card className="p-5">
              <h3 className="font-display font-bold mb-4">Chart</h3>
              <ReportChart data={result.chart_data}/>
            </Card>
          )}

          {/* Comparison section */}
          {result.comparison && (
            <Card className="p-5 border-accent/30 bg-accent/[0.02]">
              <h3 className="font-display font-bold mb-3 text-accent">Previous Period Comparison</h3>
              <ReportSummary cards={result.comparison.summary ?? []}/>
            </Card>
          )}

          {/* Data table */}
          {result.rows?.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-display font-bold">Data</h3>
                <span className="text-xs text-muted-foreground">{result.rows.length} rows</span>
              </div>
              <div className="p-4">
                <ReportTable
                  columns={result.columns ?? []}
                  rows={result.rows}
                  totals={result.totals}
                />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>

    {/* Schedule Modal — outside main div but inside fragment */}
    {/* Schedule Modal */}
    <AnimatePresence>
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowSchedule(false)}/>
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} className="relative z-10 w-full max-w-md">
            <div className="bg-card rounded-2xl shadow-2xl p-6 border">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary"/>Schedule Report</h2>
                <button onClick={()=>setShowSchedule(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4"/></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Schedule Name</label>
                  <Input value={scheduleForm.name} onChange={e=>setScheduleForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Monthly Sales Summary"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Frequency</label>
                  <select value={scheduleForm.schedule} onChange={e=>setScheduleForm(f=>({...f,schedule:e.target.value}))} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Recipients (comma-separated emails)</label>
                  <Input value={scheduleForm.emails} onChange={e=>setScheduleForm(f=>({...f,emails:e.target.value}))} placeholder="owner@store.com, manager@store.com"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Formats (comma-separated: pdf,excel,csv)</label>
                  <Input value={scheduleForm.formats} onChange={e=>setScheduleForm(f=>({...f,formats:e.target.value}))} placeholder="pdf"/>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                  📧 Email delivery requires Phase 5 email provider setup. Reports will be logged until then.
                </p>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={()=>setShowSchedule(false)} className="flex-1 py-2 rounded-xl border text-sm hover:bg-muted/30 transition-colors">Cancel</button>
                <button onClick={handleSchedule} disabled={scheduling} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {scheduling?'Saving…':'Save Schedule'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
