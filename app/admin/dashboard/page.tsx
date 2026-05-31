'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Users, DollarSign, AlertCircle, TrendingUp, Clock, XCircle, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface DashboardData {
  stats: {
    total_stores: number;
    active_stores: number;
    suspended_stores: number;
    total_users: number;
    total_revenue: number;
    month_revenue: number;
    today_revenue: number;
    expiring_soon: number;
    new_stores_this_month: number;
    subscriptions_expiring_7d: number;
    central_payments: {
      total: number;
      completed_revenue: number;
      pending: number;
      failed: number;
      failed_7d: number;
    };
  };
  recent_errors: any[];
  recent_stores: any[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<DashboardData>('/admin/dashboard')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>;
  }

  if (!data) return null;

  const failed7d   = data.stats.central_payments?.failed_7d ?? 0;
  const expiring7d = data.stats.subscriptions_expiring_7d ?? 0;

  const stats = [
    { label: 'Total Stores',   value: data.stats.total_stores,  icon: Store,      color: 'from-primary/20 to-primary/5',    iconColor: 'text-primary',           href: '/admin/stores' },
    { label: 'Active Stores',  value: data.stats.active_stores, icon: TrendingUp, color: 'from-success/20 to-success/5',    iconColor: 'text-success',           href: '/admin/stores' },
    { label: 'Total Users',    value: data.stats.total_users,   icon: Users,      color: 'from-accent/20 to-accent/5',      iconColor: 'text-accent',            href: null },
    { label: 'Month Revenue',  value: formatCurrency(data.stats.month_revenue), icon: DollarSign, color: 'from-warning/20 to-warning/5', iconColor: 'text-warning-foreground', href: '/admin/payments' },
    {
      label: 'Failed Payments (7d)',
      value: failed7d,
      icon: XCircle,
      color: failed7d > 0 ? 'from-destructive/20 to-destructive/5' : 'from-muted/40 to-muted/20',
      iconColor: failed7d > 0 ? 'text-destructive' : 'text-muted-foreground',
      href: '/admin/payments?status=failed',
    },
    {
      label: 'Expiring Subs (7d)',
      value: expiring7d,
      icon: CalendarClock,
      color: expiring7d > 0 ? 'from-warning/20 to-warning/5' : 'from-muted/40 to-muted/20',
      iconColor: expiring7d > 0 ? 'text-warning-foreground' : 'text-muted-foreground',
      href: '/admin/subscriptions?expiring_days=7',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const CardContent = (
            <Card className={`p-5 bg-gradient-to-br ${stat.color} border-0 relative overflow-hidden h-full ${stat.href ? 'hover:opacity-90 transition-opacity cursor-pointer' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-display font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg bg-background/50 backdrop-blur flex items-center justify-center ${stat.iconColor}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
            </Card>
          );
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              {stat.href ? <Link href={stat.href}>{CardContent}</Link> : CardContent}
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold">Revenue Summary</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
              <span className="text-sm text-muted-foreground">Today</span>
              <span className="font-mono font-bold">{formatCurrency(data.stats.today_revenue)}</span>
            </div>
            <div className="flex items-center justify-between pb-4 border-b">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="font-mono font-bold">{formatCurrency(data.stats.month_revenue)}</span>
            </div>
            <div className="flex items-center justify-between pb-4 border-b">
              <span className="text-sm text-muted-foreground">All Time</span>
              <span className="font-mono font-bold">{formatCurrency(data.stats.total_revenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-3.5 w-3.5" />Expiring Soon</span>
              <Badge variant={data.stats.expiring_soon > 0 ? 'warning' : 'secondary'}>{data.stats.expiring_soon}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold">Recent Stores</h3>
          </div>
          {data.recent_stores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stores yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_stores.map((store: any) => (
                <div key={store.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{store.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={store.status === 'active' ? 'success' : 'secondary'}>{store.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(store.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {data.recent_errors.length > 0 && (
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h3 className="font-display text-lg font-bold">Recent API Errors</h3>
          </div>
          <div className="space-y-2 font-mono text-xs">
            {data.recent_errors.map((err: any) => (
              <div key={err.id} className="flex items-center justify-between p-2 rounded bg-background border">
                <span className="truncate"><Badge variant="destructive" className="mr-2">{err.response_status}</Badge>{err.method} {err.endpoint}</span>
                <span className="text-muted-foreground">{formatRelativeTime(err.created_at)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
