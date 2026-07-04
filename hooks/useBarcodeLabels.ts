import { apiClient } from '@/lib/api';
import type { BarcodeLabelData } from '@/components/catalog/BarcodeLabel';

/** Fetches real scannable barcode SVGs for the given product ids in one request. */
export async function fetchBarcodeLabels(productIds: number[]): Promise<BarcodeLabelData[]> {
  if (productIds.length === 0) return [];
  const res = await apiClient.post('/store/products/barcode-labels', { product_ids: productIds });
  return (res.data as any)?.labels ?? [];
}
