import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Customer, CommercialTerms, CustomerApprovalStage, CustomerStatus } from '../types/customer';
import { customersApi } from '../api/customers/customers.api';
import {
  customerQueryKeys,
  useCustomers as useCustomersQuery,
  useCustomersOutstandings,
  useCreateCustomerStep1,
  useUpdateCustomer,
  useUpdateCommercialTerms,
  useApproveCustomer,
  useRejectCustomer,
  useDeleteCustomer,
} from '../api/customers/customers.hooks';
import { ListCustomersParams, UpdateCustomerPayload } from '../api/customers/customers.types';

export function useCustomers(initialFilters?: ListCustomersParams) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ListCustomersParams>(
    initialFilters || { page: 1, pageSize: 20 }
  );

  const customersQuery = useCustomersQuery(filters);
  const outstandingsQuery = useCustomersOutstandings();
  const createStep1Mutation = useCreateCustomerStep1();
  const updateCustomerMutation = useUpdateCustomer();
  const updateCommercialTermsMutation = useUpdateCommercialTerms();
  const approveCustomerMutation = useApproveCustomer();
  const rejectCustomerMutation = useRejectCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  const customers = useMemo<Customer[]>(() => {
    const rawList = customersQuery.data?.data ?? [];
    const groupedOutstandings = outstandingsQuery.data ?? {};
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return rawList.map((c) => {
      const creditLimitNum = c.creditLimit ? Number(c.creditLimit) : 500000;
      const outstandingEntry = groupedOutstandings[c.id];
      let totalOutstanding = 0;
      let currentDue = 0;
      let nearDue = 0;
      let overdue = 0;

      if (outstandingEntry) {
        totalOutstanding = Number(outstandingEntry.totalOutstanding) || 0;
        for (const inv of outstandingEntry.outstandingInvoices) {
          const bal = Number(inv.balanceAmount) || 0;
          if (bal <= 0) continue;
          const dueMs = new Date(inv.dueDate).getTime();
          if (dueMs < now) {
            overdue += bal;
          } else if (dueMs <= now + sevenDaysMs) {
            nearDue += bal;
          } else {
            currentDue += bal;
          }
        }
      }

      return {
        ...c,
        id: c.id,
        code: c.customerCode || c.id.slice(0, 8).toUpperCase(),
        name: c.displayName,
        displayName: c.displayName,
        companyName: c.companyName || undefined,
        type: c.customerType,
        customerType: c.customerType,
        areaId: c.areaId || '',
        areaName: c.area?.areaName || '',
        assignedRepId: c.salesRepId || '',
        assignedRepName: c.salesRep?.fullName || '',
        contactPerson: c.contactPerson,
        phone: c.primaryContactNumber,
        primaryContactNumber: c.primaryContactNumber,
        whatsappNumber: c.whatsappNumber || undefined,
        secondaryPhone: c.secondaryContactNumber || undefined,
        email: c.email,
        address: c.registrationAddress,
        registrationAddress: c.registrationAddress,
        tinNumber: c.tinNumber || undefined,
        vatNumber: c.vatNumber || undefined,
        creditPeriod: c.creditPeriod || 30,
        creditLimit: creditLimitNum,
        commercialTerms: {
          creditLimit: creditLimitNum,
          creditDays: c.creditPeriod || 30,
          paymentTermNotes: c.paymentTermNotes || undefined,
        },
        financials: {
          totalOutstanding: Number(totalOutstanding.toFixed(2)),
          currentDue: Number(currentDue.toFixed(2)),
          nearDue: Number(nearDue.toFixed(2)),
          overdue: Number(overdue.toFixed(2)),
          availableCredit: Math.max(0, Number((creditLimitNum - totalOutstanding).toFixed(2))),
        },
        approvalStage: c.approvalStage as CustomerApprovalStage,
        status: c.status as CustomerStatus,
        loyaltyLevel: c.loyaltyLevel,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
  }, [customersQuery.data, outstandingsQuery.data]);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
  }, [queryClient]);

  const createCustomer = useCallback(
    async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'>) => {
      return createStep1Mutation.mutateAsync({
        displayName: data.displayName || data.name,
        companyName: data.companyName || data.displayName || data.name,
        contactPerson: data.contactPerson || data.displayName || data.name,
        email: data.email,
        primaryContactNumber: data.primaryContactNumber || data.phone,
        whatsappNumber: data.whatsappNumber || data.primaryContactNumber || data.phone,
        secondaryContactNumber: data.secondaryContactNumber || data.secondaryPhone || undefined,
        registrationAddress: data.registrationAddress || data.address,
        areaId: data.areaId,
        tinNumber: data.tinNumber || data.taxNumber || undefined,
        vatNumber: data.vatNumber || undefined,
        customerType: data.customerType || data.type || 'DEALER',
      });
    },
    [createStep1Mutation],
  );

  const updateCustomer = useCallback(
    async (id: string, updates: Partial<Customer>) => {
      if (updates.approvalStage === 'REJECT') {
        await rejectCustomerMutation.mutateAsync({ id });
        return;
      }
      if (updates.approvalStage === 'APPROVED') {
        await approveCustomerMutation.mutateAsync({ id });
        return;
      }

      const payload: UpdateCustomerPayload = {};
      if (updates.displayName || updates.name) payload.displayName = updates.displayName || updates.name;
      if (updates.companyName !== undefined) payload.companyName = updates.companyName;
      if (updates.contactPerson !== undefined) payload.contactPerson = updates.contactPerson;
      if (updates.email !== undefined && updates.email.trim()) payload.email = updates.email.trim();
      if (updates.primaryContactNumber || updates.phone) {
        payload.primaryContactNumber = updates.primaryContactNumber || updates.phone;
      }
      if (updates.whatsappNumber !== undefined && updates.whatsappNumber.trim()) {
        payload.whatsappNumber = updates.whatsappNumber.trim();
      }
      if (updates.secondaryContactNumber || updates.secondaryPhone) {
        payload.secondaryContactNumber = updates.secondaryContactNumber || updates.secondaryPhone;
      }
      if (updates.registrationAddress || updates.address) {
        payload.registrationAddress = updates.registrationAddress || updates.address;
      }
      if (updates.areaId) payload.areaId = updates.areaId;
      if (updates.assignedRepId || updates.salesRepId) {
        payload.salesRepId = (updates.assignedRepId || updates.salesRepId) ?? undefined;
      }
      if (updates.areaManagerId) payload.areaManagerId = updates.areaManagerId;
      if (updates.loyaltyLevel) payload.loyaltyLevel = updates.loyaltyLevel;
      if (updates.customerType || updates.type) {
        payload.customerType = (updates.customerType || updates.type) as any;
      }
      if (updates.tinNumber || updates.taxNumber) {
        payload.tinNumber = updates.tinNumber || updates.taxNumber;
      }
      if (updates.vatNumber !== undefined) payload.vatNumber = updates.vatNumber ?? undefined;
      if (updates.commercialTerms?.creditDays !== undefined) {
        payload.creditPeriod = updates.commercialTerms.creditDays;
      } else if (updates.creditPeriod !== undefined && updates.creditPeriod !== null) {
        payload.creditPeriod = updates.creditPeriod;
      }
      if (updates.commercialTerms?.creditLimit !== undefined) {
        payload.creditLimit = updates.commercialTerms.creditLimit;
      } else if (updates.creditLimit !== undefined && updates.creditLimit !== null) {
        payload.creditLimit = Number(updates.creditLimit);
      }
      if (updates.commercialTerms?.paymentTermNotes !== undefined) {
        payload.paymentTermNotes = updates.commercialTerms.paymentTermNotes;
      }

      await updateCustomerMutation.mutateAsync({ id, payload });
    },
    [approveCustomerMutation, rejectCustomerMutation, updateCustomerMutation],
  );

  const setCommercialTerms = useCallback(
    async (customerId: string, terms: CommercialTerms) => {
      return updateCommercialTermsMutation.mutateAsync({
        id: customerId,
        payload: {
          creditPeriod: terms.creditDays,
          creditLimit: terms.creditLimit,
          paymentTermNotes: terms.paymentTermNotes,
        },
      });
    },
    [updateCommercialTermsMutation],
  );

  const finalizeApproval = useCallback(
    async (customerId: string, approved: boolean) => {
      if (approved) {
        await approveCustomerMutation.mutateAsync({ id: customerId });
      } else {
        await rejectCustomerMutation.mutateAsync({ id: customerId });
      }
    },
    [approveCustomerMutation, rejectCustomerMutation],
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      await deleteCustomerMutation.mutateAsync(id);
    },
    [deleteCustomerMutation],
  );

  return {
    customers,
    loading: customersQuery.isLoading,
    error: customersQuery.error ? customersQuery.error.message : null,
    filters,
    setFilters,
    total: customersQuery.data?.meta.total ?? 0,
    totalPages: customersQuery.data?.meta.totalPages ?? 1,
    refetch,
    createCustomer,
    updateCustomer,
    setCommercialTerms,
    finalizeApproval,
    deleteCustomer,
  };
}
