'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Loader2,
  CreditCard,
  AlertTriangle,
  Tag,
  Layers,
  Truck,
  FileText,
  ClipboardCheck,
  ArrowLeftRight,
  Vault,
  Gift,
  BadgeDollarSign,
  MessageSquare,
  Send,
} from 'lucide-react';
import { OfflineGuard } from '@/components/pos/OfflineGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { href: '/dashboard',                label: 'Dashboard',       icon: LayoutDashboard, exact: true },
  { href: '/dashboard/pos',            label: 'POS Sales',       icon: ShoppingCart },
  { href: '/dashboard/products',       label: 'Products',        icon: Package },
  { href: '/dashboard/categories',     label: 'Categories',      icon: Layers },
  { href: '/dashboard/brands',         label: 'Brands',          icon: Tag },
  { href: '/dashboard/inventory',      label: 'Inventory',       icon: BarChart3 },
  { href: '/dashboard/suppliers',      label: 'Suppliers',       icon: Truck },
  { href: '/dashboard/purchase-orders',label: 'Purchase Orders', icon: FileText },
  { href: '/dashboard/grns',           label: 'GRNs',            icon: ClipboardCheck },
  { href: '/dashboard/stock-transfers',label: 'Transfers',       icon: ArrowLeftRight },
  { href: '/dashboard/customers',      label: 'Customers',       icon: Users },
  { href: '/dashboard/loyalty',        label: 'Loyalty',         icon: Gift },
  { href: '/dashboard/credit',         label: 'Credit',          icon: BadgeDollarSign },
  { href: '/dashboard/cash-drawer',         label: 'Cash Drawer',  icon: Vault },
  { href: '/dashboard/pos/sync-conflicts',  label: 'Sync Conflicts', icon: AlertTriangle },
  { href: '/dashboard/communications/campaigns',  label: 'Campaigns',  icon: Send },
  { href: '/dashboard/communications/templates', label: 'Templates',  icon: MessageSquare },
  { href: '/dashboard/reports',        label: 'Reports',         icon: BarChart3 },
  { href: '/dashboard/billing',        label: 'Billing',         icon: CreditCard },
  { href: '/dashboard/settings',       label: 'Settings',        icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        router.push('/login?redirect=' + pathname);
        return;
      }
      fetchMe();
    }
  }, [isAuthenticated, fetchMe, router, pathname]);

  useEffect(() => {
    if (user?.is_super_admin) {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    router.push('/login');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r bg-card/30 backdrop-blur sticky top-0 h-screen flex flex-col">
        <div className="p-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-lg leading-none truncate">{user.store?.name ?? 'POS'}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase">{user.store?.status}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto sidebar-scroll">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Subscription status banners */}
        {user.store?.status === 'expired' && (
          <div className="m-3 p-3 rounded-lg border bg-destructive/10 border-destructive/30 text-xs">
            <p className="font-semibold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Subscription expired
            </p>
            <Link href="/dashboard/billing" className="text-primary underline mt-1 block">
              Reactivate now →
            </Link>
          </div>
        )}
        {user.store?.status !== 'expired' && user.store?.trial_ends_at && (
          <div className="m-3 p-3 rounded-lg border bg-warning/10 border-warning/30 text-xs">
            <p className="font-semibold flex items-center gap-1.5"><Badge variant="warning">TRIAL</Badge></p>
            <p className="text-muted-foreground mt-1">
              Ends {new Date(user.store.trial_ends_at).toLocaleDateString()}
            </p>
            <Link href="/dashboard/billing" className="text-primary underline mt-1 block">
              Upgrade now →
            </Link>
          </div>
        )}

        <div className="p-3 border-t">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <OfflineGuard>{children}</OfflineGuard>
        </div>
      </main>
    </div>
  );
}
