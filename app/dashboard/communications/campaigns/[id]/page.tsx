'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, MessageSquare, Mail, MessageCircle,
  Play, Ban, Users, CheckCircle2, XCircle, SkipForward,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CHANNEL_ICONS = { sms: MessageSquare, email: Mail, whatsapp: MessageCircle };
const CHANNEL_COLORS = { sms: 'text-blue-500', email: 'text-green-500', whatsapp: 'text-emerald-500' };
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700', sent: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500', failed: 'bg-red-100 text-red-700',
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/campaigns/${id}/stats`);
      setData(res.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleLaunch = async () => {
    if (!confirm('Launch this campaign now?')) return;
    setActing(true);
    try {
      await apiClient.post(`/campaigns/${id}/launch`);
      toast.success('Campaign queued.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this campaign?')) return;
    setActing(true);
    try {
      await apiClient.post(`/campaigns/${id}/cancel`);
      toast.success('Campaign cancelled.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const { campaign, breakdown, cost } = data as any;
  const Icon = CHANNEL_ICONS[campaign.channel as keyof typeof CHANNEL_ICONS] ?? MessageSquare;
  const total = campaign.total_recipients || 1;

  const statCards = [
    { label: 'Queued / Sent',   value: campaign.sent_count,    icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Skipped',         value: campaign.skipped_count, icon: SkipForward,  color: 'text-amber-500' },
    { label: 'Failed',          value: campaign.failed_count,  icon: XCircle,      color: 'text-red-500' },
    { label: 'Total Recipients',value: campaign.total_recipients, icon: Users,     color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/communications/campaigns">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-bold">{campaign.name}</h1>
            <Badge className={cn('text-xs capitalize', STATUS_STYLES[campaign.status])}>{campaign.status}</Badge>
          </div>
          {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
        </div>
        <div className="flex gap-2">
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <>
              <Link href={`/dashboard/communications/campaigns/${id}/edit`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
              <Button size="sm" className="gap-1" onClick={handleLaunch} disabled={acting}>
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Launch
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"
                onClick={handleCancel} disabled={acting}>
                <Ban className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Meta */}
      <Card className="p-5">
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Channel</p>
            <div className="flex items-center gap-1.5 font-medium">
              <Icon className={cn('h-4 w-4', CHANNEL_COLORS[campaign.channel as keyof typeof CHANNEL_COLORS])} />
              <span className="capitalize">{campaign.channel}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p>
            <p className="font-medium capitalize">{campaign.type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Audience</p>
            <p className="font-medium capitalize">{campaign.target_type?.replace(/_/g, ' ')}</p>
          </div>
          {campaign.scheduled_at && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Scheduled At</p>
              <p className="font-medium">{new Date(campaign.scheduled_at).toLocaleString()}</p>
            </div>
          )}
          {campaign.completed_at && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Completed At</p>
              <p className="font-medium">{new Date(campaign.completed_at).toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Est. Cost</p>
            <p className="font-medium">${(cost ?? 0).toFixed(4)}</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {campaign.status !== 'draft' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map(s => (
              <Card key={s.label} className="p-4 text-center">
                <s.icon className={cn('h-5 w-5 mx-auto mb-1', s.color)} />
                <p className="font-display font-bold text-2xl">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Card>
            ))}
          </div>

          {campaign.total_recipients > 0 && (
            <Card className="p-5">
              <h3 className="font-display font-bold mb-3">Delivery Breakdown</h3>
              <div className="space-y-2">
                {[
                  { key: 'queued',  label: 'Queued',   color: 'bg-blue-500' },
                  { key: 'sent',    label: 'Sent',      color: 'bg-green-500' },
                  { key: 'skipped', label: 'Skipped',   color: 'bg-amber-400' },
                  { key: 'failed',  label: 'Failed',    color: 'bg-red-500' },
                ].map(row => {
                  const count = breakdown?.[row.key] ?? 0;
                  const pct   = Math.round((count / total) * 100);
                  return count > 0 ? (
                    <div key={row.key} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-right text-muted-foreground capitalize">{row.label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', row.color)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-12 text-right font-mono text-xs">{count} ({pct}%)</span>
                    </div>
                  ) : null;
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Message preview */}
      <Card className="p-5">
        <h3 className="font-display font-bold mb-3">Message Preview</h3>
        {campaign.subject && <p className="text-sm font-medium mb-1">Subject: {campaign.subject}</p>}
        <div className="bg-muted/30 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap border">
          {campaign.body?.replace(/<[^>]+>/g, '')}
        </div>
      </Card>
    </div>
  );
}
