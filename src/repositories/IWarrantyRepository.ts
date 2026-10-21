import {
  WarrantyRecord,
  WarrantyClaim,
  ShopWarrantyFollowUp,
  WarrantyFilters,
  ClaimFilters,
  WarrantyNote,
  WarrantyNoteFilters,
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

  // Distributor Warranty Notes
  getAllWarrantyNotes(filters?: WarrantyNoteFilters): Promise<PaginatedResult<WarrantyNote>>;
  getWarrantyNoteById(id: string): Promise<WarrantyNote | null>;
  getWarrantyNoteByRecordId(warrantyRecordId: string): Promise<WarrantyNote | null>;
  getWarrantyNotesByDistributorId(distributorId: string): Promise<WarrantyNote[]>;
  createWarrantyNote(note: Omit<WarrantyNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<WarrantyNote>;
  updateWarrantyNote(id: string, updates: Partial<WarrantyNote>): Promise<WarrantyNote>;

  // Shop Follow-ups
  getFollowUps(salesRepId?: string): Promise<ShopWarrantyFollowUp[]>;
  getFollowUpByCustomerId(customerId: string): Promise<ShopWarrantyFollowUp | null>;
  saveFollowUp(followUp: ShopWarrantyFollowUp): Promise<ShopWarrantyFollowUp>;
}

