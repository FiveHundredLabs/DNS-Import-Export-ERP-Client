import { useQuery, useQueryClient, QueryClient, UseQueryResult } from '@tanstack/react-query';
import { reportsApi } from './reports.api';

let fallbackQueryClient: QueryClient | null = null;
function useSafeQueryClient(): QueryClient | undefined {
  try {
    return useQueryClient();
  } catch {
    if (!fallbackQueryClient) {
      fallbackQueryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
    }
    return fallbackQueryClient;
  }
}
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
  const queryClient = useSafeQueryClient();
  return useQuery(
    {
      queryKey: reportsKeys.generalLedger(params),
      queryFn: ({ signal }) => reportsApi.getGeneralLedger(params, signal),
      enabled: Boolean(params?.accountId),
      staleTime: 0, // Accounting ledger reports must always reflect real-time entries
    },
    queryClient
  );
}

export function useTrialBalanceReport(
  params?: TrialBalanceQueryParams,
): UseQueryResult<TrialBalanceReportResponse, Error> {
  const queryClient = useSafeQueryClient();
  return useQuery(
    {
      queryKey: reportsKeys.trialBalance(params),
      queryFn: ({ signal }) => reportsApi.getTrialBalance(params, signal),
      staleTime: 0,
    },
    queryClient
  );
}

export function useProfitLossReport(
  params?: ProfitLossQueryParams,
): UseQueryResult<ProfitLossReportResponse, Error> {
  const queryClient = useSafeQueryClient();
  return useQuery(
    {
      queryKey: reportsKeys.profitLoss(params),
      queryFn: ({ signal }) => reportsApi.getProfitLoss(params, signal),
      staleTime: 0,
    },
    queryClient
  );
}

export function useBalanceSheetReport(
  params?: BalanceSheetQueryParams,
): UseQueryResult<BalanceSheetReportResponse, Error> {
  const queryClient = useSafeQueryClient();
  return useQuery(
    {
      queryKey: reportsKeys.balanceSheet(params),
      queryFn: ({ signal }) => reportsApi.getBalanceSheet(params, signal),
      staleTime: 0,
    },
    queryClient
  );
}

export function useVatSummaryReport(
  params?: VatSummaryQueryParams,
): UseQueryResult<VatSummaryReportResponse, Error> {
  const queryClient = useSafeQueryClient();
  return useQuery(
    {
      queryKey: reportsKeys.vatSummary(params),
      queryFn: ({ signal }) => reportsApi.getVatSummary(params, signal),
      staleTime: 0,
    },
    queryClient
  );
}
