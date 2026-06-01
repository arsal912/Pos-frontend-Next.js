'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, CreditCard, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'outstanding' | 'aging' | 'payments';

export default function CreditPage() {
  const [tab, setTab] = useState<Tab>('outstanding');
  const [outstanding, setOutstanding] = useState<any[]>([]);
  const [aging, setAging] = useState<any>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [payMeta, setPayMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [payPage, setPayPage] = useState(1);

  // Payment recording
  const [showPay, setShowPay] = useState<any>(null);
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  const loadTab = useCallback(async (t:Tab) => {
    setLoading(true);
    try {
      if (t==='outstanding') { const r = await apiClient.get('/store/credit/outstanding',{per_page:20}); setOutstanding((r as any).data?.data??[]); }
      if (t==='aging') { const r = await apiClient.get('/store/credit/aging'); setAging((r.data as any)?.aging??{}); }
      if (t==='payments') { const r = await apiClient.get('/store/credit/payments',{page:payPage,per_page:20}); setPayments((r as any).data?.data??[]); setPayMeta((r as any).meta?.pagination??null); }
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [payPage]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  const recordPayment = async () => {
    if (!payAmt || parseFloat(payAmt)<=0) return toast.error('Enter a valid amount.');
    setPaying(true);
    try {
      await apiClient.post(`/store/customers/${showPay.id}/credit/payment`,{amount:parseFloat(payAmt),payment_method:payMethod,notes:payNotes||undefined});
      toast.success('Payment recorded.');
      setPayAmt(''); setPayNotes(''); setShowPay(null);
      loadTab('outstanding');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setPaying(false); }
  };

  const fmt = (d:string) => new Date(d).toLocaleDateString();
  const fmtAmt = (n:number) => Number(n).toFixed(2);

  const BUCKET_ORDER = ['current','days_31_60','days_61_90','days_90_plus'];
  const BUCKET_COLORS: Record<string,string> = {current:'text-success',days_31_60:'text-warning-foreground',days_61_90:'text-orange-500',days_90_plus:'text-destructive'};

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-4xl font-bold tracking-tight">Credit Management</h1><p className="text-muted-foreground mt-1">Track customer credit and outstanding balances</p></div>

      <div className="border-b flex gap-0">
        {([['outstanding','Outstanding'],['aging','Aging Report'],['payments','Payments']] as [Tab,string][]).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',tab===t?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground')}>{l}</button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div> : (
        <>
          {/* Outstanding */}
          {tab==='outstanding' && (
            <Card className="overflow-hidden">
              {outstanding.length===0 ? <p className="text-center py-16 text-muted-foreground">No outstanding balances.</p>
              : <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Outstanding</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credit Limit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr></thead>
                  <tbody>{outstanding.map((c:any)=>(
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                        <p className="text-xs text-muted-foreground">{c.phone??c.code}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-destructive">{fmtAmt(c.outstanding_balance)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{c.credit_limit!=null?fmtAmt(c.credit_limit):'∞'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>{setShowPay(c);setPayAmt(fmtAmt(c.outstanding_balance));}}>Pay</Button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              }
            </Card>
          )}

          {/* Aging */}
          {tab==='aging' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {BUCKET_ORDER.map(bucket=>{
                const b = aging[bucket];
                if (!b) return null;
                return (
                  <Card key={bucket} className="p-5">
                    <p className="text-xs text-muted-foreground mb-2">{b.label}</p>
                    <p className={cn('text-2xl font-display font-bold', BUCKET_COLORS[bucket])}>{fmtAmt(b.amount)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{b.customers} customer{b.customers!==1?'s':''}</p>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Payments */}
          {tab==='payments' && (
            <Card className="overflow-hidden">
              {payments.length===0 ? <p className="text-center py-16 text-muted-foreground">No payments recorded yet.</p>
              : <>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                    </tr></thead>
                    <tbody>{payments.map((p:any)=>(
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 text-muted-foreground">{fmt(p.created_at)}</td>
                        <td className="px-4 py-3">{p.customer?.name??`#${p.customer_id}`}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-success">{fmtAmt(Math.abs(Number(p.amount)))}</td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{p.payment_method??'—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {payMeta&&payMeta.last_page>1&&(
                    <div className="flex justify-between items-center px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">Total: {payMeta.total}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={payPage<=1} onClick={()=>setPayPage(p=>p-1)} className="gap-1"><ChevronLeft className="h-4 w-4"/>Prev</Button>
                        <span className="text-sm flex items-center px-2">{payPage}/{payMeta.last_page}</span>
                        <Button variant="outline" size="sm" disabled={payPage>=payMeta.last_page} onClick={()=>setPayPage(p=>p+1)} className="gap-1">Next<ChevronRight className="h-4 w-4"/></Button>
                      </div>
                    </div>
                  )}
                </>
              }
            </Card>
          )}
        </>
      )}

      {/* Quick payment modal */}
      {showPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowPay(null)}/>
          <Card className="relative z-10 w-full max-w-md p-6">
            <h2 className="font-display font-bold text-lg mb-4">Record Payment — {showPay.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Outstanding: <strong className="text-destructive">{fmtAmt(showPay.outstanding_balance)}</strong></p>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Amount</Label><Input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="0.00"/></div>
              <div className="space-y-1.5"><Label>Payment Method</Label>
                <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  {['cash','card','bank_transfer','jazzcash','easypaisa','other'].map(m=><option key={m} value={m} className="capitalize">{m}</option>)}
                </select></div>
              <div className="space-y-1.5"><Label>Notes</Label><Input value={payNotes} onChange={e=>setPayNotes(e.target.value)} placeholder="Optional"/></div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" onClick={()=>setShowPay(null)} className="flex-1">Cancel</Button>
              <Button onClick={recordPayment} disabled={paying} className="flex-1 gap-2">{paying&&<Loader2 className="h-4 w-4 animate-spin"/>}Record Payment</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
