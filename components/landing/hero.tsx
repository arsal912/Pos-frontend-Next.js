'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LandingSection } from '@/types';

export function LandingHero({ section }: { section?: LandingSection }) {
  const title = section?.title ?? 'Run Your Business Smarter';
  const subtitle =
    section?.subtitle ??
    'A modern POS that grows with your business — from a single store to a multi-branch enterprise.';
  const badge = section?.content?.badge ?? '14-day free trial • No credit card required';
  const ctaText = section?.content?.cta_text ?? 'Start Free Trial';
  const ctaSecondary = section?.content?.cta_secondary ?? 'Watch Demo';

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <Badge
            variant="outline"
            className="mb-8 px-4 py-1.5 text-xs font-mono uppercase tracking-wider bg-background/50 backdrop-blur"
          >
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            {badge}
          </Badge>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-balance leading-[0.95]"
          >
            {title.split(' ').slice(0, -2).join(' ')}{' '}
            <span className="gradient-text italic">{title.split(' ').slice(-2).join(' ')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="gradient" size="xl" asChild className="group">
              <Link href="/register">
                {ctaText}
                <ArrowRight className="ml-1 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" className="group">
              <PlayCircle className="text-accent" />
              {ctaSecondary}
            </Button>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 grid grid-cols-3 max-w-2xl mx-auto gap-6"
          >
            {[
              { icon: ShieldCheck, label: 'Bank-grade security' },
              { icon: Zap, label: 'Lightning fast' },
              { icon: BarChart3, label: 'Real-time insights' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 text-center">
                <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" strokeWidth={2} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Decorative dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 md:mt-24 max-w-5xl mx-auto"
        >
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-3xl opacity-30 rounded-3xl" />
            <div className="relative rounded-2xl border bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b bg-muted/40">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-warning/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
                <div className="ml-3 text-xs text-muted-foreground font-mono">pos.app/dashboard</div>
              </div>
              <DashboardPreview />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="grid grid-cols-12 gap-3 p-4 md:p-6 bg-gradient-to-br from-background to-muted/30">
      <div className="col-span-3 space-y-3">
        <div className="h-8 rounded-lg bg-primary/10 flex items-center px-3">
          <div className="h-2 w-16 rounded-full bg-primary/40" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 rounded-md bg-muted/60 flex items-center px-3">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>
        ))}
      </div>
      <div className="col-span-9 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {[
            { color: 'from-primary/20 to-primary/5', label: 'Sales' },
            { color: 'from-accent/20 to-accent/5', label: 'Orders' },
            { color: 'from-success/20 to-success/5', label: 'Customers' },
            { color: 'from-warning/20 to-warning/5', label: 'Stock' },
          ].map((s, i) => (
            <div key={i} className={`rounded-lg p-3 bg-gradient-to-br ${s.color} border`}>
              <div className="h-1.5 w-10 rounded-full bg-foreground/20 mb-2" />
              <div className="h-3 w-16 rounded bg-foreground/40" />
              <div className="h-2 w-8 rounded mt-2 bg-foreground/20" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-card p-4 h-48 flex items-end gap-2">
          {[40, 55, 35, 70, 45, 80, 60, 90, 50, 75, 65, 95].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-primary to-accent"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
