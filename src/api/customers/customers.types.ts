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

export type CustomerLoyaltyLevel = 'NEW' | 'PREMIUM' | 'PLATINUM';

export type CustomerType = 'DEALER' | 'SHOWROOM' | 'DIRECT';

export interface Customer {
  id: string;
  customerCode: string | null;
  contactPerson: string;
  companyName: string;
  displayName: string;
  email: string;
  whatsappNumber?: string | null;
  primaryContactNumber: string;
  secondaryContactNumber?: string | null;
  registrationAddress: string;
  areaId?: string | null;
  areaManagerId?: string | null;
  salesRepId?: string | null;
  loyaltyLevel: CustomerLoyaltyLevel;
  status: CustomerStatus;
  tinNumber?: string | null;
  vatNumber?: string | null;
  creditPeriod?: number | null;
  creditLimit?: number | string | null;
  customerType: CustomerType;
  approvalStage: CustomerApprovalStage;
  paymentTermNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // Joined relations from backend
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

export interface CreateCustomerStep1Payload {
  contactPerson: string;
  companyName: string;
  displayName: string;
  email: string;
  whatsappNumber: string;
  primaryContactNumber: string;
  secondaryContactNumber?: string;
  registrationAddress: string;
  tinNumber?: string;
  vatNumber?: string;
  customerType?: CustomerType;
}

export interface CompleteCustomerStep2Payload {
  areaId: string;
  areaManagerId: string;
  salesRepId: string;
  loyaltyLevel: CustomerLoyaltyLevel;
  creditPeriod?: number;
  creditLimit?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'REJECT';
}

export interface UpdateCommercialTermsPayload {
  creditPeriod?: number;
  creditLimit?: number;
  paymentTermNotes?: string;
}

export interface CustomerApprovalActionPayload {
  comments?: string;
}

export interface UpdateCustomerStatusPayload {
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  reason?: string;
}

export interface ListCustomersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
  areaId?: string;
  salesRepId?: string;
  areaManagerId?: string;
  approvalStage?: CustomerApprovalStage;
  loyaltyLevel?: CustomerLoyaltyLevel;
  sortBy?: 'companyName' | 'displayName' | 'customerCode' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedCustomersResponse {
  data: Customer[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
