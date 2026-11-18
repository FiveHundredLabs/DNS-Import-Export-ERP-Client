import { BaseEntity } from './common';

export type CustomerType = 'DEALER' | 'SHOWROOM' | 'DIRECT';

export type CustomerStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'REJECT';

export type CustomerApprovalStage =
  | 'DRAFT'
  | 'PENDING_SALES_REVIEW'
  | 'PENDING_MANAGER_APPROVAL'
  | 'PENDING_DIRECTOR_APPROVAL'
  | 'APPROVED'
  | 'REJECT';

export interface CommercialTerms {
  creditLimit: number;
  creditDays: number;
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
  // Primary backend field names
  customerCode?: string | null;
  displayName: string;
  primaryContactNumber: string;
  secondaryContactNumber?: string | null;
  registrationAddress: string;
  customerType: CustomerType;
  areaManagerId?: string | null;

  // Backward compatibility fields during transition
  code: string;
  name: string; // Alias of displayName
  companyName?: string;
  type: CustomerType; // Alias of customerType
  areaId: string;
  areaName?: string;
  assignedRepId?: string;
  assignedRepName?: string;
  salesRepId?: string | null;
  contactPerson: string;
  phone: string; // Alias of primaryContactNumber
  whatsappNumber?: string;
  secondaryPhone?: string;
  email: string;
  address: string; // Alias of registrationAddress
  deliveryAddress?: string;
  businessRegistrationNumber?: string;
  taxNumber?: string; // TIN Number (optional)
  tinNumber?: string | null;
  vatNumber?: string | null;
  creditPeriod?: number | null;
  creditLimit?: number | string | null;
  commercialTerms?: CommercialTerms;
  financials?: CustomerFinancials;
  approvalStage: CustomerApprovalStage;
  status: CustomerStatus;
  loyaltyTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  loyaltyLevel?: CustomerLoyaltyLevel;
  paymentTermNotes?: string | null;

  // Relations
  area?: {
    id: string;
    areaCode?: string;
    areaName: string;
  } | null;
  areaManager?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  salesRep?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}
