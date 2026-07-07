'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Printer, Settings2, Tag, Ruler,
  ChevronRight, MessageSquare, Monitor, MessageCircle,
  Save, Loader2, ShieldCheck, Palette, Globe, Keyboard, Scale,
} from 'lucide-react';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoUpload } from '@/components/ui/LogoUpload';
import { useAuthStore } from '@/store/auth';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee',   symbol: '₨' },
  { code: 'USD', name: 'US Dollar',         symbol: '$' },
  { code: 'EUR', name: 'Euro',              symbol: '€' },
  { code: 'GBP', name: 'British Pound',     symbol: '£' },
  { code: 'AED', name: 'UAE Dirham',        symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal',       symbol: '﷼' },
  { code: 'INR', name: 'Indian Rupee',      symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar',   symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'BDT', name: 'Bangladeshi Taka',  symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee',  symbol: 'Rs' },
  { code: 'NPR', name: 'Nepali Rupee',      symbol: 'रू' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'SGD', name: 'Singapore Dollar',  symbol: 'S$' },
  { code: 'THB', name: 'Thai Baht',         symbol: '฿' },
];

const TIMEZONES = [
  'Asia/Karachi',      // Pakistan
  'Asia/Kolkata',      // India
  'Asia/Dhaka',        // Bangladesh
  'Asia/Colombo',      // Sri Lanka
  'Asia/Kathmandu',    // Nepal
  'Asia/Dubai',        // UAE
  'Asia/Riyadh',       // Saudi Arabia
  'Asia/Kuala_Lumpur', // Malaysia
  'Asia/Singapore',    // Singapore
  'Asia/Bangkok',      // Thailand
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
];

const SETTING_LINKS = [
  { href: '/dashboard/settings/pos',            icon: Settings2,    label: 'POS Configuration', desc: 'Tax, rounding, currency display, defaults' },
  { href: '/dashboard/settings/receipt',        icon: Printer,      label: 'Receipt Templates',  desc: 'Customize thermal and A4 receipt layouts' },
  { href: '/dashboard/settings/tax-rates',      icon: Tag,          label: 'Tax Rates',          desc: 'GST, VAT and other tax rates' },
  { href: '/dashboard/settings/units',          icon: Ruler,        label: 'Units of Measure',   desc: 'Piece, Kg, Litre, etc.' },
  { href: '/dashboard/settings/scale',          icon: Scale,        label: 'Weighing Scale',     desc: 'Default unit and connection mode for weighted items' },
  { href: '/dashboard/settings/communications', icon: MessageSquare,label: 'Communications',     desc: 'Sender identity, quotas, opt-outs' },
  { href: '/dashboard/settings/devices',        icon: Monitor,      label: 'POS Devices',        desc: 'Offline terminals, device registry' },
  { href: '/dashboard/settings/roles',          icon: ShieldCheck,  label: 'Roles & Permissions', desc: 'Create roles and control what each can access' },
  { href: '/dashboard/settings/shortcuts',      icon: Keyboard,     label: 'Keyboard Shortcuts',  desc: 'Customize POS hotkeys for faster checkout' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const user    = useAuthStore(s => s.user);
  const store   = user?.store as any;

  // Logo
  const logoPath = store?.logo as string | null | undefined;
  const logoUrl  = logoPath ? `/api/backend/store/files/${logoPath}` : null;

  // WhatsApp
  const [whatsappNumber, setWhatsappNumber] = useState<string>(store?.whatsapp_number ?? '');
  const [savingWa,       setSavingWa]       = useState(false);

  // Store profile (currency, timezone, name, contact)
  const [profile, setProfile] = useState({
    name:          store?.name          ?? '',
    phone:         store?.phone         ?? '',
    address:       store?.address       ?? '',
    city:          store?.city          ?? '',
    country:       store?.country       ?? 'PK',
    currency:      store?.currency      ?? 'PKR',
    timezone:      store?.timezone      ?? 'Asia/Karachi',
    business_type: store?.business_type ?? '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load fresh profile from server on mount
  useEffect(() => {
    apiClient.get('/store/profile').then(res => {
      const s = (res.data as any)?.store;
      if (s) {
        setProfile({
          name:          s.name          ?? '',
          phone:         s.phone         ?? '',
          address:       s.address       ?? '',
          city:          s.city          ?? '',
          country:       s.country       ?? 'PK',
          currency:      s.currency      ?? 'PKR',
          timezone:      s.timezone      ?? 'Asia/Karachi',
          business_type: s.business_type ?? '',
        });
        setWhatsappNumber(s.whatsapp_number ?? '');
      }
    }).catch(() => {}).finally(() => setProfileLoaded(true));
  }, []);

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

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiClient.put('/store/profile', profile);
      toast.success('Store profile updated.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingProfile(false); }
  };

  const handleSaveWhatsapp = async () => {
    setSavingWa(true);
    try {
      await apiClient.put('/store/settings/whatsapp', { whatsapp_number: whatsappNumber || null });
      toast.success('WhatsApp number saved.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingWa(false); }
  };

  const selectedCurrency = CURRENCIES.find(c => c.code === profile.currency);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your store and POS system</p>
      </div>

      {/* ── Appearance / Theme ───────────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-lg">Appearance</h2>
        </div>
        <ThemeSelector />
      </Card>

      {/* ── Store Profile ────────────────────────────────────────────────────── */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-lg">Store Profile</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Logo */}
          <LogoUpload currentLogo={logoUrl} onUpload={handleLogoUpload}
            label="Store Icon" hint="JPG, PNG or WebP · max 2 MB" />

          {/* Name + contact */}
          <div className="flex-1 grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Store Name</Label>
              <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="My Store" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="+92 300 1234567" />
            </div>
            <div className="space-y-1.5">
              <Label>Business Type</Label>
              <Input value={profile.business_type}
                onChange={e => setProfile(p => ({ ...p, business_type: e.target.value }))}
                placeholder="Retail, Wholesale, F&B…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                placeholder="Shop 12, Main Market" />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                placeholder="Lahore" />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                placeholder="PK" maxLength={10} />
            </div>
          </div>
        </div>

        {/* Currency + Timezone */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t">
          {/* Currency */}
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <select
              value={profile.currency}
              onChange={e => setProfile(p => ({ ...p, currency: e.target.value }))}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
            {selectedCurrency && (
              <p className="text-xs text-muted-foreground">
                Prices will display as: <strong className="text-foreground">
                  {selectedCurrency.symbol} 1,250.00
                </strong>
              </p>
            )}
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <select
              value={profile.timezone}
              onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Used for reports, receipts, and scheduled tasks
            </p>
          </div>
        </div>

        <Button onClick={handleSaveProfile} disabled={savingProfile || !profileLoaded} className="gap-2">
          {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Profile
        </Button>
      </Card>

      {/* ── WhatsApp Report Bot ──────────────────────────────────────────────── */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-500" />
          <h2 className="font-display font-bold text-lg">WhatsApp Report Bot</h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">AI-powered</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Connect a WhatsApp Business number so customers and managers can request reports via chat.
          They simply message the number and ask — e.g.{' '}
          <em className="text-foreground">"Give me sales report from 1 May to today"</em>.
        </p>
        <div className="space-y-1.5 max-w-sm">
          <Label>WhatsApp Business Number</Label>
          <div className="flex gap-2">
            <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="+92 300 1234567" className="flex-1" />
            <Button onClick={handleSaveWhatsapp} disabled={savingWa} className="gap-2 flex-shrink-0">
              {savingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Setup required:</p>
          <p>1. Configure a WhatsApp Business number in your Twilio console</p>
          <p>2. Set webhook URL to: <code className="bg-amber-100 px-1 rounded">https://api.yourdomain.com/api/v1/webhooks/communications/whatsapp</code></p>
          <p>3. Add <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> to backend <code className="bg-amber-100 px-1 rounded">.env</code></p>
        </div>
      </Card>

      {/* ── Settings grid ────────────────────────────────────────────────────── */}
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
