import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { isRequestCanceled, extractErrorMessage } from '../api/axios';

describe('Request Cancellation & Error Normalization', () => {
  describe('isRequestCanceled', () => {
    it('should return true for Axios ERR_CANCELED errors', () => {
      const error = {
        code: 'ERR_CANCELED',
        message: 'canceled',
        name: 'CanceledError',
      };
      expect(isRequestCanceled(error)).toBe(true);
    });

    it('should return true for AbortError from AbortController / DOMException', () => {
      const error = {
        name: 'AbortError',
        message: 'The user aborted a request.',
      };
      expect(isRequestCanceled(error)).toBe(true);
    });

    it('should return true for axios.isCancel instances', () => {
      const cancelError = new axios.CanceledError('canceled');
      expect(isRequestCanceled(cancelError)).toBe(true);
    });

    it('should return true for error with message "canceled" or "cancelled"', () => {
      expect(isRequestCanceled({ message: 'canceled' })).toBe(true);
      expect(isRequestCanceled({ message: 'CANCELED' })).toBe(true);
      expect(isRequestCanceled({ message: 'cancelled' })).toBe(true);
      expect(isRequestCanceled('canceled')).toBe(true);
      expect(isRequestCanceled('CANCELLED')).toBe(true);
    });

    it('should return false for genuine API and network errors', () => {
      expect(isRequestCanceled(null)).toBe(false);
      expect(isRequestCanceled(undefined)).toBe(false);
      expect(isRequestCanceled(new Error('Network error: ECONNREFUSED'))).toBe(false);
      expect(
        isRequestCanceled({
          response: {
            status: 409,
            data: { message: 'Cannot delete brand: assigned to active products' },
          },
        })
      ).toBe(false);
      expect(
        isRequestCanceled({
          response: {
            status: 400,
            data: { message: 'Customer already has an assigned customer code.' },
          },
        })
      ).toBe(false);
      expect(
        isRequestCanceled({
          response: {
            status: 401,
            data: { message: 'Unauthorized session' },
          },
        })
      ).toBe(false);
    });
  });

  describe('extractErrorMessage', () => {
    it('should return empty string for cancelled requests so no toast is triggered', () => {
      const cancelError = { code: 'ERR_CANCELED', message: 'canceled' };
      expect(extractErrorMessage(cancelError)).toBe('');
    });

    it('should extract single string message from API response body', () => {
      const apiError = {
        response: {
          status: 409,
          data: {
            statusCode: 409,
            code: 'Conflict',
            message: 'Cannot delete brand "QT Int Brand": it is currently assigned to 2 active product(s).',
          },
        },
      };
      expect(extractErrorMessage(apiError)).toBe(
        'Cannot delete brand "QT Int Brand": it is currently assigned to 2 active product(s).'
      );
    });

    it('should extract array message from class-validator 400 errors', () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: ['salesRepId should not be empty', 'salesRepId must be a UUID'],
          },
        },
      };
      expect(extractErrorMessage(validationError)).toBe(
        'salesRepId should not be empty, salesRepId must be a UUID'
      );
    });

    it('should extract details array if message is not present', () => {
      const detailsError = {
        response: {
          status: 400,
          data: {
            statusCode: 400,
            details: ['property comments should not exist'],
          },
        },
      };
      expect(extractErrorMessage(detailsError)).toBe('property comments should not exist');
    });

    it('should use fallback if no message is provided', () => {
      expect(extractErrorMessage({}, 'Custom fallback error')).toBe('Custom fallback error');
    });
  });
});
