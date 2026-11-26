import { apiGet, apiPost } from '../../client';
import type {
  FiscalPeriod,
  CreateFiscalPeriodPayload,
  LockFiscalPeriodPayload,
  ReopenFiscalPeriodPayload,
  FiscalPeriodQueryParams,
  YearEndCloseResponse,
} from './fiscal-periods.types';

export const fiscalPeriodsApi = {
  list: async (params?: FiscalPeriodQueryParams, signal?: AbortSignal): Promise<FiscalPeriod[]> => {
    return apiGet<FiscalPeriod[]>('/finance/fiscal-periods', { params, signal });
  },

  getById: async (id: string, signal?: AbortSignal): Promise<FiscalPeriod> => {
    return apiGet<FiscalPeriod>(`/finance/fiscal-periods/${id}`, { signal });
  },

  create: async (payload: CreateFiscalPeriodPayload, signal?: AbortSignal): Promise<FiscalPeriod> => {
    return apiPost<FiscalPeriod>('/finance/fiscal-periods', payload, {
      signal,
      successMessage: 'Fiscal period created successfully',
    });
  },

  lock: async (id: string, payload: LockFiscalPeriodPayload, signal?: AbortSignal): Promise<FiscalPeriod> => {
    return apiPost<FiscalPeriod>(`/finance/fiscal-periods/${id}/lock`, payload, {
      signal,
      successMessage: `Fiscal period ${payload.status === 'HARD_LOCKED' ? 'hard locked' : 'soft locked'} successfully`,
    });
  },

  reopen: async (id: string, payload: ReopenFiscalPeriodPayload, signal?: AbortSignal): Promise<FiscalPeriod> => {
    return apiPost<FiscalPeriod>(`/finance/fiscal-periods/${id}/reopen`, payload, {
      signal,
      successMessage: 'Fiscal period reopened successfully',
    });
  },

  executeYearEndClose: async (id: string, signal?: AbortSignal): Promise<YearEndCloseResponse> => {
    return apiPost<YearEndCloseResponse>(`/finance/fiscal-periods/${id}/year-end-close`, {}, {
      signal,
      successMessage: 'Year-end close executed: Nominals rolled over into Retained Earnings',
    });
  },
};
