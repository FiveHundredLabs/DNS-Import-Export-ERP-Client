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
  meta?: unknown;
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

function redirectTo(path: '/login' | '/404' | '/500'): void {
  if (typeof window !== 'undefined' && window.location.pathname !== path) {
    window.location.replace(path);
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

function redirectForError(
  error: AxiosError<ApiErrorResponse>,
): void {
  const config = error.config as ApiRequestConfig | undefined;

  if (config?.suppressErrorRedirect) {
    return;
  }

  const status = error.response?.status;

  if (status === 404) {
    redirectTo('/404');
  } else if (status !== undefined && status >= 500) {
    redirectTo('/500');
  }
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
        clearAccessToken();
        clearAppCache();
        notifyError(refreshError as AxiosError<ApiErrorResponse>);
        redirectTo('/login');
        throw refreshError;
      }
    }

    notifyError(error);
    redirectForError(error);

    if (status === 401) {
      clearAccessToken();
      clearAppCache();
      redirectTo('/login');
    }

    return Promise.reject(error);
  },
);

export default apiClient;
