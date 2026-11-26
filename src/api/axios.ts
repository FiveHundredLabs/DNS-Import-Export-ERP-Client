import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  isCancel,
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
  return Boolean(url && /^\/auth\/(login|refresh|logout|logout-all|me)$/.test(url));
}

function redirectTo(path: '/login' | '/404' | '/500'): void {
  if (
    typeof window !== 'undefined' &&
    !navigator.userAgent.includes('jsdom') &&
    window.location.pathname !== path
  ) {
    try {
      window.location.replace(path);
    } catch {
      // Safe no-op in test/JSDOM environments where navigation throws 'Not implemented'
    }
  }
}

export function isRequestCanceled(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'string') {
    const lower = error.trim().toLowerCase();
    return lower === 'canceled' || lower === 'cancelled';
  }
  if (axios.isCancel(error)) return true;
  if (typeof error === 'object') {
    const anyErr = error as any;
    if (
      anyErr.code === 'ERR_CANCELED' ||
      anyErr.name === 'CanceledError' ||
      anyErr.name === 'AbortError' ||
      anyErr.__CANCEL__ ||
      (typeof anyErr.message === 'string' &&
        (anyErr.message.toLowerCase() === 'canceled' || anyErr.message.toLowerCase() === 'cancelled'))
    ) {
      return true;
    }
  }
  return false;
}

export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  if (!error) return fallback;
  if (isRequestCanceled(error)) return '';

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (typeof error === 'object') {
    const anyErr = error as any;
    const responseData = anyErr.response?.data;

    if (responseData) {
      if (typeof responseData.message === 'string' && responseData.message.trim()) {
        return responseData.message;
      }
      if (Array.isArray(responseData.message) && responseData.message.length > 0) {
        return responseData.message.filter(Boolean).join(', ');
      }
      if (Array.isArray(responseData.details) && responseData.details.length > 0) {
        return responseData.details.filter(Boolean).join(', ');
      }
      if (typeof responseData.error === 'string' && responseData.error.trim()) {
        return responseData.error;
      }
    }

    if (
      typeof anyErr.message === 'string' &&
      anyErr.message.trim() &&
      !anyErr.message.startsWith('Request failed with status code')
    ) {
      return anyErr.message;
    }
  }

  return fallback;
}

function getErrorPayload(error: AxiosError<ApiErrorResponse>): ApiErrorResponse {
  const responseData = error.response?.data as any;

  if (responseData && typeof responseData === 'object') {
    const message = extractErrorMessage(error, error.message || 'A network error occurred.');

    return {
      statusCode: responseData.statusCode || error.response?.status || 0,
      code: responseData.code || 'ERROR',
      message,
      details: responseData.details,
      requestId: responseData.requestId,
    };
  }

  return {
    statusCode: error.response?.status || 0,
    code: error.code || 'NETWORK_ERROR',
    message: extractErrorMessage(error, error.message || 'A network error occurred.'),
  };
}

function notifyError(error: AxiosError<ApiErrorResponse>): void {
  if (error.config?.suppressErrorToast || isRequestCanceled(error)) {
    return;
  }

  const payload = getErrorPayload(error);
  if (payload.message === 'canceled' || payload.code === 'ERR_CANCELED' || isRequestCanceled(payload.message)) {
    return;
  }
  if (payload.message) {
    toast.error(payload.message);
  }
}

function redirectForError(
  error: AxiosError<ApiErrorResponse>,
): void {
  if (isRequestCanceled(error)) {
    return;
  }

  const config = error.config as ApiRequestConfig | undefined;

  if (config?.suppressErrorRedirect) {
    return;
  }

  const status = error.response?.status;

  if (status === 404) {
    redirectTo('/404');
  }
  // Note: 500 server errors do NOT perform hard page redirects (redirectTo('/500')),
  // which would destroy in-memory authentication and reload the application.
  // Instead, 500 errors are surfaced via notifyError() toast or component error boundaries.
}

export async function refreshAccessToken(): Promise<string> {
  if (typeof window !== 'undefined' && navigator.userAgent.includes('jsdom')) {
    throw new Error('Refresh token not available in test environment');
  }

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
    // 1. If request was intentionally aborted or cancelled (e.g. via AbortController,
    // component unmounting, navigation, React StrictMode, or TanStack Query cancellation),
    // do NOT treat it as an API failure. Do NOT show toasts or redirect.
    if (isRequestCanceled(error)) {
      return Promise.reject(error);
    }

    const config = error.config as ApiRequestConfig | undefined;
    const status = error.response?.status;

    // Normalize error.message to the server's descriptive message instead of generic Axios message
    const payload = getErrorPayload(error);
    if (payload.message && typeof payload.message === 'string') {
      error.message = payload.message;
    }

    if (
      status === 401 &&
      config &&
      !config._retry &&
      !config.skipAuthRefresh &&
      !isAuthEndpoint(config.url) &&
      typeof window !== 'undefined' &&
      !navigator.userAgent.includes('jsdom')
    ) {
      config._retry = true;

      try {
        const token = await refreshAccessToken();
        setAuthorizationHeader(config as InternalAxiosRequestConfig, token);
        return apiClient.request(config);
      } catch (refreshError) {
        if (typeof window !== 'undefined' && !navigator.userAgent.includes('jsdom')) {
          clearAccessToken();
          clearAppCache();
          // Session has expired — redirect to login silently. The login page is
          // sufficient feedback; a toast here would be noisy and confusing on boot.
          redirectTo('/login');
        }
        return Promise.reject(refreshError);
      }
    }

    notifyError(error);
    redirectForError(error);

    // Only clear session and redirect to /login when an authenticated business request gets 401
    // (do not redirect on login/refresh failures where the user is already on /login or refreshing)
    if (status === 401 && !isAuthEndpoint(config?.url) && !config?.suppressErrorRedirect) {
      if (typeof window !== 'undefined' && !navigator.userAgent.includes('jsdom')) {
        clearAccessToken();
        clearAppCache();
        redirectTo('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
