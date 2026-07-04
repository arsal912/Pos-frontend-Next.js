'use client';

import { formatCurrency } from '@/lib/utils';

export interface BarcodeLabelData {
  product_id: number;
  name: string;
  sku: string;
  price: number | string;
  code: string | null;
  type: string | null;
  svg: string | null;
}

/**
 * One printable label: product name, a real scannable barcode image (SVG
 * rendered server-side by milon/barcode), the code beneath it, and price.
 * Falls back to a plain text code if the product has neither a usable
 * barcode nor a SKU to encode.
 */
export function BarcodeLabel({ label, currency = 'USD' }: { label: BarcodeLabelData; currency?: string }) {
  return (
    <div className="border rounded p-3 text-center flex flex-col items-center gap-1 print:border-gray-300 print:rounded-none overflow-hidden">
      <p className="text-[10px] font-medium truncate w-full">{label.name}</p>
      {label.svg ? (
        <div className="w-full [&_svg]:mx-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: label.svg }} />
      ) : (
        <p className="font-mono text-xs tracking-widest border border-dashed rounded px-1">{label.code ?? 'No code'}</p>
      )}
      <p className="text-[9px] text-muted-foreground">{label.sku}</p>
      <p className="text-xs font-bold">{formatCurrency(label.price, currency)}</p>
    </div>
  );
}
