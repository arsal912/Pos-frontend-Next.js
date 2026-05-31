'use client';

import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1">Stock management — built in Step 3 &amp; 4</p>
      </div>
      <Card className="p-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Inventory management UI is implemented in Step 4.</p>
      </Card>
    </div>
  );
}
