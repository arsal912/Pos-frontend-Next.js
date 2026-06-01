'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Printer, RefreshCw, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Sale } from '@/types';

interface Props {
  sale: Sale;
  onNewSale: () => void;
}

export default function ReceiptScreen({ sale, onNewSale }: Props) {
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

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`/api/backend/store/pos/sales/${sale.id}/receipt?format=thermal`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const html = await res.text();
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
      }
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintA4 = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`/api/backend/store/pos/sales/${sale.id}/receipt?format=a4`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const html = await res.text();
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleDownloadPdf = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    fetch(`/api/backend/store/pos/sales/${sale.id}/receipt?pdf=true`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${sale.sale_number}.pdf`; a.click();
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

      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <Button variant="outline" onClick={handlePrint} disabled={printing} className="gap-2">
          {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Print Thermal
        </Button>
        <Button variant="outline" onClick={handlePrintA4} className="gap-2">
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
