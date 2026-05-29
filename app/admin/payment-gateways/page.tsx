'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Settings2,
  Wifi,
  WifiOff,
  Loader2,
  Eye,
  EyeOff,
  X,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Gateway {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  is_active: boolean;
  is_test_mode: boolean;
  supports_subscription: boolean;
  supported_currencies: string[];
  sort_order: number;
}

const CREDENTIAL_FIELDS: Record<string, { key: string; label: string; placeholder: string; secret?: boolean }[]> = {
  stripe: [
    { key: 'secret_key', label: 'Secret Key', placeholder: 'sk_live_... or sk_test_...', secret: true },
    { key: 'webhook_secret', label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
  ],
  paypal: [
    { key: 'client_id', label: 'Client ID', placeholder: 'PayPal app client ID' },
    { key: 'client_secret', label: 'Client Secret', placeholder: 'PayPal app secret', secret: true },
  ],
  jazzcash: [
    { key: 'merchant_id', label: 'Merchant ID', placeholder: 'JazzCash merchant ID' },
    { key: 'password', label: 'Password', placeholder: 'JazzCash password', secret: true },
    { key: 'integrity_salt', label: 'Integrity Salt', placeholder: 'JazzCash integrity salt', secret: true },
  ],
  easypaisa: [
    { key: 'store_id', label: 'Store ID', placeholder: 'Easypaisa store ID' },
    { key: 'hash_key', label: 'Hash Key', placeholder: 'Easypaisa hash key', secret: true },
  ],
  manual: [],
};

const GATEWAY_ICONS: Record<string, string> = {
  stripe: '💳',
  paypal: '🅿️',
  jazzcash: '🟠',
  easypaisa: '🟢',
  manual: '🏦',
};

export default function PaymentGatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [configSlug, setConfigSlug] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const res = await apiClient.get<Gateway[]>('/admin/payment-gateways');
      setGateways(Array.isArray(res.data) ? res.data : (res.data as any)?.payment_gateways ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (slug: string, field: 'is_active' | 'is_test_mode', value: boolean) => {
    setToggling(prev => ({ ...prev, [`${slug}_${field}`]: true }));
    try {
      await apiClient.put(`/admin/payment-gateways/${slug}`, { [field]: value });
      setGateways(prev =>
        prev.map(g => (g.slug === slug ? { ...g, [field]: value } : g))
      );
      toast.success(`${field === 'is_active' ? (value ? 'Enabled' : 'Disabled') : (value ? 'Test mode on' : 'Live mode on')}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setToggling(prev => ({ ...prev, [`${slug}_${field}`]: false }));
    }
  };

  const handleTest = async (slug: string) => {
    setTesting(slug);
    try {
      await apiClient.post(`/admin/payment-gateways/${slug}/test`);
      toast.success('Connection successful');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTesting(null);
    }
  };

  const openConfig = (slug: string) => {
    setCredentials({});
    setShowSecrets({});
    setConfigSlug(slug);
  };

  const handleSaveCredentials = async () => {
    if (!configSlug) return;
    setSavingCredentials(true);
    try {
      await apiClient.put(`/admin/payment-gateways/${configSlug}`, {
        credentials: credentials,
      });
      toast.success('Credentials saved (encrypted)');
      setConfigSlug(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingCredentials(false);
    }
  };

  const activeGateway = gateways.find(g => g.slug === configSlug);
  const configFields = configSlug ? (CREDENTIAL_FIELDS[configSlug] ?? []) : [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 rounded-xl bg-muted animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Payment Gateways</h1>
        <p className="text-muted-foreground mt-1">Configure and enable payment methods for your platform</p>
      </div>

      <div className="grid gap-4">
        {gateways.map((gateway, i) => (
          <motion.div
            key={gateway.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={cn(
              'p-5 border transition-all',
              gateway.is_active ? 'border-success/30 bg-success/[0.02]' : 'opacity-80'
            )}>
              <div className="flex items-start gap-4">
                {/* Gateway icon */}
                <div className={cn(
                  'h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
                  gateway.is_active ? 'bg-success/10' : 'bg-muted'
                )}>
                  {GATEWAY_ICONS[gateway.slug] ?? '💰'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-bold text-lg">{gateway.name}</h2>
                    {gateway.is_active ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground gap-1">
                        <XCircle className="h-3 w-3" /> Inactive
                      </Badge>
                    )}
                    {gateway.is_test_mode && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                        <FlaskConical className="h-3 w-3" /> Test Mode
                      </Badge>
                    )}
                    {gateway.supports_subscription && (
                      <Badge variant="outline" className="text-primary border-primary/30 gap-1">
                        <ShieldCheck className="h-3 w-3" /> Subscriptions
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Currencies: {gateway.supported_currencies?.join(', ') ?? '—'}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  {/* Test mode toggle */}
                  <div className="flex items-center gap-2 text-sm">
                    {toggling[`${gateway.slug}_is_test_mode`] ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <span className="text-muted-foreground text-xs">Test</span>
                        <Switch
                          checked={gateway.is_test_mode}
                          onCheckedChange={v => handleToggle(gateway.slug, 'is_test_mode', v)}
                        />
                      </>
                    )}
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center gap-2 text-sm">
                    {toggling[`${gateway.slug}_is_active`] ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <span className="text-muted-foreground text-xs">Active</span>
                        <Switch
                          checked={gateway.is_active}
                          onCheckedChange={v => handleToggle(gateway.slug, 'is_active', v)}
                        />
                      </>
                    )}
                  </div>

                  {/* Configure */}
                  {CREDENTIAL_FIELDS[gateway.slug]?.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => openConfig(gateway.slug)} className="gap-1.5">
                      <Settings2 className="h-3.5 w-3.5" />
                      Configure
                    </Button>
                  )}

                  {/* Test connection */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(gateway.slug)}
                    disabled={testing === gateway.slug}
                    className="gap-1.5"
                  >
                    {testing === gateway.slug ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wifi className="h-3.5 w-3.5" />
                    )}
                    Test
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Credentials modal */}
      <AnimatePresence>
        {configSlug && activeGateway && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setConfigSlug(null)}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-md"
            >
              <Card className="p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                      {GATEWAY_ICONS[configSlug] ?? '💰'}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-lg leading-none">{activeGateway.name}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Enter API credentials</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfigSlug(null)}
                    className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {configFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No credentials required for this gateway.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {configFields.map(field => (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <div className="relative">
                          <Input
                            id={field.key}
                            type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                            placeholder={field.placeholder}
                            value={credentials[field.key] ?? ''}
                            onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="pr-9"
                          />
                          {field.secret && (
                            <button
                              type="button"
                              onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setConfigSlug(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCredentials} disabled={savingCredentials} className="flex-1 gap-2">
                    {savingCredentials ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save Credentials
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground text-center mt-3">
                  Credentials are encrypted at rest using AES-256.
                </p>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
