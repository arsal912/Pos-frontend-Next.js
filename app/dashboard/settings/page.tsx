'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Printer, Settings2, Tag, Ruler, Receipt, Percent,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';

const SETTING_LINKS = [
  { href: '/dashboard/settings/pos',       icon: Settings2, label: 'POS Configuration',    desc: 'Tax, rounding, currency display, defaults' },
  { href: '/dashboard/settings/receipt',   icon: Printer,   label: 'Receipt Templates',    desc: 'Customize thermal and A4 receipt layouts' },
  { href: '/dashboard/settings/tax-rates', icon: Percent,   label: 'Tax Rates',            desc: 'GST, VAT and other tax rates' },
  { href: '/dashboard/settings/units',     icon: Ruler,     label: 'Units of Measure',     desc: 'Piece, Kg, Litre, etc.' },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your store and POS system</p>
      </div>

      {/* Store info */}
      <Card className="p-6">
        <h2 className="font-display font-bold text-lg mb-4">Store Information</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Store Name</p><p className="font-semibold">{user?.store?.name ?? '—'}</p></div>
          <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Currency</p><p className="font-semibold">{user?.store?.currency ?? '—'}</p></div>
          <div><p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p><p className="font-semibold capitalize">{user?.store?.status ?? '—'}</p></div>
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
