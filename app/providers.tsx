'use client';

import { useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import NextTopLoader from 'nextjs-toploader';
import { GlobalActionOverlay } from '@/components/ui/GlobalActionOverlay';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NextTopLoader color="#6366f1" height={3} showSpinner={false} shadow="0 0 10px #6366f1,0 0 5px #6366f1" />
      {children}
      <GlobalActionOverlay />
      <Toaster richColors closeButton position="top-right" />
    </QueryClientProvider>
  );
}
