'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
  X,
  ArrowUpRight,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

interface Plan {
  id: number;
  name: string;
  slug: string;
  price: number;
  currency: string;
  billing_cycle: string;
  description: string;
  trial_days: number;
  is_featured: boolean;
  features: string[];
}

interface Subscription {
  id: number;
  status: string;
  plan: Plan;
  amount: number;
  currency: string;
  billing_cycle: string;
  starts_at: string;
  ends_at: string | null;
  next_billing_at: string | null;
  cancelled_at: string | null;
  grace_period_ends_at: string | null;
  payment_gateway: string;
  auto_renew: boolean;
}

interface Gateway {
  slug: string;
  name: string;
  supported_currencies: string[];
  is_test_mode: boolean;
}

interface Payment {
  id: number;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  invoice_number: string | null;
  paid_at: string | null;
  subscription: { plan: { name: string } } | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  expired: { label: 'Expired', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

function fmt(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success('Payment successful! Your subscription is now active.');
    }
    if (searchParams.get('reactivate') === 'true') {
      // Auto-open plan picker when arriving from a 402 redirect
      setSelectedGateway(null);
      setShowUpgradeModal(true);
    }
  }, [searchParams]);

  // Pick the right gateway for a plan. For PKR plans, use the user's selection
  // (or auto-pick if only one PKR gateway is active). Non-PKR → Stripe.
  const resolveGateway = (plan: Plan | undefined, preferred: string | null): string => {
    if (!plan || plan.currency !== 'PKR') return 'stripe';
    const pkrGateways = gateways.filter(g =>
      g.supported_currencies?.includes('PKR') && g.slug !== 'stripe' && g.slug !== 'paypal' && g.slug !== 'manual'
    );
    if (preferred && pkrGateways.some(g => g.slug === preferred)) return preferred;
    return pkrGateways[0]?.slug ?? 'jazzcash';
  };

  const load = async () => {
    setLoading(true);
    try {
      const [subRes, plansRes, paymentsRes, gwRes] = await Promise.all([
        apiClient.get('/store/billing/subscription'),
        apiClient.get('/store/billing/plans'),
        apiClient.get('/store/billing/payments'),
        apiClient.get('/store/billing/gateways'),
      ]);
      setSubscription((subRes.data as any)?.subscription ?? null);
      setPlans((plansRes.data as any)?.plans ?? []);
      setGateways((gwRes.data as any)?.payment_gateways ?? []);
      const rawPayments = (paymentsRes.data as any)?.data ?? paymentsRes.data ?? [];
      setPayments(Array.isArray(rawPayments) ? rawPayments : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async () => {
    if (!subscription) return;
    setCancelling(true);
    try {
      await apiClient.post('/store/billing/cancel', { subscription_id: subscription.id });
      toast.success('Subscription cancelled. You can still use the service until the end of your billing period.');
      setShowCancelModal(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlanId) return;
    setChangingPlan(true);
    try {
      await apiClient.post('/store/billing/change-plan', { plan_id: selectedPlanId });
      toast.success('Plan updated successfully.');
      setShowUpgradeModal(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPlan(false);
    }
  };

  const handleCheckout = async (planId: number, gateway = 'stripe') => {
    setCheckingOut(true);
    try {
      const res = await apiClient.post('/store/billing/checkout', { gateway, plan_id: planId });
      const checkout = (res.data as any)?.checkout;

      if (!checkout?.checkout_url) {
        toast.error('Could not create checkout session.');
        return;
      }

      // Standard redirect (Stripe, PayPal)
      if (!checkout.method || checkout.method === 'GET') {
        window.location.href = checkout.checkout_url;
        return;
      }

      // Form-POST redirect (JazzCash, Easypaisa)
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
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCheckingOut(false);
    }
  };

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      const res = await apiClient.post('/store/billing/portal');
      const url = (res.data as any)?.url;
      if (url) window.location.href = url;
      else toast.error('Could not open billing portal.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOpeningPortal(false);
    }
  };

  const downloadInvoice = (paymentId: number, invoiceNumber: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const a = document.createElement('a');
    a.href = `/api/backend/store/billing/payments/${paymentId}/invoice`;
    a.download = `${invoiceNumber}.pdf`;
    if (token) {
      // Fetch with auth header then trigger download
      fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${invoiceNumber}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => toast.error('Could not download invoice.'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 rounded-xl bg-muted animate-pulse" />
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  const statusInfo = subscription ? (STATUS_BADGE[subscription.status] ?? { label: subscription.status, variant: 'outline' as const }) : null;
  const isGracePeriod = subscription?.grace_period_ends_at && new Date(subscription.grace_period_ends_at) > new Date();
  const currentPlanId = subscription?.plan?.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and invoices</p>
      </div>

      {/* Reactivation banner — shown when redirected from 402 */}
      {searchParams.get('reactivate') === 'true' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30"
        >
          <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-primary">Your subscription has expired</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose a plan below to restore access to your store immediately.
            </p>
          </div>
          <Button size="sm" className="ml-auto shrink-0" onClick={() => { setSelectedGateway(null); setShowUpgradeModal(true); }}>
            Choose a Plan
          </Button>
        </motion.div>
      )}

      {/* Grace period warning */}
      {isGracePeriod && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30"
        >
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-destructive">Payment failed</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your account is in a grace period until <strong>{fmt(subscription!.grace_period_ends_at)}</strong>.
              Please update your payment method to avoid service interruption.
            </p>
          </div>
        </motion.div>
      )}

      {/* Current plan card */}
      <Card className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl font-bold">
                  {subscription?.plan?.name ?? 'No active plan'}
                </h2>
                {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
                {subscription?.payment_gateway && (
                  <Badge variant="outline" className="capitalize">{subscription.payment_gateway}</Badge>
                )}
              </div>
              {subscription && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {fmtMoney(subscription.amount, subscription.currency)}
                  {subscription.billing_cycle !== 'lifetime' ? `/${subscription.billing_cycle}` : ' one-time'}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {subscription?.status === 'active' && (
              <>
                {subscription.payment_gateway === 'stripe' && (
                  <Button variant="outline" size="sm" onClick={handleOpenPortal} disabled={openingPortal} className="gap-1.5">
                    {openingPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    Update Payment Method
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { setSelectedGateway(null); setShowUpgradeModal(true); }} className="gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Change Plan
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCancelModal(true)}
                  className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5">
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </>
            )}
            {(!subscription || subscription.status === 'expired' || subscription.status === 'cancelled') && (
              <Button size="sm" onClick={() => { setSelectedGateway(null); setShowUpgradeModal(true); }} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {subscription?.status === 'cancelled' ? 'Reactivate' : 'Choose a Plan'}
              </Button>
            )}
          </div>
        </div>

        {subscription && (
          <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-5 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Started</p>
                <p className="font-medium">{fmt(subscription.starts_at)}</p>
              </div>
            </div>
            {subscription.ends_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {subscription.status === 'cancelled' ? 'Access until' : 'Renews'}
                  </p>
                  <p className="font-medium">{fmt(subscription.next_billing_at ?? subscription.ends_at)}</p>
                </div>
              </div>
            )}
            {subscription.cancelled_at && (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                  <p className="font-medium">{fmt(subscription.cancelled_at)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Payment history */}
      <Card className="p-6">
        <h2 className="font-display text-lg font-bold mb-4">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No payments yet.</p>
        ) : (
          <div className="space-y-1">
            {payments.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {p.status === 'completed'
                    ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">
                      {p.subscription?.plan?.name ?? 'Subscription'} — {fmtMoney(p.amount, p.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(p.paid_at)} · {p.gateway} {p.invoice_number ? `· ${p.invoice_number}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === 'completed' ? 'success' : 'destructive'} className="text-xs">
                    {p.status}
                  </Badge>
                  {p.invoice_number && p.status === 'completed' && (
                    <Button variant="ghost" size="sm" onClick={() => downloadInvoice(p.id, p.invoice_number!)}
                      className="h-7 w-7 p-0">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-lg">Cancel subscription?</h2>
                  <button onClick={() => setShowCancelModal(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your subscription will be cancelled at the end of the current billing period
                  ({fmt(subscription?.ends_at ?? null)}). You will retain access until then.
                </p>
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowCancelModal(false)} className="flex-1">Keep Plan</Button>
                  <Button variant="destructive" onClick={handleCancel} disabled={cancelling} className="flex-1 gap-2">
                    {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                    Yes, Cancel
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plan picker modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-2xl">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-xl">Choose a plan</h2>
                  <button onClick={() => setShowUpgradeModal(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* PKR gateway selector — shown only when the selected plan is PKR and multiple gateways available */}
                {(() => {
                  const plan = plans.find(p => p.id === selectedPlanId);
                  const pkrGateways = gateways.filter(g =>
                    g.supported_currencies?.includes('PKR') && !['stripe', 'paypal', 'manual'].includes(g.slug)
                  );
                  if (!plan || plan.currency !== 'PKR' || pkrGateways.length <= 1) return null;
                  return (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Pay via</p>
                      <div className="flex gap-2">
                        {pkrGateways.map(gw => (
                          <button
                            key={gw.slug}
                            type="button"
                            onClick={() => setSelectedGateway(gw.slug)}
                            className={cn(
                              'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all capitalize',
                              (selectedGateway ?? pkrGateways[0]?.slug) === gw.slug
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/30'
                            )}
                          >
                            {gw.name}
                            {gw.is_test_mode && <span className="ml-1 text-[10px] text-amber-500">(test)</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="grid sm:grid-cols-2 gap-3 mb-5">
                  {plans.filter((p) => p.price > 0).map((plan) => (
                    <button key={plan.id} type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all relative',
                        selectedPlanId === plan.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                        currentPlanId === plan.id && 'opacity-60'
                      )}
                    >
                      {plan.is_featured && (
                        <Badge variant="default" className="absolute -top-2 right-3 text-[10px]">Popular</Badge>
                      )}
                      {currentPlanId === plan.id && (
                        <Badge variant="outline" className="absolute -top-2 left-3 text-[10px]">Current</Badge>
                      )}
                      <div className="flex items-baseline justify-between">
                        <span className="font-display font-bold">{plan.name}</span>
                        <span className="font-mono text-sm">
                          {fmtMoney(plan.price, plan.currency)}/{plan.billing_cycle === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowUpgradeModal(false)} className="flex-1">Cancel</Button>
                  <Button
                    onClick={() => {
                      if (!selectedPlanId) return;
                      if (subscription?.status === 'active') {
                        handleChangePlan();
                      } else {
                        const plan = plans.find(p => p.id === selectedPlanId);
                        const gw = resolveGateway(plan, selectedGateway);
                        setShowUpgradeModal(false);
                        handleCheckout(selectedPlanId, gw);
                      }
                    }}
                    disabled={!selectedPlanId || changingPlan || checkingOut || currentPlanId === selectedPlanId}
                    className="flex-1 gap-2"
                  >
                    {(changingPlan || checkingOut) && <Loader2 className="h-4 w-4 animate-spin" />}
                    {subscription?.status === 'active' ? 'Switch Plan' : 'Proceed to Payment'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
