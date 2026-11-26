import { apiGet, apiPost } from '../../client';
import type { FinanceVoucher, CreateVoucherPayload, VoucherQueryParams } from './vouchers.types';

export const vouchersApi = {
  list: async (params?: VoucherQueryParams, signal?: AbortSignal): Promise<FinanceVoucher[]> => {
    return apiGet<FinanceVoucher[]>('/finance/vouchers', { params, signal });
  },

  getById: async (id: string, signal?: AbortSignal): Promise<FinanceVoucher> => {
    return apiGet<FinanceVoucher>(`/finance/vouchers/${id}`, { signal });
  },

  create: async (payload: CreateVoucherPayload, signal?: AbortSignal): Promise<FinanceVoucher> => {
    return apiPost<FinanceVoucher>('/finance/vouchers', payload, {
      signal,
      successMessage: 'Voucher posted successfully',
    });
  },
};
