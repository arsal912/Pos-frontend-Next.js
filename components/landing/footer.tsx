'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { LandingSection } from '@/types';

export function LandingFooter({ section }: { section?: LandingSection }) {
  const title = section?.title ?? 'POS System';
  const subtitle = section?.subtitle ?? 'Modern Point of Sale for every business.';
  const content = section?.content ?? {};
  const links = content.links ?? {};
  const copyright = content.copyright ?? `© ${new Date().getFullYear()} POS System. All rights reserved.`;

  return (
    <footer className="border-t bg-card/50 mt-20">
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-xl">{title.split(' ')[0]}</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{subtitle}</p>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
            {Object.entries(links).map(([sectionName, sectionLinks]: [string, any]) => (
              <div key={sectionName}>
                <h4 className="font-display font-semibold mb-4 text-sm capitalize">{sectionName}</h4>
                <ul className="space-y-3">
                  {Array.isArray(sectionLinks) &&
                    sectionLinks.map((link: any, idx: number) => (
                      <li key={idx}>
                        <Link
                          href={link.url}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">{copyright}</p>
          <p className="text-xs text-muted-foreground font-mono">Built with care · v0.1.0</p>
        </div>
      </div>
    </footer>
  );
}
