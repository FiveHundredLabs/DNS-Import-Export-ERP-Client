import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { categoriesApi } from './categories.api';
import {
  Category,
  CreateCategoryPayload,
  ListCategoriesParams,
  UpdateCategoryPayload,
  UpdateCategoryStatusPayload,
} from './categories.types';

export const categoryQueryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryQueryKeys.all, 'list'] as const,
  list: (params?: ListCategoriesParams) => [...categoryQueryKeys.lists(), params] as const,
  details: () => [...categoryQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryQueryKeys.details(), id] as const,
};

export function useCategories(params?: ListCategoriesParams): UseQueryResult<Category[], Error> {
  return useQuery({
    queryKey: categoryQueryKeys.list(params),
    queryFn: ({ signal }) => categoriesApi.listCategories(params, signal),
    staleTime: 60_000,
  });
}

export function useCategory(id: string): UseQueryResult<Category, Error> {
  return useQuery({
    queryKey: categoryQueryKeys.detail(id),
    queryFn: ({ signal }) => categoriesApi.getCategoryById(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoriesApi.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) =>
      categoriesApi.updateCategory(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.detail(id) });
    },
  });
}

export function useUpdateCategoryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryStatusPayload }) =>
      categoriesApi.updateCategoryStatus(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.detail(id) });
    },
  });
}
