import { apiClient } from './axios';
import type { ApiRequestConfig, ApiSuccessResponse } from './axios';

export {
  apiClient,
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
  extractErrorMessage,
} from './axios';

export type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiRequestConfig,
} from './axios';

// Typed response unwrap helpers
export async function apiGet<T>(url: string, config?: ApiRequestConfig): Promise<T> {
  const response = await apiClient.get<ApiSuccessResponse<T>>(url, config);
  return response.data.data;
}

export async function apiGetPaginated<T>(
  url: string,
  config?: ApiRequestConfig,
): Promise<{ data: T[]; meta: { total: number; page: number; pageSize: number } }> {
  const response = await apiClient.get<ApiSuccessResponse<T[]>>(url, config);
  const rawMeta = response.data.meta as { total?: number; page?: number; pageSize?: number } | undefined;
  return {
    data: response.data.data,
    meta: {
      total: rawMeta?.total ?? response.data.data.length,
      page: rawMeta?.page ?? 1,
      pageSize: rawMeta?.pageSize ?? response.data.data.length,
    },
  };
}

export async function apiPost<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<T> {
  const response = await apiClient.post<ApiSuccessResponse<T>>(url, data, config);
  return response.data.data;
}

export async function apiPut<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<T> {
  const response = await apiClient.put<ApiSuccessResponse<T>>(url, data, config);
  return response.data.data;
}

export async function apiPatch<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<T> {
  const response = await apiClient.patch<ApiSuccessResponse<T>>(url, data, config);
  return response.data.data;
}

export async function apiDelete<T>(url: string, config?: ApiRequestConfig): Promise<T> {
  const response = await apiClient.delete<ApiSuccessResponse<T>>(url, config);
  return response.data.data;
}

export default apiClient;
