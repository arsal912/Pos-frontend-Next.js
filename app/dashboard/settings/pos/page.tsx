'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Save, Info, WifiOff, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiClient, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import {
  getOfflineSettings, saveOfflineSettings, getStorageEstimate,
  type OfflineSettings, type StorageEstimate,
} from '@/lib/offline/settings';
import { resetDb } from '@/lib/offline/db';
import { toast } from 'sonner';

interface PosSettings {
  'pos.tax_inclusive': string;
  'pos.low_stock_threshold': string;
  'pos.allow_negative_stock': string;
  'pos.round_decimals': string;
  'pos.currency_position': string;
  'pos.cash_rounding': string;
  'pos.default_branch_id': string;
}

export default function PosSettingsPage() {
  const user    = useAuthStore(s => s.user);
  const storeId = user?.store?.id;

  const [settings,  setSettings]  = useState<Partial<PosSettings>>({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  // Offline settings (stored client-side in IndexedDB)
  const [offlineSettings,  setOfflineSettings]  = useState<OfflineSettings | null>(null);
  const [savingOffline,    setSavingOffline]    = useState(false);
  const [storageEstimate,  setStorageEstimate]  = useState<StorageEstimate | null>(null);
  const [resetting,        setResetting]        = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/settings');
      setSettings((res.data as any)?.settings ?? {});
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load offline settings and storage estimate
  useEffect(() => {
    if (!storeId) return;
    getOfflineSettings(storeId).then(setOfflineSettings).catch(() => {});
    getStorageEstimate().then(setStorageEstimate).catch(() => {});
  }, [storeId]);

  const upd = (k: keyof PosSettings, v: string) => setSettings(s => ({ ...s, [k]: v }));
  const updBool = (k: keyof PosSettings, v: boolean) => upd(k, v ? '1' : '0');
  const updOffline = (k: keyof OfflineSettings, v: any) =>
    setOfflineSettings(s => s ? { ...s, [k]: v } : null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/store/settings', { settings });
      toast.success('POS settings saved.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleSaveOffline = async () => {
    if (!storeId || !offlineSettings) return;
    setSavingOffline(true);
    try {
      await saveOfflineSettings(storeId, offlineSettings);
      toast.success('Offline settings saved to this device.');
    } catch { toast.error('Failed to save offline settings.'); }
    finally { setSavingOffline(false); }
  };

  const handleResetOfflineData = async () => {
    if (!storeId) return;
    if (!confirm(
      'Reset all offline data on this device?\n\n' +
      'This will clear the product/customer cache and any pending unsynced sales.\n\n' +
      'WARNING: Any sales NOT yet uploaded to the server will be permanently lost.\n' +
      'Only do this if you are sure all pending sales have been uploaded first.'
    )) return;
    setResetting(true);
    try {
      await resetDb(storeId);
      toast.success('Offline data cleared. The POS will re-download data on next load.');
    } catch { toast.error('Failed to reset offline data.'); }
    finally { setResetting(false); }
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

      {/* ── Offline Mode (device-local settings) ─────────────────────────────── */}
      {offlineSettings && (
        <Card className="p-6 space-y-5 border-dashed">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display font-bold text-lg">Offline Mode</h2>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              This device only
            </span>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              These settings are stored on this device and only affect the POS offline behavior here.
              They are not synced to other devices or the server.
            </span>
          </div>

          {/* Cache limits */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Max cached products</Label>
              <Input type="number" min="100" max="5000" step="100"
                value={offlineSettings.cached_products_limit}
                onChange={e => updOffline('cached_products_limit', Number(e.target.value))}
                className="w-32" />
              <p className="text-xs text-muted-foreground">Products cached for offline search (default 1000)</p>
            </div>
            <div className="space-y-1.5">
              <Label>Max cached customers</Label>
              <Input type="number" min="100" max="2000" step="100"
                value={offlineSettings.cached_customers_limit}
                onChange={e => updOffline('cached_customers_limit', Number(e.target.value))}
                className="w-32" />
              <p className="text-xs text-muted-foreground">Customers cached for offline lookup (default 500)</p>
            </div>
          </div>

          {/* Stale threshold */}
          <div className="space-y-1.5">
            <Label>Stale data warning (hours)</Label>
            <Input type="number" min="1" max="48"
              value={offlineSettings.stale_warning_hours}
              onChange={e => updOffline('stale_warning_hours', Number(e.target.value))}
              className="w-32" />
            <p className="text-xs text-muted-foreground">Show "stale data" badge after this many hours without a sync</p>
          </div>

          {/* Toggle switches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Allow negative stock offline</p>
                <p className="text-xs text-muted-foreground">
                  When offline, allow selling below zero regardless of per-product setting
                </p>
              </div>
              <Switch
                checked={offlineSettings.allow_offline_negative_stock}
                onCheckedChange={v => updOffline('allow_offline_negative_stock', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Allow credit sales offline</p>
                <p className="text-xs text-muted-foreground">
                  Allow "on credit" payment method when offline (uses cached credit limit)
                </p>
              </div>
              <Switch
                checked={offlineSettings.allow_offline_credit_sales}
                onCheckedChange={v => updOffline('allow_offline_credit_sales', v)}
              />
            </div>
          </div>

          <Button onClick={handleSaveOffline} disabled={savingOffline} variant="outline" className="gap-2">
            {savingOffline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Offline Settings
          </Button>

          {/* Storage quota */}
          {storageEstimate && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium">Storage Usage</p>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${storageEstimate.isNearLimit ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${storageEstimate.percentUsed}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{storageEstimate.usedMB} MB used</span>
                <span>{storageEstimate.quotaMB} MB available</span>
              </div>
              {storageEstimate.isNearLimit && (
                <p className="text-xs text-destructive">
                  Storage is {storageEstimate.percentUsed}% full. Consider reducing cache limits or resetting old data.
                </p>
              )}
            </div>
          )}

          {/* Recovery */}
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium text-destructive">Danger Zone</p>
            <p className="text-xs text-muted-foreground">
              If the POS is not loading correctly offline, you can clear all cached data. This removes
              the product/customer cache and any pending unsynced sales from this device.
            </p>
            <Button variant="outline" size="sm" onClick={handleResetOfflineData}
              disabled={resetting} className="gap-2 border-destructive text-destructive hover:bg-destructive/10">
              {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Reset All Offline Data on This Device
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
