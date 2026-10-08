import { BaseEntity } from './common';

export type WarrantySaleType = 'SHOWROOM' | 'DEALER';
export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'CLAIMED';
export type WarrantyNoteStatus = 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
export type ClaimStatus =
  | 'SUBMITTED'
  | 'IN_INSPECTION'
  | 'APPROVED'
  | 'REPLACED'
  | 'REPAIRED'
  | 'REJECTED';
export type ClaimResolutionType = 'REPLACE' | 'REPAIR' | 'REJECT';

export interface WarrantyNote extends BaseEntity {
  noteNumber: string; // Distributor warranty card / note number
  warrantyRecordId: string;
  invoiceId: string;
  invoiceNumber: string;
  distributorId: string;
  distributorName: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string; // Unique barcode assigned to this specific individual unit
  serialNumber: string;
  distributorSaleDate: string; // Date distributor sold unit to end-customer (YYYY-MM-DD)
  receivedDate: string; // Date DNS ERP received the warranty note (YYYY-MM-DD)
  endCustomerName?: string;
  endCustomerPhone?: string;
  status: WarrantyNoteStatus; // 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED'
  reviewNotes?: string;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  enteredByUserId: string;
  enteredByUserName: string;
}

export interface WarrantyRecord extends BaseEntity {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string; // Unique barcode assigned to this specific individual unit (not product-level)
  serialNumber?: string;
  saleDate: string; // ISO string or YYYY-MM-DD
  warrantyStartDate: string;
  warrantyPeriodMonths: number;
  warrantyExpiryDate: string;
  saleType: WarrantySaleType;
  status: WarrantyStatus;
  dealerSoldDate?: string;
  notesReceived: boolean;
  notesReceivedDate?: string;
  warrantyNoteId?: string;
  warrantyNoteNumber?: string;
  warrantyNoteStatus?: WarrantyNoteStatus;
  endCustomerName?: string;
}

export interface WarrantyClaim extends BaseEntity {
  claimNumber: string;
  warrantyRecordId: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  sku: string;
  serialNumber?: string;
  complaintDate: string;
  complaintReason: string;
  status: ClaimStatus;
  resolutionType?: ClaimResolutionType;
  resolutionNotes?: string;
  inspectedById?: string;
  resolvedById?: string;
  resolvedAt?: string;
  warrantyNoteId?: string;
  warrantyNoteNumber?: string;
  distributorId?: string;
  distributorName?: string;
  endCustomerName?: string;
}

export interface ShopWarrantyFollowUp {
  customerId: string;
  customerName: string;
  totalUnitsSold: number;
  warrantyNotesReceived: number;
  pendingNotesCount: number;
  lastFollowUpDate?: string;
  followUpNotes?: string[];
}

export interface WarrantyFilters {
  status?: WarrantyStatus | 'ALL';
  saleType?: WarrantySaleType | 'ALL';
  customerId?: string;
  productId?: string;
  invoiceId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ClaimFilters {
  status?: ClaimStatus | 'ALL';
  customerId?: string;
  productId?: string;
  warrantyRecordId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface WarrantyNoteFilters {
  status?: WarrantyNoteStatus | 'ALL';
  distributorId?: string;
  productId?: string;
  warrantyRecordId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface RecordWarrantyNoteDTO {
  warrantyRecordId: string;
  noteNumber?: string;
  barcode?: string;
  distributorSaleDate: string;
  receivedDate?: string;
  endCustomerName?: string;
  endCustomerPhone?: string;
  serialNumber?: string;
  reviewNotes?: string;
  verifyImmediately?: boolean;
}
