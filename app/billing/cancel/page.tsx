'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm w-full"
      >
        <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="font-display text-2xl font-bold">Payment cancelled</h1>
        <p className="text-muted-foreground mt-2">
          No charge was made. You can try again or choose a different plan.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button onClick={() => router.push('/dashboard/billing')} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
