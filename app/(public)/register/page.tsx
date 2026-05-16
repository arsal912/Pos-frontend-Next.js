'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, ArrowRight, Loader2, Check, Store as StoreIcon, User as UserIcon, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Plan, User } from '@/types';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Your Business', icon: StoreIcon },
  { id: 2, title: 'Account', icon: UserIcon },
  { id: 3, title: 'Plan', icon: Tag },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [form, setForm] = useState({
    store_name: '',
    business_type: 'general',
    store_email: '',
    store_phone: '',
    city: '',
    country: 'PK',
    currency: 'PKR',
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    plan_id: 0,
  });

  useEffect(() => {
    apiClient
      .get<Plan[]>('/public/landing/plans')
      .then((res) => {
        setPlans(res.data);
        const planSlug = searchParams.get('plan');
        const matched = planSlug ? res.data.find((p) => p.slug === planSlug) : res.data[0];
        if (matched) setForm((f) => ({ ...f, plan_id: matched.id }));
      })
      .catch(() => toast.error('Failed to load plans'));
  }, [searchParams]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const validateStep = () => {
    if (step === 1) {
      if (!form.store_name || !form.store_email) {
        toast.error('Please fill in store name and email');
        return false;
      }
    }
    if (step === 2) {
      if (!form.name || !form.email || !form.password) {
        toast.error('Please fill in all required fields');
        return false;
      }
      if (form.password !== form.password_confirmation) {
        toast.error('Passwords do not match');
        return false;
      }
      if (form.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) next();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    try {
      const res = await apiClient.post<{ token: string; user: User }>('/auth/register', form);
      setAuth(res.data.user, res.data.token);
      toast.success('Welcome aboard! Your store is ready.');
      router.push('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />

      <div className="relative z-10 container py-10">
        <Link href="/" className="inline-flex items-center gap-2 group mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-xl">POS</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Set up your <span className="gradient-text italic">store</span>
            </h1>
            <p className="mt-3 text-muted-foreground">Get started in less than 2 minutes</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full transition-all',
                      isActive && 'bg-primary text-primary-foreground shadow-lg shadow-primary/20',
                      isDone && 'bg-success/10 text-success border border-success/30',
                      !isActive && !isDone && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    <span className="text-sm font-medium hidden sm:inline">{s.title}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn('h-px w-8 mx-1', step > s.id ? 'bg-success' : 'bg-border')} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="glass-card rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="font-display text-2xl font-bold mb-1">Tell us about your business</h2>
                      <p className="text-sm text-muted-foreground">We&rsquo;ll customize your dashboard for it</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="store_name">Store Name *</Label>
                      <Input
                        id="store_name"
                        value={form.store_name}
                        onChange={(e) => update('store_name', e.target.value)}
                        placeholder="Khan Mart"
                        required
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="store_email">Business Email *</Label>
                        <Input
                          id="store_email"
                          type="email"
                          value={form.store_email}
                          onChange={(e) => update('store_email', e.target.value)}
                          placeholder="store@business.com"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="store_phone">Business Phone</Label>
                        <Input
                          id="store_phone"
                          value={form.store_phone}
                          onChange={(e) => update('store_phone', e.target.value)}
                          placeholder="+92 300 0000000"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={form.city}
                          onChange={(e) => update('city', e.target.value)}
                          placeholder="Lahore"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={form.country}
                          onChange={(e) => update('country', e.target.value)}
                          placeholder="PK"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={form.currency}
                          onChange={(e) => update('currency', e.target.value)}
                          placeholder="PKR"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="font-display text-2xl font-bold mb-1">Create your account</h2>
                      <p className="text-sm text-muted-foreground">You&rsquo;ll be the owner of this store</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="name">Your Full Name *</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        placeholder="Ahmed Khan"
                        required
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Your Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => update('email', e.target.value)}
                          placeholder="you@email.com"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Your Phone</Label>
                        <Input
                          id="phone"
                          value={form.phone}
                          onChange={(e) => update('phone', e.target.value)}
                          placeholder="+92 300 0000000"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={form.password}
                          onChange={(e) => update('password', e.target.value)}
                          placeholder="At least 8 characters"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password_confirmation">Confirm Password *</Label>
                        <Input
                          id="password_confirmation"
                          type="password"
                          value={form.password_confirmation}
                          onChange={(e) => update('password_confirmation', e.target.value)}
                          placeholder="Re-type password"
                          required
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="font-display text-2xl font-bold mb-1">Choose your plan</h2>
                      <p className="text-sm text-muted-foreground">Start with a free trial — no credit card required</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {plans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => update('plan_id', plan.id)}
                          className={cn(
                            'p-4 rounded-xl border-2 text-left transition-all relative',
                            form.plan_id === plan.id
                              ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                              : 'border-border hover:border-primary/30'
                          )}
                        >
                          {plan.is_featured && (
                            <Badge variant="default" className="absolute -top-2 right-3 text-[10px]">
                              Popular
                            </Badge>
                          )}
                          <div className="flex items-baseline justify-between">
                            <span className="font-display font-bold text-lg">{plan.name}</span>
                            <span className="font-mono text-sm">
                              {plan.price === 0 ? 'Free' : `$${plan.price}/${plan.billing_cycle === 'yearly' ? 'yr' : 'mo'}`}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                          {plan.trial_days > 0 && (
                            <p className="text-xs text-accent font-medium mt-2">
                              {plan.trial_days}-day free trial
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={back}
                  disabled={step === 1 || loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                {step < STEPS.length ? (
                  <Button type="button" variant="gradient" onClick={handleNext} disabled={loading}>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" variant="gradient" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating store...
                      </>
                    ) : (
                      <>
                        Create Store
                        <Check className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
