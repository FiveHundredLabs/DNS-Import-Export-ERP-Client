import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { fiscalPeriodsApi } from './fiscal-periods.api';
import { coaKeys } from '../coa/coa.hooks';
import type {
  FiscalPeriod,
  CreateFiscalPeriodPayload,
  LockFiscalPeriodPayload,
  ReopenFiscalPeriodPayload,
  FiscalPeriodQueryParams,
  YearEndCloseResponse,
} from './fiscal-periods.types';

export const periodKeys = {
  all: ['finance', 'fiscal-periods'] as const,
  lists: () => [...periodKeys.all, 'list'] as const,
  list: (params?: FiscalPeriodQueryParams) => [...periodKeys.lists(), params] as const,
  details: () => [...periodKeys.all, 'detail'] as const,
  detail: (id: string) => [...periodKeys.details(), id] as const,
};

export function useFiscalPeriods(params?: FiscalPeriodQueryParams): UseQueryResult<FiscalPeriod[], Error> {
  return useQuery({
    queryKey: periodKeys.list(params),
    queryFn: ({ signal }) => fiscalPeriodsApi.list(params, signal),
    staleTime: 60_000,
  });
}

export function useFiscalPeriod(id: string): UseQueryResult<FiscalPeriod, Error> {
  return useQuery({
    queryKey: periodKeys.detail(id),
    queryFn: ({ signal }) => fiscalPeriodsApi.getById(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateFiscalPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFiscalPeriodPayload) => fiscalPeriodsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: periodKeys.all });
    },
  });
}

export function useLockFiscalPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LockFiscalPeriodPayload }) =>
      fiscalPeriodsApi.lock(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: periodKeys.all });
      queryClient.setQueryData(periodKeys.detail(updated.id), updated);
    },
  });
}

export function useReopenFiscalPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReopenFiscalPeriodPayload }) =>
      fiscalPeriodsApi.reopen(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: periodKeys.all });
      queryClient.setQueryData(periodKeys.detail(updated.id), updated);
    },
  });
}

export function useExecuteYearEndClose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fiscalPeriodsApi.executeYearEndClose(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: periodKeys.all });
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ['finance', 'journals'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
    },
  });
}
