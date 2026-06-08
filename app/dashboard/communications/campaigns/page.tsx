'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, MessageSquare, Mail, MessageCircle, Play, Ban,
  BarChart2, Loader2, Search, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  channel: 'sms' | 'email' | 'whatsapp';
  type: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  target_type: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  skipped_count: number;
  failed_count: number;
  delivery_rate: number;
  created_at: string;
}

const CHANNEL_ICONS = { sms: MessageSquare, email: Mail, whatsapp: MessageCircle };
const CHANNEL_COLORS = { sms: 'text-blue-500', email: 'text-green-500', whatsapp: 'text-emerald-500' };

const STATUS_STYLES: Record<Campaign['status'], string> = {
  draft:     'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending:   'bg-amber-100 text-amber-700',
  sent:      'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  failed:    'bg-red-100 text-red-700',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [acting, setActing] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/campaigns', {
        search:   search   || undefined,
        status:   statusFilter || undefined,
        per_page: 50,
      });
      setCampaigns(Array.isArray(res.data) ? (res.data as Campaign[]) : []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleLaunch = async (c: Campaign) => {
    if (!confirm(`Launch "${c.name}" now? This will queue messages to all targeted recipients.`)) return;
    setActing(c.id);
    try {
      await apiClient.post(`/campaigns/${c.id}/launch`);
      toast.success('Campaign queued for dispatch.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(null); }
  };

  const handleCancel = async (c: Campaign) => {
    if (!confirm(`Cancel "${c.name}"? This cannot be undone.`)) return;
    setActing(c.id);
    try {
      await apiClient.post(`/campaigns/${c.id}/cancel`);
      toast.success('Campaign cancelled.');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Bulk SMS, email and WhatsApp campaigns to your customers</p>
        </div>
        <Link href="/dashboard/communications/campaigns/new">
          <Button className="gap-2 flex-shrink-0">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns…" className="pl-9 h-9" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : campaigns.length === 0 ? (
        <Card className="p-16 text-center">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No campaigns yet.</p>
          <Link href="/dashboard/communications/campaigns/new" className="mt-3 inline-block">
            <Button variant="outline" size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />Create one</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c, i) => {
            const Icon = CHANNEL_ICONS[c.channel];
            const isActing = acting === c.id;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className={cn('h-5 w-5', CHANNEL_COLORS[c.channel])} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/communications/campaigns/${c.id}`}
                          className="font-semibold hover:underline">
                          {c.name}
                        </Link>
                        <Badge className={cn('text-xs capitalize', STATUS_STYLES[c.status])}>
                          {c.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">{c.type}</span>
                      </div>
                      {c.description && <p className="text-sm text-muted-foreground mt-0.5">{c.description}</p>}

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Audience: <span className="capitalize">{c.target_type.replace('_', ' ')}</span></span>
                        {c.total_recipients > 0 && (
                          <>
                            <span>{c.total_recipients} recipients</span>
                            {c.status === 'sent' && (
                              <span className="text-green-600">{c.delivery_rate}% delivered</span>
                            )}
                          </>
                        )}
                        {c.scheduled_at && (
                          <span>Scheduled: {new Date(c.scheduled_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {c.status === 'sent' && (
                        <Link href={`/dashboard/communications/campaigns/${c.id}`}>
                          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                            <BarChart2 className="h-3.5 w-3.5" /> Stats
                          </Button>
                        </Link>
                      )}
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <>
                          <Link href={`/dashboard/communications/campaigns/${c.id}/edit`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">Edit</Button>
                          </Link>
                          <Button size="sm" className="h-8 gap-1 text-xs"
                            onClick={() => handleLaunch(c)} disabled={isActing}>
                            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            Launch
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleCancel(c)} disabled={isActing}>
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {!['draft','scheduled','sent'].includes(c.status) && (
                        <Link href={`/dashboard/communications/campaigns/${c.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for sent campaigns */}
                  {c.status === 'sent' && c.total_recipients > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full"
                          style={{ width: `${c.delivery_rate}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{c.sent_count} sent</span>
                        <span>{c.skipped_count} skipped · {c.failed_count} failed</span>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
