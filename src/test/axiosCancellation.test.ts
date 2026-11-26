import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError, CanceledError } from 'axios';
import { toast } from 'sonner';
import { apiClient, isRequestCanceled } from '../api/axios';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Axios Request Cancellation & Error Suppression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isRequestCanceled helper', () => {
    it('returns true for an Axios CanceledError instance', () => {
      const err = new CanceledError('canceled');
      expect(isRequestCanceled(err)).toBe(true);
    });

    it('returns true for an error with code ERR_CANCELED', () => {
      const err = new AxiosError('canceled', 'ERR_CANCELED');
      expect(isRequestCanceled(err)).toBe(true);
    });

    it('returns true for an error with message "canceled"', () => {
      const err = new Error('canceled');
      expect(isRequestCanceled(err)).toBe(true);
    });

    it('returns false for regular network or HTTP errors', () => {
      const err = new AxiosError('Internal Server Error', 'ERR_BAD_RESPONSE');
      expect(isRequestCanceled(err)).toBe(false);
      expect(isRequestCanceled(new Error('Something failed'))).toBe(false);
      expect(isRequestCanceled(null)).toBe(false);
      expect(isRequestCanceled(undefined)).toBe(false);
    });
  });

  describe('apiClient interceptor behavior on cancellation', () => {
    it('does NOT trigger toast.error when an AbortController cancels a request', async () => {
      const controller = new AbortController();
      controller.abort();

      try {
        await apiClient.get('/finance/coa/accounts', { signal: controller.signal });
      } catch (err: unknown) {
        expect(isRequestCanceled(err)).toBe(true);
      }

      expect(toast.error).not.toHaveBeenCalled();
    });

    it('does trigger toast.error for non-canceled server/network errors', async () => {
      const sampleError = new AxiosError(
        'Server exploded',
        'ERR_BAD_RESPONSE',
        { headers: {} } as any,
        {},
        {
          status: 500,
          statusText: 'Internal Server Error',
          data: { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal Server Error' },
          headers: {},
          config: { headers: {} } as any,
        },
      );

      const responseInterceptor = (apiClient.interceptors.response as any).handlers[0];
      if (responseInterceptor && responseInterceptor.rejected) {
        await expect(responseInterceptor.rejected(sampleError)).rejects.toThrow();
        expect(toast.error).toHaveBeenCalledWith('Internal Server Error');
      }
    });

    it('suppresses toast.error when request is canceled in the response interceptor', async () => {
      const canceledError = new AxiosError('canceled', 'ERR_CANCELED');
      const responseInterceptor = (apiClient.interceptors.response as any).handlers[0];

      if (responseInterceptor && responseInterceptor.rejected) {
        await expect(responseInterceptor.rejected(canceledError)).rejects.toThrow();
        expect(toast.error).not.toHaveBeenCalled();
      }
    });
  });
});
