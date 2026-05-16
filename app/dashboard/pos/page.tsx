'use client';

import { ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function PosPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">POS Sales</h1>
      <Card className="p-12 text-center border-dashed">
        <ShoppingCart className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-display text-xl font-semibold mb-2">POS Sales Screen</p>
        <p className="text-muted-foreground max-w-md mx-auto">
          The full POS sales interface will be implemented in Phase 4. This is protected by the <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">pos-sales</code> module middleware on the backend.
        </p>
      </Card>
    </div>
  );
}
