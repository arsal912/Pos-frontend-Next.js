'use client';

import { Palette, Shield, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { useAuthStore } from '@/store/auth';

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
