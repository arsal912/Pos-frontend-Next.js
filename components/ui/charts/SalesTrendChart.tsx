'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface ChartData {
  labels?: string[];
  series?: { name: string; data: number[] }[];
}

const COLORS = ['#6366F1', '#10B981', '#F97316', '#EF4444'];

export default function SalesTrendChart({ chart_data, currency = 'USD' }: { chart_data: ChartData; currency?: string }) {
  const labels = chart_data?.labels ?? [];
  const series = chart_data?.series ?? [];

  const data = labels.map((label, i) => {
    const row: Record<string, any> = { period: label };
    series.forEach((s) => { row[s.name] = s.data[i] ?? 0; });
    return row;
  });

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.name} id={`gradTrend${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.6} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.06} />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => String(Math.round(v))} />
          <Tooltip formatter={(v: any) => formatCurrency(Number(v), currency)} />
          <Legend />
          {series.map((s, i) => (
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={COLORS[i % COLORS.length]}
              fill={`url(#gradTrend${i})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
