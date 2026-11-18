import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { coaApi } from './coa.api';
import type {
  FinanceAccount,
  FinanceCategory,
  CreateAccountPayload,
  UpdateAccountPayload,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  AccountQueryParams,
  CategoryQueryParams,
} from './coa.types';

export const coaKeys = {
  all: ['finance', 'coa'] as const,
  categories: () => [...coaKeys.all, 'categories'] as const,
  categoriesTree: () => [...coaKeys.categories(), 'tree'] as const,
  categoryList: (params?: CategoryQueryParams) => [...coaKeys.categories(), 'list', params] as const,
  categoryDetail: (id: string) => [...coaKeys.categories(), 'detail', id] as const,
  accounts: () => [...coaKeys.all, 'accounts'] as const,
  accountList: (params?: AccountQueryParams) => [...coaKeys.accounts(), 'list', params] as const,
  accountDetail: (id: string) => [...coaKeys.accounts(), 'detail', id] as const,
};

// ─── Categories Queries & Mutations ──────────────────────────────────────────

export function useCategoriesTree(): UseQueryResult<FinanceCategory[], Error> {
  return useQuery({
    queryKey: coaKeys.categoriesTree(),
    queryFn: ({ signal }) => coaApi.getCategoriesTree(signal),
    staleTime: 300_000,
  });
}

export function useCategories(params?: CategoryQueryParams): UseQueryResult<FinanceCategory[], Error> {
  return useQuery({
    queryKey: coaKeys.categoryList(params),
    queryFn: ({ signal }) => coaApi.getCategories(params, signal),
    staleTime: 300_000,
  });
}

export function useCategory(id: string): UseQueryResult<FinanceCategory, Error> {
  return useQuery({
    queryKey: coaKeys.categoryDetail(id),
    queryFn: ({ signal }) => coaApi.getCategoryById(id, signal),
    enabled: Boolean(id),
    staleTime: 300_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => coaApi.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coaKeys.categories() });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) =>
      coaApi.updateCategory(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: coaKeys.categories() });
      queryClient.setQueryData(coaKeys.categoryDetail(updated.id), updated);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coaApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coaKeys.categories() });
    },
  });
}

// ─── Accounts Queries & Mutations ────────────────────────────────────────────

export function useAccounts(params?: AccountQueryParams): UseQueryResult<FinanceAccount[], Error> {
  return useQuery({
    queryKey: coaKeys.accountList(params),
    queryFn: ({ signal }) => coaApi.getAccounts(params, signal),
    staleTime: 60_000,
  });
}

export function useAccount(id: string): UseQueryResult<FinanceAccount, Error> {
  return useQuery({
    queryKey: coaKeys.accountDetail(id),
    queryFn: ({ signal }) => coaApi.getAccountById(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountPayload) => coaApi.createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: coaKeys.categoriesTree() });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountPayload }) =>
      coaApi.updateAccount(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: coaKeys.categoriesTree() });
      queryClient.setQueryData(coaKeys.accountDetail(updated.id), updated);
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coaApi.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: coaKeys.categoriesTree() });
    },
  });
}
