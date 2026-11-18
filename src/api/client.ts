import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { toast } from 'sonner';
import { clearAppCache } from './queryClient';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || '/api/v1'
).replace(/\/+$/, '');

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
  };
  requestId?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
  requestId?: string;
}

export interface ApiRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
  suppressErrorToast?: boolean;
  successMessage?: string;
  suppressErrorRedirect?: boolean;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    _retry?: boolean;
    skipAuthRefresh?: boolean;
    suppressErrorToast?: boolean;
    successMessage?: string;
    suppressErrorRedirect?: boolean;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

function getRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isAuthEndpoint(url?: string): boolean {
  return Boolean(url && /^\/auth\/(login|refresh|logout|logout-all)$/.test(url));
}

function handleSessionExpired(): void {
  clearAccessToken();
  clearAppCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:logout'));
    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  }
}

function getErrorPayload(error: AxiosError<ApiErrorResponse>): ApiErrorResponse {
  const responseData = error.response?.data;
  if (responseData && typeof responseData === 'object') {
    return responseData;
  }
  return {
    statusCode: error.response?.status || 0,
    code: error.code || 'NETWORK_ERROR',
    message: error.message || 'A network error occurred.',
  };
}

function notifyError(error: AxiosError<ApiErrorResponse>): void {
  if (error.config?.suppressErrorToast) {
    return;
  }
  const payload = getErrorPayload(error);
  toast.error(payload.message);
}

export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiSuccessResponse<{ accessToken: string }>>('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.data.accessToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  token: string,
): void {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }
  config.headers.set('Authorization', `Bearer ${token}`);
}

apiClient.interceptors.request.use((config) => {
  const requestConfig = config as InternalAxiosRequestConfig & ApiRequestConfig;
  if (accessToken) {
    setAuthorizationHeader(requestConfig, accessToken);
  }
  requestConfig.headers.set('X-Request-ID', getRequestId());
  return requestConfig;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiSuccessResponse<unknown>>) => {
    const config = response.config as ApiRequestConfig;
    if (config.successMessage) {
      toast.success(config.successMessage);
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as ApiRequestConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      config &&
      !config._retry &&
      !config.skipAuthRefresh &&
      !isAuthEndpoint(config.url)
    ) {
      config._retry = true;
      try {
        const token = await refreshAccessToken();
        setAuthorizationHeader(config as InternalAxiosRequestConfig, token);
        return apiClient.request(config);
      } catch (refreshError) {
        handleSessionExpired();
        notifyError(refreshError as AxiosError<ApiErrorResponse>);
        throw refreshError;
      }
    }

    notifyError(error);

    if (status === 401) {
      handleSessionExpired();
    }

    return Promise.reject(error);
  },
);

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
  return {
    data: response.data.data,
    meta: response.data.meta || { total: response.data.data.length, page: 1, pageSize: response.data.data.length },
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
