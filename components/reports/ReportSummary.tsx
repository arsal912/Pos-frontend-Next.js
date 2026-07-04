'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ReportSummaryCard } from '@/types';

interface Props { cards: ReportSummaryCard[]; }

export default function ReportSummary({ cards }: Props) {
  if (!cards?.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{card.label}</p>
            <p className="font-display font-bold text-2xl">{card.value}</p>
            {card.trend != null && (
              <div className={cn('flex items-center gap-1 text-xs mt-1', card.trend > 0 ? 'text-success' : card.trend < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                {card.trend > 0 ? <TrendingUp className="h-3 w-3"/> : card.trend < 0 ? <TrendingDown className="h-3 w-3"/> : <Minus className="h-3 w-3"/>}
                {card.trend > 0 ? '+' : ''}{card.trend.toFixed(1)}% vs prev period
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
