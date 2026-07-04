'use client';

import { useEffect, useState } from 'react';
import { Palette, Shield, Info, Receipt, Loader2, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { useAuthStore } from '@/store/auth';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

function ReceiptFooterSettings() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [footerText, setFooterText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/admin/settings/receipt-footer')
      .then(res => {
        const setting = (res.data as any)?.setting;
        setIsEnabled(setting?.is_enabled ?? true);
        setFooterText(setting?.footer_text ?? '');
      })
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put('/admin/settings/receipt-footer', { is_enabled: isEnabled, footer_text: footerText });
      toast.success('Platform receipt footer updated.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-primary" />
        <h2 className="font-display font-bold text-lg">Receipt Footer (All Stores)</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show on receipts</Label>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <div className="space-y-1.5">
            <Label>Footer text</Label>
            <textarea value={footerText} onChange={e => setFooterText(e.target.value)} rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
              placeholder="e.g. Powered by MyPOS · support@mypos.com · +1 555 0100" />
          </div>

          <Button onClick={save} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>

          <div className="pt-2 border-t flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <p>
              This text prints at the very bottom of every store's receipts — thermal, A4, and PDF —
              beneath their own header/footer. Store owners can see it in their receipt preview but
              cannot edit or remove it; it's only set here.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

export default function AdminSettingsPage() {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">Platform preferences for the super admin panel</p>
      </div>

      {/* Appearance / Theme */}
      <Card className="p-6 space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-lg">Appearance</h2>
        </div>
        <ThemeSelector />
        <div className="mt-4 pt-4 border-t flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <p>
            The admin panel theme is stored in this browser only and is independent from the store
            dashboard theme. Each browser session can have its own color.
          </p>
        </div>
      </Card>

      <ReceiptFooterSettings />

      {/* Account info */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-lg">Account</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Name</p>
            <p className="font-semibold">{user?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
            <p className="font-semibold">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Role</p>
            <p className="font-semibold">Super Admin</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Access</p>
            <p className="font-semibold text-primary">Full Platform Access</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
