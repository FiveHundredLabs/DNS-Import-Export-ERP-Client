import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from './suppliers.api';
import type {
  CreateSupplierPayload,
  SupplierListParams,
  UpdateSupplierPayload,
} from './suppliers.types';

export const supplierQueryKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierQueryKeys.all, 'list'] as const,
  list: (params: SupplierListParams = {}) => [...supplierQueryKeys.lists(), params] as const,
  lookup: () => [...supplierQueryKeys.all, 'lookup'] as const,
  details: () => [...supplierQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplierQueryKeys.details(), id] as const,
};

export function useSupplierLookup() {
  return useQuery({
    queryKey: supplierQueryKeys.lookup(),
    queryFn: ({ signal }) => suppliersApi.lookup(signal),
    staleTime: 60_000,
  });
}

export function useSuppliers(params: SupplierListParams = {}) {
  return useQuery({
    queryKey: supplierQueryKeys.list(params),
    queryFn: ({ signal }) => suppliersApi.list(params, signal),
    staleTime: 30_000,
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: supplierQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => suppliersApi.getById(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => suppliersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lookup() });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupplierPayload }) =>
      suppliersApi.update(id, payload),
    onSuccess: (_supplier, { id }) => {
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lookup() });
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.detail(id) });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lookup() });
      queryClient.removeQueries({ queryKey: supplierQueryKeys.detail(id) });
    },
  });
}
