import { IQuotationRepository, QuotationUserContext } from '../IQuotationRepository';
import { Quotation, QuotationFilters } from '../../types/quotation';
import { PaginatedResult } from '../../types/common';
import { MOCK_QUOTATIONS } from '../../mock/mockQuotations';

export class MockQuotationRepository implements IQuotationRepository {
  private quotations: Quotation[] = [...MOCK_QUOTATIONS];

  async getAll(
    filters?: QuotationFilters,
    userContext?: QuotationUserContext
  ): Promise<PaginatedResult<Quotation>> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    let filtered = [...this.quotations];

    // 1. Role-based scoping
    if (userContext) {
      if (userContext.role === 'SALES_REP') {
        filtered = filtered.filter((q) => q.salesRepId === userContext.userId);
      }
      // Note: AREA_MANAGER / SALES_MANAGER / MANAGER / DIRECTOR have wide/appropriate visibility
    }

    // 2. Status filtering
    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((q) => q.status === filters.status);
    }

    // 3. Customer filtering
    if (filters?.customerId) {
      filtered = filtered.filter((q) => q.customerId === filters.customerId);
    }

    // 4. Sales rep filtering
    if (filters?.salesRepId) {
      filtered = filtered.filter((q) => q.salesRepId === filters.salesRepId);
    }

    // 5. Search text filtering
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.quotationNumber.toLowerCase().includes(q) ||
          item.customerNameSnapshot.toLowerCase().includes(q) ||
          item.customerCodeSnapshot.toLowerCase().includes(q) ||
          item.salesRepNameSnapshot.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    // 6. Date sorting
    const sortAsc = filters?.sortByDate === 'asc';
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

    // 7. Pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated.map((item) => JSON.parse(JSON.stringify(item))),
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize) || 1,
    };
  }

  async getById(id: string): Promise<Quotation | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = this.quotations.find((q) => q.id === id || q.quotationNumber === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async create(
    data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Quotation> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const nextId = `qt-${Date.now().toString().slice(-6)}`;
    const quotationNumber =
      data.quotationNumber ||
      `QT-${new Date().getFullYear()}-${String(this.quotations.length + 1).padStart(3, '0')}`;

    const newQuotation: Quotation = {
      ...data,
      id: nextId,
      quotationNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.quotations.unshift(newQuotation);
    return JSON.parse(JSON.stringify(newQuotation));
  }

  async update(id: string, updates: Partial<Quotation>): Promise<Quotation> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const index = this.quotations.findIndex((q) => q.id === id);
    if (index === -1) {
      throw new Error(`Quotation not found: ${id}`);
    }

    const updated: Quotation = {
      ...this.quotations[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.quotations[index] = updated;
    return JSON.parse(JSON.stringify(updated));
  }

  async delete(id: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const index = this.quotations.findIndex((q) => q.id === id);
    if (index === -1) return false;
    this.quotations.splice(index, 1);
    return true;
  }
}
