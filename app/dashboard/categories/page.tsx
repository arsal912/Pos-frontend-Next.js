'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Loader2, X, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

type ModalState = { open: boolean; category: Category | null; parentId: number | null };

function CategoryRow({ category, depth = 0, onEdit, onDelete, onAddChild }: {
  category: Category;
  depth?: number;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onAddChild: (parentId: number) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = (category.children?.length ?? 0) > 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex items-center gap-2 py-2.5 px-4 hover:bg-muted/20 transition-colors border-b last:border-0',
          !category.is_active && 'opacity-50'
        )}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <button onClick={() => setExpanded(!expanded)} className={cn('h-5 w-5 flex-shrink-0', !hasChildren && 'invisible')}>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{category.name}</span>
          {category.products_count !== undefined && (
            <span className="text-xs text-muted-foreground flex-shrink-0">{category.products_count} products</span>
          )}
          {!category.is_active && <Badge variant="outline" className="text-xs flex-shrink-0">Inactive</Badge>}
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            onClick={() => onAddChild(category.id)}>
            <Plus className="h-3 w-3" />Sub
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(category)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(category)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>

      {expanded && hasChildren && category.children!.map(child => (
        <CategoryRow key={child.id} category={child} depth={depth + 1}
          onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
      ))}
    </>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ open: false, category: null, parentId: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/categories');
      setCategories((res.data as any)?.categories ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = (parentId?: number) => {
    setForm({ name: '', description: '', is_active: true });
    setModal({ open: true, category: null, parentId: parentId ?? null });
  };

  const openEdit = (category: Category) => {
    setForm({ name: category.name, description: category.description ?? '', is_active: category.is_active });
    setModal({ open: true, category, parentId: category.parent_id });
  };

  const close = () => setModal({ open: false, category: null, parentId: null });

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required.');
    setSaving(true);
    try {
      const body = { ...form, parent_id: modal.parentId };
      if (modal.category) {
        await apiClient.put(`/store/categories/${modal.category.id}`, body);
        toast.success('Category updated.');
      } else {
        await apiClient.post('/store/categories', body);
        toast.success('Category created.');
      }
      close();
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const del = async (c: Category) => {
    if ((c.products_count ?? 0) > 0) return toast.error('Cannot delete a category that has products.');
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await apiClient.delete(`/store/categories/${c.id}`);
      toast.success('Category deleted.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">Organize products into categories and subcategories</p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2"><Plus className="h-4 w-4" />Add Category</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No categories yet. Create your first one.</p>
          </div>
        ) : (
          <div>
            {categories.map(cat => (
              <CategoryRow key={cat.id} category={cat} onEdit={openEdit} onDelete={del} onAddChild={openCreate} />
            ))}
          </div>
        )}
      </Card>

      <AnimatePresence>
        {modal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-lg">
                    {modal.category ? 'Edit Category' : modal.parentId ? 'Add Subcategory' : 'New Category'}
                  </h2>
                  <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Category name" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
                  <Button onClick={save} disabled={saving} className="flex-1 gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
