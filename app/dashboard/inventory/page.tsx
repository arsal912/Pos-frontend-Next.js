'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Download, RefreshCw, AlertTriangle, Package,
  Loader2, ChevronLeft, ChevronRight, History,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { InventoryItem, Category } from '@/types';

type StatusFilter = '' | 'out' | 'low';

const STATUS_STYLES: Record<string, string> = {
  in_stock: 'bg-success/10 text-success',
  low:      'bg-warning/10 text-warning-foreground',
  out:      'bg-destructive/10 text-destructive',
};

export default function InventoryPage() {
  const [items, setItems] = useState<(InventoryItem & { stock_value?: number; available?: number; stock_status?: string })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);

  const [categoryId, setCategoryId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, catRes] = await Promise.all([
        apiClient.get('/store/inventory', {
          category_id: categoryId || undefined,
          branch_id: branchId || undefined,
          low_stock: lowStock || undefined,
          status: status || undefined,
          page, per_page: 25,
        }),
        apiClient.get('/store/categories'),
      ]);
      setItemsgetItems((invRes as any));
      setMeta((invRes as any).meta?.pagination ?? null);
      setCategories((catRes.data as any)?.categories ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [categoryId, branchId, lowStock, status, page]);

  useEffect(() => { load(); }, [load]);

  const totalValue = items.reduce((sum, i) => sum + (i.stock_value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Current stock levels across all branches</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/dashboard/inventory/adjust"><Filter className="h-4 w-4" />Adjust Stock</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/dashboard/inventory/movements"><History className="h-4 w-4" />Movements</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total SKUs', value: meta?.total ?? 0, color: 'text-primary' },
            { label: 'Out of Stock', value: items.filter(i => i.stock_status === 'out').length, color: 'text-destructive' },
            { label: 'Stock Value', value: `${totalValue.toLocaleString('en', { minimumFractionDigits: 2 })}`, color: 'text-success' },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn('font-display font-bold text-2xl mt-1', s.color)}>{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value as StatusFilter); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All stock status</option>
            <option value="out">Out of stock</option>
            <option value="low">Low stock</option>
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }} className="rounded" />
            Low stock only
          </label>
          <Button variant="outline" size="sm" onClick={() => { setCategoryId(''); setStatus(''); setLowStock(false); setPage(1); }} className="gap-1.5 ml-auto">
            <RefreshCw className="h-3.5 w-3.5" />Reset
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No inventory data. Add products and receive stock first.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Variant</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Quantity</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reserved</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Available</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Value</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.product?.name ?? `Product #${item.product_id}`}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.product?.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.variant?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{Number(item.quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{Number(item.reserved_quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">{Number(item.available ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{(item.stock_value ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_STYLES[item.stock_status ?? 'in_stock'])}>
                          {item.stock_status === 'out' ? 'Out of stock' : item.stock_status === 'low' ? 'Low stock' : 'In stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" asChild>
                            <Link href={`/dashboard/inventory/movements?product_id=${item.product_id}`}>History</Link>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" asChild>
                            <Link href="/dashboard/inventory/adjust">Adjust</Link>
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
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

