'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Save, ArrowLeft, Plus, Trash2, Loader2, Upload, Star,
  RefreshCw, Barcode, X, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product, ProductVariant, ProductImage, Category, Brand, TaxRate, Unit } from '@/types';

type Tab = 'basic' | 'pricing' | 'inventory' | 'variants' | 'images';

const TABS: { id: Tab; label: string }[] = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'variants', label: 'Variants' },
  { id: 'images', label: 'Images' },
];

interface ProductFormProps { productId?: number }

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!productId;

  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Form state
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', description: '',
    type: 'simple' as 'simple' | 'variable',
    category_id: '', brand_id: '', unit_id: '', tax_rate_id: '',
    cost_price: '', selling_price: '', msrp: '',
    track_stock: true, allow_negative_stock: false,
    low_stock_threshold: '', is_active: true, is_weightable: false,
    initial_stock: '', branch_id: '',
  });

  const [variants, setVariants] = useState<Partial<ProductVariant>[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [productData, setProductData] = useState<Product | null>(null);

  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------

  const loadRefData = useCallback(async () => {
    const [cRes, bRes, tRes, uRes] = await Promise.all([
      apiClient.get('/store/categories'),
      apiClient.get('/store/brands'),
      apiClient.get('/store/tax-rates'),
      apiClient.get('/store/units'),
    ]);
    setCategories((cRes.data as any)?.categories ?? []);
    setBrands((bRes.data as any)?.brands ?? []);
    setTaxRates((tRes.data as any)?.tax_rates ?? []);
    setUnits((uRes.data as any)?.units ?? []);
  }, []);

  useEffect(() => {
    loadRefData().catch(() => {});

    if (isEdit) {
      apiClient.get(`/store/products/${productId}`)
        .then(res => {
          const p: Product = (res.data as any)?.product ?? res.data;
          setProductData(p);
          setForm({
            name: p.name, sku: p.sku, barcode: p.barcode ?? '', description: p.description ?? '',
            type: p.type, category_id: String(p.category_id ?? ''), brand_id: String(p.brand_id ?? ''),
            unit_id: String(p.unit_id ?? ''), tax_rate_id: String(p.tax_rate_id ?? ''),
            cost_price: String(p.cost_price), selling_price: String(p.selling_price),
            msrp: String(p.msrp ?? ''), track_stock: p.track_stock,
            allow_negative_stock: p.allow_negative_stock,
            low_stock_threshold: String(p.low_stock_threshold ?? ''),
            is_active: p.is_active, is_weightable: p.is_weightable ?? false,
            initial_stock: '', branch_id: '',
          });
          setVariants(p.variants ?? []);
          setImages(p.images ?? []);
        })
        .catch(() => toast.error('Failed to load product.'))
        .finally(() => setLoading(false));
    }
  }, [isEdit, productId, loadRefData]);

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!form.name) errs.name = 'Name is required.';
    if (!form.selling_price) errs.selling_price = 'Selling price is required.';
    if (Object.keys(errs).length) {
      setErrors(errs);
      setActiveTab('basic');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        type: form.type,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        brand_id: form.brand_id ? parseInt(form.brand_id) : null,
        unit_id: form.unit_id ? parseInt(form.unit_id) : null,
        tax_rate_id: form.tax_rate_id ? parseInt(form.tax_rate_id) : null,
        cost_price: parseFloat(form.cost_price || '0'),
        selling_price: parseFloat(form.selling_price),
        msrp: form.msrp ? parseFloat(form.msrp) : undefined,
        track_stock: form.track_stock,
        allow_negative_stock: form.allow_negative_stock,
        low_stock_threshold: form.low_stock_threshold ? parseInt(form.low_stock_threshold) : undefined,
        is_active: form.is_active,
        is_weightable: form.is_weightable,
        initial_stock: form.initial_stock ? parseFloat(form.initial_stock) : undefined,
        branch_id: form.branch_id ? parseInt(form.branch_id) : undefined,
      };

      let savedId = productId;
      if (isEdit) {
        await apiClient.put(`/store/products/${productId}`, body);
      } else {
        const res = await apiClient.post('/store/products', body);
        savedId = (res.data as any)?.product?.id;
      }

      toast.success(isEdit ? 'Product updated.' : 'Product created.');
      if (!isEdit) router.push(`/dashboard/products/${savedId}`);
      else loadRefData();
    } catch (err) {
      const msg = getErrorMessage(err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Barcode generation
  // -------------------------------------------------------------------------

  const handleGenerateBarcode = async () => {
    if (!productId) return toast.error('Save the product first to generate a barcode.');
    setGeneratingBarcode(true);
    try {
      const res = await apiClient.post(`/store/products/${productId}/barcode/generate`);
      const barcode = (res.data as any)?.barcode ?? '';
      setForm(f => ({ ...f, barcode }));
      toast.success('Barcode generated: ' + barcode);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setGeneratingBarcode(false); }
  };

  // -------------------------------------------------------------------------
  // Image upload via dropzone
  // -------------------------------------------------------------------------

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    disabled: !productId,
    onDrop: async (files) => {
      if (!productId) return;
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        setUploadingImage(true);
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const res = await fetch(`/api/backend/store/products/${productId}/images`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
          const data = await res.json();
          if (data.success) {
            setImages(prev => [...prev, data.data.image]);
          } else {
            toast.error(data.message ?? 'Upload failed.');
          }
        } catch { toast.error('Upload failed.'); }
        finally { setUploadingImage(false); }
      }
    },
  });

  const deleteImage = async (imageId: number) => {
    if (!productId) return;
    try {
      await apiClient.delete(`/store/products/${productId}/images/${imageId}`);
      setImages(prev => prev.filter(i => i.id !== imageId));
      toast.success('Image removed.');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // -------------------------------------------------------------------------
  // Variants
  // -------------------------------------------------------------------------

  const addVariantRow = () => setVariants(v => [...v, { name: '', sku: '', cost_price: 0, selling_price: 0, is_active: true }]);

  const updateVariant = (idx: number, field: string, value: any) =>
    setVariants(v => v.map((vv, i) => i === idx ? { ...vv, [field]: value } : vv));

  const saveVariant = async (idx: number) => {
    if (!productId) return;
    const v = variants[idx];
    try {
      if ((v as ProductVariant).id) {
        await apiClient.put(`/store/products/${productId}/variants/${(v as ProductVariant).id}`, v);
        toast.success('Variant saved.');
      } else {
        const res = await apiClient.post(`/store/products/${productId}/variants`, v);
        const saved = (res.data as any)?.variant;
        setVariants(prev => prev.map((vv, i) => i === idx ? saved : vv));
        toast.success('Variant created.');
      }
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const deleteVariant = async (idx: number) => {
    const v = variants[idx] as ProductVariant;
    if (v.id && productId) {
      try {
        await apiClient.delete(`/store/products/${productId}/variants/${v.id}`);
        toast.success('Variant deleted.');
      } catch (err) { toast.error(getErrorMessage(err)); return; }
    }
    setVariants(prev => prev.filter((_, i) => i !== idx));
  };

  // -------------------------------------------------------------------------

  const upd = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const flatCategories = (cats: Category[], depth = 0): { id: number; label: string }[] =>
    cats.flatMap(c => [{ id: c.id, label: '  '.repeat(depth) + c.name }, ...(c.children ? flatCategories(c.children, depth + 1) : [])]);

  if (loading) {
    return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild><Link href="/dashboard/products"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {isEdit ? (productData?.name ?? 'Edit Product') : 'New Product'}
            </h1>
            {isEdit && <p className="text-muted-foreground text-sm mt-0.5">SKU: {form.sku}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {isEdit && form.barcode && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href={`/dashboard/products/${productId}/print-barcode`}>
                <Barcode className="h-3.5 w-3.5" />Print Barcode
              </Link>
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {TABS.filter(t => form.type === 'variable' || t.id !== 'variants').map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              {tab.label}
              {Object.keys(errors).some(k => {
                if (tab.id === 'basic') return ['name', 'sku', 'barcode'].includes(k);
                if (tab.id === 'pricing') return ['selling_price', 'cost_price'].includes(k);
                return false;
              }) && <span className="ml-1 text-destructive">•</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <Card className="p-6">
        {activeTab === 'basic' && (
          <div className="space-y-5 max-w-2xl">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Product Name *</Label>
                <Input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Samsung Galaxy S24" />
                {errors.name && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={e => upd('sku', e.target.value)} placeholder="Auto-generated if empty" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Barcode</Label>
                  {isEdit && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2" onClick={handleGenerateBarcode} disabled={generatingBarcode}>
                      {generatingBarcode ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Generate EAN-13
                    </Button>
                  )}
                </div>
                <Input value={form.barcode} onChange={e => upd('barcode', e.target.value)} placeholder="EAN-13, UPC-A, or custom" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select value={form.category_id} onChange={e => upd('category_id', e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">No category</option>
                  {flatCategories(categories).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <select value={form.brand_id} onChange={e => upd('brand_id', e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">No brand</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <select value={form.unit_id} onChange={e => upd('unit_id', e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">Select unit</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.short_code})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Product Type</Label>
                <select value={form.type} onChange={e => upd('type', e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="simple">Simple Product</option>
                  <option value="variable">Variable Product (has variants)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea value={form.description} onChange={e => upd('description', e.target.value)}
                rows={4} placeholder="Product description…"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => upd('is_active', v)} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Weightable</p>
                <p className="text-xs text-muted-foreground">Sold by weight (kg/g) rather than by unit count</p>
              </div>
              <Switch checked={form.is_weightable} onCheckedChange={v => upd('is_weightable', v)} />
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-5 max-w-lg">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cost Price</Label>
                <Input type="number" min="0" step="0.01" value={form.cost_price} onChange={e => upd('cost_price', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price *</Label>
                <Input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => upd('selling_price', e.target.value)} placeholder="0.00" />
                {errors.selling_price && <p className="text-xs text-destructive">{errors.selling_price}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>MSRP (Optional)</Label>
                <Input type="number" min="0" step="0.01" value={form.msrp} onChange={e => upd('msrp', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Tax Rate</Label>
                <select value={form.tax_rate_id} onChange={e => upd('tax_rate_id', e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">No tax</option>
                  {taxRates.filter(r => r.is_active).map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.rate}% {r.is_inclusive ? 'incl.' : 'excl.'})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-5 max-w-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Track Stock</p>
                <p className="text-xs text-muted-foreground">Monitor quantity levels</p>
              </div>
              <Switch checked={form.track_stock} onCheckedChange={v => upd('track_stock', v)} />
            </div>
            {form.track_stock && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Allow Negative Stock</p>
                    <p className="text-xs text-muted-foreground">Sell even when stock is zero</p>
                  </div>
                  <Switch checked={form.allow_negative_stock} onCheckedChange={v => upd('allow_negative_stock', v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Low Stock Threshold</Label>
                  <Input type="number" min="0" value={form.low_stock_threshold} onChange={e => upd('low_stock_threshold', e.target.value)} placeholder="e.g. 5" />
                  <p className="text-xs text-muted-foreground">Alert when stock falls below this number</p>
                </div>
                {!isEdit && (
                  <div className="space-y-1.5 border-t pt-4">
                    <Label>Initial Stock (for this branch)</Label>
                    <Input type="number" min="0" step="0.001" value={form.initial_stock} onChange={e => upd('initial_stock', e.target.value)} placeholder="0" />
                    <p className="text-xs text-muted-foreground">Stock added when the product is created</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'variants' && form.type === 'variable' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{isEdit ? 'Add and manage product variants.' : 'Save the product first, then add variants.'}</p>
              {isEdit && <Button variant="outline" size="sm" onClick={addVariantRow} className="gap-2"><Plus className="h-4 w-4" />Add Variant</Button>}
            </div>
            {variants.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No variants yet.</p>
            ) : (
              <div className="space-y-3">
                {variants.map((v, idx) => (
                  <div key={idx} className="border rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="col-span-2 sm:col-span-1 space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input value={v.name ?? ''} onChange={e => updateVariant(idx, 'name', e.target.value)} placeholder="e.g. Red - L" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">SKU</Label>
                        <Input value={v.sku ?? ''} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="SKU-001" className="h-8 text-xs font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cost</Label>
                        <Input type="number" value={v.cost_price ?? ''} onChange={e => updateVariant(idx, 'cost_price', parseFloat(e.target.value))} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price</Label>
                        <Input type="number" value={v.selling_price ?? ''} onChange={e => updateVariant(idx, 'selling_price', parseFloat(e.target.value))} className="h-8 text-xs" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      {isEdit && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => saveVariant(idx)}>Save</Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteVariant(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-4">
            {!isEdit && (
              <div className="bg-muted/30 border rounded-xl p-4 text-center text-sm text-muted-foreground">
                Save the product first to upload images.
              </div>
            )}
            {isEdit && (
              <>
                {/* Dropzone */}
                <div {...getRootProps()} className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/20'
                )}>
                  <input {...getInputProps()} />
                  {uploadingImage ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? 'Drop images here…' : 'Drag & drop images or click to browse'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP — max 5 MB each</p>
                </div>

                {/* Image grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {images.map(img => (
                      <div key={img.id} className="relative group">
                        <img
                          src={`/api/backend/store/files/${img.path}`}
                          alt={img.alt_text ?? ''}
                          className={cn('w-full aspect-square rounded-lg object-cover border', img.is_primary && 'ring-2 ring-primary')}
                        />
                        {img.is_primary && (
                          <div className="absolute top-1 left-1 bg-primary text-white rounded-full p-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" />
                          </div>
                        )}
                        <button onClick={() => deleteImage(img.id)}
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
