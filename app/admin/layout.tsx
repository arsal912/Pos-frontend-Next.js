'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Store,
  Puzzle,
  Globe,
  ScrollText,
  LogOut,
  Sparkles,
  Loader2,
  ChevronRight,
  CreditCard,
  Receipt,
  Users,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { href: '/admin/dashboard',        label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/admin/stores',           label: 'Stores',           icon: Store },
  { href: '/admin/subscriptions',    label: 'Subscriptions',    icon: Users },
  { href: '/admin/payments',         label: 'Payments',         icon: Receipt },
  { href: '/admin/modules',          label: 'Modules',          icon: Puzzle },
  { href: '/admin/payment-gateways',         label: 'Gateways',      icon: CreditCard },
  { href: '/admin/communications-providers', label: 'Comms',         icon: MessageSquare },
  { href: '/admin/reports',                  label: 'Reports',       icon: BarChart3 },
  { href: '/admin/landing-page',     label: 'Landing Page',     icon: Globe },
  { href: '/admin/api-logs',         label: 'API Logs',         icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
    if (user && !user.is_super_admin) {
      toast.error('Access denied. Super admin only.');
      router.push('/dashboard');
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
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card/30 backdrop-blur sticky top-0 h-screen flex flex-col">
        <div className="p-6 border-b">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display font-bold text-lg leading-none">POS Admin</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">SUPER ADMIN</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="ml-auto"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.div>
                )}
              </Link>
            );
          })}
        </nav>

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

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
