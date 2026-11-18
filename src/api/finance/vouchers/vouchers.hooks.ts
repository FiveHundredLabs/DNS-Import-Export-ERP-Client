import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { vouchersApi } from './vouchers.api';
import { coaKeys } from '../coa/coa.hooks';
import type { FinanceVoucher, CreateVoucherPayload, VoucherQueryParams } from './vouchers.types';

export const voucherKeys = {
  all: ['finance', 'vouchers'] as const,
  lists: () => [...voucherKeys.all, 'list'] as const,
  list: (params?: VoucherQueryParams) => [...voucherKeys.lists(), params] as const,
  details: () => [...voucherKeys.all, 'detail'] as const,
  detail: (id: string) => [...voucherKeys.details(), id] as const,
};

export function useVouchers(params?: VoucherQueryParams): UseQueryResult<FinanceVoucher[], Error> {
  return useQuery({
    queryKey: voucherKeys.list(params),
    queryFn: ({ signal }) => vouchersApi.list(params, signal),
    staleTime: 0, // Direct financial cash book data
  });
}

export function useVoucher(id: string): UseQueryResult<FinanceVoucher, Error> {
  return useQuery({
    queryKey: voucherKeys.detail(id),
    queryFn: ({ signal }) => vouchersApi.getById(id, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useCreateVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVoucherPayload) => vouchersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherKeys.all });
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ['finance', 'journals'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
    },
  });
}
