'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const PRESETS = [
  { value: 'today',         label: 'Today' },
  { value: 'yesterday',     label: 'Yesterday' },
  { value: 'this_week',     label: 'This Week' },
  { value: 'last_week',     label: 'Last Week' },
  { value: 'this_month',    label: 'This Month' },
  { value: 'last_month',    label: 'Last Month' },
  { value: 'this_quarter',  label: 'This Quarter' },
  { value: 'last_quarter',  label: 'Last Quarter' },
  { value: 'this_year',     label: 'This Year' },
  { value: 'last_year',     label: 'Last Year' },
  { value: 'custom',        label: 'Custom Range' },
];

interface Props {
  value: string;
  dateFrom?: string;
  dateTo?: string;
  onChange: (preset: string, dateFrom?: string, dateTo?: string) => void;
}

export default function ReportDateRangePicker({ value, dateFrom, dateTo, onChange }: Props) {
  const label = PRESETS.find(p => p.value === value)?.label ?? 'Select Range';

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Date Range</Label>
      <select
        value={value}
        onChange={e => onChange(e.target.value, dateFrom, dateTo)}
        className="w-full h-9 rounded-md border bg-background px-3 text-sm"
      >
        {PRESETS.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      {value === 'custom' && (
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={dateFrom ?? ''} onChange={e => onChange('custom', e.target.value, dateTo)} className="h-8 text-sm"/>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={dateTo ?? ''} onChange={e => onChange('custom', dateFrom, e.target.value)} className="h-8 text-sm"/>
          </div>
        </div>
      )}
    </div>
  );
}
