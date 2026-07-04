'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useSalesOverTime(days = 30) {
  return useQuery({
    queryKey: ['admin', 'salesOverTime', days],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/dashboard/charts/sales-over-time`, { days });
      return res.data?.series ?? [];
    },
  });
}

export function usePaymentsBreakdown() {
  return useQuery({
    queryKey: ['admin', 'paymentsBreakdown'],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/dashboard/charts/payments-breakdown`);
      return res.data?.breakdown ?? [];
    },
  });
}

export function useTopStores(limit = 6) {
  return useQuery({
    queryKey: ['admin', 'topStores', limit],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/dashboard/charts/top-stores`, { limit });
      return res.data?.top_stores ?? [];
    },
  });
}

export function useSubscriptionsComparison() {
  return useQuery({
    queryKey: ['admin', 'subscriptionsComparison'],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/dashboard/charts/subscriptions-comparison`);
      return res.data ?? null;
    },
  });
}
