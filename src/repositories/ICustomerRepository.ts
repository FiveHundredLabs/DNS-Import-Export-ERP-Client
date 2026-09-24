import { Customer, CommercialTerms, CustomerApprovalStage } from '../types/customer';
import { PaginatedResult, PaginationParams } from '../types/common';

export interface CustomerFilters extends PaginationParams {
  type?: string;
  areaId?: string;
  assignedRepId?: string;
  approvalStage?: CustomerApprovalStage;
  status?: string;
}

export interface ICustomerRepository {
  getAll(filters?: CustomerFilters): Promise<PaginatedResult<Customer>>;
  getById(id: string): Promise<Customer | null>;
  create(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'>): Promise<Customer>;
  update(id: string, updates: Partial<Customer>): Promise<Customer>;
  updateCommercialTerms(id: string, terms: CommercialTerms): Promise<Customer>;
  updateApprovalStage(id: string, stage: CustomerApprovalStage): Promise<Customer>;
}
