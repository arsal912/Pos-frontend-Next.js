'use client';

import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportColumn } from '@/types';

interface Props {
  columns: ReportColumn[];
  rows: Record<string, any>[];
  totals?: Record<string, any>;
  maxHeight?: string;
}

function fmtCell(value: any, type: string): string {
  if (value == null) return '—';
  switch (type) {
    case 'money':   return Number(value).toFixed(2);
    case 'int':     return Number(value).toLocaleString();
    case 'percent': return Number(value).toFixed(1) + '%';
    case 'date':    return value ? new Date(value).toLocaleDateString() : '—';
    default:        return String(value);
  }
}

export default function ReportTable({ columns, rows, totals, maxHeight = '60vh' }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...rows].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (!rows.length) return <p className="text-center py-12 text-muted-foreground text-sm">No data for this period.</p>;

  return (
    <div className="overflow-auto rounded-xl border" style={{ maxHeight }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur">
          <tr>
            {columns.map(col => (
              <th key={col.key}
                className={cn('px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none',
                  col.align === 'right' ? 'text-right' : 'text-left')}
                onClick={() => handleSort(col.key)}>
                <span className="flex items-center gap-1 justify-start" style={col.align==='right'?{flexDirection:'row-reverse'}:{}}>
                  {col.label}
                  {sortKey === col.key
                    ? sortDir === 'asc' ? <ArrowUp className="h-3 w-3"/> : <ArrowDown className="h-3 w-3"/>
                    : <ArrowUpDown className="h-3 w-3 opacity-30"/>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/20 transition-colors">
              {columns.map(col => (
                <td key={col.key} className={cn('px-3 py-2', col.align === 'right' ? 'text-right font-mono' : '')}>
                  {fmtCell(row[col.key], col.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals && Object.keys(totals).length > 0 && (
          <tfoot className="sticky bottom-0 bg-muted/90 backdrop-blur border-t-2">
            <tr>
              {columns.map((col, i) => (
                <td key={col.key} className={cn('px-3 py-2.5 font-bold', col.align === 'right' ? 'text-right font-mono' : '')}>
                  {i === 0 ? 'Total' : (col.total && totals[col.key] != null ? fmtCell(totals[col.key], col.type) : '')}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
