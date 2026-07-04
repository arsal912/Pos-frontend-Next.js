'use client';

/**
 * OfflineGuard — blocks non-POS routes when the device is offline,
 * and shows a non-blocking stale-data banner when the POS cache is >1 hour old.
 *
 * Only /dashboard/pos works offline. Every other route shows a redirect screen.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WifiOff, ShoppingCart, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { getDb } from '@/lib/offline/db';
import { useAuthStore } from '@/store/auth';
import { useEffect, useState } from 'react';

const POS_PATH    = '/dashboard/pos';
const STALE_MS    = 60 * 60 * 1000; // 1 hour

interface OfflineGuardProps {
  children: React.ReactNode;
}

export function OfflineGuard({ children }: OfflineGuardProps) {
  const pathname    = usePathname();
  const { isOnline } = useConnectionStatus();
  const user        = useAuthStore(s => s.user);
  const storeId     = user?.store?.id;

  const [lastSync,   setLastSync]   = useState<number | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Load last sync timestamp from IndexedDB for stale-data warning
  useEffect(() => {
    if (!storeId) return;
    getDb(storeId).device_info.get('last_full_sync').then(row => {
      if (row?.value) setLastSync(new Date(row.value as string).getTime());
    }).catch(() => {});
  }, [storeId]);

  const isPosScreen = pathname === POS_PATH || pathname?.startsWith(POS_PATH + '/');
  const isStale     = lastSync !== null && Date.now() - lastSync > STALE_MS;
  const showStaleBanner = isStale && !bannerDismissed && !isPosScreen && isOnline;

  // Offline block screen for non-POS routes
  if (!isOnline && !isPosScreen) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>

        <h1 className="font-display font-bold text-3xl mb-2">You're offline</h1>
        <p className="text-muted-foreground max-w-sm mb-1">
          Only the POS screen is available without internet.
        </p>
        <p className="text-sm text-muted-foreground max-w-sm mb-8">
          Connect to the internet to access reports, inventory, customers,
          and other sections.
        </p>

        <div className="flex gap-3 flex-wrap justify-center">
          <Link href={POS_PATH}>
            <Button className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Return to POS
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          The POS screen supports offline sales with automatic sync when you reconnect.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Non-blocking stale-data warning banner */}
      {showStaleBanner && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">
            POS offline cache last synced{' '}
            <strong>
              {lastSync
                ? `${Math.floor((Date.now() - lastSync) / 3_600_000)}h ago`
                : 'a while ago'}
            </strong>
            . Open the{' '}
            <Link href={POS_PATH} className="underline font-medium">POS screen</Link>{' '}
            to refresh product prices and stock levels.
          </span>
          <button onClick={() => setBannerDismissed(true)}
            className="text-amber-600 hover:text-amber-800 flex-shrink-0 text-lg leading-none">
            ×
          </button>
        </div>
      )}
      {children}
    </>
  );
}
