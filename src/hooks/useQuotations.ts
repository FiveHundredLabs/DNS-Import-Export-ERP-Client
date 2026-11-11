import { useState, useEffect, useCallback } from 'react';
import {
  Quotation,
  QuotationFilters,
  QuotationSummary,
  CreateQuotationInput,
  UpdateQuotationInput,
  ConvertedOrderPayload,
} from '../types/quotation';
import { quotationService } from '../services/QuotationService';
import { orderService } from '../services/OrderService';
import { SalesOrder } from '../types/order';
import { useAuth } from './useAuth';

const EMPTY_SUMMARY: QuotationSummary = {
  totalCount: 0,
  draftCount: 0,
  pendingApprovalCount: 0,
  approvedCount: 0,
  convertedCount: 0,
  rejectedCount: 0,
  expiredCount: 0,
  totalPipelineValue: 0,
};

export function useQuotations(initialFilters?: QuotationFilters) {
  const { currentUser } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [summary, setSummary] = useState<QuotationSummary>(EMPTY_SUMMARY);
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
      const userContext = {
        userId: currentUser.id,
        role: currentUser.role,
        areaId: currentUser.areaId,
      };
      const [res, summaryRes] = await Promise.all([
        quotationService.listQuotations(filters, userContext),
        quotationService.getQuotationSummary(filters, userContext),
      ]);
      setQuotations(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSummary(summaryRes);
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
  ): Promise<SalesOrder> => {
    const order = await orderService.convertQuotationToOrder(id, currentUser, details);
    await fetchQuotations();
    return order;
  };

  const issueQuotation = async (id: string): Promise<Quotation> => {
    const issued = await quotationService.issueQuotation(id, currentUser);
    await fetchQuotations();
    return issued;
  };

  return {
    quotations,
    summary,
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
