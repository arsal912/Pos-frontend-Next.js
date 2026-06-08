'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import CampaignForm from '../../CampaignForm';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiClient.get(`/campaigns/${id}`)
      .then(res => {
        const c = (res.data as any)?.campaign ?? res.data;
        setCampaign({
          id:                   c.id,
          name:                 c.name,
          description:          c.description ?? '',
          channel:              c.channel,
          type:                 c.type,
          message_template_id:  c.message_template_id ?? null,
          subject:              c.subject ?? '',
          body:                 c.body ?? '',
          variables:            c.variables ?? {},
          target_type:          c.target_type,
          target_id:            c.target_id ?? null,
          scheduled_at:         c.scheduled_at
            ? new Date(c.scheduled_at).toISOString().slice(0,16)
            : '',
        });
      })
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return campaign ? <CampaignForm initial={campaign} /> : null;
}
