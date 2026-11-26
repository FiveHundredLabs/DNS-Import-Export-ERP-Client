import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { creditTermsApi } from './credit-terms.api';
import { CreditTermsConfig, UpdateCreditTermsConfigPayload } from './credit-terms.types';

export const creditTermsQueryKeys = {
  all: ['credit-terms'] as const,
  config: () => [...creditTermsQueryKeys.all, 'config'] as const,
};

export function useCreditTermsConfig(options?: { enabled?: boolean }): UseQueryResult<CreditTermsConfig, Error> {
  return useQuery({
    queryKey: creditTermsQueryKeys.config(),
    queryFn: ({ signal }) => creditTermsApi.getConfig(signal),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useUpdateCreditTermsConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCreditTermsConfigPayload) =>
      creditTermsApi.updateConfig(payload),
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(creditTermsQueryKeys.config(), updatedConfig);
      queryClient.invalidateQueries({ queryKey: creditTermsQueryKeys.all });
    },
  });
}
