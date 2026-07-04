'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { SearchParamsBoundary } from '@/components/ui/SearchParamsBoundary';

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      toast.error('Password reset link is missing.');
      router.push('/forgot-password');
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [router, searchParams]);

  const validateToken = async (tokenValue: string) => {
    try {
      const res = await apiClient.post<{ valid: boolean; email: string }>('/auth/password/validate', {
        token: tokenValue,
      });
      // Prefill the email field returned by the backend for smoother UX
      if (res?.data?.email) setEmail(res.data.email);
      setIsValid(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setIsValid(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setLoading(true);

    try {
      await apiClient.post('/auth/password/reset', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success('Password reset successfully.');
      router.push('/login');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link href="/" className="flex items-center gap-2 justify-center mb-8 group">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-110 transition-transform">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-2xl">POS</span>
        </Link>

        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <div className="mb-7 text-center">
            <Lock className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="font-display text-3xl font-bold tracking-tight">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Enter a new password to update your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || !isValid}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || !isValid}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passwordConfirmation">Confirm Password</Label>
              <Input
                id="passwordConfirmation"
                type="password"
                placeholder="••••••••"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                disabled={loading || !isValid}
              />
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading || !isValid}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Back to{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <SearchParamsBoundary>
      <ResetPasswordPageContent />
    </SearchParamsBoundary>
  );
}
