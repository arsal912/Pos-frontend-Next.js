'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { StockMovement } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  sale: 'destructive', sale_return: 'success', purchase: 'success', purchase_return: 'destructive',
  adjustment: 'warning', transfer_out: 'destructive', transfer_in: 'success', initial: 'outline',
};

function fmt(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MovementsPage() {
  const searchParams = useSearchParams();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);

  const [productId, setProductId] = useState(searchParams.get('product_id') ?? '');
  const [type, setType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/inventory/movements', {
        product_id: productId || undefined, type: type || undefined,
        date_from: dateFrom || undefined, date_to: dateTo || undefined,
        page, per_page: 30,
      });
      setMovements(getItems(res));
      setMeta((res as any).meta?.pagination ?? null);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [productId, type, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/inventory"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Stock Movements</h1>
          <p className="text-muted-foreground mt-0.5">Full audit log of every stock change</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Product ID" value={productId} onChange={e => { setProductId(e.target.value); setPage(1); }} className="h-9 w-32" />
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All types</option>
            {['sale','sale_return','purchase','purchase_return','adjustment','transfer_out','transfer_in','initial'].map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-9 w-36" />
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-9 w-36" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : movements.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground">No movements found.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty Change</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance After</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
              </tr></thead>
              <tbody>{movements.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(m.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.product?.name ?? `#${m.product_id}`}</p>
                    {m.variant && <p className="text-xs text-muted-foreground">{m.variant.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={(TYPE_COLORS[m.type] ?? 'outline') as any} className="capitalize text-xs">
                      {m.type.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('font-mono font-bold', Number(m.quantity) >= 0 ? 'text-success' : 'text-destructive')}>
                      {Number(m.quantity) >= 0 ? '+' : ''}{Number(m.quantity).toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(m.balance_after).toFixed(3)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-48 truncate">{m.notes ?? '—'}</td>
                </tr>
              ))}</tbody>
            </table>
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">Total: {meta.total}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1"><ChevronLeft className="h-4 w-4" />Prev</Button>
                  <span className="text-sm flex items-center px-2">{page} / {meta.last_page}</span>
                  <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)} className="gap-1">Next<ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

