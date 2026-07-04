/**
 * Background sync processor — CLIENT → SERVER.
 *
 * Reads pending_sales from IndexedDB and uploads them to the server.
 * Runs automatically when online, on reconnect, and manually on demand.
 *
 * D6 safety rules enforced:
 *  - Never delete a pending_sale until server confirms creation
 *  - Exponential backoff on transient failures
 *  - Permanent errors (403, 422) are not retried
 */

import { getDb, type PendingSale } from './db';
import { apiClient } from '@/lib/api';
import { getSyncService } from './sync-service';

const BACKOFF_SECONDS = [30, 60, 120, 300, 900, 1800, 3600, 7200]; // up to 2h
const MAX_BATCH_SIZE  = 10;
const MAX_ATTEMPTS    = 10;

export type SyncUploadResult = {
  uploaded:   number;
  failed:     number;
  conflicts:  number;
  errors:     string[];
};

export type PendingCount = {
  total:      number;
  high:       number;
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Run a single pass of the upload queue.
 * Returns immediately if queue is empty or device is offline.
 */
export async function runUploadSync(storeId: number): Promise<SyncUploadResult> {
  const db     = getDb(storeId);
  const result: SyncUploadResult = { uploaded: 0, failed: 0, conflicts: 0, errors: [] };

  if (!navigator.onLine) return result;

  // Get device UUID for the request
  const deviceInfo = await db.device_info.get('device_uuid');
  const deviceUUID = deviceInfo?.value as string | null;
  if (!deviceUUID) return result;

  // Fetch pending sales ordered by priority then created_at
  const pending = await db.pending_sales
    .where('status').equals('pending_sync')
    .filter(s => {
      if (s.attempts >= MAX_ATTEMPTS) return false;
      if (s.last_attempt_at) {
        const backoff = (BACKOFF_SECONDS[Math.min(s.attempts, BACKOFF_SECONDS.length - 1)] ?? 7200) * 1000;
        if (Date.now() - s.last_attempt_at < backoff) return false;
      }
      return true;
    })
    .sortBy('created_at');

  if (pending.length === 0) return result;

  // Process in batches of MAX_BATCH_SIZE
  for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
    const batch = pending.slice(i, i + MAX_BATCH_SIZE);
    await processBatch(storeId, deviceUUID, batch, result);
    if (!navigator.onLine) break; // connection dropped mid-batch
  }

  return result;
}

/** Get count of pending (unsynced) sales. */
export async function getPendingCount(storeId: number): Promise<PendingCount> {
  const db = getDb(storeId);
  const all = await db.pending_sales
    .where('status').equals('pending_sync')
    .toArray();
  return {
    total: all.length,
    high:  all.filter(s => s.sale_data).length,
  };
}

// ── Batch processing ───────────────────────────────────────────────────────

async function processBatch(
  storeId:    number,
  deviceUUID: string,
  batch:      PendingSale[],
  result:     SyncUploadResult,
): Promise<void> {
  const db = getDb(storeId);

  // Mark all as 'syncing' so another processor won't pick them up
  for (const s of batch) {
    await db.pending_sales.update(s.id!, { status: 'syncing' });
  }

  try {
    const payloads = batch.map(s => s.sale_data);
    const res = await apiClient.post('/store/pos/sync/sales', {
      device_uuid: deviceUUID,
      sales:       payloads,
    });

    const results: any[] = (res.data as any)?.results ?? [];

    // Match server results back to pending_sales by offline_reference
    for (const serverResult of results) {
      const local = batch.find(s => s.offline_reference === serverResult.offline_reference);
      if (!local) continue;

      if (serverResult.status === 'synced' || serverResult.status === 'already_synced') {
        await db.pending_sales.update(local.id!, {
          status:          'synced',
          real_sale_id:    serverResult.sale_id,
          real_sale_number:serverResult.real_sale_number,
          has_conflicts:   false,
          synced_at:       Date.now(),
        });
        result.uploaded++;

        // Refresh customer cache after sync
        if (local.sale_data.customer_id) {
          await refreshCustomerCache(storeId, local.sale_data.customer_id);
        }

      } else if (serverResult.status === 'synced_with_conflicts') {
        await db.pending_sales.update(local.id!, {
          status:          'synced',
          real_sale_id:    serverResult.sale_id,
          real_sale_number:serverResult.real_sale_number,
          has_conflicts:   true,
          conflict_detail: JSON.stringify(serverResult.conflicts),
          synced_at:       Date.now(),
        });
        result.uploaded++;
        result.conflicts++;

        if (local.sale_data.customer_id) {
          await refreshCustomerCache(storeId, local.sale_data.customer_id);
        }

      } else if (serverResult.status === 'failed') {
        const isPermanent = isPermanentError(serverResult.error ?? '');
        await db.pending_sales.update(local.id!, {
          status:         isPermanent ? 'failed_permanent' : 'pending_sync',
          attempts:       (local.attempts ?? 0) + 1,
          last_attempt_at:Date.now(),
          last_error:     serverResult.error,
        });
        result.failed++;
        result.errors.push(`${serverResult.offline_reference}: ${serverResult.error}`);
      }
    }

    // Update sync log
    await getDb(storeId).sync_log.add({
      type:            'upload',
      status:          result.errors.length > 0 ? 'partial' : 'success',
      products_synced: 0,
      customers_synced:0,
      sales_uploaded:  result.uploaded,
      error:           result.errors.length > 0 ? result.errors.join('; ') : null,
      duration_ms:     0,
      created_at:      Date.now(),
    });

  } catch (err: any) {
    const statusCode = err?.response?.status;
    const isPermanent = statusCode === 403; // Device deactivated — stop retrying

    for (const s of batch) {
      await db.pending_sales.update(s.id!, {
        status:          isPermanent ? 'failed_permanent' : 'pending_sync',
        attempts:        (s.attempts ?? 0) + 1,
        last_attempt_at: Date.now(),
        last_error:      err?.message ?? 'Network error',
      });
    }
    result.failed += batch.length;
    result.errors.push(err?.message ?? 'Network error');
  }
}

function isPermanentError(error: string): boolean {
  const lower = error.toLowerCase();
  return lower.includes('422') ||
         lower.includes('validation') ||
         lower.includes('product no longer') ||
         lower.includes('forbidden');
}

// ── Post-sync cache refresh ────────────────────────────────────────────────

async function refreshCustomerCache(storeId: number, customerId: number): Promise<void> {
  try {
    const svc = getSyncService(storeId);
    // Incremental sync for customers will update their balances
    const res = await apiClient.get('/store/pos/sync/customers', {
      since: new Date(Date.now() - 60_000).toISOString(), // last 60s
      limit: 500,
    });
    const customers = (res.data as any)?.customers ?? [];
    if (customers.length > 0) {
      const db = getDb(storeId);
      await db.customers.bulkPut(customers.map((c: any) => ({
        ...c,
        cached_at: Date.now(),
      })));
    }
  } catch {
    // Non-fatal — cache will be refreshed on next incremental sync
  }
}
