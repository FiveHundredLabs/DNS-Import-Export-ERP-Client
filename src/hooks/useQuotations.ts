import { useState, useEffect, useCallback } from 'react';
import {
  Quotation,
  QuotationFilters,
  CreateQuotationInput,
  UpdateQuotationInput,
  ConvertedOrderPayload,
} from '../types/quotation';
import { quotationService } from '../services/QuotationService';
import { useAuth } from './useAuth';

export function useQuotations(initialFilters?: QuotationFilters) {
  const { currentUser } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuotationFilters>(
    initialFilters || { page: 1, pageSize: 15, status: 'ALL', sortByDate: 'desc' }
  );
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationService.listQuotations(filters, {
        userId: currentUser.id,
        role: currentUser.role,
        areaId: currentUser.areaId,
      });
      setQuotations(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  }, [filters, currentUser]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const createQuotation = async (input: CreateQuotationInput): Promise<Quotation> => {
    const created = await quotationService.createQuotation(input, currentUser);
    await fetchQuotations();
    return created;
  };

  const updateQuotation = async (
    id: string,
    updates: UpdateQuotationInput
  ): Promise<Quotation> => {
    const updated = await quotationService.updateQuotation(id, updates, currentUser);
    await fetchQuotations();
    return updated;
  };

  const submitForApproval = async (id: string, reason?: string): Promise<Quotation> => {
    const submitted = await quotationService.submitForApproval(id, currentUser, reason);
    await fetchQuotations();
    return submitted;
  };

  const approveQuotation = async (id: string, comment: string): Promise<Quotation> => {
    const approved = await quotationService.approveQuotation(id, currentUser, comment);
    await fetchQuotations();
    return approved;
  };

  const rejectQuotation = async (id: string, reason: string): Promise<Quotation> => {
    const rejected = await quotationService.rejectQuotation(id, currentUser, reason);
    await fetchQuotations();
    return rejected;
  };

  const convertToSalesOrder = async (
    id: string,
    details?: { deliveryAddress?: string; deliveryDate?: string; customerPoNumber?: string }
  ): Promise<ConvertedOrderPayload> => {
    const orderPayload = await quotationService.convertToSalesOrder(id, currentUser, details);
    await fetchQuotations();
    return orderPayload;
  };

  const issueQuotation = async (id: string): Promise<Quotation> => {
    const issued = await quotationService.issueQuotation(id, currentUser);
    await fetchQuotations();
    return issued;
  };

  return {
    quotations,
    loading,
    error,
    filters,
    setFilters,
    total,
    totalPages,
    refetch: fetchQuotations,
    createQuotation,
    updateQuotation,
    submitForApproval,
    issueQuotation,
    approveQuotation,
    rejectQuotation,
    convertToSalesOrder,
  };
}
