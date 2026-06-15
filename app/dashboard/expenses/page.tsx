'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Trash2, Loader2, Search, Pencil, TrendingDown,
  ChevronLeft, ChevronRight, RefreshCw, X, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Expense {
  id: number; expense_date: string; category: string;
  description: string; amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other';
  branch_id: number | null; reference: string | null;
  notes: string | null; created_at: string;
}

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash',          color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'card',          label: 'Card',          color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'bank_transfer', label: 'Bank Transfer', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  { value: 'cheque',        label: 'Cheque',        color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'other',         label: 'Other',         color: 'text-gray-600 bg-gray-50 border-gray-200' },
] as const;

const DEFAULT_CATEGORIES = [
  'Rent', 'Electricity', 'Internet', 'Salary', 'Wages',
  'Marketing', 'Supplies', 'Maintenance', 'Transport',
  'Food & Beverages', 'Insurance', 'Tax', 'Other',
];

const METHOD_BADGE: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  card: 'bg-blue-100 text-blue-700',
  bank_transfer: 'bg-violet-100 text-violet-700',
  cheque: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-600',
};

// ── Empty form state ──────────────────────────────────────────────────────────

const emptyForm = () => ({
  expense_date:   new Date().toISOString().split('T')[0],
  category:       '',
  description:    '',
  amount:         '',
  payment_method: 'cash' as const,
  reference:      '',
  notes:          '',
});

// ── Add / Edit Expense Form ───────────────────────────────────────────────────

function ExpenseForm({
  initial, categories, onSaved, onCancel, editId,
}: {
  initial?: ReturnType<typeof emptyForm>;
  categories: string[];
  onSaved: () => void;
  onCancel?: () => void;
  editId?: number | null;
}) {
  const [form,     setForm]     = useState(initial ?? emptyForm());
  const [saving,   setSaving]   = useState(false);
  const [catInput, setCatInput] = useState(initial?.category ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isEdit     = !!editId;
  const allCats    = [...new Set([...DEFAULT_CATEGORIES, ...categories])].sort();
  const suggestions = allCats.filter(c =>
    catInput.length > 0 &&
    c.toLowerCase().includes(catInput.toLowerCase()) &&
    c !== catInput
  );

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category)    return toast.error('Category is required.');
    if (!form.description) return toast.error('Description is required.');
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter a valid amount.');

    setSaving(true);
    try {
      const body = {
        expense_date:   form.expense_date,
        category:       form.category,
        description:    form.description,
        amount:         parseFloat(form.amount),
        payment_method: form.payment_method,
        reference:      form.reference || undefined,
        notes:          form.notes     || undefined,
      };
      if (isEdit) {
        await apiClient.put(`/store/expenses/${editId}`, body);
        toast.success('Expense updated.');
      } else {
        await apiClient.post('/store/expenses', body);
        toast.success('Expense recorded.');
      }
      if (!isEdit) setForm(emptyForm());
      onSaved();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: Date + Amount */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Date *</Label>
          <Input type="date" value={form.expense_date}
            onChange={e => set('expense_date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">Rs</span>
            <Input type="number" value={form.amount} min="0.01" step="0.01"
              onChange={e => set('amount', e.target.value)}
              placeholder="0.00" className="pl-8 h-9 font-mono" required />
          </div>
        </div>
      </div>

      {/* Row 2: Category autocomplete */}
      <div className="space-y-1 relative">
        <Label className="text-xs">Category *</Label>
        <Input
          value={catInput}
          onChange={e => { setCatInput(e.target.value); set('category', e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Select or type a category…"
          className="h-9"
          required
        />
        {/* Quick category pills */}
        {!catInput && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {DEFAULT_CATEGORIES.slice(0, 8).map(c => (
              <button key={c} type="button"
                onClick={() => { setCatInput(c); set('category', c); }}
                className="text-xs px-2.5 py-1 rounded-full border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors">
                {c}
              </button>
            ))}
          </div>
        )}
        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-background border rounded-xl shadow-xl overflow-hidden">
            {suggestions.slice(0, 6).map(c => (
              <button key={c} type="button"
                onMouseDown={() => { setCatInput(c); set('category', c); setShowSuggestions(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2">
                <Check className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />{c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Description */}
      <div className="space-y-1">
        <Label className="text-xs">Description *</Label>
        <Input value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="e.g. June rent payment, Staff salary, Electricity bill" className="h-9" required />
      </div>

      {/* Row 4: Payment method */}
      <div className="space-y-1">
        <Label className="text-xs">Payment Method</Label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map(m => (
            <button key={m.value} type="button"
              onClick={() => set('payment_method', m.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                form.payment_method === m.value ? m.color + ' border-current' : 'hover:bg-muted/50'
              )}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 5: Reference + Notes */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Reference # <span className="text-muted-foreground">(optional)</span></Label>
          <Input value={form.reference} onChange={e => set('reference', e.target.value)}
            placeholder="Invoice / receipt number" className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
          <Input value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Any additional details" className="h-9 text-xs" />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} className="gap-2 flex-1 sm:flex-none sm:min-w-36">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Add Expense'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [meta,       setMeta]       = useState<any>(null);
  const [editExpense, setEditExpense]= useState<Expense | null>(null);
  const [deleting,   setDeleting]   = useState<number | null>(null);

  // Filters
  const [search,   setSearch]   = useState('');
  const [catFilter,setCatFilter]= useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [page,     setPage]     = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        apiClient.get('/store/expenses', {
          category:  catFilter  || undefined,
          date_from: dateFrom   || undefined,
          date_to:   dateTo     || undefined,
          per_page: 20, page,
        }),
        apiClient.get('/store/expenses/categories'),
      ]);
      setExpenses(getItems(expRes));
      setMeta((expRes as any).meta?.pagination ?? null);
      setCategories((catRes.data as any)?.categories ?? []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [catFilter, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? expenses.filter(e =>
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase())
      )
    : expenses;

  const totalShown = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const handleDelete = async (exp: Expense) => {
    if (!confirm(`Delete expense "${exp.description}"?`)) return;
    setDeleting(exp.id);
    try {
      await apiClient.delete(`/store/expenses/${exp.id}`);
      toast.success('Expense deleted.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(null); }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground mt-1">Record and track store operating costs</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── LEFT: Add / Edit Form ──────────────────────────── */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {editExpense ? (
              <motion.div key="edit" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }}>
                <Card className="p-5 border-primary/30 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-display font-bold text-lg">Edit Expense</h2>
                      <p className="text-xs text-muted-foreground">{editExpense.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditExpense(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ExpenseForm
                    initial={{
                      expense_date:   editExpense.expense_date,
                      category:       editExpense.category,
                      description:    editExpense.description,
                      amount:         String(editExpense.amount),
                      payment_method: editExpense.payment_method,
                      reference:      editExpense.reference ?? '',
                      notes:          editExpense.notes ?? '',
                    }}
                    categories={categories}
                    editId={editExpense.id}
                    onSaved={() => { setEditExpense(null); load(); }}
                    onCancel={() => setEditExpense(null)}
                  />
                </Card>
              </motion.div>
            ) : (
              <motion.div key="add" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }}>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-lg">Add Custom Expense</h2>
                      <p className="text-xs text-muted-foreground">Record any store operating cost</p>
                    </div>
                  </div>
                  <ExpenseForm categories={categories} onSaved={load} />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT: Expense List ────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Filters */}
          <Card className="p-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-36">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search…" className="pl-8 h-8 text-xs" />
              </div>
              <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
                className="h-8 rounded-md border bg-background px-2 text-xs">
                <option value="">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="h-8 w-32 text-xs" />
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="h-8 w-32 text-xs" />
              <Button variant="ghost" size="sm" className="h-8 text-xs px-2"
                onClick={() => { setCatFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1); }}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>

          {/* List */}
          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-20 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">No expenses found.</p>
                <p className="text-xs text-muted-foreground mt-1">Use the form on the left to record an expense.</p>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {filtered.map((exp, i) => (
                    <motion.div key={exp.id}
                      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.02 }}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 hover:bg-muted/10 transition-colors',
                        editExpense?.id === exp.id && 'bg-primary/5'
                      )}>
                      {/* Date */}
                      <div className="text-center flex-shrink-0 w-12 pt-0.5">
                        <p className="text-xs font-bold text-muted-foreground">
                          {new Date(exp.expense_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}
                        </p>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-sm">{exp.description}</p>
                          <span className="text-xs bg-muted/60 px-2 py-0.5 rounded-full">{exp.category}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', METHOD_BADGE[exp.payment_method])}>
                            {exp.payment_method.replace('_',' ')}
                          </span>
                          {exp.reference && (
                            <span className="text-xs text-muted-foreground font-mono">#{exp.reference}</span>
                          )}
                        </div>
                      </div>

                      {/* Amount + Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="font-mono font-bold text-sm">
                          {Number(exp.amount).toLocaleString('en', { minimumFractionDigits:2 })}
                        </p>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => setEditExpense(exp)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(exp)} disabled={deleting===exp.id}>
                            {deleting===exp.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/10 text-xs">
                  <span className="text-muted-foreground">
                    Total shown: <span className="font-mono font-bold text-foreground">
                      Rs {totalShown.toLocaleString('en', { minimumFractionDigits:2 })}
                    </span>
                  </span>
                  {meta && meta.last_page > 1 && (
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-6 w-6" disabled={page<=1} onClick={() => setPage(p=>p-1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-muted-foreground">{page}/{meta.last_page}</span>
                      <Button variant="outline" size="icon" className="h-6 w-6" disabled={page>=meta.last_page} onClick={() => setPage(p=>p+1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
