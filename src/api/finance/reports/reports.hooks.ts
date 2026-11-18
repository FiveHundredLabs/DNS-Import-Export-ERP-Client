import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { reportsApi } from './reports.api';
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

export const reportsKeys = {
  all: ['finance', 'reports'] as const,
  generalLedger: (params?: GeneralLedgerQueryParams) => [...reportsKeys.all, 'general-ledger', params] as const,
  trialBalance: (params?: TrialBalanceQueryParams) => [...reportsKeys.all, 'trial-balance', params] as const,
  profitLoss: (params?: ProfitLossQueryParams) => [...reportsKeys.all, 'profit-loss', params] as const,
  balanceSheet: (params?: BalanceSheetQueryParams) => [...reportsKeys.all, 'balance-sheet', params] as const,
  vatSummary: (params?: VatSummaryQueryParams) => [...reportsKeys.all, 'vat-summary', params] as const,
};

export function useGeneralLedgerReport(
  params: GeneralLedgerQueryParams,
): UseQueryResult<GeneralLedgerReportResponse, Error> {
  return useQuery({
    queryKey: reportsKeys.generalLedger(params),
    queryFn: ({ signal }) => reportsApi.getGeneralLedger(params, signal),
    enabled: Boolean(params?.accountId),
    staleTime: 0, // Accounting ledger reports must always reflect real-time entries
  });
}

export function useTrialBalanceReport(
  params?: TrialBalanceQueryParams,
): UseQueryResult<TrialBalanceReportResponse, Error> {
  return useQuery({
    queryKey: reportsKeys.trialBalance(params),
    queryFn: ({ signal }) => reportsApi.getTrialBalance(params, signal),
    staleTime: 0,
  });
}

export function useProfitLossReport(
  params?: ProfitLossQueryParams,
): UseQueryResult<ProfitLossReportResponse, Error> {
  return useQuery({
    queryKey: reportsKeys.profitLoss(params),
    queryFn: ({ signal }) => reportsApi.getProfitLoss(params, signal),
    staleTime: 0,
  });
}

export function useBalanceSheetReport(
  params?: BalanceSheetQueryParams,
): UseQueryResult<BalanceSheetReportResponse, Error> {
  return useQuery({
    queryKey: reportsKeys.balanceSheet(params),
    queryFn: ({ signal }) => reportsApi.getBalanceSheet(params, signal),
    staleTime: 0,
  });
}

export function useVatSummaryReport(
  params?: VatSummaryQueryParams,
): UseQueryResult<VatSummaryReportResponse, Error> {
  return useQuery({
    queryKey: reportsKeys.vatSummary(params),
    queryFn: ({ signal }) => reportsApi.getVatSummary(params, signal),
    staleTime: 0,
  });
}
