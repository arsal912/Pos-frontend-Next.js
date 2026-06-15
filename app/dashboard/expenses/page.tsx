'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Loader2, Search, Filter,
  X, Save, ChevronLeft, ChevronRight, TrendingDown,
  Calendar, CreditCard, Wallet, RefreshCw,
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
  id: number;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other';
  branch_id: number | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash',          icon: '💵' },
  { value: 'card',          label: 'Card',           icon: '💳' },
  { value: 'bank_transfer', label: 'Bank Transfer',  icon: '🏦' },
  { value: 'cheque',        label: 'Cheque',         icon: '📄' },
  { value: 'other',         label: 'Other',          icon: '📋' },
];

const DEFAULT_CATEGORIES = [
  'Rent', 'Utilities', 'Salary', 'Marketing', 'Supplies',
  'Maintenance', 'Transport', 'Food & Beverages', 'Insurance', 'Other',
];

const METHOD_COLORS: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  card: 'bg-blue-100 text-blue-700',
  bank_transfer: 'bg-violet-100 text-violet-700',
  cheque: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-600',
};

// ── Expense Modal ─────────────────────────────────────────────────────────────

function ExpenseModal({ expense, categories, onClose, onSaved }: {
  expense: Expense | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !expense;
  const today = new Date().toISOString().split('T')[0];

  const [date,    setDate]    = useState(expense?.expense_date ?? today);
  const [cat,     setCat]     = useState(expense?.category ?? '');
  const [desc,    setDesc]    = useState(expense?.description ?? '');
  const [amount,  setAmount]  = useState(expense?.amount?.toString() ?? '');
  const [method,  setMethod]  = useState<Expense['payment_method']>(expense?.payment_method ?? 'cash');
  const [ref,     setRef]     = useState(expense?.reference ?? '');
  const [notes,   setNotes]   = useState(expense?.notes ?? '');
  const [catInput,setCatInput]= useState(expense?.category ?? '');
  const [saving,  setSaving]  = useState(false);
  const [showCatSuggestions, setShowCatSuggestions] = useState(false);

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])].sort();
  const filteredCats  = allCategories.filter(c =>
    c.toLowerCase().includes(catInput.toLowerCase()) && c !== catInput
  );

  const handleSave = async () => {
    if (!date)   return toast.error('Date is required.');
    if (!cat)    return toast.error('Category is required.');
    if (!desc)   return toast.error('Description is required.');
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount.');
    setSaving(true);
    try {
      const body = {
        expense_date:   date,
        category:       cat,
        description:    desc,
        amount:         parseFloat(amount),
        payment_method: method,
        reference:      ref   || undefined,
        notes:          notes || undefined,
      };
      if (isNew) {
        await apiClient.post('/store/expenses', body);
        toast.success('Expense recorded.');
      } else {
        await apiClient.put(`/store/expenses/${expense!.id}`, body);
        toast.success('Expense updated.');
      }
      onSaved();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg">

        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-display font-bold text-xl">
            {isNew ? 'Record Expense' : 'Edit Expense'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} max={today} />
            </div>
            {/* Amount */}
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rs</span>
                <Input type="number" value={amount} min="0.01" step="0.01"
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00" className="pl-9 font-mono" />
              </div>
            </div>
          </div>

          {/* Category with autocomplete */}
          <div className="space-y-1.5 relative">
            <Label>Category *</Label>
            <Input
              value={catInput}
              onChange={e => { setCatInput(e.target.value); setCat(e.target.value); setShowCatSuggestions(true); }}
              onFocus={() => setShowCatSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCatSuggestions(false), 150)}
              placeholder="e.g. Rent, Salary, Utilities…"
            />
            {showCatSuggestions && filteredCats.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border rounded-xl shadow-lg overflow-hidden">
                {filteredCats.slice(0,6).map(c => (
                  <button key={c} onMouseDown={() => { setCat(c); setCatInput(c); setShowCatSuggestions(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What was this expense for?" />
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_METHODS.map(m => (
                <button key={m.value}
                  onClick={() => setMethod(m.value as Expense['payment_method'])}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    method === m.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted/50'
                  )}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference (optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Reference <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="Invoice/receipt #" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra detail" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? 'Record Expense' : 'Save Changes'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [meta,       setMeta]       = useState<any>(null);
  const [editExpense, setEditExpense]= useState<Expense | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);
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
        e.category.toLowerCase().includes(search.toLowerCase()) ||
        (e.reference ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : expenses;

  // Summary stats from current page
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

  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track and manage store operating costs</p>
        </div>
        <Button onClick={() => { setEditExpense(null); setModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />Record Expense
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'This Month', icon: Calendar, color: 'text-blue-600',
            click: () => {
              setDateFrom(thisMonth + '-01');
              setDateTo(new Date().toISOString().split('T')[0]);
              setPage(1);
            },
          },
          {
            label: 'This Year', icon: TrendingDown, color: 'text-violet-600',
            click: () => {
              setDateFrom(new Date().getFullYear() + '-01-01');
              setDateTo(new Date().toISOString().split('T')[0]);
              setPage(1);
            },
          },
          {
            label: 'All Time', icon: Wallet, color: 'text-green-600',
            click: () => { setDateFrom(''); setDateTo(''); setPage(1); },
          },
        ].map(s => (
          <Card key={s.label} className="p-4 cursor-pointer hover:border-primary/40 transition-colors" onClick={s.click}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn('h-4 w-4', s.color)} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="font-display font-bold text-lg">Click to filter</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search description or reference…" className="pl-9 h-9" />
          </div>
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="h-9 w-36 text-sm" placeholder="From" />
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="h-9 w-36 text-sm" placeholder="To" />
          <Button variant="ghost" size="sm" onClick={() => { setCatFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Reset
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <TrendingDown className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground font-medium">No expenses found.</p>
            <Button variant="outline" size="sm" className="mt-3 gap-2"
              onClick={() => { setEditExpense(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4" />Record your first expense
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((exp, i) => (
                    <motion.tr key={exp.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.01 }}
                      className="border-b last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono whitespace-nowrap">
                        {new Date(exp.expense_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted/50 px-2 py-0.5 rounded-full">{exp.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{exp.description}</p>
                        {exp.reference && <p className="text-xs text-muted-foreground font-mono">{exp.reference}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', METHOD_COLORS[exp.payment_method])}>
                          {exp.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {Number(exp.amount).toLocaleString('en', { minimumFractionDigits:2 })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={() => { setEditExpense(exp); setModalOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleDelete(exp)} disabled={deleting === exp.id}>
                            {deleting === exp.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer: total + pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
              <p className="text-sm font-medium">
                Showing total:{' '}
                <span className="font-mono font-bold text-foreground">
                  {totalShown.toLocaleString('en', { minimumFractionDigits:2 })}
                </span>
              </p>
              {meta && meta.last_page > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page<=1} onClick={() => setPage(p=>p-1)} className="h-8 gap-1">
                    <ChevronLeft className="h-4 w-4" />Prev
                  </Button>
                  <span className="text-sm px-2">{page}/{meta.last_page}</span>
                  <Button variant="outline" size="sm" disabled={page>=meta.last_page} onClick={() => setPage(p=>p+1)} className="h-8 gap-1">
                    Next<ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ExpenseModal
            expense={editExpense}
            categories={categories}
            onClose={() => setModalOpen(false)}
            onSaved={() => { setModalOpen(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
