'use client';

import { useState } from 'react';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

export default function VerificationBanner() {
  const user = useAuthStore((state) => state.user);
  const [isSending, setIsSending] = useState(false);

  if (!user || user.email_verified_at) {
    return null;
  }

  const handleResend = async () => {
    setIsSending(true);
    try {
      const res = await apiClient.post<{ sent: boolean }>('/auth/email/resend');
      if (res.data.sent) {
        toast.success('Verification email resent. Check your inbox.');
      } else {
        toast.success('Email is already verified.');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 shadow-sm mb-6">
      <div className="flex items-start gap-4">
        <div className="mt-1 rounded-2xl bg-amber-200/60 p-3 text-amber-900">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">Verify your email to unlock full access</p>
          <p className="mt-1 text-sm text-amber-700">
            A verification link was sent to your inbox. Please verify your email to keep your account secure and continue using your dashboard.
          </p>
        </div>

        <Button onClick={handleResend} size="sm" disabled={isSending} className="whitespace-nowrap">
          <RotateCcw className="mr-2 h-4 w-4" />
          {isSending ? 'Sending...' : 'Resend email'}
        </Button>
      </div>
    </div>
  );
}
