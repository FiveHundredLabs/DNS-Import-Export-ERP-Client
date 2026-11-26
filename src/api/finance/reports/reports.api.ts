import { apiGet } from '../../client';
import type {
  GeneralLedgerReportResponse,
  TrialBalanceReportResponse,
  ProfitLossReportResponse,
  BalanceSheetReportResponse,
  VatSummaryReportResponse,
  GeneralLedgerQueryParams,
  TrialBalanceQueryParams,
  ProfitLossQueryParams,
  BalanceSheetQueryParams,
  VatSummaryQueryParams,
} from './reports.types';

export const reportsApi = {
  getGeneralLedger: async (params: GeneralLedgerQueryParams, signal?: AbortSignal): Promise<GeneralLedgerReportResponse> => {
    return apiGet<GeneralLedgerReportResponse>('/finance/ledger/general-ledger', { params, signal });
  },

  getTrialBalance: async (params?: TrialBalanceQueryParams, signal?: AbortSignal): Promise<TrialBalanceReportResponse> => {
    return apiGet<TrialBalanceReportResponse>('/finance/ledger/trial-balance', { params, signal });
  },

  getProfitLoss: async (params?: ProfitLossQueryParams, signal?: AbortSignal): Promise<ProfitLossReportResponse> => {
    return apiGet<ProfitLossReportResponse>('/finance/ledger/profit-loss', { params, signal });
  },

  getBalanceSheet: async (params?: BalanceSheetQueryParams, signal?: AbortSignal): Promise<BalanceSheetReportResponse> => {
    return apiGet<BalanceSheetReportResponse>('/finance/ledger/balance-sheet', { params, signal });
  },

  getVatSummary: async (params?: VatSummaryQueryParams, signal?: AbortSignal): Promise<VatSummaryReportResponse> => {
    return apiGet<VatSummaryReportResponse>('/finance/ledger/vat-summary', { params, signal });
  },
};
