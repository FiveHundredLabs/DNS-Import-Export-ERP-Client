import { BaseEntity } from './common';

export type CustomerType = 'DEALER' | 'SHOWROOM' | 'DIRECT';

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type CustomerApprovalStage =
  | 'DRAFT'
  | 'PENDING_SALES_REVIEW'
  | 'PENDING_MANAGER_APPROVAL'
  | 'PENDING_DIRECTOR_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export interface CommercialTerms {
  creditLimit: number;
  creditDays: number;
  defaultDiscountPercentage: number;
  maxDiscountPercentage: number;
  paymentTermNotes?: string;
}

export interface CustomerFinancials {
  totalOutstanding: number;
  currentDue: number;
  nearDue: number; // Due within 7 days
  overdue: number; // Past credit days
  availableCredit: number; // creditLimit - totalOutstanding
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

export type CustomerLoyaltyLevel = 'NEW' | 'PREMIUM' | 'PLATINUM';

export interface Customer extends BaseEntity {
  code: string;
  name: string; // Display Name (required)
  companyName?: string; // Company Name (optional)
  type: CustomerType;
  areaId: string;
  areaName: string;
  assignedRepId: string;
  assignedRepName: string;
  contactPerson: string;
  phone: string; // Primary Phone Number (required)
  whatsappNumber?: string; // WhatsApp Number (optional)
  secondaryPhone?: string; // Secondary Phone / Landline (optional)
  email: string;
  address: string;
  deliveryAddress?: string;
  businessRegistrationNumber?: string;
  taxNumber?: string; // TIN Number (optional)
  vatNumber?: string; // VAT Number (optional)
  commercialTerms: CommercialTerms;
  financials: CustomerFinancials;
  approvalStage: CustomerApprovalStage;
  status: CustomerStatus;
  loyaltyTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  loyaltyLevel?: CustomerLoyaltyLevel;
  warrantyNotesExpected: number;
  warrantyNotesReceived: number;
}
