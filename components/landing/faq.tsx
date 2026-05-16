'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { LandingSection } from '@/types';

const defaultFaq = [
  { question: 'Do I need to install anything?', answer: 'No, our POS is fully cloud-based. Just open it in any modern browser and you are ready to go.' },
  { question: 'What payment methods can I accept?', answer: 'You can accept cash, credit/debit cards, mobile wallets (JazzCash, Easypaisa), bank transfers, and split payments.' },
  { question: 'Can I use it on a tablet?', answer: 'Yes! Our POS works on desktops, laptops, tablets, and mobile devices.' },
  { question: 'Is my data safe?', answer: 'Absolutely. We use bank-grade encryption, daily backups, and isolated tenant data for maximum security.' },
];

export function LandingFaq({ section }: { section?: LandingSection }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const title = section?.title ?? 'Frequently Asked Questions';
  const subtitle = section?.subtitle ?? "Can't find what you're looking for? Contact our support team.";
  const items: { question: string; answer: string }[] = section?.content?.items ?? defaultFaq;

  return (
    <section id="faq" className="section relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-success/10 text-success text-xs font-mono uppercase tracking-wider font-semibold">
            FAQ
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
            {title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-2xl border bg-card hover:border-primary/30 transition-colors overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="font-display font-semibold text-base md:text-lg pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-primary transition-transform duration-300 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-muted-foreground leading-relaxed">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
