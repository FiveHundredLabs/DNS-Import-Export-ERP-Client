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

export interface Customer extends BaseEntity {
  code: string;
  name: string;
  type: CustomerType;
  areaId: string;
  areaName: string;
  assignedRepId: string;
  assignedRepName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  deliveryAddress?: string;
  businessRegistrationNumber?: string;
  taxNumber?: string;
  commercialTerms: CommercialTerms;
  financials: CustomerFinancials;
  approvalStage: CustomerApprovalStage;
  status: CustomerStatus;
  loyaltyTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  warrantyNotesExpected: number;
  warrantyNotesReceived: number;
}
