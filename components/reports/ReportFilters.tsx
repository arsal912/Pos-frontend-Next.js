'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RefreshCw } from 'lucide-react';
import ReportDateRangePicker from './ReportDateRangePicker';
import type { ReportFilterSchema } from '@/types';

interface Props {
  schema: ReportFilterSchema[];
  filters: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  onReset: () => void;
  loading?: boolean;
}

export default function ReportFilters({ schema, filters, onChange, onReset, loading }: Props) {
  const upd = (key: string, value: any) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {schema.map(field => {
        switch (field.type) {
          case 'date_range':
            return (
              <div key={field.key} className="min-w-48">
                <ReportDateRangePicker
                  value={filters[field.key] ?? field.default ?? 'this_month'}
                  dateFrom={filters.date_from}
                  dateTo={filters.date_to}
                  onChange={(preset, from, to) => {
                    const updated = { ...filters, [field.key]: preset };
                    if (from) updated.date_from = from;
                    if (to) updated.date_to = to;
                    onChange(updated);
                  }}
                />
              </div>
            );

          case 'select':
            return (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <select value={filters[field.key] ?? field.default ?? ''} onChange={e => upd(field.key, e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm min-w-32">
                  {!field.required && <option value="">All</option>}
                  {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            );

          case 'number':
            return (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <Input type="number" value={filters[field.key] ?? field.default ?? ''} onChange={e => upd(field.key, e.target.value ? parseInt(e.target.value) : undefined)} className="h-9 w-24 text-sm"/>
              </div>
            );

          case 'text':
            return (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <Input value={filters[field.key] ?? ''} onChange={e => upd(field.key, e.target.value || undefined)} placeholder={field.label} className="h-9 w-40 text-sm"/>
              </div>
            );

          default:
            return null;
        }
      })}

      <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5 h-9 self-end">
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}/>Reset
      </Button>
    </div>
  );
}
