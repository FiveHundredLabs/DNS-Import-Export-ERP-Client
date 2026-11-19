import { apiGetPaginated, apiGet, apiPost, apiPatch, apiDelete } from '../client';
import {
  CreateProductPayload,
  ListProductsParams,
  PaginatedProductsResponse,
  Product,
  SkuPreviewResponse,
  UpdateProductPayload,
} from './products.types';

export const productsApi = {
  listProducts: async (params?: ListProductsParams, signal?: AbortSignal): Promise<PaginatedProductsResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 100)));
    if (params?.search) query.set('search', params.search);
    if (params?.brandId) query.set('brandId', params.brandId);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.status) query.set('status', params.status);
    if (params?.unitOfMeasure) query.set('unitOfMeasure', params.unitOfMeasure);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const qs = query.toString();
    const url = `/products${qs ? `?${qs}` : ''}`;
    const result = await apiGetPaginated<Product>(url, { signal });
    return {
      data: result.data,
      meta: {
        ...result.meta,
        totalPages: Math.ceil(result.meta.total / (result.meta.pageSize || 20)),
      },
    };
  },

  getProductById: async (id: string, signal?: AbortSignal): Promise<Product> => {
    return apiGet<Product>(`/products/${id}`, { signal });
  },

  getProductByBarcode: async (barcode: string, signal?: AbortSignal): Promise<Product> => {
    return apiGet<Product>(`/products/barcode/${encodeURIComponent(barcode)}`, { signal });
  },

  getSkuPreview: async (
    query: { brandName?: string; brandId?: string; productName: string },
    signal?: AbortSignal,
  ): Promise<SkuPreviewResponse> => {
    const params = new URLSearchParams();
    if (query.brandName) params.set('brandName', query.brandName);
    if (query.brandId) params.set('brandId', query.brandId);
    params.set('productName', query.productName);
    return apiGet<SkuPreviewResponse>(`/products/sku-preview?${params.toString()}`, { signal });
  },

  createProduct: async (payload: CreateProductPayload): Promise<Product> => {
    return apiPost<Product>('/products', payload, {
      successMessage: 'Product created successfully with generated SKU and Barcode',
    });
  },

  updateProduct: async (id: string, payload: UpdateProductPayload): Promise<Product> => {
    return apiPatch<Product>(`/products/${id}`, payload, {
      successMessage: 'Product updated successfully',
    });
  },

  deleteProduct: async (id: string): Promise<{ message: string }> => {
    return apiDelete<{ message: string }>(`/products/${id}`, {
      successMessage: 'Product soft-deleted successfully',
    });
  },
};
