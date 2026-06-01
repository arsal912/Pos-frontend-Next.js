'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Printer, RefreshCw, Loader2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Sale } from '@/types';

interface Props {
  sale: Sale;
  onNewSale: () => void;
  loyaltyEarned?: { points: number; balance_after: number } | null;
}

export default function ReceiptScreen({ sale, onNewSale, loyaltyEarned }: Props) {
  const [countdown, setCountdown] = useState(8);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); onNewSale(); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onNewSale]);

  const openReceipt = async (format: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`/api/backend/store/pos/sales/${sale.id}/receipt?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const html = await res.text();
    const win = window.open('', '_blank');
    if (win) {
      // Use innerHTML on a new document instead of document.write (avoids deprecation warning)
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try { await openReceipt('thermal'); }
    finally { setPrinting(false); }
  };

  const handleDownloadPdf = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    fetch(`/api/backend/store/pos/sales/${sale.id}/receipt?pdf=true`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sale.sale_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 bg-background flex flex-col items-center justify-center z-40 p-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
      >
        <CheckCircle2 className="h-24 w-24 text-success mx-auto mb-6" />
      </motion.div>

      <h1 className="font-display text-4xl font-bold text-center mb-2">Sale Complete!</h1>
      <p className="text-muted-foreground text-center mb-1">
        {sale.sale_number} · Total {Number(sale.total).toFixed(2)}
      </p>

      {Number(sale.change_given) > 0 && (
        <div className="mt-2 px-4 py-2 bg-success/10 rounded-xl text-center">
          <p className="text-success font-bold text-lg">Change: {Number(sale.change_given).toFixed(2)}</p>
        </div>
      )}

      {/* Loyalty points earned notification */}
      {loyaltyEarned && loyaltyEarned.points > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 px-4 py-2.5 bg-success/10 border border-success/30 rounded-xl flex items-center gap-2"
        >
          <Gift className="h-4 w-4 text-success flex-shrink-0" />
          <p className="text-sm text-success font-medium">
            +{loyaltyEarned.points.toFixed(0)} points earned · Balance: {loyaltyEarned.balance_after.toFixed(0)} pts
          </p>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <Button variant="outline" onClick={handlePrint} disabled={printing} className="gap-2">
          {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Print Thermal
        </Button>
        <Button variant="outline" onClick={() => openReceipt('a4')} className="gap-2">
          <Printer className="h-4 w-4" />Print A4
        </Button>
        <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
          <Printer className="h-4 w-4" />Download PDF
        </Button>
      </div>

      <Button onClick={onNewSale} className="mt-8 h-12 px-8 gap-2 text-base">
        <RefreshCw className="h-5 w-5" />
        New Sale ({countdown}s)
      </Button>
    </motion.div>
  );
}
