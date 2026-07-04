'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, TrendingUp, Users, Package, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

interface AnalyticsData {
  store: { id: number; name: string; slug: string; status: string };
  aggregate: {
    today_revenue: number;
    month_revenue: number;
    total_revenue: number;
    active_users_count: number;
    meta: Record<string, any> | null;
  } | null;
  sales_by_day: { date: string; count: number; amount: number }[];
  top_products: { product_name: string; qty_sold: number; revenue: number }[];
  customer_growth: { date: string; count: number }[];
}

function StatCard({ label, value, icon: Icon, color = 'text-primary' }: {
  label: string; value: string | number; icon: React.ElementType; color?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 flex-shrink-0 ${color}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display font-bold text-2xl mt-0.5">{value}</p>
        </div>
      </div>
    </Card>
  );
}

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
};

export default function StoreAnalyticsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/admin/stores/${id}/analytics`, { days })
      .then(res => setData(res.data as any))
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, days]);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!data) return <p className="text-center py-16 text-muted-foreground">Store not found.</p>;

  const { store, aggregate, sales_by_day, top_products, customer_growth } = data;
  const meta = aggregate?.meta ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/stores/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{store.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Analytics dashboard</p>
        </div>
        <div className="ml-auto flex gap-2">
          {[7, 14, 30].map(d => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Revenue" value={(Number(aggregate?.today_revenue ?? 0)).toFixed(2)} icon={TrendingUp} color="text-success" />
        <StatCard label="Month Revenue" value={(Number(aggregate?.month_revenue ?? 0)).toFixed(2)} icon={TrendingUp} color="text-primary" />
        <StatCard label="Total Customers" value={meta.total_customers ?? 0} icon={Users} color="text-accent" />
        <StatCard label="Products" value={meta.total_products ?? 0} icon={Package} />
      </div>

      {/* Low stock warning */}
      {(meta.low_stock_count ?? 0) > 0 && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-xl text-sm">
          <AlertTriangle className="h-4 w-4 text-warning-foreground" />
          <span><strong>{meta.low_stock_count}</strong> products are at or below low-stock threshold.</span>
        </div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily sales */}
        <Card className="p-5">
          <h2 className="font-display font-bold mb-4">Daily Sales — Last {days} Days</h2>
          {sales_by_day.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No sales in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sales_by_day} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === 'amount' ? v.toFixed(2) : v,
                    name === 'amount' ? 'Revenue' : 'Orders',
                  ]}
                  labelFormatter={fmtDate}
                />
                <Legend formatter={v => v === 'amount' ? 'Revenue' : 'Orders'} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Customer growth */}
        <Card className="p-5">
          <h2 className="font-display font-bold mb-4">New Customers — Last {days} Days</h2>
          {customer_growth.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No new customers in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={customer_growth} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={fmtDate} />
                <Bar dataKey="count" name="New Customers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top products */}
      {top_products.length > 0 && (
        <Card className="p-5">
          <h2 className="font-display font-bold mb-4">Top Products This Month</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, top_products.length * 36)}>
            <BarChart data={top_products} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="product_name" width={160} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => v.toFixed(2)} />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Raw aggregate info */}
      <Card className="p-5">
        <h2 className="font-display font-bold mb-3">Aggregate Summary</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs">All-time Revenue</p><p className="font-mono font-semibold">{Number(aggregate?.total_revenue ?? 0).toFixed(2)}</p></div>
          <div><p className="text-muted-foreground text-xs">Active Users</p><p className="font-semibold">{aggregate?.active_users_count ?? 0}</p></div>
          <div><p className="text-muted-foreground text-xs">Top Product Today</p><p className="font-semibold truncate">{meta.top_product_today ?? '—'}</p></div>
        </div>
      </Card>
    </div>
  );
}
