'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, ArrowLeft, Phone, Mail, MapPin, Building2, Calendar,
  Gift, CreditCard, FileText, MessageCircle, Star, Plus, X,
  TrendingUp, ShoppingBag, Pencil, Send,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Customer, LoyaltyTransaction, CreditTransaction, CustomerNote } from '@/types';

type Tab = 'overview' | 'purchases' | 'loyalty' | 'credit' | 'notes' | 'communications';

const TABS: {id:Tab; label:string; icon:React.ElementType}[] = [
  {id:'overview',      label:'Overview',       icon:FileText},
  {id:'purchases',     label:'Purchases',      icon:ShoppingBag},
  {id:'loyalty',       label:'Loyalty',        icon:Gift},
  {id:'credit',        label:'Credit',         icon:CreditCard},
  {id:'notes',         label:'Notes',          icon:FileText},
  {id:'communications',label:'Messages',       icon:MessageCircle},
];

function fmt(d:string|null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function fmtMoney(n:number|null|undefined) {
  return n != null ? Number(n).toFixed(2) : '—';
}

export default function CustomerDetailPage({params}:{params:{id:string}}) {
  const {id} = params;
  const [customer, setCustomer] = useState<Customer|null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  // Tab data
  const [loyaltyTx, setLoyaltyTx] = useState<LoyaltyTransaction[]>([]);
  const [creditTx, setCreditTx] = useState<CreditTransaction[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Note form
  const [newNote, setNewNote] = useState('');
  const [notePinned, setNotePinned] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  // Credit payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [payingSaving, setPayingSaving] = useState(false);

  // Loyalty adjust form
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjPoints, setAdjPoints] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  // Message form
  const [showMessage, setShowMessage] = useState(false);
  const [msgChannel, setMsgChannel] = useState<'sms'|'email'|'whatsapp'>('sms');
  const [msgBody, setMsgBody] = useState('');
  const [msgSaving, setMsgSaving] = useState(false);

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/store/customers/${id}`);
      setCustomer((res.data as any)?.customer ?? null);
    } catch { toast.error('Failed to load customer.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadCustomer(); }, [loadCustomer]);

  const loadTab = useCallback(async (t:Tab) => {
    if (t === 'overview') return;
    setTabLoading(true);
    try {
      switch (t) {
        case 'loyalty':
          setLoyaltyTx(((await apiClient.get(`/store/customers/${id}/loyalty-history`)) as any).data?.data ?? []);
          break;
        case 'credit':
          setCreditTx(((await apiClient.get(`/store/customers/${id}/credit-history`)) as any).data?.data ?? []);
          break;
        case 'notes':
          setNotes(((await apiClient.get(`/store/customers/${id}/notes`)) as any).data?.data ?? []);
          break;
        case 'purchases':
          setPurchases(((await apiClient.get(`/store/customers/${id}/purchases`)) as any).data?.sales ?? []);
          break;
        case 'communications':
          setCommunications(((await apiClient.get(`/store/customers/${id}/communications`)) as any).data?.data ?? []);
          break;
      }
    } catch { /* ignore tab load errors */ }
    finally { setTabLoading(false); }
  }, [id]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await apiClient.post(`/store/customers/${id}/notes`, {note:newNote, is_pinned:notePinned});
      setNewNote(''); setNotePinned(false);
      toast.success('Note added.');
      loadTab('notes');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (noteId:number) => {
    try {
      await apiClient.delete(`/store/customers/${id}/notes/${noteId}`);
      setNotes(n => n.filter(nn => nn.id !== noteId));
      toast.success('Note deleted.');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleCreditPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return toast.error('Enter a valid amount.');
    setPayingSaving(true);
    try {
      await apiClient.post(`/store/customers/${id}/credit/payment`, {
        amount: parseFloat(payAmount), payment_method: payMethod, notes: payNotes || undefined,
      });
      toast.success('Payment recorded.');
      setPayAmount(''); setPayNotes(''); setShowPaymentForm(false);
      loadCustomer(); loadTab('credit');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setPayingSaving(false); }
  };

  const handleAdjustLoyalty = async () => {
    if (!adjPoints || parseFloat(adjPoints) === 0) return toast.error('Enter points amount.');
    if (!adjReason.trim()) return toast.error('Reason is required.');
    setAdjSaving(true);
    try {
      await apiClient.post(`/store/customers/${id}/loyalty/adjust`, {
        points: parseFloat(adjPoints), reason: adjReason,
      });
      toast.success('Loyalty balance adjusted.');
      setAdjPoints(''); setAdjReason(''); setShowAdjust(false);
      loadCustomer(); loadTab('loyalty');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setAdjSaving(false); }
  };

  const handleSendMessage = async () => {
    if (!msgBody.trim()) return toast.error('Message body is required.');
    setMsgSaving(true);
    try {
      const res = await apiClient.post(`/store/customers/${id}/send-message`, {
        channel: msgChannel, body: msgBody,
      });
      const waLink = (res.data as any)?.whatsapp_link;
      if (waLink) { window.open(waLink, '_blank'); }
      toast.success((res as any).message ?? 'Message logged.');
      setMsgBody(''); setShowMessage(false);
      loadTab('communications');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setMsgSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>;
  if (!customer) return <p className="text-center py-16 text-muted-foreground">Customer not found.</p>;

  const initials = customer.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/customers"><ArrowLeft className="h-4 w-4"/></Link></Button>
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">{initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-3xl font-bold">{customer.name}</h1>
            <span className="font-mono text-sm text-muted-foreground">{customer.code}</span>
            {customer.group && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:customer.group.color+'20',color:customer.group.color}}>
                {customer.group.name}
              </span>
            )}
            <Badge variant={customer.is_active?'success':'outline'}>{customer.is_active?'Active':'Inactive'}</Badge>
          </div>
          {customer.tags && customer.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">{customer.tags.map(t=><span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{t}</span>)}</div>
          )}
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={()=>setShowMessage(true)} className="gap-1.5"><Send className="h-3.5 w-3.5"/>Message</Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Loyalty Points', value:Number(customer.loyalty_points_balance??0).toFixed(0)+' pts', icon:Gift, color:'text-success', action:<button onClick={()=>setShowAdjust(true)} className="text-xs text-primary hover:underline">Adjust</button>},
          {label:'Outstanding Credit', value:fmtMoney(customer.outstanding_balance), icon:CreditCard, color:(customer.outstanding_balance??0)>0?'text-destructive':'text-muted-foreground', action:<button onClick={()=>setShowPaymentForm(true)} className="text-xs text-primary hover:underline">Record Payment</button>},
          {label:'Lifetime Value', value:fmtMoney(customer.lifetime_value), icon:TrendingUp, color:'text-primary'},
          {label:'Total Purchases', value:String(customer.total_purchases_count??0), icon:ShoppingBag, color:'text-accent'},
        ].map(s=>(
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn('h-4 w-4 flex-shrink-0',s.color)}/>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="font-display font-bold text-xl">{s.value}</p>
            {s.action && <div className="mt-1">{s.action}</div>}
          </Card>
        ))}
      </div>

      {/* Inline forms */}
      {showAdjust && (
        <Card className="p-4 border-primary/30">
          <p className="font-medium text-sm mb-3">Adjust Loyalty Points</p>
          <div className="flex gap-3 flex-wrap">
            <Input type="number" value={adjPoints} onChange={e=>setAdjPoints(e.target.value)} placeholder="e.g. 100 or -50" className="w-32 h-8 text-sm"/>
            <Input value={adjReason} onChange={e=>setAdjReason(e.target.value)} placeholder="Reason (required)" className="flex-1 h-8 text-sm"/>
            <Button size="sm" className="h-8 gap-1" onClick={handleAdjustLoyalty} disabled={adjSaving}>{adjSaving&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}Apply</Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={()=>setShowAdjust(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {showPaymentForm && (
        <Card className="p-4 border-success/30">
          <p className="font-medium text-sm mb-3">Record Credit Payment — Outstanding: <strong>{fmtMoney(customer.outstanding_balance)}</strong></p>
          <div className="flex gap-3 flex-wrap">
            <Input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Amount" className="w-32 h-8 text-sm"/>
            <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-sm">
              {['cash','card','bank_transfer','jazzcash','easypaisa','other'].map(m=><option key={m} value={m} className="capitalize">{m}</option>)}
            </select>
            <Input value={payNotes} onChange={e=>setPayNotes(e.target.value)} placeholder="Notes (optional)" className="flex-1 h-8 text-sm"/>
            <Button size="sm" className="h-8 gap-1" onClick={handleCreditPayment} disabled={payingSaving}>{payingSaving&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}Record</Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={()=>setShowPaymentForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {showMessage && (
        <Card className="p-4 border-accent/30">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm">Send Message</p>
            <button onClick={()=>setShowMessage(false)} className="text-muted-foreground"><X className="h-4 w-4"/></button>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(['sms','email','whatsapp'] as const).map(ch=>(
                <button key={ch} onClick={()=>setMsgChannel(ch)}
                  className={cn('px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors',
                    msgChannel===ch?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  {ch}
                </button>
              ))}
            </div>
            <textarea value={msgBody} onChange={e=>setMsgBody(e.target.value)} rows={3} placeholder="Message body… Use {{name}}, {{loyalty_points}}, {{outstanding_credit}}, {{store_name}}"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"/>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1" onClick={handleSendMessage} disabled={msgSaving}>{msgSaving&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}
                {msgChannel==='whatsapp'?'Open WhatsApp':'Log Message'}
              </Button>
              <Button variant="ghost" size="sm" onClick={()=>setShowMessage(false)}>Cancel</Button>
            </div>
            {msgChannel!=='whatsapp' && <p className="text-xs text-muted-foreground">SMS/Email delivery will be enabled in Phase 5. This logs the message.</p>}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                tab===t.id?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground')}>
              <t.icon className="h-3.5 w-3.5"/>{t.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-6">
        {tabLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div> : (
          <>
            {/* Overview */}
            {tab==='overview' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-display font-bold mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    {customer.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{customer.phone}</p>}
                    {customer.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/>{customer.email}</p>}
                    {customer.company && <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground"/>{customer.company}</p>}
                    {customer.city && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/>{customer.city}{customer.country?`, ${customer.country}`:''}</p>}
                    {customer.date_of_birth && <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/>DOB: {fmt(customer.date_of_birth)}</p>}
                    {customer.last_purchase_at && <p className="text-muted-foreground text-xs mt-2">Last purchase: {fmt(customer.last_purchase_at)}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="font-display font-bold mb-3">Marketing Preferences</h3>
                  <div className="space-y-2 text-sm">
                    {[['SMS',customer.sms_marketing_opted_in],['Email',customer.email_marketing_opted_in],['WhatsApp',customer.whatsapp_marketing_opted_in]].map(([l,v])=>(
                      <div key={l as string} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{l} marketing</span>
                        <Badge variant={v?'success':'outline'} className="text-xs">{v?'Opted in':'Opted out'}</Badge>
                      </div>
                    ))}
                  </div>
                  {customer.referral_code && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">Referral Code</p>
                      <p className="font-mono font-bold">{customer.referral_code}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Purchases */}
            {tab==='purchases' && (
              purchases.length===0 ? <p className="text-center py-8 text-muted-foreground text-sm">No purchases yet.</p>
              : <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30"><th className="px-3 py-2 text-left">Sale #</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                  <tbody>{purchases.map((s:any)=>(
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono font-medium">{s.sale_number}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fmt(s.sale_date)}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(s.total).toFixed(2)}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="capitalize">{s.status}</Badge></td>
                    </tr>
                  ))}</tbody>
                </table>
            )}

            {/* Loyalty */}
            {tab==='loyalty' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-display font-bold text-success">{Number(customer.loyalty_points_balance??0).toFixed(0)} pts</p>
                    <p className="text-sm text-muted-foreground">Current balance</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={()=>setShowAdjust(true)}>Adjust</Button>
                </div>
                {loyaltyTx.length===0 ? <p className="text-center py-8 text-muted-foreground text-sm">No transactions yet.</p>
                : <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/30"><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Points</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
                    <tbody>{loyaltyTx.map(tx=>(
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmt(tx.created_at)}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="capitalize text-xs">{tx.type.replace('_',' ')}</Badge></td>
                        <td className="px-3 py-2 text-muted-foreground text-xs max-w-48 truncate">{tx.description}</td>
                        <td className={cn('px-3 py-2 text-right font-mono font-bold',Number(tx.points)>=0?'text-success':'text-destructive')}>
                          {Number(tx.points)>=0?'+':''}{Number(tx.points).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{Number(tx.balance_after).toFixed(2)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                }
              </div>
            )}

            {/* Credit */}
            {tab==='credit' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-2xl font-display font-bold',(customer.outstanding_balance??0)>0?'text-destructive':'text-success')}>
                      {fmtMoney(customer.outstanding_balance)} outstanding
                    </p>
                    <p className="text-sm text-muted-foreground">Credit limit: {customer.credit_limit!=null?fmtMoney(customer.credit_limit):'Unlimited'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={()=>setShowPaymentForm(true)}>Record Payment</Button>
                </div>
                {creditTx.length===0 ? <p className="text-center py-8 text-muted-foreground text-sm">No credit transactions yet.</p>
                : <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/30"><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
                    <tbody>{creditTx.map(tx=>(
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 text-muted-foreground">{fmt(tx.created_at)}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="capitalize text-xs">{tx.type.replace(/_/g,' ')}</Badge></td>
                        <td className={cn('px-3 py-2 text-right font-mono font-bold',Number(tx.amount)<0?'text-success':'text-destructive')}>
                          {Number(tx.amount)<0?'-':'+'}${Math.abs(Number(tx.amount)).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{Number(tx.balance_after).toFixed(2)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                }
              </div>
            )}

            {/* Notes */}
            {tab==='notes' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} rows={2} placeholder="Add a note…"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"/>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={notePinned} onChange={e=>setNotePinned(e.target.checked)} className="rounded"/>
                      Pin this note
                    </label>
                    <Button size="sm" onClick={handleAddNote} disabled={addingNote||!newNote.trim()} className="gap-1">
                      {addingNote&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}Add Note
                    </Button>
                  </div>
                </div>
                {notes.length===0 ? <p className="text-center py-6 text-muted-foreground text-sm">No notes yet.</p>
                : notes.map(n=>(
                  <div key={n.id} className={cn('p-3 rounded-xl border relative',n.is_pinned&&'border-warning/40 bg-warning/5')}>
                    {n.is_pinned && <Star className="h-3.5 w-3.5 text-warning-foreground absolute top-2 right-8"/>}
                    <p className="text-sm">{n.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fmt(n.created_at)}</p>
                    <button onClick={()=>handleDeleteNote(n.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5"/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Communications */}
            {tab==='communications' && (
              <div className="space-y-3">
                <Button variant="outline" size="sm" onClick={()=>setShowMessage(true)} className="gap-2"><Send className="h-3.5 w-3.5"/>Send Message</Button>
                {communications.length===0 ? <p className="text-center py-6 text-muted-foreground text-sm">No messages yet.</p>
                : communications.map((c:any)=>(
                  <div key={c.id} className="p-3 rounded-xl border">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize text-xs">{c.channel}</Badge>
                      <Badge variant={c.status==='sent'?'success':c.status==='failed'?'destructive':'outline'} className="text-xs">{c.status}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{fmt(c.created_at)}</span>
                    </div>
                    {c.subject && <p className="text-sm font-medium">{c.subject}</p>}
                    <p className="text-sm text-muted-foreground">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
