'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await apiClient.post<{ sent: boolean; reset_url?: string }>('/auth/password/forgot', {
        email,
      });

      if (res.data.reset_url) {
        setResetUrl(res.data.reset_url);
      }

      toast.success('If this email is registered, password reset instructions were sent.');
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
            <Mail className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="font-display text-3xl font-bold tracking-tight">Forgot Password</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Enter your email and we&apos;ll send a reset link.</p>
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
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>

          {resetUrl ? (
            <div className="mt-6 rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground break-words">
              <p className="font-medium text-foreground mb-2">Local reset preview</p>
              <div className="flex items-center gap-3">
                <a href={resetUrl} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
                  {resetUrl}
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(resetUrl);
                      toast.success('Reset link copied to clipboard');
                    } catch {
                      toast('Copy failed — please select and copy manually');
                    }
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-md px-3 py-1 bg-border text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          ) : null}

          <p className="text-sm text-center text-muted-foreground mt-6">
            Remembered your password?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
