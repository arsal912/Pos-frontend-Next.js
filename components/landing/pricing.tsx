'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingSection, Plan } from '@/types';
import { cn } from '@/lib/utils';

export function LandingPricing({ section, plans }: { section?: LandingSection; plans: Plan[] }) {
  const title = section?.title ?? 'Simple, Transparent Pricing';
  const subtitle = section?.subtitle ?? 'Choose the plan that fits your business. Cancel anytime.';

  return (
    <section id="pricing" className="section relative bg-muted/20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider font-semibold">
            Pricing
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
            {title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-balance">{subtitle}</p>
        </motion.div>

        <div className={cn('grid gap-6 max-w-7xl mx-auto', plans.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3')}>
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative"
            >
              {plan.is_featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-primary to-accent text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}
              <div
                className={cn(
                  'relative p-7 rounded-2xl border h-full flex flex-col transition-all duration-300',
                  plan.is_featured
                    ? 'bg-card border-primary/40 shadow-xl shadow-primary/10 scale-105'
                    : 'bg-card/50 hover:border-primary/20 hover:shadow-lg'
                )}
              >
                <div className="mb-6">
                  <h3 className="font-display text-2xl font-bold tracking-tight">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-display font-bold tracking-tight">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground text-sm font-medium">
                        /{plan.billing_cycle === 'yearly' ? 'yr' : 'mo'}
                      </span>
                    )}
                  </div>
                  {plan.trial_days > 0 && plan.price > 0 && (
                    <p className="text-xs text-accent font-medium mt-1">{plan.trial_days}-day free trial</p>
                  )}
                </div>

                <Button
                  variant={plan.is_featured ? 'gradient' : 'outline'}
                  className="w-full mb-6"
                  asChild
                >
                  <Link href={`/register?plan=${plan.slug}`}>
                    {plan.price === 0 ? 'Start Free' : 'Get Started'}
                  </Link>
                </Button>

                <div className="space-y-3 flex-1">
                  {plan.features?.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                        <Check className="h-3 w-3 text-success" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-foreground/80 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
