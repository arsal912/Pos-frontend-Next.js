'use client';

import { useEffect, useState } from 'react';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { BarcodeLabel, type BarcodeLabelData } from '@/components/catalog/BarcodeLabel';
import { fetchBarcodeLabels } from '@/hooks/useBarcodeLabels';

export default function PrintBarcodePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const currency = useAuthStore((s) => s.user?.store?.currency) ?? 'USD';

  const [label, setLabel] = useState<BarcodeLabelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(10);

  useEffect(() => {
    fetchBarcodeLabels([parseInt(id)])
      .then((labels) => setLabel(labels[0] ?? null))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!label) return <p className="text-center py-16 text-muted-foreground">Product not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild><Link href={`/dashboard/products/${id}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="font-display text-2xl font-bold">Print Barcode — {label.name}</h1>
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

      {/* Real, scannable barcode grid — rendered server-side by milon/barcode */}
      <div className="grid grid-cols-4 gap-3 print:grid-cols-3 print:gap-2">
        {Array.from({ length: qty }).map((_, i) => (
          <BarcodeLabel key={i} label={label} currency={currency} />
        ))}
      </div>

      <style>{`
        @media print {
          @page { margin: 10mm; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
