'use client';

import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import type { LandingSection } from '@/types';

const defaultTestimonials = [
  { name: 'Ahmed Khan', role: 'Owner, Khan Mart', avatar: null, text: 'This POS transformed our business. The inventory tracking alone saves us hours every week.' },
  { name: 'Sara Ali', role: 'CEO, Boutique Plus', avatar: null, text: 'Easy to use, beautiful interface, and the customer support is exceptional. Highly recommend!' },
  { name: 'Bilal Hussain', role: 'Manager, Fresh Foods', avatar: null, text: 'Multi-branch support is a game-changer for us. We can finally see everything in one place.' },
];

export function LandingTestimonials({ section }: { section?: LandingSection }) {
  const title = section?.title ?? 'Loved by Businesses Everywhere';
  const subtitle = section?.subtitle ?? 'See what our customers have to say';
  const items: any[] = section?.content?.items ?? defaultTestimonials;

  return (
    <section id="testimonials" className="section relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-warning/10 text-warning-foreground text-xs font-mono uppercase tracking-wider font-semibold">
            Testimonials
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
            {title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {items.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative p-7 rounded-2xl bg-card border hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5"
            >
              <Quote className="absolute top-5 right-5 h-8 w-8 text-primary/10" strokeWidth={1.5} fill="currentColor" />

              <p className="text-foreground/90 leading-relaxed italic font-display text-lg">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="mt-6 flex items-center gap-3 pt-5 border-t">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg">
                  {t.name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
