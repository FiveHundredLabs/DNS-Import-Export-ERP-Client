import { apiGetPaginated, apiGet, apiPost, apiPatch, apiDelete } from '../client';
import {
  Customer,
  CreateCustomerStep1Payload,
  CompleteCustomerStep2Payload,
  UpdateCommercialTermsPayload,
  CustomerApprovalActionPayload,
  UpdateCustomerStatusPayload,
  ListCustomersParams,
  PaginatedCustomersResponse,
} from './customers.types';

export const customersApi = {
  listCustomers: async (
    params?: ListCustomersParams,
    signal?: AbortSignal,
  ): Promise<PaginatedCustomersResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    // Enforce backend @Max(100) limit
    if (params?.pageSize) query.set('pageSize', String(Math.min(params.pageSize, 100)));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.customerType) query.set('customerType', params.customerType);
    if (params?.areaId) query.set('areaId', params.areaId);
    if (params?.salesRepId) query.set('salesRepId', params.salesRepId);
    if (params?.areaManagerId) query.set('areaManagerId', params.areaManagerId);
    if (params?.approvalStage) query.set('approvalStage', params.approvalStage);
    if (params?.approvalStages?.length) query.set('approvalStages', params.approvalStages.join(','));
    if (params?.loyaltyLevel) query.set('loyaltyLevel', params.loyaltyLevel);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const qs = query.toString();
    const url = `/customers${qs ? `?${qs}` : ''}`;
    const result = await apiGetPaginated<Customer>(url, { signal });
    return {
      data: result.data,
      meta: {
        ...result.meta,
        totalPages: Math.ceil(result.meta.total / (result.meta.pageSize || 20)),
      },
    };
  },

  getCustomerById: async (id: string, signal?: AbortSignal): Promise<Customer> => {
    return apiGet<Customer>(`/customers/${id}`, { signal });
  },

  createCustomerStep1: async (
    payload: CreateCustomerStep1Payload,
    signal?: AbortSignal,
  ): Promise<Customer> => {
    return apiPost<Customer>('/customers/onboarding/step-1', payload, {
      signal,
      successMessage: 'Customer draft created successfully',
    });
  },

  completeCustomerStep2: async (
    id: string,
    payload: CompleteCustomerStep2Payload,
    signal?: AbortSignal,
  ): Promise<Customer> => {
    const cleanPayload = {
      ...payload,
      salesRepId: payload.salesRepId?.trim() ? payload.salesRepId.trim() : undefined,
    };
    return apiPatch<Customer>(`/customers/${id}/onboarding/step-2`, cleanPayload, {
      signal,
      successMessage: 'Customer onboarding completed successfully',
    });
  },

  updateCommercialTerms: async (
    id: string,
    payload: UpdateCommercialTermsPayload,
    signal?: AbortSignal,
  ): Promise<Customer> => {
    return apiPatch<Customer>(`/customers/${id}/commercial-terms`, payload, {
      signal,
      successMessage: 'Commercial terms updated successfully',
    });
  },

  approveCustomer: async (
    id: string,
    payload?: CustomerApprovalActionPayload,
    signal?: AbortSignal,
  ): Promise<Customer> => {
    const reason = payload?.reason ?? payload?.comments;
    const body = reason !== undefined ? { reason } : {};
    return apiPost<Customer>(`/customers/${id}/approve`, body, {
      signal,
      successMessage: 'Customer approved successfully',
    });
  },

  rejectCustomer: async (
    id: string,
    payload?: CustomerApprovalActionPayload,
    signal?: AbortSignal,
  ): Promise<Customer> => {
    const reason = payload?.reason ?? payload?.comments;
    const body = reason !== undefined ? { reason } : {};
    return apiPost<Customer>(`/customers/${id}/reject`, body, {
      signal,
      successMessage: 'Customer rejected',
    });
  },

  updateCustomerStatus: async (
    id: string,
    payload: UpdateCustomerStatusPayload,
    signal?: AbortSignal,
  ): Promise<Customer> => {
    return apiPatch<Customer>(`/customers/${id}/status`, payload, {
      signal,
      successMessage: `Customer status updated to ${payload.status}`,
    });
  },

  deleteCustomer: async (id: string, signal?: AbortSignal): Promise<void> => {
    return apiDelete<void>(`/customers/${id}`, {
      signal,
      successMessage: 'Customer deleted successfully',
    });
  },
};
