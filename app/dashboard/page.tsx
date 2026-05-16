'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, Package, Users, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { formatCurrency } from '@/lib/utils';

export default function StoreDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const quickStats = [
    { label: "Today's Sales", value: formatCurrency(0, user?.store?.currency ?? 'PKR'), icon: ShoppingCart, color: 'from-primary/20 to-primary/5' },
    { label: 'Products', value: '0', icon: Package, color: 'from-accent/20 to-accent/5' },
    { label: 'Customers', value: '0', icon: Users, color: 'from-success/20 to-success/5' },
    { label: 'This Month', value: formatCurrency(0, user?.store?.currency ?? 'PKR'), icon: TrendingUp, color: 'from-warning/20 to-warning/5' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Welcome back, <span className="gradient-text italic">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here&rsquo;s what&rsquo;s happening at {user?.store?.name} today</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`p-5 bg-gradient-to-br ${stat.color} border-0`}>
              <div className="flex items-start justify-between mb-2">
                <stat.icon className="h-5 w-5 text-foreground/40" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-display font-bold mt-1">{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-primary/20">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold mb-2">🎉 Welcome to your POS!</h2>
          <p className="text-muted-foreground mb-6">
            Your store is set up and ready. Here are some next steps to get rolling.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Button asChild variant="gradient" size="lg" className="justify-between">
              <Link href="/dashboard/pos">
                <span>Start Selling</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="justify-between">
              <Link href="/dashboard/settings">
                <span>Configure Store</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-8 text-center border-dashed">
        <p className="font-display text-lg font-semibold mb-1">🚧 POS Features Coming Soon</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The full POS system (products, sales screen, inventory, reports) is being built in Phase 4. The foundation is ready and modules can be toggled per store from the super admin panel.
        </p>
      </Card>
    </div>
  );
}
