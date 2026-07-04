'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#6366F1', '#10B981', '#F97316', '#EF4444', '#64748B', '#8B5CF6'];

export default function PaymentsPieChart({ data }: { data: any[] }) {
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="gateway" cx="50%" cy="50%" outerRadius={70} label />
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
          <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Amount']} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
