import { useState, useEffect, useCallback } from 'react';
import { Customer, CommercialTerms, CustomerApprovalStage, CustomerStatus } from '../types/customer';
import { customersApi } from '../api/customers/customers.api';
import { ListCustomersParams } from '../api/customers/customers.types';

export function useCustomers(initialFilters?: ListCustomersParams) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ListCustomersParams>(
    initialFilters || { page: 1, pageSize: 20 }
  );
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await customersApi.listCustomers(filters);
      // Map to ensure both modern backend fields and UI alias fields work everywhere
      const mapped: Customer[] = res.data.map((c) => ({
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
        creditLimit: c.creditLimit ? Number(c.creditLimit) : 500000,
        commercialTerms: {
          creditLimit: c.creditLimit ? Number(c.creditLimit) : 500000,
          creditDays: c.creditPeriod || 30,
          paymentTermNotes: c.paymentTermNotes || undefined,
        },
        financials: {
          totalOutstanding: 0,
          currentDue: 0,
          nearDue: 0,
          overdue: 0,
          availableCredit: c.creditLimit ? Number(c.creditLimit) : 500000,
        },
        approvalStage: c.approvalStage as CustomerApprovalStage,
        status: c.status as CustomerStatus,
        loyaltyLevel: c.loyaltyLevel,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      setCustomers(mapped);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const createCustomer = async (
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'>
  ) => {
    const created = await customersApi.createCustomerStep1({
      displayName: data.displayName || data.name,
      companyName: data.companyName || data.displayName || data.name,
      contactPerson: data.contactPerson || data.displayName || data.name,
      email: data.email,
      primaryContactNumber: data.primaryContactNumber || data.phone,
      whatsappNumber: data.whatsappNumber || data.primaryContactNumber || data.phone,
      secondaryContactNumber: data.secondaryContactNumber || data.secondaryPhone || undefined,
      registrationAddress: data.registrationAddress || data.address,
      tinNumber: data.tinNumber || data.taxNumber || undefined,
      vatNumber: data.vatNumber || undefined,
      customerType: data.customerType || data.type || 'DEALER',
    });
    await fetchCustomers();
    return created;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    if (updates.approvalStage === 'REJECT') {
      await customersApi.rejectCustomer(id);
    } else if (updates.approvalStage === 'APPROVED') {
      await customersApi.approveCustomer(id);
    }
    await fetchCustomers();
  };

  const setCommercialTerms = async (customerId: string, terms: CommercialTerms) => {
    const res = await customersApi.updateCommercialTerms(customerId, {
      creditPeriod: terms.creditDays,
      creditLimit: terms.creditLimit,
      paymentTermNotes: terms.paymentTermNotes,
    });
    await fetchCustomers();
    return res;
  };

  const finalizeApproval = async (customerId: string, approved: boolean) => {
    if (approved) {
      await customersApi.approveCustomer(customerId);
    } else {
      await customersApi.rejectCustomer(customerId);
    }
    await fetchCustomers();
  };

  const deleteCustomer = async (id: string) => {
    await customersApi.deleteCustomer(id);
    await fetchCustomers();
  };

  return {
    customers,
    loading,
    error,
    filters,
    setFilters,
    total,
    totalPages,
    refetch: fetchCustomers,
    createCustomer,
    updateCustomer,
    setCommercialTerms,
    finalizeApproval,
    deleteCustomer,
  };
}
