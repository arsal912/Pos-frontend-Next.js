'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, Loader2, MailX, MessageSquareX, MessageCircleX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SearchParamsBoundary } from '@/components/ui/SearchParamsBoundary';

type Phase = 'loading' | 'confirm' | 'done' | 'error' | 'already';

const CHANNEL_ICONS = {
  sms:      { icon: MessageSquareX, color: 'text-blue-500',    label: 'SMS' },
  email:    { icon: MailX,          color: 'text-green-500',   label: 'email' },
  whatsapp: { icon: MessageCircleX, color: 'text-emerald-500', label: 'WhatsApp' },
};

function UnsubscribePageContent() {
  const params = useSearchParams();
  const channel  = params.get('channel') ?? '';
  const r        = params.get('r')       ?? '';
  const store    = params.get('store')   ?? '';
  const sig      = params.get('sig')     ?? '';

  const [phase, setPhase]         = useState<Phase>('loading');
  const [info, setInfo]           = useState<{ channel: string; recipient: string; store_name: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError]         = useState('');

  // Validate the link on mount
  useEffect(() => {
    if (!channel || !r || !store || !sig) {
      setError('This unsubscribe link is missing required information.');
      setPhase('error');
      return;
    }

    apiClient.get('/unsubscribe', { channel, r, store, sig })
      .then(res => {
        const d = res.data as any;
        setInfo(d);
        setPhase(d.already_opted_out ? 'already' : 'confirm');
      })
      .catch(err => {
        setError(getErrorMessage(err));
        setPhase('error');
      });
  }, []);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await apiClient.post('/unsubscribe/confirm', { channel, r, store, sig });
      setPhase('done');
    } catch (err) {
      setError(getErrorMessage(err));
      setPhase('error');
    } finally {
      setConfirming(false);
    }
  };

  const chMeta = CHANNEL_ICONS[channel as keyof typeof CHANNEL_ICONS] ?? CHANNEL_ICONS.email;
  const Icon   = chMeta.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center mb-3">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Communication Preferences</p>
        </div>

        <div className="bg-card border rounded-2xl shadow-xl p-8 text-center space-y-5">

          {/* Loading */}
          {phase === 'loading' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Verifying your unsubscribe link…</p>
            </>
          )}

          {/* Confirm */}
          {phase === 'confirm' && info && (
            <>
              <Icon className={cn('h-12 w-12 mx-auto', chMeta.color)} />
              <div>
                <h1 className="font-display font-bold text-2xl mb-1">Unsubscribe</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You are about to unsubscribe <strong>{info.recipient}</strong> from{' '}
                  <strong>{chMeta.label}</strong> messages from <strong>{info.store_name}</strong>.
                </p>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 leading-relaxed">
                You will no longer receive marketing messages via {chMeta.label}. You may still receive
                important transactional messages (receipts, order updates).
              </p>
              <div className="space-y-2">
                <Button onClick={handleConfirm} disabled={confirming} variant="destructive" className="w-full gap-2">
                  {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
                  Yes, unsubscribe me
                </Button>
                <p className="text-xs text-muted-foreground">
                  Changed your mind?{' '}
                  <a href="/" className="text-primary underline">Go back to homepage</a>
                </p>
              </div>
            </>
          )}

          {/* Already opted out */}
          {phase === 'already' && info && (
            <>
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h1 className="font-display font-bold text-2xl mb-1">Already unsubscribed</h1>
                <p className="text-muted-foreground text-sm">
                  <strong>{info.recipient}</strong> is already unsubscribed from{' '}
                  {chMeta.label} messages from <strong>{info.store_name}</strong>.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                If you believe this is a mistake, please contact the store directly.
              </p>
            </>
          )}

          {/* Done */}
          {phase === 'done' && (
            <>
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl mb-1">Unsubscribed</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You have been successfully removed from {chMeta.label} marketing messages.
                  This may take up to 24 hours to take full effect.
                </p>
              </div>
              <p className="text-xs text-muted-foreground bg-green-50 border border-green-100 rounded-lg p-3">
                You will still receive important transactional messages such as receipts and order confirmations.
              </p>
            </>
          )}

          {/* Error */}
          {phase === 'error' && (
            <>
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-9 w-9 text-destructive" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl mb-1">Invalid link</h1>
                <p className="text-muted-foreground text-sm">{error || 'This unsubscribe link is invalid or has expired.'}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                If you want to unsubscribe, please contact the store directly or reply STOP to any SMS.
              </p>
            </>
          )}

        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by POS System &mdash; Secure unsubscribe
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <SearchParamsBoundary>
      <UnsubscribePageContent />
    </SearchParamsBoundary>
  );
}
