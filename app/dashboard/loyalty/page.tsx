'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Gift, TrendingUp, TrendingDown, Star, Settings2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { LoyaltySettings, LoyaltyTransaction } from '@/types';

type Tab = 'overview' | 'settings' | 'transactions';

export default function LoyaltyPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [settings, setSettings] = useState<Partial<LoyaltySettings>>({});
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, stRes] = await Promise.all([
        apiClient.get('/store/loyalty/settings'),
        apiClient.get('/store/loyalty/stats'),
      ]);
      setSettings((sRes.data as any)?.settings ?? {});
      setStats((stRes.data as any) ?? null);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await apiClient.get('/store/loyalty/transactions', { per_page: 30 });
      setTransactions(getItems(res));
    } catch { setTransactions([]); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'transactions') loadTransactions(); }, [tab, loadTransactions]);

  const upd = (k: string, v: any) => setSettings(s => ({ ...s, [k]: v }));

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiClient.put('/store/loyalty/settings', settings);
      toast.success('Loyalty settings saved.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-4xl font-bold tracking-tight">Loyalty Program</h1><p className="text-muted-foreground mt-1">Manage customer loyalty points and rewards</p></div>
        {settings.is_enabled === false && <Badge variant="warning">Program Disabled</Badge>}
      </div>

      {/* Tab strip */}
      <div className="border-b flex gap-0">
        {([['overview','Overview'],['settings','Settings'],['transactions','Transactions']] as [Tab,string][]).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',tab===t?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground')}>{l}</button>
        ))}
      </div>

      {/* Overview */}
      {tab==='overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {label:'Outstanding Points', value:Number(stats.total_outstanding_points??0).toFixed(0)+' pts', sub:`≈ ${Number(stats.total_outstanding_value??0).toFixed(2)} Rs value`, icon:Gift, color:'text-success'},
              {label:'Earned This Month', value:Number(stats.earned_this_month??0).toFixed(0)+' pts', icon:TrendingUp, color:'text-primary'},
              {label:'Redeemed This Month', value:Number(stats.redeemed_this_month??0).toFixed(0)+' pts', icon:TrendingDown, color:'text-accent'},
              {label:'Expiring This Month', value:Number(stats.expiring_this_month??0).toFixed(0)+' pts', icon:Gift, color:'text-warning-foreground'},
            ].map(s=>(
              <Card key={s.label} className="p-4">
                <div className="flex items-center gap-2 mb-1"><s.icon className={cn('h-4 w-4',s.color)}/><p className="text-xs text-muted-foreground">{s.label}</p></div>
                <p className="font-display font-bold text-xl">{s.value}</p>
                {(s as any).sub && <p className="text-xs text-muted-foreground mt-0.5">{(s as any).sub}</p>}
              </Card>
            ))}
          </div>

          {stats.top_earners?.length > 0 && (
            <Card className="p-5">
              <h2 className="font-display font-bold mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-warning-foreground"/>Top Earners</h2>
              <div className="space-y-2">
                {stats.top_earners.map((c:any,i:number) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-5">{i+1}</span>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs font-mono text-muted-foreground">{c.code}</p></div>
                    <span className="font-mono font-bold text-success">{Number(c.loyalty_points_balance).toFixed(0)} pts</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Settings */}
      {tab==='settings' && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-semibold">Enable Loyalty Program</p><p className="text-xs text-muted-foreground">Disabling hides loyalty from POS but preserves existing balances</p></div>
              <Switch checked={!!settings.is_enabled} onCheckedChange={v=>upd('is_enabled',v)}/>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="font-display font-bold">Earning Rules</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Points per 1 currency unit</Label><Input type="number" min="0" step="0.0001" value={String(settings.points_per_currency_unit??1)} onChange={e=>upd('points_per_currency_unit',parseFloat(e.target.value)||0)}/><p className="text-xs text-muted-foreground">e.g. 1 = 1 point per Rs 1</p></div>
              <div className="space-y-1.5"><Label>Rs value per 1 point (redemption)</Label><Input type="number" min="0" step="0.0001" value={String(settings.redemption_value??1)} onChange={e=>upd('redemption_value',parseFloat(e.target.value)||0)}/></div>
              <div className="space-y-1.5"><Label>Min points to redeem</Label><Input type="number" min="0" value={String(settings.minimum_points_to_redeem??0)} onChange={e=>upd('minimum_points_to_redeem',parseFloat(e.target.value)||0)}/></div>
              <div className="space-y-1.5"><Label>Max redemption per sale (%)</Label><Input type="number" min="0" max="100" value={String(settings.maximum_redemption_per_sale??'')} onChange={e=>upd('maximum_redemption_per_sale',e.target.value?parseFloat(e.target.value):null)} placeholder="No cap"/></div>
              <div className="space-y-1.5"><Label>Points expiry (days)</Label><Input type="number" min="1" value={String(settings.points_expiry_days??'')} onChange={e=>upd('points_expiry_days',e.target.value?parseInt(e.target.value):null)} placeholder="Never expire"/></div>
            </div>
            <div className="space-y-2 border-t pt-4">
              {[['earn_on_discounted_sales','Earn on discounted sales'],['earn_on_tax','Earn on tax amount']].map(([k,l])=>(
                <div key={k} className="flex items-center justify-between"><Label className="text-sm">{l}</Label><Switch checked={!!settings[k as keyof LoyaltySettings]} onCheckedChange={(v:boolean)=>upd(k,v)}/></div>
              ))}
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="font-display font-bold">Bonus Points</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[['welcome_bonus_points','Welcome Bonus (first sale)'],['birthday_bonus_points','Birthday Bonus (per year)'],['referral_bonus_points','Referral Bonus (to referrer)']].map(([k,l])=>(
                <div key={k} className="space-y-1.5"><Label className="text-xs">{l}</Label><Input type="number" min="0" value={String(settings[k as keyof LoyaltySettings]??0)} onChange={e=>upd(k,parseFloat(e.target.value)||0)}/></div>
              ))}
            </div>
          </Card>
          <Button onClick={saveSettings} disabled={saving} className="gap-2">{saving&&<Loader2 className="h-4 w-4 animate-spin"/>}Save Settings</Button>
        </div>
      )}

      {/* Transactions */}
      {tab==='transactions' && (
        <Card className="overflow-hidden">
          {transactions.length===0 ? <p className="text-center py-16 text-muted-foreground">No transactions yet.</p>
          : <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30"><th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th><th className="px-4 py-3 text-right font-medium text-muted-foreground">Points</th><th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th></tr></thead>
              <tbody>{transactions.map(tx=>(
                <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{(tx as any).customer?.name??`#${tx.customer_id}`}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="capitalize text-xs">{tx.type.replace(/_/g,' ')}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-40">{tx.description}</td>
                  <td className={cn('px-4 py-3 text-right font-mono font-bold',Number(tx.points)>=0?'text-success':'text-destructive')}>
                    {Number(tx.points)>=0?'+':''}{Number(tx.points).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(tx.balance_after).toFixed(2)}</td>
                </tr>
              ))}</tbody>
            </table>
          }
        </Card>
      )}
    </div>
  );
}

