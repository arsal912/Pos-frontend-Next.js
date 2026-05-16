'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LandingNav({ siteTitle = 'POS System' }: { siteTitle?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Testimonials', href: '#testimonials' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'py-2' : 'py-4'
      )}
    >
      <div className="container">
        <nav
          className={cn(
            'flex items-center justify-between rounded-2xl px-4 md:px-6 py-3 transition-all',
            scrolled
              ? 'glass-card shadow-lg shadow-primary/5'
              : 'bg-transparent'
          )}
        >
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">
              {siteTitle.split(' ')[0]}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/5"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="gradient" size="sm" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden glass-card mt-2 rounded-2xl p-4 space-y-1 animate-fade-in">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium hover:bg-accent/5 rounded-lg"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t flex flex-col gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button variant="gradient" size="sm" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
