import { apiGet, apiPost, apiPatch, apiDelete } from '../../client';
import type {
  OpeningBalanceBatch,
  CreateOpeningBalancePayload,
  UpdateOpeningBalancePayload,
  RejectOpeningBalancePayload,
  OpeningBalanceQueryParams,
} from './opening-balances.types';

export const openingBalancesApi = {
  list: async (params?: OpeningBalanceQueryParams, signal?: AbortSignal): Promise<OpeningBalanceBatch[]> => {
    return apiGet<OpeningBalanceBatch[]>('/finance/opening-balances', { params, signal });
  },

  getById: async (id: string, signal?: AbortSignal): Promise<OpeningBalanceBatch> => {
    return apiGet<OpeningBalanceBatch>(`/finance/opening-balances/${id}`, { signal });
  },

  create: async (payload: CreateOpeningBalancePayload, signal?: AbortSignal): Promise<OpeningBalanceBatch> => {
    return apiPost<OpeningBalanceBatch>('/finance/opening-balances', payload, {
      signal,
      successMessage: 'Opening balance batch draft saved',
    });
  },

  update: async (id: string, payload: UpdateOpeningBalancePayload, signal?: AbortSignal): Promise<OpeningBalanceBatch> => {
    return apiPatch<OpeningBalanceBatch>(`/finance/opening-balances/${id}`, payload, {
      signal,
      successMessage: 'Opening balance batch updated',
    });
  },

  validate: async (id: string, signal?: AbortSignal): Promise<OpeningBalanceBatch> => {
    return apiPost<OpeningBalanceBatch>(`/finance/opening-balances/${id}/validate`, {}, {
      signal,
      successMessage: 'Opening balance batch validated: equilibrium confirmed',
    });
  },

  post: async (id: string, signal?: AbortSignal): Promise<OpeningBalanceBatch> => {
    return apiPost<OpeningBalanceBatch>(`/finance/opening-balances/${id}/post`, {}, {
      signal,
      successMessage: 'Opening balances posted to General Ledger',
    });
  },

  reject: async (id: string, payload: RejectOpeningBalancePayload, signal?: AbortSignal): Promise<OpeningBalanceBatch> => {
    return apiPost<OpeningBalanceBatch>(`/finance/opening-balances/${id}/reject`, payload, {
      signal,
      successMessage: 'Opening balance batch rejected',
    });
  },

  deleteDraft: async (id: string, signal?: AbortSignal): Promise<void> => {
    return apiDelete<void>(`/finance/opening-balances/${id}`, {
      signal,
      successMessage: 'Opening balance batch deleted',
    });
  },
};
