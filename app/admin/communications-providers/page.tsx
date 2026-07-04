'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Mail, MessageCircle, CheckCircle2, XCircle,
  Settings2, Wifi, FlaskConical, Eye, EyeOff, X, Loader2,
  ShieldCheck, Star,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Provider {
  id: number;
  channel: string;
  provider_slug: string;
  name: string;
  is_active: boolean;
  is_default_for_channel: boolean;
  has_credentials: boolean;
  test_recipient: string | null;
  config: Record<string, any> | null;
  sort_order: number;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  sms: MessageSquare, email: Mail, whatsapp: MessageCircle,
};

const CHANNEL_COLORS: Record<string, string> = {
  sms: 'text-blue-500', email: 'text-green-500', whatsapp: 'text-emerald-500',
};

const CREDENTIAL_FIELDS: Record<string, { key: string; label: string; placeholder: string; secret?: boolean }[]> = {
  'twilio-sms': [
    { key: 'account_sid',  label: 'Account SID',   placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    { key: 'auth_token',   label: 'Auth Token',    placeholder: 'Auth token from Twilio console', secret: true },
    { key: 'from_number',  label: 'From Number',   placeholder: '+12345678901' },
    { key: 'test_number',  label: 'Test Number',   placeholder: '+1XXXXXXXXXX' },
  ],
  'twilio-whatsapp': [
    { key: 'account_sid',    label: 'Account SID',      placeholder: 'ACxxxxxxxx' },
    { key: 'auth_token',     label: 'Auth Token',       placeholder: 'Auth token', secret: true },
    { key: 'whatsapp_from',  label: 'WhatsApp From',    placeholder: 'whatsapp:+14155238886' },
  ],
  'resend': [
    { key: 'api_key',        label: 'API Key',          placeholder: 're_xxxxxxxxxx', secret: true },
    { key: 'from_email',     label: 'From Email',       placeholder: 'noreply@yourdomain.com' },
    { key: 'from_name',      label: 'From Name',        placeholder: 'My Store' },
    { key: 'webhook_secret', label: 'Webhook Secret',   placeholder: 'From Resend dashboard', secret: true },
  ],
  'local-pk-sms': [
    { key: 'username',   label: 'Username',   placeholder: 'Provider username' },
    { key: 'password',   label: 'Password',   placeholder: 'Provider password', secret: true },
    { key: 'sender_id',  label: 'Sender ID',  placeholder: 'POSAPP (11 chars max)' },
    { key: 'api_url',    label: 'API URL',    placeholder: 'https://api.provider.com/send' },
  ],
};

export default function CommunicationsProvidersPage() {
  const [grouped, setGrouped] = useState<Record<string, Provider[]>>({});
  const [loading, setLoading] = useState(true);
  const [configSlug, setConfigSlug] = useState<{ id: number; slug: string } | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [testRecipient, setTestRecipient] = useState('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/communications-providers');
      setGrouped((res.data as any)?.providers ?? {});
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (provider: Provider, field: 'is_active', value: boolean) => {
    const key = `${provider.id}_${field}`;
    setToggling(prev => ({ ...prev, [key]: true }));
    try {
      await apiClient.put(`/admin/communications-providers/${provider.id}`, { [field]: value });
      setGrouped(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(ch => {
          updated[ch] = updated[ch].map(p => p.id === provider.id ? { ...p, [field]: value } : p);
        });
        return updated;
      });
      toast.success(value ? `${provider.name} enabled` : `${provider.name} disabled`);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setToggling(prev => ({ ...prev, [key]: false })); }
  };

  const handleSetDefault = async (provider: Provider) => {
    try {
      await apiClient.post(`/admin/communications-providers/${provider.id}/set-default`);
      toast.success(`${provider.name} set as default ${provider.channel} provider.`);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleTest = async (provider: Provider) => {
    setTesting(provider.id);
    try {
      const res = await apiClient.post(`/admin/communications-providers/${provider.id}/test`);
      toast.success((res as any).message ?? 'Connection successful');
      const msg = (res.data as any)?.test_message;
      if (msg) toast.info(msg, { duration: 6000 });
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setTesting(null); }
  };

  const openConfig = (provider: Provider) => {
    setCredentials({});
    setShowSecrets({});
    setTestRecipient(provider.test_recipient ?? '');
    setConfigSlug({ id: provider.id, slug: provider.provider_slug });
  };

  const handleSaveCredentials = async () => {
    if (!configSlug) return;
    setSaving(true);
    try {
      await apiClient.put(`/admin/communications-providers/${configSlug.id}`, {
        credentials:    credentials,
        test_recipient: testRecipient || undefined,
      });
      toast.success('Credentials saved (encrypted).');
      setConfigSlug(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const channels = ['sms', 'email', 'whatsapp'];
  const allProviders = Object.values(grouped).flat();
  const activeProvider = allProviders.find(p => p.id === configSlug?.id) ?? null;
  const configFields = configSlug ? (CREDENTIAL_FIELDS[configSlug.slug] ?? []) : [];

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse"/>)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Communications Providers</h1>
        <p className="text-muted-foreground mt-1">Configure SMS, Email, and WhatsApp delivery providers</p>
      </div>

      {channels.map(channel => {
        const Icon = CHANNEL_ICONS[channel] ?? MessageSquare;
        const colorClass = CHANNEL_COLORS[channel] ?? 'text-primary';
        const providers = grouped[channel] ?? [];

        return (
          <div key={channel}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={cn('h-5 w-5', colorClass)} />
              <h2 className="font-display font-bold text-lg capitalize">{channel}</h2>
            </div>

            <div className="space-y-3">
              {providers.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className={cn('p-5 border transition-all', p.is_active && 'border-success/30 bg-success/[0.02]')}>
                    <div className="flex items-start gap-4">
                      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0', p.is_active ? 'bg-success/10' : 'bg-muted')}>
                        <Icon className={cn('h-5 w-5', p.is_active ? 'text-success' : 'text-muted-foreground')} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold">{p.name}</h3>
                          {p.is_active && <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3"/>Active</Badge>}
                          {!p.is_active && <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3"/>Inactive</Badge>}
                          {p.is_default_for_channel && <Badge variant="outline" className="gap-1 text-warning-foreground border-warning/40"><Star className="h-3 w-3"/>Default</Badge>}
                          {p.has_credentials && <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3"/>Configured</Badge>}
                          {!p.has_credentials && <Badge variant="destructive" className="text-xs">No Credentials</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{p.provider_slug}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
                        {/* Active toggle */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground">Active</span>
                          {toggling[`${p.id}_is_active`] ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Switch checked={p.is_active} onCheckedChange={v => handleToggle(p, 'is_active', v)} />
                          )}
                        </div>

                        {/* Set default */}
                        {!p.is_default_for_channel && (
                          <Button variant="outline" size="sm" onClick={() => handleSetDefault(p)} className="gap-1.5">
                            <Star className="h-3.5 w-3.5" />Set Default
                          </Button>
                        )}

                        {/* Configure */}
                        {configFields.length > 0 || CREDENTIAL_FIELDS[p.provider_slug]?.length > 0 ? (
                          <Button variant="outline" size="sm" onClick={() => openConfig(p)} className="gap-1.5">
                            <Settings2 className="h-3.5 w-3.5" />Configure
                          </Button>
                        ) : null}

                        {/* Test */}
                        <Button variant="ghost" size="sm" onClick={() => handleTest(p)} disabled={testing === p.id} className="gap-1.5">
                          {testing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                          Test
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}

              {providers.length === 0 && (
                <p className="text-muted-foreground text-sm py-3">No {channel} providers configured.</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Credentials modal */}
      <AnimatePresence>
        {configSlug && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfigSlug(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-display font-bold text-lg">{activeProvider?.name ?? 'Configure Provider'}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Enter API credentials</p>
                  </div>
                  <button onClick={() => setConfigSlug(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {configFields.map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <Label>{field.label}</Label>
                      <div className="relative">
                        <Input
                          type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={credentials[field.key] ?? ''}
                          onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="pr-9"
                        />
                        {field.secret && (
                          <button type="button" onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="space-y-1.5 border-t pt-4">
                    <Label>Test Recipient (optional)</Label>
                    <Input value={testRecipient} onChange={e => setTestRecipient(e.target.value)}
                      placeholder={activeProvider?.channel === 'email' ? 'test@example.com' : '+923001234567'} />
                    <p className="text-xs text-muted-foreground">Used when clicking "Test" to send a real test message</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setConfigSlug(null)} className="flex-1">Cancel</Button>
                  <Button onClick={handleSaveCredentials} disabled={saving} className="flex-1 gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Credentials
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground text-center mt-3">
                  Credentials encrypted at rest with AES-256.
                </p>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
