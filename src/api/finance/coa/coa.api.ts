import { apiGet, apiPost, apiPatch, apiDelete } from '../../client';
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

export const coaApi = {
  // Categories
  getCategories: async (params?: CategoryQueryParams, signal?: AbortSignal): Promise<FinanceCategory[]> => {
    return apiGet<FinanceCategory[]>('/finance/coa/categories', { params, signal });
  },

  getCategoriesTree: async (signal?: AbortSignal): Promise<FinanceCategory[]> => {
    return apiGet<FinanceCategory[]>('/finance/coa/categories/tree', { signal });
  },

  getCategoryById: async (id: string, signal?: AbortSignal): Promise<FinanceCategory> => {
    return apiGet<FinanceCategory>(`/finance/coa/categories/${id}`, { signal });
  },

  createCategory: async (payload: CreateCategoryPayload, signal?: AbortSignal): Promise<FinanceCategory> => {
    return apiPost<FinanceCategory>('/finance/coa/categories', payload, {
      signal,
      successMessage: 'Category created successfully',
    });
  },

  updateCategory: async (id: string, payload: UpdateCategoryPayload, signal?: AbortSignal): Promise<FinanceCategory> => {
    return apiPatch<FinanceCategory>(`/finance/coa/categories/${id}`, payload, {
      signal,
      successMessage: 'Category updated successfully',
    });
  },

  deleteCategory: async (id: string, signal?: AbortSignal): Promise<void> => {
    return apiDelete<void>(`/finance/coa/categories/${id}`, {
      signal,
      successMessage: 'Category deleted successfully',
    });
  },

  // Accounts
  getAccounts: async (params?: AccountQueryParams, signal?: AbortSignal): Promise<FinanceAccount[]> => {
    return apiGet<FinanceAccount[]>('/finance/coa/accounts', { params, signal });
  },

  getAccountById: async (id: string, signal?: AbortSignal): Promise<FinanceAccount> => {
    return apiGet<FinanceAccount>(`/finance/coa/accounts/${id}`, { signal });
  },

  createAccount: async (payload: CreateAccountPayload, signal?: AbortSignal): Promise<FinanceAccount> => {
    return apiPost<FinanceAccount>('/finance/coa/accounts', payload, {
      signal,
      successMessage: 'Account created successfully',
    });
  },

  updateAccount: async (id: string, payload: UpdateAccountPayload, signal?: AbortSignal): Promise<FinanceAccount> => {
    return apiPatch<FinanceAccount>(`/finance/coa/accounts/${id}`, payload, {
      signal,
      successMessage: 'Account updated successfully',
    });
  },

  deleteAccount: async (id: string, signal?: AbortSignal): Promise<void> => {
    return apiDelete<void>(`/finance/coa/accounts/${id}`, {
      signal,
      successMessage: 'Account deleted successfully',
    });
  },
};
