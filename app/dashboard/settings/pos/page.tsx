'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Save, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

interface PosSettings {
  'pos.tax_inclusive': string;
  'pos.low_stock_threshold': string;
  'pos.allow_negative_stock': string;
  'pos.round_decimals': string;
  'pos.currency_position': string;
  'pos.cash_rounding': string;
  'pos.default_branch_id': string;
  'receipt.thermal_template_id': string;
  'receipt.a4_template_id': string;
}

export default function PosSettingsPage() {
  const [settings, setSettings] = useState<Partial<PosSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/settings');
      setSettings((res.data as any)?.settings ?? {});
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upd = (k: keyof PosSettings, v: string) => setSettings(s => ({ ...s, [k]: v }));
  const updBool = (k: keyof PosSettings, v: boolean) => upd(k, v ? '1' : '0');

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/store/settings', { settings });
      toast.success('POS settings saved.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">POS Configuration</h1>
        <p className="text-muted-foreground mt-1">Store-wide defaults for the point-of-sale system</p>
      </div>

      {/* Pricing */}
      <Card className="p-6 space-y-4">
        <h2 className="font-display font-bold text-lg">Pricing & Tax</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Tax-inclusive pricing</p>
            <p className="text-xs text-muted-foreground">Product prices already include tax</p>
          </div>
          <Switch checked={settings['pos.tax_inclusive'] === '1'} onCheckedChange={v => updBool('pos.tax_inclusive', v)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Decimal places</Label>
            <select value={settings['pos.round_decimals'] ?? '2'} onChange={e => upd('pos.round_decimals', e.target.value)}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="0">0 (e.g. 100)</option>
              <option value="1">1 (e.g. 100.0)</option>
              <option value="2">2 (e.g. 100.00)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Currency symbol position</Label>
            <select value={settings['pos.currency_position'] ?? 'before'} onChange={e => upd('pos.currency_position', e.target.value)}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="before">Before (₨100)</option>
              <option value="after">After (100₨)</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Cash rounding</Label>
          <select value={settings['pos.cash_rounding'] ?? '0'} onChange={e => upd('pos.cash_rounding', e.target.value)}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm">
            <option value="0">Off (exact amounts)</option>
            <option value="1">Round to nearest 1</option>
            <option value="5">Round to nearest 5</option>
            <option value="10">Round to nearest 10</option>
          </select>
          <p className="text-xs text-muted-foreground">Useful for PKR where coins are rare</p>
        </div>
      </Card>

      {/* Inventory */}
      <Card className="p-6 space-y-4">
        <h2 className="font-display font-bold text-lg">Inventory Defaults</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Allow negative stock</p>
            <p className="text-xs text-muted-foreground">Default for new products — can be overridden per product</p>
          </div>
          <Switch checked={settings['pos.allow_negative_stock'] === '1'} onCheckedChange={v => updBool('pos.allow_negative_stock', v)} />
        </div>

        <div className="space-y-1.5">
          <Label>Default low-stock threshold</Label>
          <Input type="number" min="0" value={settings['pos.low_stock_threshold'] ?? '5'}
            onChange={e => upd('pos.low_stock_threshold', e.target.value)}
            placeholder="5" className="w-32" />
          <p className="text-xs text-muted-foreground">Products below this quantity show a low-stock warning</p>
        </div>
      </Card>

      {/* Defaults */}
      <Card className="p-6 space-y-4">
        <h2 className="font-display font-bold text-lg">Operational Defaults</h2>

        <div className="space-y-1.5">
          <Label>Default branch ID</Label>
          <Input type="number" min="1" value={settings['pos.default_branch_id'] ?? '1'}
            onChange={e => upd('pos.default_branch_id', e.target.value)}
            placeholder="1" className="w-32" />
          <p className="text-xs text-muted-foreground">Pre-selected branch when opening POS</p>
        </div>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2 h-11 px-8">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Settings
      </Button>
    </div>
  );
}
