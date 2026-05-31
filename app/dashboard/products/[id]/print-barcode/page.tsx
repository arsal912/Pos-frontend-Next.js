'use client';

import { use, useEffect, useState } from 'react';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Product } from '@/types';

export default function PrintBarcodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(10);

  useEffect(() => {
    apiClient.get(`/store/products/${id}`)
      .then(res => setProduct((res.data as any)?.product ?? null))
      .catch(() => toast.error('Failed to load product.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!product) return <p className="text-center py-16 text-muted-foreground">Product not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild><Link href={`/dashboard/products/${id}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="font-display text-2xl font-bold">Print Barcode — {product.name}</h1>
      </div>

      {/* Controls */}
      <Card className="p-4 print:hidden">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="space-y-1.5">
            <Label>Labels to print</Label>
            <Input type="number" min={1} max={200} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="w-24" />
          </div>
          <div className="self-end">
            <Button onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" />Print</Button>
          </div>
        </div>
      </Card>

      {/* Barcode grid — rendered as simple text labels since milon/barcode generates server-side */}
      <div className="grid grid-cols-4 gap-3 print:grid-cols-5 print:gap-1">
        {Array.from({ length: qty }).map((_, i) => (
          <div key={i} className="border rounded p-3 text-center flex flex-col items-center gap-1 print:border-gray-300 print:rounded-none">
            <p className="text-[10px] font-medium truncate w-full">{product.name}</p>
            {product.barcode ? (
              <>
                <p className="font-mono text-xs tracking-widest border border-dashed rounded px-1">{product.barcode}</p>
                <p className="text-[9px] text-muted-foreground">{product.sku}</p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">No barcode</p>
            )}
            <p className="text-xs font-bold">{Number(product.selling_price).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body > *:not(.print-area) { display: none; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
