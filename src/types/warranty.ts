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
  saleDate: string; // ISO string or YYYY-MM-DD (Distributor invoice date)
  warrantyStartDate: string; // End-customer selling date
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
  endCustomerPhone?: string;
  grnNumber?: string;
  grnDate?: string;
  productCost?: number;
  distributorSupplierName?: string;
  salesRepId?: string;
  salesRepName?: string;
  receiptPhotoUrl?: string;
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
  replacementSerialNumber?: string;
  sparePartsUsed?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost?: number;
  }>;
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

export type UnitWarrantyStatus =
  | 'RECEIVED_VERIFIED'
  | 'RECEIVED_PENDING'
  | 'MISSING_CONFIRMED'
  | 'IN_DISTRIBUTOR_STOCK';

export interface UnitBarcodeWarrantyDetail {
  id: string;
  barcode: string;
  serialNumber?: string;
  productId: string;
  productName: string;
  sku: string;
  distributorId: string;
  distributorName: string;
  customerCode?: string;
  saleDate: string;
  invoiceNumber: string;
  orderNumber?: string;
  warrantyStatus: UnitWarrantyStatus;
  statusLabel: string;
  warrantyNoteId?: string;
  warrantyNoteNumber?: string;
  warrantyNoteReceivedDate?: string;
  endCustomerSaleDate?: string;
  endCustomerName?: string;
  endCustomerPhone?: string;
  warrantyPeriodMonths: number;
  warrantyExpiryDate?: string;
}

export interface DistributorWarrantySummary {
  distributorId: string;
  distributorName: string;
  customerCode: string;
  phone?: string;
  address?: string;
  assignedRepId?: string;
  assignedRepName?: string;
  totalUnitsSold: number;
  warrantyNotesReceived: number;
  pendingNotesCount: number;
  confirmedMissingCount: number;
  unaccountedInStockCount: number;
  collectionProgress: number;
  lastSubmissionDate?: string;
  hasOutstandingNotes: boolean;
}

export interface SalesRepWarrantySummary {
  salesRepId: string;
  salesRepName: string;
  totalUnitsSold: number;
  warrantyNotesReceived: number;
  pendingNotesCount: number;
  confirmedMissingCount: number;
  unaccountedInStockCount: number;
  collectionProgress: number;
  distributorsCount: number;
  distributorsWithOutstandingNotes: number;
}

export interface ProductBarcodeDossier {
  barcode: string;
  serialNumber?: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName?: string;
  productCost: number;
  sellingPrice?: number;
  defaultWarrantyPeriodMonths: number;
  supplierId?: string;
  supplierName?: string;
  grnId?: string;
  grnNumber?: string;
  grnDate?: string;
  distributorInvoiceId?: string;
  distributorInvoiceNumber?: string;
  distributorInvoiceDate?: string;
  salesRepId?: string;
  salesRepName?: string;
  distributorId?: string;
  distributorName?: string;
  distributorCode?: string;
  isRegistered: boolean;
  warrantyRecordId?: string;
  endCustomerSellingDate?: string;
  warrantyStartDate?: string;
  warrantyPeriodMonths?: number;
  warrantyExpiryDate?: string;
  warrantyStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_REGISTERED';
  remainingPeriodText?: string;
  receiptPhotoUrl?: string;
  endCustomerName?: string;
  endCustomerPhone?: string;
  canRegister: boolean;
  canClaim: boolean;
  isExpired: boolean;
  claimBlockReason?: string;
}

export interface RegisterEndCustomerWarrantyDTO {
  barcode: string;
  sellingDate: string;
  customerId: string;
  customerName?: string;
  warrantyPeriodMonths: number;
  endCustomerName?: string;
  endCustomerPhone?: string;
  receiptPhotoUrl?: string;
  notes?: string;
}

export interface CustomerWarrantyTallyItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  serialNumber?: string;
  quantity: number;
  unit: string;
  invoiceNumber: string;
  invoiceDate: string;
  sellingDate?: string;
  isRegistered: boolean;
  hasNoteReceipt: boolean;
  receiptPhotoUrl?: string;
  warrantyStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_REGISTERED';
  warrantyExpiryDate?: string;
  remainingPeriodText?: string;
}

export interface CustomerWarrantyTally {
  customerId: string;
  customerName: string;
  customerCode: string;
  assignedRepId?: string;
  assignedRepName?: string;
  totalSupplied: number;
  registeredCount: number;
  pendingCount: number;
  items: CustomerWarrantyTallyItem[];
}

