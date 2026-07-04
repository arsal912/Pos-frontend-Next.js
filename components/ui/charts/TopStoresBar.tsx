'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export default function TopStoresBar({ data }: { data: any[] }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.06} />
          <XAxis type="number" />
          <YAxis dataKey="store_name" type="category" width={160} />
          <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Revenue']} />
          <Bar dataKey="today_revenue" fill="#06B6D4" radius={[4,4,4,4]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
