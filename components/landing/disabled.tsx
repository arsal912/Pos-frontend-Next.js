'use client';

import Link from 'next/link';
import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingDisabled({ message }: { message: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />

      <div className="relative z-10 text-center max-w-md px-6">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-warning/10 border border-warning/30 mb-6">
          <Construction className="h-10 w-10 text-warning" />
        </div>

        <h1 className="font-display text-4xl font-bold mb-3 tracking-tight">
          We&rsquo;ll be right back
        </h1>

        <p className="text-muted-foreground leading-relaxed mb-8">
          {message ?? 'Our website is currently undergoing maintenance. Please check back soon.'}
        </p>

        <Button asChild variant="outline">
          <Link href="/login">Already have an account? Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
