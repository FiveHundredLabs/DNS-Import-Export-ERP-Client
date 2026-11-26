import React from 'react';
import {
  QueryClient,
  QueryClientContext,
  useMutation,
  useQuery,
  UseQueryResult,
} from '@tanstack/react-query';
import { grnsApi } from './grns.api';
import { coaKeys } from '../finance/coa/coa.hooks';
import type { GRN } from '../../types/inventory';
import type {
  CapitalizeGrnResponse,
  CreateGrnPayload,
  GrnActionPayload,
  GrnCostingCalculationResponse,
  GrnListQueryParams,
  GrnStockBatchItem,
  IntakeUnitsPayload,
  UpdateGrnCostingPayload,
  UpdateGrnPricingPayload,
} from './grns.types';

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

export const grnKeys = {
  all: ['grns'] as const,
  lists: () => [...grnKeys.all, 'list'] as const,
  list: (params: GrnListQueryParams = {}) => [...grnKeys.lists(), params] as const,
  details: () => [...grnKeys.all, 'detail'] as const,
  detail: (id: string) => [...grnKeys.details(), id] as const,
  costings: () => [...grnKeys.all, 'costing'] as const,
  costing: (id: string) => [...grnKeys.costings(), id] as const,
  batches: (id: string) => [...grnKeys.all, 'batches', id] as const,
};

export function useGrns(params: GrnListQueryParams = {}) {
  const client = useSafeQueryClient();
  return useQuery(
    {
      queryKey: grnKeys.list(params),
      queryFn: ({ signal }) => grnsApi.list(params, signal),
      staleTime: params.status === 'APPROVED' || params.status === 'COSTED' ? 0 : 30_000,
    },
    client,
  );
}

export function useGrn(id: string | undefined): UseQueryResult<GRN, Error> {
  const client = useSafeQueryClient();
  return useQuery(
    {
      queryKey: grnKeys.detail(id ?? ''),
      queryFn: ({ signal }) => grnsApi.getById(id!, signal),
      enabled: Boolean(id),
      staleTime: 0,
    },
    client,
  );
}

export function useGrnCosting(id: string | undefined): UseQueryResult<GrnCostingCalculationResponse, Error> {
  const client = useSafeQueryClient();
  return useQuery(
    {
      queryKey: grnKeys.costing(id ?? ''),
      queryFn: ({ signal }) => grnsApi.getCosting(id!, signal),
      enabled: Boolean(id),
      staleTime: 0, // Landed cost calculations must always be fresh
    },
    client,
  );
}

export function useGrnBatches(id: string | undefined): UseQueryResult<GrnStockBatchItem[], Error> {
  const client = useSafeQueryClient();
  return useQuery(
    {
      queryKey: grnKeys.batches(id ?? ''),
      queryFn: ({ signal }) => grnsApi.getBatches(id!, signal),
      enabled: Boolean(id),
      staleTime: 0,
    },
    client,
  );
}

export function useCreateGrn() {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload: CreateGrnPayload) => grnsApi.create(payload),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
      },
    },
    queryClient,
  );
}

export function useIntakeUnits(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload: IntakeUnitsPayload) => grnsApi.intakeUnits(id, payload),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
      },
    },
    queryClient,
  );
}

export function useSubmitGrn(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload?: GrnActionPayload) => grnsApi.submit(id, payload),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
      },
    },
    queryClient,
  );
}

export function useVerifyGrn(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload?: GrnActionPayload) => grnsApi.verify(id, payload),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
      },
    },
    queryClient,
  );
}

export function useApproveGrn(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload?: GrnActionPayload) => grnsApi.approve(id, payload),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
      },
    },
    queryClient,
  );
}

export function useRejectGrn(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload: GrnActionPayload) => grnsApi.reject(id, payload),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
      },
    },
    queryClient,
  );
}

export function useUpdateGrnCosting(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload: UpdateGrnCostingPayload) => grnsApi.updateCosting(id, payload),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.costing(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      },
    },
    queryClient,
  );
}

export function useCompleteGrnCosting(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: () => grnsApi.completeCosting(id),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
      },
    },
    queryClient,
  );
}

export function useAssignGrnPricing(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload: UpdateGrnPricingPayload) => grnsApi.assignPricing(id, payload),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
      },
    },
    queryClient,
  );
}

export function useCapitalizeGrn(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (): Promise<CapitalizeGrnResponse> => grnsApi.capitalize(id),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.costing(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.batches(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
        queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['finance', 'journals'] });
        queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
        queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      },
    },
    queryClient,
  );
}

export function useReverseCapitalizeGrn(id: string) {
  const queryClient = useSafeQueryClient();
  return useMutation(
    {
      mutationFn: (payload: { reversalReason: string; reversalDate?: string }) =>
        grnsApi.reverseCapitalize(id, payload),
      retry: 0,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: grnKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.costing(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.batches(id) });
        queryClient.invalidateQueries({ queryKey: grnKeys.lists() });
        queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['finance', 'journals'] });
        queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
        queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      },
    },
    queryClient,
  );
}
