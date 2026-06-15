'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Printer, Settings2, Tag, Ruler,
  ChevronRight, MessageSquare, Monitor, MessageCircle,
  Save, Loader2, ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoUpload } from '@/components/ui/LogoUpload';
import { useAuthStore } from '@/store/auth';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

const SETTING_LINKS = [
  { href: '/dashboard/settings/pos',            icon: Settings2,    label: 'POS Configuration', desc: 'Tax, rounding, currency display, defaults' },
  { href: '/dashboard/settings/receipt',        icon: Printer,      label: 'Receipt Templates',  desc: 'Customize thermal and A4 receipt layouts' },
  { href: '/dashboard/settings/tax-rates',      icon: Tag,          label: 'Tax Rates',          desc: 'GST, VAT and other tax rates' },
  { href: '/dashboard/settings/units',          icon: Ruler,        label: 'Units of Measure',   desc: 'Piece, Kg, Litre, etc.' },
  { href: '/dashboard/settings/communications', icon: MessageSquare,label: 'Communications',     desc: 'Sender identity, quotas, opt-outs' },
  { href: '/dashboard/settings/devices',        icon: Monitor,      label: 'POS Devices',        desc: 'Offline terminals, device registry' },
  { href: '/dashboard/settings/roles',          icon: ShieldCheck,  label: 'Roles & Permissions', desc: 'Create roles and control what each can access' },
];

export default function SettingsPage() {
  const user    = useAuthStore(s => s.user);
  const store   = user?.store as any;

  const logoPath = store?.logo as string | null | undefined;
  const logoUrl  = logoPath ? `/api/backend/store/files/${logoPath}` : null;

  const [whatsappNumber, setWhatsappNumber] = useState<string>(store?.whatsapp_number ?? '');
  const [savingWa,       setSavingWa]       = useState(false);

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch('/api/backend/settings/logo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message ?? 'Upload failed.');
      throw new Error(err.message);
    }
    toast.success('Logo updated successfully.');
  };

  const handleSaveWhatsapp = async () => {
    setSavingWa(true);
    try {
      await apiClient.put('/store/settings/whatsapp', { whatsapp_number: whatsappNumber || null });
      toast.success('WhatsApp number saved. Customers can now message this number for reports.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingWa(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your store and POS system</p>
      </div>

      {/* Store info + logo */}
      <Card className="p-6">
        <h2 className="font-display font-bold text-lg mb-4">Store Information</h2>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <LogoUpload
            currentLogo={logoUrl}
            onUpload={handleLogoUpload}
            label="Store Icon"
            hint="JPG, PNG or WebP · max 2 MB"
          />
          <div className="flex-1 grid sm:grid-cols-3 gap-4 text-sm self-center">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Store Name</p>
              <p className="font-semibold">{store?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Currency</p>
              <p className="font-semibold">{store?.currency ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
              <p className="font-semibold capitalize">{store?.status ?? '—'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* WhatsApp Report Bot */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-500" />
          <h2 className="font-display font-bold text-lg">WhatsApp Report Bot</h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">AI-powered</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Connect a WhatsApp Business number so customers and managers can request reports via chat.
          They simply message the number and ask — for example:{' '}
          <em className="text-foreground">"Give me sales report from 1 May to today"</em> — and receive
          a branded PDF report in the chat.
        </p>

        <div className="bg-muted/30 rounded-xl p-4 text-sm space-y-1">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">Supported report requests (natural language)</p>
          {[
            '"Sales report this week"',
            '"Top products last 30 days"',
            '"Inventory stock report"',
            '"Customer report this month"',
            '"Expenses summary last month"',
            '"Revenue report from Jan 1 to now"',
          ].map(ex => (
            <p key={ex} className="text-xs text-muted-foreground">• {ex}</p>
          ))}
        </div>

        <div className="space-y-1.5 max-w-sm">
          <Label>WhatsApp Business Number</Label>
          <div className="flex gap-2">
            <Input
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="+92 300 1234567"
              className="flex-1"
            />
            <Button onClick={handleSaveWhatsapp} disabled={savingWa} className="gap-2 flex-shrink-0">
              {savingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your Twilio WhatsApp Business number (e.g. +14155238886). Must be configured in your
            Twilio console and pointed to this platform's webhook URL.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Setup required:</p>
          <p>1. Configure a WhatsApp Business number in your Twilio console</p>
          <p>2. Set webhook URL to: <code className="bg-amber-100 px-1 rounded">https://api.yourdomain.com/api/v1/webhooks/communications/whatsapp</code></p>
          <p>3. Add your <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> to the backend <code className="bg-amber-100 px-1 rounded">.env</code> file</p>
        </div>
      </Card>

      {/* Settings grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {SETTING_LINKS.map((link, i) => (
          <motion.div key={link.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={link.href}>
              <Card className="p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group h-full">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <link.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{link.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{link.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
