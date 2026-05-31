'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, Search, Package, Pencil, Trash2, Loader2,
  RefreshCw, Barcode, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product, Category, Brand } from '@/types';

function stockBadge(stock: number) {
  if (stock <= 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (stock < 5)  return <Badge variant="warning">Low stock</Badge>;
  return <Badge variant="success">In stock</Badge>;
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') ?? '');
  const [brandId, setBrandId] = useState(searchParams.get('brand') ?? '');
  const [isActive, setIsActive] = useState<string>(searchParams.get('active') ?? '');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, bRes] = await Promise.all([
        apiClient.get('/store/products', {
          search: search || undefined,
          category_id: categoryId || undefined,
          brand_id: brandId || undefined,
          is_active: isActive !== '' ? isActive : undefined,
          page,
          per_page: 20,
        }),
        apiClient.get('/store/categories'),
        apiClient.get('/store/brands'),
      ]);
      setProducts((pRes as any).data?.data ?? (pRes as any).data ?? []);
      setMeta((pRes as any).meta?.pagination ?? null);
      setCategories((cRes.data as any)?.categories ?? []);
      setBrands((bRes.data as any)?.brands ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [search, categoryId, brandId, isActive, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This will soft-delete the product.`)) return;
    setDeleting(product.id);
    try {
      await apiClient.delete(`/store/products/${product.id}`);
      toast.success('Product deleted.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(null); }
  };

  const flatCategories = (cats: Category[], depth = 0): { id: number; label: string }[] =>
    cats.flatMap(c => [
      { id: c.id, label: '  '.repeat(depth) + c.name },
      ...(c.children ? flatCategories(c.children, depth + 1) : []),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/products/new"><Plus className="h-4 w-4" />Add Product</Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, SKU, barcode…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
          </div>

          <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm min-w-36">
            <option value="">All categories</option>
            {flatCategories(categories).map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <select value={brandId} onChange={e => { setBrandId(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select value={isActive} onChange={e => { setIsActive(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setCategoryId(''); setBrandId(''); setIsActive(''); setPage(1); }} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Reset
          </Button>
        </div>
      </Card>

      {/* Product table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No products found. Create your first product.</p>
            <Button asChild className="mt-4 gap-2"><Link href="/dashboard/products/new"><Plus className="h-4 w-4" />Add Product</Link></Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.primary_image ? (
                            <img src={`/api/backend/store/files/${p.primary_image.path}`}
                              alt={p.name} className="h-10 w-10 rounded-lg object-cover border bg-muted flex-shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center flex-shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{p.name}</p>
                            {p.type === 'variable' && (
                              <p className="text-xs text-muted-foreground">{p.variants_count} variants</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-mono">{Number(p.selling_price).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{(p.total_stock ?? 0).toFixed(0)}</span>
                          {stockBadge(p.total_stock ?? 0)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.is_active ? 'success' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          {p.barcode && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                              <Link href={`/dashboard/products/${p.id}/print-barcode`}><Barcode className="h-3.5 w-3.5" /></Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                            <Link href={`/dashboard/products/${p.id}`}><Pencil className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleDelete(p)} disabled={deleting === p.id}>
                            {deleting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">Total: {meta.total} products</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1">
                    <ChevronLeft className="h-4 w-4" />Prev
                  </Button>
                  <span className="text-sm flex items-center px-2">{page} / {meta.last_page}</span>
                  <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)} className="gap-1">
                    Next<ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
