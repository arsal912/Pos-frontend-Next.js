'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Lock, Unlock, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CashDrawerSession } from '@/types';

interface CurrentDrawer {
  session: CashDrawerSession | null;
  expected_balance?: number;
  cash_sales?: number;
}

export default function CashDrawerPage() {
  const [current, setCurrent] = useState<CurrentDrawer | null>(null);
  const [history, setHistory] = useState<CashDrawerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBalance, setOpenBalance] = useState('');
  const [closeBalance, setCloseBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [curRes, histRes] = await Promise.all([
        apiClient.get('/store/pos/drawer/current'),
        apiClient.get('/store/pos/drawer/history', { per_page: 10 }),
      ]);
      setCurrent(curRes.data as any);
      setHistory(getItems(histRes));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpen = async () => {
    if (!openBalance) return toast.error('Enter opening balance.');
    setActing(true);
    try {
      await apiClient.post('/store/pos/drawer/open', { opening_balance: parseFloat(openBalance), branch_id: 1 });
      toast.success('Drawer opened.');
      setOpenBalance('');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(false); }
  };

  const handleClose = async () => {
    if (!closeBalance) return toast.error('Enter closing balance.');
    setActing(true);
    try {
      await apiClient.post('/store/pos/drawer/close', { closing_balance: parseFloat(closeBalance), notes: closeNotes || undefined });
      toast.success('Drawer closed.');
      setCloseBalance('');
      setCloseNotes('');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(false); }
  };

  const session = current?.session;
  const expected = current?.expected_balance ?? 0;

  const fmtDate = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtAmt = (n: number | null | undefined) => n != null ? Number(n).toFixed(2) : '—';

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Cash Drawer</h1>
        <p className="text-muted-foreground mt-1">Manage daily cash drawer sessions</p>
      </div>

      {/* Current session */}
      {session ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 border-success/30 bg-success/[0.02]">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Unlock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-display font-bold text-lg">Drawer Open</p>
                <p className="text-sm text-muted-foreground">Opened at {fmtDate(session.opened_at)}</p>
              </div>
              <Badge variant="success" className="ml-auto">Active</Badge>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Opening Balance', value: fmtAmt(session.opening_balance), icon: DollarSign },
                { label: 'Cash Sales', value: fmtAmt(current?.cash_sales), icon: TrendingUp },
                { label: 'Expected Balance', value: fmtAmt(expected), icon: DollarSign },
              ].map(s => (
                <div key={s.label} className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="font-display font-bold text-xl">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="font-medium text-sm">Close Drawer</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Closing Balance *</Label>
                  <Input type="number" value={closeBalance} onChange={e => setCloseBalance(e.target.value)} placeholder="Count cash" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Input value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Optional" />
                </div>
                <div className="flex items-end">
                  {closeBalance && (
                    <div className="text-sm mr-3">
                      <p className="text-muted-foreground text-xs">Over / Short</p>
                      <p className={cn('font-bold', (parseFloat(closeBalance) - expected) >= 0 ? 'text-success' : 'text-destructive')}>
                        {(parseFloat(closeBalance) - expected) >= 0 ? '+' : ''}{(parseFloat(closeBalance) - expected).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <Button onClick={handleClose} disabled={acting} variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5">
                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display font-bold text-lg">Drawer Closed</p>
              <p className="text-sm text-muted-foreground">Open a new session to start selling</p>
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="space-y-1.5 w-48">
              <Label>Opening Balance</Label>
              <Input type="number" value={openBalance} onChange={e => setOpenBalance(e.target.value)} placeholder="e.g. 5000" />
            </div>
            <Button onClick={handleOpen} disabled={acting} className="gap-2 h-10">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
              Open Drawer
            </Button>
          </div>
        </Card>
      )}

      {/* Session history */}
      {history.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b"><h2 className="font-display font-bold">Session History</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Opened</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Closed</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Opening</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Closing</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Over/Short</th>
            </tr></thead>
            <tbody>{history.map(s => {
              const overShort = Number(s.over_short ?? 0);
              return (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm">{fmtDate(s.opened_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.closed_at ? fmtDate(s.closed_at) : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtAmt(s.opening_balance)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtAmt(s.closing_balance)}</td>
                  <td className="px-4 py-3 text-right">
                    {s.over_short != null ? (
                      <span className={cn('font-mono font-medium flex items-center justify-end gap-1',
                        overShort > 0 ? 'text-success' : overShort < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {overShort > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : overShort < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        {overShort >= 0 ? '+' : ''}{fmtAmt(s.over_short)}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

