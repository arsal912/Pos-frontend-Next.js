'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { getSyncService } from '@/lib/offline/sync-service';
import { runUploadSync, getPendingCount } from '@/lib/offline/sync-processor';

const AUTO_SYNC_INTERVAL_MS   = 5 * 60 * 1000;  // 5 minutes data pull
const UPLOAD_POLL_INTERVAL_MS = 30 * 1000;       // 30 seconds upload poll

export interface SyncState {
  isSyncing:        boolean;
  isInitialSync:    boolean;
  isUploading:      boolean;      // true while uploading pending sales
  progress:         string | null;
  lastSyncAt:       Date | null;
  lastError:        string | null;
  cachedProducts:   number;
  cachedCustomers:  number;
  pendingSales:     number;       // count of unsynced offline sales
  needsFullSync:    boolean;
  triggerFullSync:  () => Promise<void>;
  triggerIncSync:   () => Promise<void>;
  triggerUpload:    () => Promise<void>;
}

export function useSyncService(): SyncState {
  const user    = useAuthStore(s => s.user);
  const storeId = user?.store?.id;

  const [isSyncing,       setIsSyncing]       = useState(false);
  const [isInitialSync,   setIsInitialSync]   = useState(false);
  const [isUploading,     setIsUploading]     = useState(false);
  const [progress,        setProgress]        = useState<string | null>(null);
  const [lastSyncAt,      setLastSyncAt]      = useState<Date | null>(null);
  const [lastError,       setLastError]       = useState<string | null>(null);
  const [cachedProducts,  setCachedProducts]  = useState(0);
  const [cachedCustomers, setCachedCustomers] = useState(0);
  const [pendingSales,    setPendingSales]    = useState(0);
  const [needsFullSync,   setNeedsFullSync]   = useState(false);

  const autoSyncTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncingRef        = useRef(false);
  const uploadingRef      = useRef(false);

  const getService = useCallback(() => {
    if (!storeId) return null;
    return getSyncService(storeId);
  }, [storeId]);

  // ── Load persisted state on mount ────────────────────────────────────────

  useEffect(() => {
    if (!storeId) return;
    const svc = getSyncService(storeId);
    Promise.all([
      svc.getLastSyncAt(),
      svc.getCachedCounts(),
      svc.needsFullSync(),
      getPendingCount(storeId),
    ]).then(([last, counts, needsFull, pending]) => {
      setLastSyncAt(last);
      setCachedProducts(counts.products);
      setCachedCustomers(counts.customers);
      setNeedsFullSync(needsFull);
      setPendingSales(pending.total);
    }).catch(() => {});
  }, [storeId]);

  // ── Data pull (SERVER → CLIENT) ────────────────────────────────────────

  const triggerFullSync = useCallback(async () => {
    const svc = getService();
    if (!svc || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    setIsInitialSync(needsFullSync);
    setLastError(null);
    try {
      const result = await svc.fullSync(msg => setProgress(msg));
      setLastSyncAt(new Date(result.synced_at));
      setCachedProducts(result.products_synced);
      setCachedCustomers(result.customers_synced);
      setNeedsFullSync(false);
      setLastError(null);
    } catch (err: any) {
      setLastError(err?.message ?? 'Sync failed');
    } finally {
      setIsSyncing(false);
      setIsInitialSync(false);
      setProgress(null);
      syncingRef.current = false;
    }
  }, [getService, needsFullSync]);

  const triggerIncSync = useCallback(async () => {
    const svc = getService();
    if (!svc || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    setLastError(null);
    try {
      const result = await svc.incrementalSync();
      setLastSyncAt(new Date(result.synced_at));
      if (result.products_synced  > 0) setCachedProducts(p => p + result.products_synced);
      if (result.customers_synced > 0) setCachedCustomers(c => c + result.customers_synced);
      setLastError(null);
    } catch (err: any) {
      setLastError(err?.message ?? 'Sync failed');
    } finally {
      setIsSyncing(false);
      setProgress(null);
      syncingRef.current = false;
    }
  }, [getService]);

  // ── Upload (CLIENT → SERVER) ──────────────────────────────────────────

  const triggerUpload = useCallback(async () => {
    if (!storeId || uploadingRef.current || !navigator.onLine) return;
    uploadingRef.current = true;
    setIsUploading(true);
    try {
      const result = await runUploadSync(storeId);
      // Refresh pending count after upload attempt
      const pending = await getPendingCount(storeId);
      setPendingSales(pending.total);
      if (result.errors.length > 0) {
        setLastError(`Upload: ${result.errors[0]}`);
      }
    } catch (err: any) {
      setLastError(err?.message ?? 'Upload failed');
    } finally {
      setIsUploading(false);
      uploadingRef.current = false;
    }
  }, [storeId]);

  // ── Initial load ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!storeId || typeof window === 'undefined') return;
    getSyncService(storeId).needsFullSync().then(needs => {
      if (needs && !syncingRef.current)               triggerFullSync();
      else if (!needs && navigator.onLine && !syncingRef.current) triggerIncSync();
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // ── Auto-sync: data pull every 5 min + upload every 30s ──────────────

  useEffect(() => {
    if (!storeId || typeof window === 'undefined') return;

    const runPull = () => {
      if (navigator.onLine && !syncingRef.current) triggerIncSync();
    };
    const runUpload = () => {
      if (navigator.onLine && !uploadingRef.current) triggerUpload();
    };

    autoSyncTimerRef.current = setInterval(runPull,   AUTO_SYNC_INTERVAL_MS);
    uploadTimerRef.current   = setInterval(runUpload, UPLOAD_POLL_INTERVAL_MS);

    // Trigger upload immediately on reconnect
    const onOnline = () => { runPull(); runUpload(); };
    window.addEventListener('online', onOnline);

    return () => {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
      if (uploadTimerRef.current)   clearInterval(uploadTimerRef.current);
      window.removeEventListener('online', onOnline);
    };
  }, [storeId, triggerIncSync, triggerUpload]);

  // Refresh pending count whenever a sale might have been added
  useEffect(() => {
    if (!storeId) return;
    const refresh = () => getPendingCount(storeId).then(p => setPendingSales(p.total)).catch(() => {});
    const timer = setInterval(refresh, 10_000); // lightweight poll every 10s
    return () => clearInterval(timer);
  }, [storeId]);

  return {
    isSyncing,
    isInitialSync,
    isUploading,
    progress,
    lastSyncAt,
    lastError,
    cachedProducts,
    cachedCustomers,
    pendingSales,
    needsFullSync,
    triggerFullSync,
    triggerIncSync,
    triggerUpload,
  };
}
