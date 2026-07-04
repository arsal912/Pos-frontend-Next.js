'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart, Package, Users, TrendingUp, ArrowRight,
  BarChart3, AlertTriangle, CreditCard, Gift,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api';
import { useSalesTrend } from '@/hooks/useStoreCharts';
import { formatCurrency } from '@/lib/utils';

const SalesTrendChart = dynamic(() => import('@/components/ui/charts/SalesTrendChart'), { ssr: false });

interface DashboardStats {
  revenue_today: number;
  revenue_this_month: number;
  transactions_today: number;
  low_stock_count: number;
  total_customers: number;
  outstanding_credit: number;
  loyalty_outstanding: number;
}

export default function StoreDashboardPage() {
  const user    = useAuthStore((s) => s.user);
  const currency = user?.store?.currency ?? 'PKR';
  const [stats, setStats] = useState<Partial<DashboardStats>>({});
  const [loading, setLoading] = useState(false);
  const salesTrendQuery = useSalesTrend(30);

  useEffect(() => {
    setLoading(true);
    // Try to pull today's stats from sales summary report
    Promise.all([
      apiClient.post('/store/reports/sales-summary/run', { date_range: 'today' }).catch(() => null),
      apiClient.post('/store/reports/stock-on-hand/run', { status: 'low' }).catch(() => null),
      apiClient.get('/store/customers', { per_page: 1 }).catch(() => null),
    ]).then(([salesRes, stockRes, customersRes]) => {
      if (salesRes) {
        const summary: any[] = (salesRes.data as any)?.summary ?? [];
        const find = (label: string) => summary.find((c: any) => c.label === label)?.raw ?? 0;
        setStats(s => ({
          ...s,
          revenue_today: find('Gross Revenue'),
          transactions_today: find('Total Transactions'),
        }));
      }
      if (stockRes) {
        const meta = (stockRes.data as any)?.meta ?? {};
        setStats(s => ({ ...s, low_stock_count: meta.row_count ?? 0 }));
      }
      if (customersRes) {
        const total = (customersRes as any).meta?.pagination?.total ?? 0;
        setStats(s => ({ ...s, total_customers: total }));
      }
    }).finally(() => setLoading(false));
  }, []);

  const quickStats = [
    { label: "Today's Revenue",  value: formatCurrency(stats.revenue_today ?? 0, currency), icon: ShoppingCart,  color: 'from-primary/20 to-primary/5',   href: '/dashboard/reports/sales-summary' },
    { label: 'Transactions Today',value: String(stats.transactions_today ?? 0),              icon: TrendingUp,    color: 'from-success/20 to-success/5',   href: '/dashboard/reports/sales-by-day' },
    { label: 'Low Stock Alerts', value: String(stats.low_stock_count ?? 0),                  icon: AlertTriangle, color: (stats.low_stock_count ?? 0) > 0 ? 'from-warning/20 to-warning/5' : 'from-muted/30 to-muted/10', href: '/dashboard/reports/low-stock' },
    { label: 'Total Customers',  value: String(stats.total_customers ?? 0),                  icon: Users,         color: 'from-accent/20 to-accent/5',     href: '/dashboard/customers' },
  ];

  const quickReports = [
    { label: 'Sales Summary',    slug: 'sales-summary',    icon: BarChart3,  desc: 'Revenue & transactions overview' },
    { label: 'Stock on Hand',    slug: 'stock-on-hand',    icon: Package,    desc: 'Current inventory levels' },
    { label: 'P&L Statement',    slug: 'profit-loss',      icon: TrendingUp, desc: 'Revenue, COGS & net profit' },
    { label: 'Credit Aging',     slug: 'credit-aging',     icon: CreditCard, desc: 'Outstanding customer credit' },
    { label: 'Loyalty Overview', slug: 'loyalty-overview', icon: Gift,       desc: 'Points earned & redeemed' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Welcome back, <span className="gradient-text italic">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here&rsquo;s what&rsquo;s happening at {user?.store?.name} today</p>
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={stat.href}>
              <Card className={`p-5 bg-gradient-to-br ${stat.color} border-0 hover:shadow-md transition-shadow cursor-pointer`}>
                <div className="flex items-start justify-between mb-2">
                  <stat.icon className="h-5 w-5 text-foreground/40" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-display font-bold mt-1">{stat.value}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Sales trend */}
      <Card className="p-4">
        <h3 className="font-display text-lg font-bold mb-3">Sales Trend (30 days)</h3>
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse" />}>
          <SalesTrendChart
            chart_data={salesTrendQuery.data ?? { labels: [], series: [] }}
            currency={currency}
          />
        </Suspense>
      </Card>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-primary/20">
          <h2 className="font-display font-bold text-lg mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              {href:'/dashboard/pos',     label:'Open POS',       icon:ShoppingCart},
              {href:'/dashboard/products/new', label:'Add Product',icon:Package},
              {href:'/dashboard/customers',label:'Customers',      icon:Users},
              {href:'/dashboard/reports', label:'All Reports',     icon:BarChart3},
            ].map(a => (
              <Button key={a.href} asChild variant="outline" size="sm" className="justify-start gap-2 h-9">
                <Link href={a.href}><a.icon className="h-3.5 w-3.5"/>{a.label}</Link>
              </Button>
            ))}
          </div>
        </Card>

        {/* Quick reports */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg">Quick Reports</h2>
            <Link href="/dashboard/reports" className="text-xs text-primary hover:underline flex items-center gap-1">
              All reports <ArrowRight className="h-3 w-3"/>
            </Link>
          </div>
          <div className="space-y-1.5">
            {quickReports.map(r => (
              <Link key={r.slug} href={`/dashboard/reports/${r.slug}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors group">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <r.icon className="h-3.5 w-3.5 text-primary"/>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"/>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
