import React from 'react';
import {
  QueryClient,
  QueryClientContext,
  useMutation,
  useQuery,
  UseQueryResult,
} from '@tanstack/react-query';
import { supplierPaymentsApi } from './supplier-payments.api';
import { coaKeys } from '../finance/coa/coa.hooks';
import type {
  AvailableAdvanceItem,
  CreateSupplierPaymentPayload,
  PaginatedSupplierPaymentsResponse,
  SupplierPaymentItem,
  SupplierPaymentQueryParams,
} from './supplier-payments.types';

const defaultFallbackQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export function useSafeQueryClient(): QueryClient {
  const contextClient = React.useContext(QueryClientContext);
  return contextClient ?? defaultFallbackQueryClient;
}

export const supplierPaymentKeys = {
  all: ['supplier-payments'] as const,
  lists: () => [...supplierPaymentKeys.all, 'list'] as const,
  list: (params: SupplierPaymentQueryParams = {}) => [...supplierPaymentKeys.lists(), params] as const,
  advances: () => [...supplierPaymentKeys.all, 'advances'] as const,
  availableAdvances: (supplierId: string) => [...supplierPaymentKeys.advances(), 'available', supplierId] as const,
  details: () => [...supplierPaymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplierPaymentKeys.details(), id] as const,
};

export function useSupplierPayments(
  params: SupplierPaymentQueryParams = {},
): UseQueryResult<PaginatedSupplierPaymentsResponse, Error> {
  const client = useSafeQueryClient();
  return useQuery(
    {
      queryKey: supplierPaymentKeys.list(params),
      queryFn: ({ signal }) => supplierPaymentsApi.list(params, signal),
      staleTime: 0, // Financial disbursement/advance data must always be fresh
    },
    client,
  );
}

export function useAvailableAdvances(
  supplierId: string | undefined,
): UseQueryResult<AvailableAdvanceItem[], Error> {
  const client = useSafeQueryClient();
  return useQuery(
    {
      queryKey: supplierPaymentKeys.availableAdvances(supplierId ?? ''),
      queryFn: ({ signal }) => supplierPaymentsApi.getAvailableAdvances(supplierId!, signal),
      enabled: Boolean(supplierId),
      staleTime: 0, // Available advance balances must reflect real-time utilization
    },
    client,
  );
}

export function useSupplierPayment(
  id: string | undefined,
): UseQueryResult<SupplierPaymentItem, Error> {
  const client = useSafeQueryClient();
  return useQuery(
    {
      queryKey: supplierPaymentKeys.detail(id ?? ''),
      queryFn: ({ signal }) => supplierPaymentsApi.getById(id!, signal),
      enabled: Boolean(id),
      staleTime: 0,
    },
    client,
  );
}

export function useCreateSupplierPayment() {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload: CreateSupplierPaymentPayload) => supplierPaymentsApi.create(payload),
      retry: 0, // Financial disbursements must never retry automatically
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: supplierPaymentKeys.all });
        queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
        queryClient.invalidateQueries({ queryKey: ['finance', 'journals'] });
        queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
        queryClient.invalidateQueries({ queryKey: ['grns'] });
      },
    },
    queryClient,
  );
}
