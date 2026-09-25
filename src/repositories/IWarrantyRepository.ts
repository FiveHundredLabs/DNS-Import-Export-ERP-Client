import {
  WarrantyRecord,
  WarrantyClaim,
  ShopWarrantyFollowUp,
  WarrantyFilters,
  ClaimFilters,
} from '../types/warranty';
import { PaginatedResult } from '../types/common';

export interface IWarrantyRepository {
  // Warranty Records
  getAllRecords(filters?: WarrantyFilters): Promise<PaginatedResult<WarrantyRecord>>;
  getRecordById(id: string): Promise<WarrantyRecord | null>;
  getRecordsByInvoiceId(invoiceId: string): Promise<WarrantyRecord[]>;
  getRecordsByCustomerId(customerId: string): Promise<WarrantyRecord[]>;
  createRecord(record: Omit<WarrantyRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<WarrantyRecord>;
  updateRecord(id: string, updates: Partial<WarrantyRecord>): Promise<WarrantyRecord>;

  // Warranty Claims
  getAllClaims(filters?: ClaimFilters): Promise<PaginatedResult<WarrantyClaim>>;
  getClaimById(id: string): Promise<WarrantyClaim | null>;
  getClaimsByCustomerId(customerId: string): Promise<WarrantyClaim[]>;
  getClaimsByRecordId(warrantyRecordId: string): Promise<WarrantyClaim[]>;
  createClaim(claim: Omit<WarrantyClaim, 'id' | 'createdAt' | 'updatedAt'>): Promise<WarrantyClaim>;
  updateClaim(id: string, updates: Partial<WarrantyClaim>): Promise<WarrantyClaim>;

  // Shop Follow-ups
  getFollowUps(salesRepId?: string): Promise<ShopWarrantyFollowUp[]>;
  getFollowUpByCustomerId(customerId: string): Promise<ShopWarrantyFollowUp | null>;
  saveFollowUp(followUp: ShopWarrantyFollowUp): Promise<ShopWarrantyFollowUp>;
}
