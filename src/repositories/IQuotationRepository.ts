import { Quotation, QuotationFilters, QuotationSummary } from '../types/quotation';
import { PaginatedResult } from '../types/common';
import { UserRole } from '../types/auth';

export interface QuotationUserContext {
  userId: string;
  role: UserRole;
  areaId?: string;
}

export interface IQuotationRepository {
  getAll(
    filters?: QuotationFilters,
    userContext?: QuotationUserContext
  ): Promise<PaginatedResult<Quotation>>;
  getSummary(
    filters?: QuotationFilters,
    userContext?: QuotationUserContext
  ): Promise<QuotationSummary>;
  getById(id: string): Promise<Quotation | null>;
  create(
    data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Quotation>;
  update(id: string, updates: Partial<Quotation>): Promise<Quotation>;
  delete(id: string): Promise<boolean>;
}
