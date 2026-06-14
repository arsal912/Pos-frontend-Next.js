'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Printer, RefreshCw, Loader2, Gift, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Sale } from '@/types';
import type { OfflineCompletionResult } from '@/lib/offline/offline-sale';
import type { OfflineCart } from '@/lib/offline/cart';

interface OnlineProps {
  sale:           Sale;
  onNewSale:      () => void;
  loyaltyEarned?: { points: number; balance_after: number } | null;
}

interface OfflineProps {
  offlineResult:  OfflineCompletionResult;
  offlineCart:    OfflineCart;
  onNewSale:      () => void;
}

type Props = OnlineProps | OfflineProps;

function isOfflineMode(p: Props): p is OfflineProps {
  return 'offlineResult' in p;
}

/** Escape user-supplied strings before interpolating into innerHTML to prevent XSS. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export default function ReceiptScreen(props: Props) {
  const [countdown, setCountdown] = useState(8);
  const [printing,  setPrinting]  = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); props.onNewSale(); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [props.onNewSale]);

  // ── Online receipt (server-rendered) ────────────────────────────────────

  const openServerReceipt = async (format: string) => {
    if (!isOfflineMode(props)) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res   = await fetch(`/api/backend/store/pos/sales/${props.sale.id}/receipt?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const html = await res.text();
      const win  = window.open('', '_blank');
      if (win) { win.document.documentElement.innerHTML = html; win.print(); }
    }
  };

  const handlePrint = async () => {
    if (isOfflineMode(props)) {
      printOfflineReceipt(props.offlineResult, props.offlineCart);
      return;
    }
    setPrinting(true);
    try { await openServerReceipt('thermal'); }
    finally { setPrinting(false); }
  };

  // ── Offline receipt (client-rendered) ────────────────────────────────────

  const printOfflineReceipt = (result: OfflineCompletionResult, cart: OfflineCart) => {
    const storeName = 'POS System'; // TODO: read from store_meta cache
    const lines = [
      `<html><head><style>`,
      `body{font-family:monospace;font-size:12px;width:300px;margin:0 auto;padding:8px}`,
      `hr{border:1px dashed #666} .center{text-align:center} .right{text-align:right}`,
      `table{width:100%} td{vertical-align:top}`,
      `.offline-badge{background:#f59e0b;color:white;padding:2px 6px;border-radius:4px;font-size:10px}`,
      `</style></head><body>`,
      `<div class="center"><h2>${escHtml(storeName)}</h2>`,
      `<p><span class="offline-badge">⚡ OFFLINE SALE</span></p>`,
      `<p><strong>${escHtml(result.offline_reference)}</strong></p>`,
      `<p>${new Date().toLocaleString()}</p></div><hr>`,
    ];

    if (cart.customer) {
      lines.push(`<p>Customer: ${escHtml(cart.customer.name)}</p>`);
      if (cart.customer.phone) lines.push(`<p>Phone: ${escHtml(cart.customer.phone)}</p>`);
      lines.push(`<hr>`);
    }

    lines.push(`<table>`);
    for (const item of cart.items) {
      lines.push(`<tr><td>${escHtml(item.product_name)}</td><td class="right">${item.line_total.toFixed(2)}</td></tr>`);
      lines.push(`<tr><td style="font-size:10px;color:#666">&nbsp;&nbsp;${item.quantity} × ${item.unit_price.toFixed(2)}</td><td></td></tr>`);
    }
    lines.push(`</table><hr>`);

    if (cart.discount_amount > 0) {
      lines.push(`<div style="display:flex;justify-content:space-between"><span>Discount</span><span>-${cart.discount_amount.toFixed(2)}</span></div>`);
    }
    if (cart.tax_amount > 0) {
      lines.push(`<div style="display:flex;justify-content:space-between"><span>Tax</span><span>${cart.tax_amount.toFixed(2)}</span></div>`);
    }
    lines.push(`<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px"><span>TOTAL</span><span>${result.total.toFixed(2)}</span></div>`);

    if (result.change_given > 0) {
      lines.push(`<div style="display:flex;justify-content:space-between"><span>Change</span><span>${result.change_given.toFixed(2)}</span></div>`);
    }

    lines.push(`<hr>`);
    lines.push(`<p style="font-size:10px;text-align:center;color:#666">Offline sale — will sync automatically when connected.<br>Reference: ${escHtml(result.offline_reference)}</p>`);
    lines.push(`</body></html>`);

    const win = window.open('', '_blank');
    if (win) { win.document.documentElement.innerHTML = lines.join('\n'); win.print(); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const offline     = isOfflineMode(props);
  const saleNumber  = offline ? props.offlineResult.offline_reference : props.sale.sale_number;
  const total       = offline ? props.offlineResult.total             : Number(props.sale.total);
  const changeGiven = offline ? props.offlineResult.change_given      : Number(props.sale.change_given ?? 0);
  const loyalty     = offline
    ? (props.offlineResult.loyalty_earned > 0 ? { points: props.offlineResult.loyalty_earned, balance_after: 0 } : null)
    : ('loyaltyEarned' in props ? props.loyaltyEarned : null);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 bg-background flex flex-col items-center justify-center z-40 p-8"
    >
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}>
        <CheckCircle2 className={`h-24 w-24 mx-auto mb-6 ${offline ? 'text-amber-500' : 'text-success'}`} />
      </motion.div>

      <h1 className="font-display text-4xl font-bold text-center mb-2">
        {offline ? 'Offline Sale Saved!' : 'Sale Complete!'}
      </h1>
      <p className="text-muted-foreground text-center mb-1">
        {saleNumber} · Total {total.toFixed(2)}
      </p>

      {/* Offline sync notice */}
      {offline && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mt-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 max-w-sm text-center">
          <WifiOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Sale saved offline. Will sync automatically when internet is restored.
          </p>
        </motion.div>
      )}

      {changeGiven > 0 && (
        <div className="mt-3 px-4 py-2 bg-success/10 rounded-xl text-center">
          <p className="text-success font-bold text-lg">Change: {changeGiven.toFixed(2)}</p>
        </div>
      )}

      {loyalty && loyalty.points > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mt-3 px-4 py-2.5 bg-success/10 border border-success/30 rounded-xl flex items-center gap-2">
          <Gift className="h-4 w-4 text-success flex-shrink-0" />
          <p className="text-sm text-success font-medium">
            +{loyalty.points.toFixed(0)} points earned
            {loyalty.balance_after > 0 && ` · Balance: ${loyalty.balance_after.toFixed(0)} pts`}
          </p>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <Button variant="outline" onClick={handlePrint} disabled={printing} className="gap-2">
          {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Print Receipt
        </Button>
        {!offline && (
          <>
            <Button variant="outline" onClick={() => openServerReceipt('a4')} className="gap-2">
              <Printer className="h-4 w-4" />Print A4
            </Button>
          </>
        )}
      </div>

      <Button onClick={props.onNewSale} className="mt-8 h-12 px-8 gap-2 text-base">
        <RefreshCw className="h-5 w-5" />
        New Sale ({countdown}s)
      </Button>
    </motion.div>
  );
}
