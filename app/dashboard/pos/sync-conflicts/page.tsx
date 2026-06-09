'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Loader2,
  Package, CreditCard, RefreshCw, AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConflictSale {
  id: number;
  sale_number: string;
  offline_reference: string;
  total: string;
  sale_date: string;
  has_stock_conflict: boolean;
  has_credit_conflict: boolean;
  synced_at: string;
  customer: { id: number; name: string; phone: string | null } | null;
  items: { id: number; product_name: string; sku: string; quantity: number; unit_price: number; line_total: number }[];
}

const RESOLUTIONS = [
  { value: 'acknowledged',   label: 'Acknowledge',      desc: 'Mark as reviewed, no further action needed' },
  { value: 'stock_adjusted', label: 'Stock Adjusted',   desc: 'I have manually adjusted the stock levels' },
  { value: 'recovered',      label: 'Credit Recovered', desc: 'I have contacted the customer and resolved the credit issue' },
];

export default function SyncConflictsPage() {
  const [sales, setSales]       = useState<ConflictSale[]>([]);
  const [loading, setLoading]   = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/pos/sync-conflicts', { per_page: 50 });
      setSales(Array.isArray(res.data) ? (res.data as ConflictSale[]) : []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (sale: ConflictSale, resolution: string) => {
    setResolving(sale.id);
    try {
      await apiClient.post(`/store/pos/sync-conflicts/${sale.id}/resolve`, { resolution });
      toast.success('Conflict resolved.');
      setSales(prev => prev.filter(s => s.id !== sale.id));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setResolving(null); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/pos">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">Sync Conflicts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Offline sales that synced successfully but encountered stock or credit issues
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {/* Explanation */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-semibold">These sales have been recorded and are visible to customers.</p>
            <p>The conflicts below are informational — review each one and take appropriate action.</p>
            <ul className="list-disc ml-4 text-xs space-y-0.5 mt-1">
              <li><strong>Stock conflict:</strong> The item was oversold offline. Check your physical inventory and adjust if needed.</li>
              <li><strong>Credit conflict:</strong> The customer's credit limit was exceeded offline. Contact them to arrange payment.</li>
            </ul>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : sales.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
          <p className="font-semibold">No unresolved conflicts</p>
          <p className="text-sm text-muted-foreground mt-1">All offline sales synced cleanly.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sales.map((sale, i) => (
            <motion.div key={sale.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="overflow-hidden">
                {/* Header */}
                <button className="w-full flex items-start gap-4 p-4 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => setExpanded(e => e === sale.id ? null : sale.id)}>
                  <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                    {sale.has_stock_conflict && (
                      <span title="Stock conflict" className="p-1 rounded-md bg-orange-100">
                        <Package className="h-4 w-4 text-orange-600" />
                      </span>
                    )}
                    {sale.has_credit_conflict && (
                      <span title="Credit conflict" className="p-1 rounded-md bg-red-100">
                        <CreditCard className="h-4 w-4 text-red-600" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{sale.sale_number}</span>
                      <span className="text-xs text-muted-foreground font-mono">{sale.offline_reference}</span>
                      <Badge className="text-xs bg-green-100 text-green-700">synced</Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>Total: <strong className="text-foreground">{Number(sale.total).toFixed(2)}</strong></span>
                      {sale.customer && <span>Customer: {sale.customer.name}</span>}
                      <span>{new Date(sale.synced_at).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {sale.has_stock_conflict && (
                        <span className="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                          Stock oversold
                        </span>
                      )}
                      {sale.has_credit_conflict && (
                        <span className="text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                          Credit limit exceeded
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {expanded === sale.id && (
                  <div className="border-t bg-muted/10 p-4 space-y-4">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Items</p>
                      <div className="space-y-1">
                        {sale.items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.product_name} <span className="text-muted-foreground text-xs">× {item.quantity}</span></span>
                            <span className="font-mono">{Number(item.line_total).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Conflict detail */}
                    {sale.has_stock_conflict && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                        <p className="font-semibold flex items-center gap-1.5 mb-1">
                          <Package className="h-4 w-4" />Stock conflict
                        </p>
                        <p className="text-xs">
                          One or more items in this sale exceeded available stock at the time of server sync.
                          The sale has been recorded. Check your physical inventory and create a stock adjustment
                          if needed from <Link href="/dashboard/inventory" className="underline">Inventory</Link>.
                        </p>
                      </div>
                    )}

                    {sale.has_credit_conflict && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                        <p className="font-semibold flex items-center gap-1.5 mb-1">
                          <CreditCard className="h-4 w-4" />Credit conflict
                        </p>
                        <p className="text-xs">
                          This sale pushed {sale.customer?.name ?? 'the customer'}'s outstanding balance beyond their credit limit.
                          The sale has been recorded. Contact the customer
                          {sale.customer?.phone ? ` (${sale.customer.phone})` : ''} to arrange payment.
                        </p>
                      </div>
                    )}

                    {/* Resolution actions */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resolve</p>
                      <div className="flex flex-wrap gap-2">
                        {RESOLUTIONS.map(r => (
                          <button key={r.value} title={r.desc}
                            onClick={() => handleResolve(sale, r.value)}
                            disabled={resolving === sale.id}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-muted',
                              resolving === sale.id && 'opacity-50 cursor-not-allowed'
                            )}>
                            {resolving === sale.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <CheckCircle2 className="h-3 w-3 text-success" />}
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Resolving removes it from this list. The sale record is preserved.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
