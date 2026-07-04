'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { SearchParamsBoundary } from '@/components/ui/SearchParamsBoundary';

type Status = 'verifying' | 'success' | 'pending' | 'error';

function BillingSuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setStatus('error');
      return;
    }

    apiClient
      .get(`/store/billing/sessions/${sessionId}`)
      .then((res) => {
        const paymentStatus = res.data?.status ?? 'pending';
        setPlanName(res.data?.subscription?.plan?.name ?? '');
        setStatus(paymentStatus === 'completed' ? 'success' : 'pending');

        if (paymentStatus === 'completed') {
          setTimeout(() => router.push('/dashboard?payment=success'), 2500);
        }
      })
      .catch(() => {
        // Session may not be processed yet — treat as pending
        setStatus('pending');
        setTimeout(() => router.push('/dashboard'), 3000);
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm w-full"
      >
        {status === 'verifying' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold">Verifying payment…</h1>
            <p className="text-muted-foreground mt-2">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 className="h-20 w-20 text-success mx-auto mb-6" />
            </motion.div>
            <h1 className="font-display text-3xl font-bold">Payment successful!</h1>
            {planName && <p className="text-muted-foreground mt-2">You are now on the <strong>{planName}</strong> plan.</p>}
            <p className="text-sm text-muted-foreground mt-4">Redirecting to your dashboard…</p>
          </>
        )}

        {status === 'pending' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-warning mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold">Payment processing…</h1>
            <p className="text-muted-foreground mt-2">This can take a few seconds. You will be redirected shortly.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground mt-2">We could not verify your payment. Please contact support.</p>
            <Button className="mt-6" onClick={() => router.push('/dashboard/billing')}>
              Go to Billing
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <SearchParamsBoundary>
      <BillingSuccessPageContent />
    </SearchParamsBoundary>
  );
}
