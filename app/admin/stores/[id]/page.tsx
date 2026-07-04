'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Users, Building, Puzzle, MessageCircle, Save, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoUpload } from '@/components/ui/LogoUpload';
import { apiClient, getErrorMessage } from '@/lib/api';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [store,   setStore]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [waNumber, setWaNumber] = useState('');
  const [savingWa, setSavingWa] = useState(false);

  useEffect(() => {
    apiClient.get(`/admin/stores/${params.id}`).then(res => {
      setStore(res.data);
      setWaNumber((res.data as any)?.whatsapp_number ?? '');
    }).finally(() => setLoading(false));
  }, [params.id]);

  const handleSaveWhatsapp = async () => {
    setSavingWa(true);
    try {
      await apiClient.put(`/admin/stores/${params.id}/whatsapp`, { whatsapp_number: waNumber || null });
      setStore((s: any) => ({ ...s, whatsapp_number: waNumber }));
      toast.success('WhatsApp number updated.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingWa(false); }
  };

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`/api/backend/admin/stores/${params.id}/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message ?? 'Logo upload failed.');
      throw new Error(err.message);
    }
    const data = await res.json();
    setStore((s: any) => ({ ...s, logo: data.data?.logo }));
    toast.success('Store logo updated.');
  };

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  if (!store) return <p>Store not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl font-bold tracking-tight">{store.name}</h1>
            <Badge variant={store.status === 'active' ? 'success' : 'secondary'}>{store.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{store.slug}</p>
        </div>
        <Button asChild>
          <Link href={`/admin/modules?store=${store.id}`}>
            <Puzzle className="h-4 w-4" />
            Manage Modules
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 space-y-4">
          <h3 className="font-display text-lg font-bold">Store Information</h3>

          {/* Logo + info row */}
          <div className="flex gap-5 items-start">
            <LogoUpload
              currentLogo={store.logo ? `/api/backend/store/files/${store.logo}` : null}
              onUpload={handleLogoUpload}
              label="Store Icon"
              hint="JPG, PNG, WebP · max 2 MB"
            />
            <div className="grid sm:grid-cols-2 gap-4 text-sm flex-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{store.email}</span>
              </div>
              {store.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{store.phone}</span></div>}
              {store.city && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{store.city}, {store.country}</span></div>}
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Joined {formatDate(store.created_at)}</span></div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span>{store.users_count} users</span></div>
              <div className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" /><span>{store.branches_count} branches</span></div>
            </div>
          </div>
        </Card>

        {/* WhatsApp Report Bot */}
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-500" />
            <h3 className="font-display text-base font-bold">WhatsApp Report Bot</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Set this store's WhatsApp Business number. Customers who message it can request AI-generated PDF reports.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">WhatsApp Number</Label>
            <div className="flex gap-2">
              <Input
                value={waNumber}
                onChange={e => setWaNumber(e.target.value)}
                placeholder="+14155238886"
                className="flex-1 h-8 text-sm"
              />
              <Button size="sm" onClick={handleSaveWhatsapp} disabled={savingWa} className="h-8 gap-1 text-xs flex-shrink-0">
                {savingWa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
            {store.whatsapp_number && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> Active: {store.whatsapp_number}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-lg font-bold mb-3">Subscription</h3>
          {store.active_subscription ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-lg">{store.active_subscription.plan?.name}</p>
              <p className="text-muted-foreground">Status: <Badge variant="success">{store.active_subscription.status}</Badge></p>
              {store.active_subscription.ends_at && <p className="text-xs text-muted-foreground">Renews {formatRelativeTime(store.active_subscription.ends_at)}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription</p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-display text-lg font-bold mb-4">Users ({store.users?.length ?? 0})</h3>
        <div className="space-y-2">
          {store.users?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium text-sm">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant={u.is_active ? 'success' : 'secondary'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
