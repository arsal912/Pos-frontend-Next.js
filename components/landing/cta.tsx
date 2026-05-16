'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingSection } from '@/types';

export function LandingCta({ section }: { section?: LandingSection }) {
  const title = section?.title ?? 'Ready to Transform Your Business?';
  const subtitle = section?.subtitle ?? 'Join thousands of businesses already using our POS to grow faster.';
  const ctaText = section?.content?.cta_text ?? 'Start Your Free Trial';
  const ctaSecondary = section?.content?.cta_secondary ?? 'Talk to Sales';

  return (
    <section className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-12 md:p-20 text-center"
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />

          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white text-balance">
              {title}
            </h2>
            <p className="mt-5 text-lg md:text-xl text-white/80 max-w-2xl mx-auto text-balance">
              {subtitle}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="xl"
                asChild
                className="bg-white text-primary hover:bg-white/90 group"
              >
                <Link href="/register">
                  {ctaText}
                  <ArrowRight className="ml-1 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="xl"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white/50"
              >
                {ctaSecondary}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
