import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { productsApi } from './products.api';
import {
  CreateProductPayload,
  ListProductsParams,
  PaginatedProductsResponse,
  Product,
  SkuPreviewResponse,
  UpdateProductPayload,
} from './products.types';

export const productQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  list: (params?: ListProductsParams) => [...productQueryKeys.lists(), params] as const,
  details: () => [...productQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...productQueryKeys.details(), id] as const,
  barcode: (barcode: string) => [...productQueryKeys.all, 'barcode', barcode] as const,
  skuPreview: (query: { brandName?: string; brandId?: string; productName: string }) =>
    [...productQueryKeys.all, 'skuPreview', query] as const,
};

export function useProducts(params?: ListProductsParams): UseQueryResult<PaginatedProductsResponse, Error> {
  return useQuery({
    queryKey: productQueryKeys.list(params),
    queryFn: ({ signal }) => productsApi.listProducts(params, signal),
    staleTime: 60_000,
  });
}

export function useProduct(id: string): UseQueryResult<Product, Error> {
  return useQuery({
    queryKey: productQueryKeys.detail(id),
    queryFn: ({ signal }) => productsApi.getProductById(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useProductByBarcode(barcode: string): UseQueryResult<Product, Error> {
  return useQuery({
    queryKey: productQueryKeys.barcode(barcode),
    queryFn: ({ signal }) => productsApi.getProductByBarcode(barcode, signal),
    enabled: Boolean(barcode),
    staleTime: 60_000,
  });
}

export function useSkuPreview(
  query: { brandName?: string; brandId?: string; productName: string },
  enabled = true,
): UseQueryResult<SkuPreviewResponse, Error> {
  return useQuery({
    queryKey: productQueryKeys.skuPreview(query),
    queryFn: ({ signal }) => productsApi.getSkuPreview(query, signal),
    enabled: enabled && Boolean(query.productName && query.productName.trim().length >= 2),
    staleTime: 30_000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productsApi.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      productsApi.updateProduct(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
    },
  });
}
