'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { SearchParamsBoundary } from '@/components/ui/SearchParamsBoundary';

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setMessage('No verification token provided. Please use the link sent to your email.');
      setStatus('error');
      return;
    }

    const verify = async () => {
      setStatus('loading');

      try {
        const res = await apiClient.post<{ verified: boolean }>('/auth/email/verify', { token });
        setStatus('success');
        setMessage(res.message || 'Your email has been verified successfully.');
      } catch (error) {
        setStatus('error');
        setMessage(getErrorMessage(error));
      }
    };

    verify();
  }, [token]);

  const handleBack = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-10 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            {status === 'success' ? <CheckCircle2 className="h-10 w-10" /> : status === 'loading' ? <Loader2 className="h-10 w-10 animate-spin" /> : <AlertTriangle className="h-10 w-10" />}
          </div>
          <h1 className="text-3xl font-bold">Email Verification</h1>
          <p className="mt-3 text-sm text-muted-foreground">{message || 'Verifying your email address...'}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {status === 'success' ? (
            <Button variant="default" onClick={handleBack}>
              Continue to login
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                Back to login
              </Button>
              <Link href="/register" className="text-center text-sm text-muted-foreground hover:text-foreground">
                Need a new account?
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <SearchParamsBoundary>
      <VerifyEmailPageContent />
    </SearchParamsBoundary>
  );
}
