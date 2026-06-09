'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Loader2, DollarSign, WifiOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { OFFLINE_BLOCKED_METHODS, type OfflinePayment } from '@/lib/offline/offline-sale';
import type { PaymentMethod, Sale } from '@/types';

interface PaymentRow {
  method:    string;
  amount:    string;
  reference: string; // for card_manual, bank_transfer
}

interface Props {
  // Online mode: pass sale
  sale?:         Sale;
  onPay?:        (payments: { method: PaymentMethod; amount: number }[]) => Promise<void>;
  // Offline mode: pass total directly
  offlineTotal?: number;
  onPayOffline?: (payments: OfflinePayment[]) => Promise<void>;
  isOffline?:    boolean;
  onClose:       () => void;
}

interface MethodDef { id: string; label: string; emoji: string; needsRef?: boolean }

const ALL_METHODS: MethodDef[] = [
  { id: 'cash',           label: 'Cash',           emoji: '💵' },
  { id: 'card_manual',    label: 'Card (manual)',   emoji: '💳', needsRef: true },
  { id: 'on_credit',      label: 'Store Credit',    emoji: '🏪' },
  { id: 'loyalty_points', label: 'Loyalty Points',  emoji: '⭐' },
  { id: 'bank_transfer',  label: 'Bank Transfer',   emoji: '🏦', needsRef: true },
  { id: 'jazzcash',       label: 'JazzCash',        emoji: '🟠' },
  { id: 'easypaisa',      label: 'Easypaisa',       emoji: '🟢' },
  { id: 'other',          label: 'Other',           emoji: '📋', needsRef: true },
];

const QUICK_CASH = [500, 1000, 2000, 5000];

export default function PaymentModal({ sale, onPay, offlineTotal, onPayOffline, isOffline = false, onClose }: Props) {
  const total     = offlineTotal ?? Number(sale?.total ?? 0);
  const alreadyPaid = Number(sale?.paid_amount ?? 0);
  const remaining = Math.max(0, total - alreadyPaid);

  const availableMethods = isOffline
    ? ALL_METHODS.filter(m => !(OFFLINE_BLOCKED_METHODS as readonly string[]).includes(m.id))
    : ALL_METHODS;

  const [rows,   setRows]   = useState<PaymentRow[]>([{ method: 'cash', amount: remaining.toFixed(2), reference: '' }]);
  const [paying, setPaying] = useState(false);

  const totalEntered = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const change       = Math.max(0, totalEntered - remaining);
  const canComplete  = totalEntered >= remaining - 0.001;

  const addRow    = () => setRows(p => [...p, { method: 'cash', amount: '', reference: '' }]);
  const removeRow = (i: number) => setRows(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof PaymentRow, val: string) =>
    setRows(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const needsRef = (method: string) => ALL_METHODS.find(m => m.id === method)?.needsRef ?? false;

  const handlePay = async () => {
    if (!canComplete) return;
    setPaying(true);
    try {
      if (isOffline && onPayOffline) {
        await onPayOffline(rows.map(r => ({
          method:    r.method,
          amount:    parseFloat(r.amount) || 0,
          reference: r.reference || null,
        })));
      } else if (onPay) {
        await onPay(rows.map(r => ({ method: r.method as PaymentMethod, amount: parseFloat(r.amount) || 0 })));
      }
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
          <div className={cn('px-6 py-5 text-white', isOffline ? 'bg-amber-600' : 'bg-primary')}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-xl">Payment</h2>
                {isOffline && (
                  <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
                    <WifiOff className="h-3 w-3" />Offline
                  </span>
                )}
              </div>
              <button onClick={onClose} className="opacity-70 hover:opacity-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-display font-bold">{remaining.toFixed(2)}</span>
              <span className="opacity-70 text-sm">due</span>
            </div>
            {alreadyPaid > 0 && <p className="text-sm opacity-70 mt-1">({alreadyPaid.toFixed(2)} already paid)</p>}
          </div>

          <div className="p-5 space-y-4">
            {/* Offline notice */}
            {isOffline && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <strong>Offline mode</strong> — JazzCash and Easypaisa require internet.
                Sale will sync automatically when connected.
              </div>
            )}

            {/* Quick cash */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Cash</p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm"
                  onClick={() => setRows([{ method: 'cash', amount: remaining.toFixed(2), reference: '' }])}
                  className="gap-1 text-xs">
                  <DollarSign className="h-3 w-3" />Exact
                </Button>
                {QUICK_CASH.map(amt => (
                  <Button key={amt} variant="outline" size="sm"
                    onClick={() => setRows([{ method: 'cash', amount: amt.toFixed(2), reference: '' }])}
                    className="text-xs">
                    {amt.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Payment rows */}
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <select value={row.method} onChange={e => updateRow(i, 'method', e.target.value)}
                      className="h-9 rounded-md border bg-background px-2 text-sm flex-shrink-0 w-40">
                      {availableMethods.map(m => (
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
                  {needsRef(row.method) && (
                    <Input value={row.reference} onChange={e => updateRow(i, 'reference', e.target.value)}
                      placeholder="Reference / transaction ID (optional)"
                      className="h-8 text-xs" />
                  )}
                </div>
              ))}
            </div>

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
              {totalEntered < remaining - 0.001 && totalEntered > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-destructive">Still due</span>
                  <span className="font-mono font-bold text-destructive">{(remaining - totalEntered).toFixed(2)}</span>
                </div>
              )}
            </div>

            <Button onClick={handlePay} disabled={!canComplete || paying}
              className={cn('w-full h-12 text-base font-bold gap-2', isOffline && 'bg-amber-600 hover:bg-amber-700')}>
              {paying && <Loader2 className="h-5 w-5 animate-spin" />}
              {canComplete
                ? isOffline
                  ? `Complete Offline Sale — ${total.toFixed(2)}`
                  : `Complete Sale — ${total.toFixed(2)}`
                : 'Enter full payment to continue'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
