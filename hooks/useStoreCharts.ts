'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useSalesTrend(days = 30) {
  return useQuery({
    queryKey: ['store', 'salesTrend', days],
    queryFn: async () => {
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - (days - 1));
      const res = await apiClient.post('/store/reports/sales-by-day/run', {
        date_range: 'custom',
        date_from: dateFrom.toISOString().slice(0, 10),
        date_to: dateTo.toISOString().slice(0, 10),
        group_by: 'day',
      });
      return (res.data as any)?.chart_data ?? { labels: [], series: [] };
    },
  });
}
