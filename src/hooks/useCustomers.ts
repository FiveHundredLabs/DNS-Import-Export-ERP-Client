import { useState, useEffect, useCallback } from 'react';
import { Customer, CommercialTerms } from '../types/customer';
import { customerService } from '../services/CustomerService';
import { CustomerFilters } from '../repositories/ICustomerRepository';

export function useCustomers(initialFilters?: CustomerFilters) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters || { page: 1, pageSize: 10 });
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await customerService.listCustomers(filters);
      setCustomers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
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
    const created = await customerService.createCustomer(data);
    await fetchCustomers();
    return created;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const updated = await customerService.updateCustomer(id, updates);
    await fetchCustomers();
    return updated;
  };

  const setCommercialTerms = async (customerId: string, terms: CommercialTerms) => {
    const res = await customerService.setCommercialTerms(customerId, terms);
    await fetchCustomers();
    return res;
  };

  const finalizeApproval = async (customerId: string, approved: boolean) => {
    const res = await customerService.finalizeApproval(customerId, approved);
    await fetchCustomers();
    return res;
  };

  const deleteCustomer = async (id: string) => {
    await customerService.deleteCustomer(id);
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
