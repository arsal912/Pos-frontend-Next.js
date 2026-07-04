'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2, X, Upload, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import type { SyncState } from '@/hooks/useSyncService';

interface SyncIndicatorProps {
  sync:      SyncState;
  className?: string;
}

export function SyncIndicator({ sync, className }: SyncIndicatorProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  // Use active HTTP probe for reliable offline detection (not just navigator.onLine)
  const connection = useConnectionStatus();

  const formatTime = (d: Date | null) => {
    if (!d) return 'Never';
    const diff = Date.now() - d.getTime();
    if (diff < 60_000)   return 'Just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return d.toLocaleTimeString();
  };

  const isStale     = sync.lastSyncAt
    ? Date.now() - sync.lastSyncAt.getTime() > 4 * 3600_000
    : true;
  const hasPending  = sync.pendingSales > 0;
  // Prefer the active HTTP probe result over the unreliable navigator.onLine
  const isOnline    = connection.isOnline;

  // Determine pill colour
  const pillColor = !isOnline
    ? 'bg-red-50 text-red-700'
    : sync.isUploading
      ? 'bg-blue-50 text-blue-700'
      : (sync.isSyncing || hasPending)
        ? 'bg-amber-50 text-amber-700'
        : sync.lastError
          ? 'bg-red-50 text-red-700'
          : isStale
            ? 'bg-amber-50 text-amber-700'
            : 'bg-green-50 text-green-700';

  const pillLabel = !isOnline
    ? `Offline${hasPending ? ` · ${sync.pendingSales} pending` : ''}`
    : sync.isUploading
      ? `Uploading ${sync.pendingSales} sale${sync.pendingSales !== 1 ? 's' : ''}…`
      : sync.isSyncing
        ? (sync.progress ?? 'Syncing…')
        : hasPending
          ? `${sync.pendingSales} pending sync`
          : sync.lastError
            ? 'Sync error'
            : `Synced ${formatTime(sync.lastSyncAt)}`;

  const PillIcon = !isOnline
    ? WifiOff
    : (sync.isUploading || hasPending)
      ? Upload
      : sync.isSyncing
        ? Loader2
        : sync.lastError
          ? AlertTriangle
          : CheckCircle2;

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setPanelOpen(v => !v)}
        className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors', pillColor)}
      >
        <PillIcon className={cn('h-3 w-3', (sync.isSyncing || sync.isUploading) && 'animate-spin')} />
        <span>{pillLabel}</span>
      </button>

      {panelOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border bg-popover shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Offline Data</p>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPanelOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Connection</span>
              <span className={cn('font-medium', isOnline ? 'text-green-600' : 'text-red-600')}>
                {isOnline ? '● Online' : '● Offline'}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Last sync</span>
              <span className="font-medium text-foreground">{formatTime(sync.lastSyncAt)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Cached products</span>
              <span className="font-medium text-foreground">{sync.cachedProducts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Cached customers</span>
              <span className="font-medium text-foreground">{sync.cachedCustomers.toLocaleString()}</span>
            </div>
            {hasPending && (
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Pending uploads</span>
                <span>{sync.pendingSales} sale{sync.pendingSales !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {sync.lastError && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2 break-words">
              {sync.lastError}
            </div>
          )}

          {isStale && !sync.isSyncing && isOnline && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
              Data is over 4 hours old. Sync now for latest prices and stock.
            </p>
          )}

          {/* Upload button — shown when there are pending offline sales */}
          {hasPending && isOnline && (
            <Button size="sm" variant="default" className="w-full gap-2 h-8 text-xs"
              disabled={sync.isUploading}
              onClick={() => { sync.triggerUpload(); setPanelOpen(false); }}>
              {sync.isUploading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Upload className="h-3.5 w-3.5" />}
              Upload {sync.pendingSales} pending sale{sync.pendingSales !== 1 ? 's' : ''}
            </Button>
          )}

          <Button size="sm" variant="outline" className="w-full gap-2 h-8 text-xs"
            disabled={sync.isSyncing || !isOnline}
            onClick={() => { sync.triggerIncSync(); setPanelOpen(false); }}>
            {sync.isSyncing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            {isOnline ? 'Sync data now' : 'Offline — cannot sync'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Data syncs every 5 min · Uploads check every 30s
          </p>
        </div>
      )}
    </div>
  );
}
