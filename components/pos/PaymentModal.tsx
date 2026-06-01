'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Loader2, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { PaymentMethod, Sale } from '@/types';

interface PaymentRow { method: PaymentMethod; amount: string; }

interface Props {
  sale: Sale;
  onPay: (payments: { method: PaymentMethod; amount: number }[]) => Promise<void>;
  onClose: () => void;
}

const METHODS: { id: PaymentMethod; label: string; emoji: string }[] = [
  { id: 'cash',         label: 'Cash',         emoji: '💵' },
  { id: 'card',         label: 'Card',         emoji: '💳' },
  { id: 'jazzcash',     label: 'JazzCash',     emoji: '🟠' },
  { id: 'easypaisa',   label: 'Easypaisa',    emoji: '🟢' },
  { id: 'store_credit',label: 'Store Credit', emoji: '🏪' },
  { id: 'other',        label: 'Other',        emoji: '📋' },
];

const QUICK_CASH = [500, 1000, 2000, 5000];

export default function PaymentModal({ sale, onPay, onClose }: Props) {
  const total    = Number(sale.total);
  const alreadyPaid = Number(sale.paid_amount);
  const remaining = Math.max(0, total - alreadyPaid);

  const [rows, setRows] = useState<PaymentRow[]>([{ method: 'cash', amount: remaining.toFixed(2) }]);
  const [paying, setPaying] = useState(false);

  const totalEntered = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const change       = Math.max(0, totalEntered - remaining);
  const canComplete  = totalEntered >= remaining;

  const addRow = () => setRows(prev => [...prev, { method: 'cash', amount: '' }]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof PaymentRow, val: string) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const handleQuickCash = (amount: number) => setRows([{ method: 'cash', amount: amount.toFixed(2) }]);

  const handleExactCash = () => setRows([{ method: 'cash', amount: remaining.toFixed(2) }]);

  const handlePay = async () => {
    if (!canComplete) return;
    setPaying(true);
    try {
      await onPay(rows.map(r => ({ method: r.method, amount: parseFloat(r.amount) || 0 })));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md">
        <Card className="shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-5 text-primary-foreground">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold text-xl">Payment</h2>
              <button onClick={onClose} className="opacity-70 hover:opacity-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-display font-bold">{remaining.toFixed(2)}</span>
              <span className="opacity-70 text-sm">due</span>
            </div>
            {alreadyPaid > 0 && (
              <p className="text-sm opacity-70 mt-1">({alreadyPaid.toFixed(2)} already paid)</p>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Quick cash shortcuts */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Cash</p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleExactCash} className="gap-1 text-xs">
                  <DollarSign className="h-3 w-3" />Exact
                </Button>
                {QUICK_CASH.map(amt => (
                  <Button key={amt} variant="outline" size="sm" onClick={() => handleQuickCash(amt)} className="text-xs">
                    {amt.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Payment rows */}
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={row.method} onChange={e => updateRow(i, 'method', e.target.value)}
                    className="h-9 rounded-md border bg-background px-2 text-sm flex-shrink-0 w-36">
                    {METHODS.map(m => (
                      <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>
                    ))}
                  </select>
                  <Input type="number" value={row.amount} min="0" step="0.01"
                    onChange={e => updateRow(i, 'amount', e.target.value)}
                    className="flex-1 h-9 font-mono text-right" placeholder="0.00" />
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(i)} className="text-destructive/60 hover:text-destructive flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add method */}
            <button onClick={addRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" />Add payment method (split)
            </button>

            {/* Summary */}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount entered</span>
                <span className="font-mono font-medium">{totalEntered.toFixed(2)}</span>
              </div>
              {change > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-success font-medium">Change to give</span>
                  <span className="font-mono font-bold text-success">{change.toFixed(2)}</span>
                </div>
              )}
              {totalEntered < remaining && totalEntered > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-destructive">Still due</span>
                  <span className="font-mono font-bold text-destructive">{(remaining - totalEntered).toFixed(2)}</span>
                </div>
              )}
            </div>

            <Button onClick={handlePay} disabled={!canComplete || paying}
              className="w-full h-12 text-base font-bold gap-2">
              {paying && <Loader2 className="h-5 w-5 animate-spin" />}
              {canComplete ? `Complete Sale — ${total.toFixed(2)}` : 'Enter full payment to continue'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
