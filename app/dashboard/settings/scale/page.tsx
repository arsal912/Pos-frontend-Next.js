'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Save, Scale } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────

type WeightUnit = 'g' | 'kg';

interface WeighingScaleSetting {
  default_weight_unit: WeightUnit;
  connection_mode: 'manual';
}

const DEFAULT_SETTING: WeighingScaleSetting = {
  default_weight_unit: 'kg',
  connection_mode: 'manual',
};

// ── Page ──────────────────────────────────────────────────────────────────

export default function WeighingScaleSettingsPage() {
  const [setting, setSetting] = useState<WeighingScaleSetting>(DEFAULT_SETTING);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/settings/weighing-scale');
      const s = (res.data as any)?.setting;
      if (s) {
        setSetting({
          default_weight_unit: s.default_weight_unit === 'g' ? 'g' : 'kg',
          connection_mode: 'manual',
        });
      }
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put('/store/settings/weighing-scale', {
        default_weight_unit: setting.default_weight_unit,
        connection_mode: setting.connection_mode,
      });
      const s = (res.data as any)?.setting;
      if (s) {
        setSetting({
          default_weight_unit: s.default_weight_unit === 'g' ? 'g' : 'kg',
          connection_mode: 'manual',
        });
      }
      toast.success('Weighing scale settings saved.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Weighing Scale</h1>
        <p className="text-muted-foreground mt-1">Defaults for weight-based products at checkout</p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-lg">Weight & Connection</h2>
        </div>

        <div className="space-y-1.5">
          <Label>Default weight unit</Label>
          <select
            value={setting.default_weight_unit}
            onChange={e => setSetting(s => ({ ...s, default_weight_unit: e.target.value as WeightUnit }))}
            className="w-full max-w-xs h-10 rounded-md border bg-background px-3 text-sm">
            <option value="kg">Kilogram (kg)</option>
            <option value="g">Gram (g)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Pre-fills the weight unit when creating a new weightable product. Existing products keep
            whichever unit they were saved with.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Connection mode</Label>
          <select
            value={setting.connection_mode}
            onChange={e => setSetting(s => ({ ...s, connection_mode: e.target.value as 'manual' }))}
            className="w-full max-w-xs h-10 rounded-md border bg-background px-3 text-sm">
            <option value="manual">Manual entry</option>
            <option value="serial" disabled>Serial / USB scale — coming soon</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Cashiers type the weighed amount by hand at checkout. Direct hardware/serial scale
            integration isn't available yet — that option is shown for visibility only and can't be
            selected.
          </p>
        </div>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2 h-11 px-8">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Settings
      </Button>
    </div>
  );
}
