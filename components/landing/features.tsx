'use client';

import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import type { LandingSection } from '@/types';

const defaultFeatures = [
  { icon: 'shopping-cart', title: 'Fast POS Screen', description: 'Process sales in seconds with barcode scanning and keyboard shortcuts.' },
  { icon: 'boxes', title: 'Smart Inventory', description: 'Real-time stock tracking, low-stock alerts, and multi-branch support.' },
  { icon: 'users', title: 'Customer CRM', description: 'Build loyalty with customer profiles, purchase history, and rewards.' },
  { icon: 'bar-chart', title: 'Insightful Reports', description: 'Get clear insights into sales, profits, and business performance.' },
  { icon: 'store', title: 'Multi-Branch', description: 'Manage multiple locations from one dashboard with branch-wise stock.' },
  { icon: 'credit-card', title: 'Multiple Payments', description: 'Accept cash, cards, mobile wallets, and split payments.' },
];

function getIcon(name: string) {
  const iconName = name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return (Icons as any)[iconName] || Icons.Box;
}

export function LandingFeatures({ section }: { section?: LandingSection }) {
  const title = section?.title ?? 'Everything You Need to Run Your Store';
  const subtitle = section?.subtitle ?? 'Powerful features designed for modern businesses';
  const items: { icon: string; title: string; description: string }[] = section?.content?.items ?? defaultFeatures;

  return (
    <section id="features" className="section relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-mono uppercase tracking-wider font-semibold">
            Features
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
            {title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-balance">{subtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((feature, i) => {
            const Icon = getIcon(feature.icon);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/5 group-hover:to-accent/5 rounded-2xl transition-all duration-500" />
                <div className="relative p-6 md:p-8 rounded-2xl border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 h-full">
                  <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 mb-5">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Icon className="relative h-6 w-6 text-primary group-hover:text-white transition-colors" strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2 tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
