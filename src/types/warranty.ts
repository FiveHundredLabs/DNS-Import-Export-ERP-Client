import { BaseEntity } from './common';

export type WarrantySaleType = 'SHOWROOM' | 'DEALER';
export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'CLAIMED';
export type ClaimStatus =
  | 'SUBMITTED'
  | 'IN_INSPECTION'
  | 'APPROVED'
  | 'REPLACED'
  | 'REPAIRED'
  | 'REJECTED';
export type ClaimResolutionType = 'REPLACE' | 'REPAIR' | 'REJECT';

export interface WarrantyRecord extends BaseEntity {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  sku: string;
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
