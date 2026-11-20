import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { brandsApi } from './brands.api';
import {
  Brand,
  CreateBrandPayload,
  ListBrandsParams,
  UpdateBrandPayload,
  UpdateBrandStatusPayload,
} from './brands.types';

export const brandQueryKeys = {
  all: ['brands'] as const,
  lists: () => [...brandQueryKeys.all, 'list'] as const,
  list: (params?: ListBrandsParams) => [...brandQueryKeys.lists(), params] as const,
  details: () => [...brandQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...brandQueryKeys.details(), id] as const,
};

export function useBrands(params?: ListBrandsParams): UseQueryResult<Brand[], Error> {
  return useQuery({
    queryKey: brandQueryKeys.list(params),
    queryFn: ({ signal }) => brandsApi.listBrands(params, signal),
    staleTime: 60_000,
  });
}

export function useBrand(id: string): UseQueryResult<Brand, Error> {
  return useQuery({
    queryKey: brandQueryKeys.detail(id),
    queryFn: ({ signal }) => brandsApi.getBrandById(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBrandPayload) => brandsApi.createBrand(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandQueryKeys.all });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBrandPayload }) =>
      brandsApi.updateBrand(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: brandQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: brandQueryKeys.detail(id) });
    },
  });
}

export function useUpdateBrandStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBrandStatusPayload }) =>
      brandsApi.updateBrandStatus(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: brandQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: brandQueryKeys.detail(id) });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => brandsApi.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
