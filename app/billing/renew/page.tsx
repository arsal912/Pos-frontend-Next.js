'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { SearchParamsBoundary } from '@/components/ui/SearchParamsBoundary';

/**
 * Landing page for manual renewal links sent in reminder emails.
 * Linked from: ManualRenewalReminder email
 * URL: /billing/renew?subscription_id={id}
 *
 * Reads the subscription_id, determines the gateway (jazzcash/easypaisa),
 * initiates a new checkout, and redirects the browser to the payment page.
 */
function BillingRenewPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      setErrorMsg('Invalid renewal link — subscription ID is missing.');
      setStatus('error');
      return;
    }

    // Fetch the subscription to find the gateway and plan
    apiClient.get('/store/billing/subscription')
      .then((res) => {
        const sub = (res.data as any)?.subscription;

        if (!sub) {
          setErrorMsg('Subscription not found. Please log in first.');
          setStatus('error');
          return;
        }

        const gateway = sub.payment_gateway ?? 'jazzcash';
        const planId  = sub.plan?.id;

        if (!planId) {
          setErrorMsg('Could not determine plan. Please visit your billing page.');
          setStatus('error');
          return;
        }

        setStatus('redirecting');

        return apiClient.post('/store/billing/checkout', { gateway, plan_id: planId });
      })
      .then((checkoutRes) => {
        if (!checkoutRes) return;

        const checkout = (checkoutRes.data as any)?.checkout;

        if (!checkout?.checkout_url) {
          setErrorMsg('Could not create checkout session.');
          setStatus('error');
          return;
        }

        if (!checkout.method || checkout.method === 'GET') {
          window.location.href = checkout.checkout_url;
          return;
        }

        // Form POST (JazzCash / Easypaisa)
        if (checkout.method === 'POST' && checkout.params) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = checkout.checkout_url;
          form.style.display = 'none';
          Object.entries(checkout.params as Record<string, string>).forEach(([k, v]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = v;
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
        }
      })
      .catch((err) => {
        const msg = getErrorMessage(err);
        if (msg.includes('Unauthenticated') || msg.includes('401')) {
          // Not logged in — redirect to login then back
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
        } else {
          setErrorMsg(msg);
          setStatus('error');
        }
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm w-full"
      >
        {(status === 'loading' || status === 'redirecting') && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold">
              {status === 'loading' ? 'Preparing renewal…' : 'Redirecting to payment…'}
            </h1>
            <p className="text-muted-foreground mt-2">Please wait a moment.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold">Could not renew</h1>
            <p className="text-muted-foreground mt-2">{errorMsg}</p>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="outline" onClick={() => router.push('/login')}>Sign in</Button>
              <Button onClick={() => router.push('/dashboard/billing')} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Billing Page
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function BillingRenewPage() {
  return (
    <SearchParamsBoundary>
      <BillingRenewPageContent />
    </SearchParamsBoundary>
  );
}
