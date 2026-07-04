'use client';

import { Suspense, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function SearchParamsBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
