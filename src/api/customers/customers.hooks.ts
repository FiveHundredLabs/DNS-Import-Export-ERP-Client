import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { customersApi } from './customers.api';
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

export const customerQueryKeys = {
  all: ['customers'] as const,
  lists: () => [...customerQueryKeys.all, 'list'] as const,
  list: (params?: ListCustomersParams) => [...customerQueryKeys.lists(), params] as const,
  details: () => [...customerQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerQueryKeys.details(), id] as const,
};

export function useCustomers(
  params?: ListCustomersParams,
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedCustomersResponse, Error> {
  return useQuery({
    queryKey: customerQueryKeys.list(params),
    queryFn: ({ signal }) => customersApi.listCustomers(params, signal),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useCustomer(id: string): UseQueryResult<Customer, Error> {
  return useQuery({
    queryKey: customerQueryKeys.detail(id),
    queryFn: ({ signal }) => customersApi.getCustomerById(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateCustomerStep1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerStep1Payload) =>
      customersApi.createCustomerStep1(payload),
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      queryClient.setQueryData(customerQueryKeys.detail(newCustomer.id), newCustomer);
    },
  });
}

export function useCompleteCustomerStep2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompleteCustomerStep2Payload }) =>
      customersApi.completeCustomerStep2(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      queryClient.setQueryData(customerQueryKeys.detail(updated.id), updated);
    },
  });
}

export function useUpdateCommercialTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCommercialTermsPayload }) =>
      customersApi.updateCommercialTerms(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      queryClient.setQueryData(customerQueryKeys.detail(updated.id), updated);
    },
  });
}

export function useApproveCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: CustomerApprovalActionPayload }) =>
      customersApi.approveCustomer(id, payload),
    onSuccess: (approved) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      queryClient.setQueryData(customerQueryKeys.detail(approved.id), approved);
    },
  });
}

export function useRejectCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: CustomerApprovalActionPayload }) =>
      customersApi.rejectCustomer(id, payload),
    onSuccess: (rejected) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      queryClient.setQueryData(customerQueryKeys.detail(rejected.id), rejected);
    },
  });
}

export function useUpdateCustomerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerStatusPayload }) =>
      customersApi.updateCustomerStatus(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      queryClient.setQueryData(customerQueryKeys.detail(updated.id), updated);
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
    },
  });
}
