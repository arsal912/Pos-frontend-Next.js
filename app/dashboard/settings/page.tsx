'use client';

import { Settings as SettingsIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">Settings</h1>
      <Card className="p-8">
        <h2 className="font-display text-xl font-bold mb-4">Store Information</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">Store Name</p><p className="font-medium">{user?.store?.name}</p></div>
          <div><p className="text-muted-foreground">Slug</p><p className="font-mono">{user?.store?.slug}</p></div>
          <div><p className="text-muted-foreground">Currency</p><p className="font-medium">{user?.store?.currency}</p></div>
          <div><p className="text-muted-foreground">Status</p><p className="font-medium capitalize">{user?.store?.status}</p></div>
        </div>
      </Card>
      <Card className="p-12 text-center border-dashed">
        <SettingsIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="font-display text-lg font-semibold mb-1">Full Settings Coming Soon</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Detailed store configuration, tax settings, receipt customization, and more will be available in Phase 4.
        </p>
      </Card>
    </div>
  );
}
