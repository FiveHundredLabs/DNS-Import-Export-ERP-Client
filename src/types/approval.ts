import { BaseEntity } from './common';
import { UserRole } from './auth';

export type ApprovalDocumentType =
  | 'CUSTOMER_CREATION'
  | 'PRODUCT_PRICE_CHANGE'
  | 'QUOTATION_DISCOUNT'
  | 'SPECIAL_SALES_ORDER'
  | 'GRN_RECEIPT'
  | 'PAYMENT_RECEIPT'
  | 'EXPENSE_CLAIM';

export type ApprovalRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED';

export type ApprovalActionType = 'APPROVE' | 'REJECT' | 'ESCALATE';

export interface ApprovalHistoryEntry {
  id: string;
  stepNumber: number;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: ApprovalActionType;
  fromStatus: string;
  toStatus: string;
  comment: string;
  timestamp: string;
}

export interface ApprovalRequest extends BaseEntity {
  documentType: ApprovalDocumentType;
  documentId: string;
  documentReferenceNumber: string;
  title: string;
  description: string;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: UserRole;
  currentApproverRole: UserRole;
  targetApproverRole?: UserRole;
  isSpecialScenario: boolean;
  specialReason?: string;
  status: ApprovalRequestStatus;
  history: ApprovalHistoryEntry[];
}
