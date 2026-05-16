'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, AlertTriangle, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

interface LandingState {
  settings: any;
  sections: any[];
}

export default function AdminLandingPagePage() {
  const [data, setData] = useState<LandingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<LandingState>('/admin/landing-page');
      setData(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggleLanding = async (enabled: boolean) => {
    setToggleLoading(true);
    try {
      await apiClient.put('/admin/landing-page/toggle', { is_enabled: enabled });
      toast.success(enabled ? 'Landing page enabled' : 'Landing page disabled');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setToggleLoading(false);
    }
  };

  const handleToggleSection = async (sectionKey: string, enabled: boolean) => {
    try {
      await apiClient.patch(`/admin/landing-page/sections/${sectionKey}/toggle`, {
        is_enabled: enabled,
      });
      toast.success(`Section "${sectionKey}" ${enabled ? 'enabled' : 'disabled'}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await apiClient.put('/admin/landing-page/settings', {
        site_title: formData.get('site_title'),
        site_description: formData.get('site_description'),
        meta_keywords: formData.get('meta_keywords'),
        primary_color: formData.get('primary_color'),
      });
      toast.success('Settings saved');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleMaintenanceUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await apiClient.put('/admin/landing-page/toggle', {
        is_enabled: data?.settings.is_enabled ?? true,
        maintenance_message: formData.get('maintenance_message'),
        redirect_when_disabled: formData.get('redirect_when_disabled') || null,
      });
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Landing Page</h1>
        <p className="text-muted-foreground mt-1">Control your public marketing site</p>
      </div>

      {/* Master toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-7 border-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  Landing Page
                  <Badge variant={data.settings.is_enabled ? 'success' : 'destructive'}>
                    {data.settings.is_enabled ? 'LIVE' : 'OFFLINE'}
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  When enabled, your public landing page is accessible to visitors. When disabled, visitors see a maintenance page or redirect.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {toggleLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : null}
              <Switch
                checked={data.settings.is_enabled}
                onCheckedChange={handleToggleLanding}
                disabled={toggleLoading}
                className="scale-125"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Sections */}
      <Card className="p-7">
        <h3 className="font-display text-lg font-bold mb-1">Page Sections</h3>
        <p className="text-sm text-muted-foreground mb-5">Toggle individual sections on or off</p>
        <div className="space-y-2">
          {data.sections.map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
            >
              <div className="flex items-center gap-3">
                {section.is_enabled ? (
                  <Eye className="h-4 w-4 text-success" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium capitalize">{section.section_key}</p>
                  {section.title && <p className="text-xs text-muted-foreground">{section.title}</p>}
                </div>
              </div>
              <Switch
                checked={section.is_enabled}
                onCheckedChange={(enabled) => handleToggleSection(section.section_key, enabled)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Site Settings */}
      <Card className="p-7">
        <h3 className="font-display text-lg font-bold mb-1">Site Settings</h3>
        <p className="text-sm text-muted-foreground mb-5">Global SEO and branding settings</p>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="site_title">Site Title</Label>
            <Input id="site_title" name="site_title" defaultValue={data.settings.site_title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site_description">Meta Description</Label>
            <Input id="site_description" name="site_description" defaultValue={data.settings.site_description} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="meta_keywords">Meta Keywords</Label>
              <Input id="meta_keywords" name="meta_keywords" defaultValue={data.settings.meta_keywords} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primary_color">Primary Color</Label>
              <Input id="primary_color" name="primary_color" defaultValue={data.settings.primary_color} />
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" variant="gradient" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Settings
            </Button>
          </div>
        </form>
      </Card>

      {/* Maintenance mode */}
      <Card className="p-7 border-warning/30 bg-warning/5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-display text-lg font-bold">Maintenance Mode</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Shown when landing page is disabled</p>
        <form onSubmit={handleMaintenanceUpdate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="maintenance_message">Maintenance Message</Label>
            <Input
              id="maintenance_message"
              name="maintenance_message"
              defaultValue={data.settings.maintenance_message ?? ''}
              placeholder="We'll be back soon!"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="redirect_when_disabled">Or Redirect URL (optional)</Label>
            <Input
              id="redirect_when_disabled"
              name="redirect_when_disabled"
              defaultValue={data.settings.redirect_when_disabled ?? ''}
              placeholder="https://example.com"
            />
          </div>
          <Button type="submit">Update</Button>
        </form>
      </Card>
    </div>
  );
}
