'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import type { LandingPageData } from '@/types';
import { LandingHero } from '@/components/landing/hero';
import { LandingFeatures } from '@/components/landing/features';
import { LandingPricing } from '@/components/landing/pricing';
import { LandingTestimonials } from '@/components/landing/testimonials';
import { LandingFaq } from '@/components/landing/faq';
import { LandingCta } from '@/components/landing/cta';
import { LandingFooter } from '@/components/landing/footer';
import { LandingNav } from '@/components/landing/nav';
import { LandingDisabled } from '@/components/landing/disabled';

export default function LandingPage() {
  const [data, setData] = useState<LandingPageData | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First check if landing is enabled (fast check)
        const status = await apiClient.get('/public/landing/status');
        if (!status.data?.is_enabled) {
          if (status.data?.redirect_when_disabled) {
            window.location.href = status.data.redirect_when_disabled;
            return;
          }
          setDisabledMessage(status.data?.maintenance_message ?? null);
          setIsDisabled(true);
          setLoading(false);
          return;
        }

        // Fetch full landing data
        const res = await apiClient.get<LandingPageData>('/public/landing');
        setData(res.data);
      } catch (err) {
        // Backend not reachable — show fallback content
        console.error('Failed to load landing page:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (isDisabled) {
    return <LandingDisabled message={disabledMessage} />;
  }

  // If data fetch failed, show landing with fallback content
  const sections = data?.sections ?? {};
  const plans = data?.plans ?? [];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      <div className="relative z-10">
        <LandingNav siteTitle={data?.settings.site_title} />

        <main>
          {sections.hero?.[0]?.is_enabled !== false && (
            <LandingHero section={sections.hero?.[0]} />
          )}

          {sections.features?.[0]?.is_enabled !== false && (
            <LandingFeatures section={sections.features?.[0]} />
          )}

          {sections.pricing?.[0]?.is_enabled !== false && (
            <LandingPricing section={sections.pricing?.[0]} plans={plans} />
          )}

          {sections.testimonials?.[0]?.is_enabled !== false && (
            <LandingTestimonials section={sections.testimonials?.[0]} />
          )}

          {sections.faq?.[0]?.is_enabled !== false && (
            <LandingFaq section={sections.faq?.[0]} />
          )}

          {sections.cta?.[0]?.is_enabled !== false && (
            <LandingCta section={sections.cta?.[0]} />
          )}
        </main>

        <LandingFooter section={sections.footer?.[0]} />
      </div>
    </div>
  );
}
