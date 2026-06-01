'use client';

import { use, useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Phone, Mail, MapPin, Building2, Calendar, CreditCard, Pencil, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Customer } from '@/types';

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get(`/store/customers/${id}`),
      apiClient.get(`/store/customers/${id}/purchases`),
    ])
      .then(([cRes, pRes]) => {
        setCustomer((cRes.data as any)?.customer ?? null);
        setPurchases((pRes as any).data?.sales ?? (pRes as any).data?.data ?? []);
      })
      .catch(() => toast.error('Failed to load customer.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!customer) {
    return <p className="text-center py-16 text-muted-foreground">Customer not found.</p>;
  }

  const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/customers"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-muted-foreground text-sm font-mono">{customer.code}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Badge variant={customer.is_active ? 'success' : 'outline'}>{customer.is_active ? 'Active' : 'Inactive'}</Badge>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href={`/dashboard/customers?edit=${customer.id}`}>
                <Pencil className="h-3.5 w-3.5" />Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact info */}
        <Card className="p-5">
          <h2 className="font-display font-bold mb-3">Contact Information</h2>
          <InfoRow icon={Phone} label="Phone" value={customer.phone} />
          <InfoRow icon={Mail} label="Email" value={customer.email} />
          <InfoRow icon={Building2} label="Company" value={customer.company} />
          <InfoRow icon={MapPin} label="City" value={customer.city} />
          <InfoRow icon={Calendar} label="Date of Birth" value={customer.date_of_birth} />
          {customer.gender && (
            <div className="flex items-center gap-3 py-2.5">
              <span className="text-xs text-muted-foreground w-24">Gender</span>
              <Badge variant="outline" className="capitalize">{customer.gender.replace('_', ' ')}</Badge>
            </div>
          )}
        </Card>

        {/* Financial info */}
        <Card className="p-5">
          <h2 className="font-display font-bold mb-3">Account Details</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Opening Balance</span>
              <span className="font-mono font-medium">{Number(customer.opening_balance).toFixed(2)}</span>
            </div>
            {customer.credit_limit != null && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Credit Limit</span>
                <span className="font-mono font-medium">{Number(customer.credit_limit).toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Customer Since</span>
              <span className="text-sm">{new Date(customer.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
          {customer.notes && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{customer.notes}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Purchase history */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display font-bold">Purchase History</h2>
        </div>
        {purchases.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">
            No purchases recorded yet. Purchase history will appear here after sales are completed (Step 6).
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sale #</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((sale: any) => (
                <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono font-medium">{sale.sale_number}</td>
                  <td className="px-3 py-2 text-muted-foreground">{sale.sale_date}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(sale.total).toFixed(2)}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="capitalize">{sale.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
