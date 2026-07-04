'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Package, Loader2, Printer, Barcode as BarcodeIcon, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { BarcodeLabel, type BarcodeLabelData } from '@/components/catalog/BarcodeLabel';
import { fetchBarcodeLabels } from '@/hooks/useBarcodeLabels';
import type { Product } from '@/types';

export default function BarcodeGeneratorPage() {
  const currency = useAuthStore((s) => s.user?.store?.currency) ?? 'USD';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // product_id -> quantity, kept across search changes so a selection isn't lost while filtering
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [defaultQty, setDefaultQty] = useState(1);

  const [labels, setLabels] = useState<BarcodeLabelData[] | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/products', { search: search || undefined, is_active: 'true', per_page: 50 });
      setProducts(getItems(res as any));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const toggle = (product: Product) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (product.id in next) delete next[product.id];
      else next[product.id] = defaultQty;
      return next;
    });
  };

  const setQty = (id: number, qty: number) => {
    setSelected((prev) => ({ ...prev, [id]: Math.max(1, qty || 1) }));
  };

  // "Default qty" only seeds newly-checked rows — it doesn't retroactively
  // change ones already selected, which reads as "my quantity didn't apply"
  // if you set it after selecting. This applies it to everything currently checked.
  const applyQtyToAllSelected = () => {
    setSelected((prev) => {
      const next: Record<number, number> = {};
      for (const id of Object.keys(prev)) next[Number(id)] = defaultQty;
      return next;
    });
  };

  const selectedIds = Object.keys(selected).map(Number);
  const totalLabels = Object.values(selected).reduce((s, q) => s + q, 0);
  // Only counts products currently in view — good enough as a heads-up, not a hard guarantee.
  const newBarcodeCount = products.filter((p) => p.id in selected && !p.barcode).length;

  const generate = async () => {
    if (selectedIds.length === 0) return toast.error('Select at least one product.');
    setGenerating(true);
    try {
      const fetched = await fetchBarcodeLabels(selectedIds);
      // Repeat each label by its chosen quantity for a print-ready sheet.
      const expanded: BarcodeLabelData[] = [];
      for (const label of fetched) {
        const qty = selected[label.product_id] ?? 1;
        for (let i = 0; i < qty; i++) expanded.push(label);
      }
      setLabels(expanded);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setGenerating(false); }
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild><Link href="/dashboard/products"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2"><BarcodeIcon className="h-6 w-6 text-primary" />Barcode Generator</h1>
            <p className="text-muted-foreground mt-1">Select multiple products and print scannable labels. Products without a barcode yet get one created automatically.</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 print:hidden">
        {/* Product picker */}
        <Card className="lg:col-span-5 p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center gap-2 sticky top-0 bg-card pb-2 -mt-1 pt-1 z-10">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, barcode…" className="pl-9 h-9" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-10"><Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No products found.</p></div>
          ) : (
            <div className="space-y-1.5">
              {products.map((p) => {
                const isSelected = p.id in selected;
                return (
                  <div key={p.id}
                    className={cn('flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors',
                      isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/30')}
                    onClick={() => toggle(p)}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(p)}
                      onClick={(e) => e.stopPropagation()} className="h-4 w-4 accent-primary cursor-pointer flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.sku}{p.barcode ? ` · ${p.barcode}` : ''}</p>
                    </div>
                    {!p.barcode && (
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">will create</Badge>
                    )}
                    {isSelected && (
                      <input type="number" min={1} value={selected[p.id]}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setQty(p.id, parseInt(e.target.value))}
                        className="w-16 h-8 rounded-md border bg-background px-2 text-sm text-right flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Summary + actions */}
        <Card className="lg:col-span-7 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">Selection</h2>
            {selectedIds.length > 0 && (
              <button onClick={() => setSelected({})} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                <X className="h-3 w-3" />Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div><span className="font-bold">{selectedIds.length}</span> <span className="text-muted-foreground">products</span></div>
            <div><span className="font-bold">{totalLabels}</span> <span className="text-muted-foreground">labels total</span></div>
            {newBarcodeCount > 0 && (
              <div className="text-warning-foreground">
                <span className="font-bold">{newBarcodeCount}</span> <span className="text-muted-foreground">will get a new barcode created</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-muted-foreground">Qty for new selections</label>
            <input type="number" min={1} value={defaultQty} onChange={(e) => setDefaultQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 h-9 rounded-md border bg-background px-2 text-sm" />
            {selectedIds.length > 0 && (
              <button type="button" onClick={applyQtyToAllSelected}
                className="text-xs text-primary hover:underline">
                Apply to all {selectedIds.length} selected
              </button>
            )}
          </div>

          <Button onClick={generate} disabled={generating || selectedIds.length === 0} className="w-full gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarcodeIcon className="h-4 w-4" />}
            Generate {totalLabels > 0 ? `${totalLabels} Labels` : 'Labels'}
          </Button>

          {labels && (
            <Button variant="outline" onClick={handlePrint} className="w-full gap-2">
              <Printer className="h-4 w-4" />Print
            </Button>
          )}

          {!labels && (
            <p className="text-sm text-muted-foreground text-center py-6">Select products on the left, then generate to preview labels here.</p>
          )}
        </Card>
      </div>

      {/* Printable label sheet */}
      {labels && labels.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-4 gap-3 print:grid-cols-3 print:gap-2">
          {labels.map((label, i) => (
            <BarcodeLabel key={`${label.product_id}-${i}`} label={label} currency={currency} />
          ))}
        </motion.div>
      )}

      <style>{`
        @media print {
          @page { margin: 10mm; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
