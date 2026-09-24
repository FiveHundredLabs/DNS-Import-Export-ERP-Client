import { SalesOrder, OrderFilters, OrderUserContext } from '../types/order';
import { PaginatedResult } from '../types/common';

export interface ISalesOrderRepository {
  getAll(
    filters?: OrderFilters,
    userContext?: OrderUserContext
  ): Promise<PaginatedResult<SalesOrder>>;
  getById(id: string): Promise<SalesOrder | null>;
  create(order: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesOrder>;
  update(id: string, updates: Partial<SalesOrder>): Promise<SalesOrder>;
  delete(id: string): Promise<boolean>;
}
