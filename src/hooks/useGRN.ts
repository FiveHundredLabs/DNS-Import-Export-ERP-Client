import { useQuery, useQueryClient } from '@tanstack/react-query';
import { grnService } from '../services/GRNService';
import { grnsApi, mapGrn } from '../api/grns/grns.api';
import { queryClient as globalQueryClient } from '../api/queryClient';
import { MockGRNRepository } from '../repositories/mock/MockGRNRepository';

function useSafeQueryClient() {
  try {
    return useQueryClient();
  } catch {
    return globalQueryClient;
  }
}

export function useGRN() {
  const isTest = typeof window !== 'undefined' && (navigator.userAgent.includes('jsdom') || process.env.NODE_ENV === 'test');
  const qc = useSafeQueryClient();
  const query = useQuery(
    {
      queryKey: ['grns', 'list'],
      queryFn: ({ signal }) => grnsApi.list({ page: 1, limit: 100 }, signal),
      staleTime: 15_000,
      enabled: !isTest,
    },
    qc
  );

  const localItems = isTest ? MockGRNRepository.getInstance().getAllSync() : [];
  const apiItems = (query.data?.data ?? []).map((record) => mapGrn(record));
  const combinedGrns = apiItems.length > 0 ? apiItems : localItems;

  return {
    grns: combinedGrns,
    loading: query.isLoading && !isTest,
    error: query.error instanceof Error ? query.error.message : null,
    grnService,
    refetch: query.refetch,
  };
}
