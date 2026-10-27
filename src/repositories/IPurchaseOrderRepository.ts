import { PurchaseOrder, PurchaseOrderFilter } from '../types/purchasing';

export interface IPurchaseOrderRepository {
  getAll(filters?: PurchaseOrderFilter): Promise<PurchaseOrder[]>;
  getById(id: string): Promise<PurchaseOrder | null>;
  getByPONumber(poNumber: string): Promise<PurchaseOrder | null>;
  create(po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<PurchaseOrder>;
  update(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder>;
  delete(id: string): Promise<boolean>;
  getNextPONumber(): Promise<string>;
}
