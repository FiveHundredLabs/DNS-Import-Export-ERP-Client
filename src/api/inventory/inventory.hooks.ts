import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query';
import { inventoryApi } from './inventory.api';
import type {
  ListStockBalancesParams,
  ListStockMovementsParams,
  PaginatedStockBalancesResponse,
  PaginatedStockMovementsResponse,
  StockBalanceApiItem,
} from './inventory.types';

export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  balances: () => [...inventoryQueryKeys.all, 'balances'] as const,
  balancesList: (params?: ListStockBalancesParams) =>
    [...inventoryQueryKeys.balances(), params] as const,
  balanceDetail: (productId: string) =>
    [...inventoryQueryKeys.balances(), productId] as const,
  movements: () => [...inventoryQueryKeys.all, 'movements'] as const,
  movementsList: (params?: ListStockMovementsParams) =>
    [...inventoryQueryKeys.movements(), params] as const,
};

export function useStockBalances(
  params: ListStockBalancesParams = {},
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedStockBalancesResponse, Error> {
  return useQuery({
    queryKey: inventoryQueryKeys.balancesList(params),
    queryFn: ({ signal }) => inventoryApi.getStockBalances(params, signal),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

export function useProductStockBalance(
  productId: string,
  options?: { enabled?: boolean },
): UseQueryResult<StockBalanceApiItem, Error> {
  return useQuery({
    queryKey: inventoryQueryKeys.balanceDetail(productId),
    queryFn: ({ signal }) => inventoryApi.getProductStockBalance(productId, signal),
    enabled: Boolean(productId) && (options?.enabled ?? true),
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

export function useStockMovements(
  params: ListStockMovementsParams = {},
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedStockMovementsResponse, Error> {
  return useQuery({
    queryKey: inventoryQueryKeys.movementsList(params),
    queryFn: ({ signal }) => inventoryApi.getStockMovements(params, signal),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 300_000,
  });
}
