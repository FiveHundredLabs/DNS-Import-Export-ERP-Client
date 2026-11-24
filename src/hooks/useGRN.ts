import { useQuery } from '@tanstack/react-query';
import { grnService } from '../services/GRNService';
import { grnsApi, mapGrn } from '../api/grns/grns.api';

export function useGRN() {
  const query = useQuery({
    queryKey: ['grns', 'list'],
    queryFn: ({ signal }) => grnsApi.list({ page: 1, limit: 100 }, signal),
    staleTime: 15_000,
  });

  return {
    grns: (query.data?.data ?? []).map((record) => mapGrn(record)),
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    grnService,
    refetch: query.refetch,
  };
}
