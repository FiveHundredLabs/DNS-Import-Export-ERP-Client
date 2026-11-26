import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { openingBalancesApi } from './opening-balances.api';
import { coaKeys } from '../coa/coa.hooks';
import type {
  OpeningBalanceBatch,
  CreateOpeningBalancePayload,
  UpdateOpeningBalancePayload,
  RejectOpeningBalancePayload,
  OpeningBalanceQueryParams,
} from './opening-balances.types';

export const openingBalanceKeys = {
  all: ['finance', 'opening-balances'] as const,
  lists: () => [...openingBalanceKeys.all, 'list'] as const,
  list: (params?: OpeningBalanceQueryParams) => [...openingBalanceKeys.lists(), params] as const,
  details: () => [...openingBalanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...openingBalanceKeys.details(), id] as const,
};

export function useOpeningBalanceBatches(params?: OpeningBalanceQueryParams): UseQueryResult<OpeningBalanceBatch[], Error> {
  return useQuery({
    queryKey: openingBalanceKeys.list(params),
    queryFn: ({ signal }) => openingBalancesApi.list(params, signal),
    staleTime: 0,
  });
}

export function useOpeningBalanceBatch(id: string): UseQueryResult<OpeningBalanceBatch, Error> {
  return useQuery({
    queryKey: openingBalanceKeys.detail(id),
    queryFn: ({ signal }) => openingBalancesApi.getById(id, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useCreateOpeningBalanceBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOpeningBalancePayload) => openingBalancesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.all });
    },
  });
}

export function useValidateOpeningBalanceBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => openingBalancesApi.validate(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.lists() });
      queryClient.setQueryData(openingBalanceKeys.detail(updated.id), updated);
    },
  });
}

export function usePostOpeningBalanceBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => openingBalancesApi.post(id),
    onSuccess: (posted) => {
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.all });
      queryClient.setQueryData(openingBalanceKeys.detail(posted.id), posted);
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ['finance', 'journals'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
    },
  });
}

export function useRejectOpeningBalanceBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectOpeningBalancePayload }) =>
      openingBalancesApi.reject(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.lists() });
      queryClient.setQueryData(openingBalanceKeys.detail(updated.id), updated);
    },
  });
}

export function useDeleteOpeningBalanceBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => openingBalancesApi.deleteDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.lists() });
    },
  });
}
