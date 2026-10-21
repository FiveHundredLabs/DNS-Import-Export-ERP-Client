import { Customer, CustomerLoyaltyLevel } from '../types/customer';
import { Product } from '../types/product';
import { User, UserRole } from '../types/auth';
import { approvalService, ApprovalService } from './ApprovalService';
import {
  getProductDiscountLevels,
  getAllowedDiscountLevels,
  getMaxAllowedDiscount,
  evaluateCustomerProductDiscount,
  normalizeCustomerLoyaltyLevel,
  calculateLineTotal,
  DiscountEvaluationResult,
  DiscountStatus,
} from '../rules/discountRules';

export interface DiscountApprovalRecord {
  id: string;
  documentType: 'QUOTATION' | 'ORDER' | 'INVOICE';
  documentId: string;
  documentReferenceNumber: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  customerLoyaltyLevel: CustomerLoyaltyLevel;
  requestedDiscountPercentage: number;
  allowedDiscountPercentage: number;
  requestedById: string;
  requestedByName: string;
  requestedByUserName?: string;
  requestedAt: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedById?: string;
  approvedByName?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  approvalNote?: string;
  rejectionReason?: string;
}

export class DiscountRuleService {
  private approvalSvc: ApprovalService;
  private approvalRecords: Map<string, DiscountApprovalRecord> = new Map();

  constructor(approvalSvc?: ApprovalService) {
    this.approvalSvc = approvalSvc || approvalService;
  }

  /**
   * Get configured discount levels for a product (0 to 3 levels, ordered lowest to highest)
   */
  getProductDiscountLevels(product?: Partial<Product> | null): number[] {
    return getProductDiscountLevels(product);
  }

  /**
   * Determine available discount levels for a customer based on loyalty level
   */
  getAllowedDiscounts(
    product?: Partial<Product> | null,
    customer?: Partial<Customer> | null
  ): number[] {
    return getAllowedDiscountLevels(product, customer);
  }

  /**
   * Determine maximum allowed discount without approval
   */
  getMaxAllowedDiscount(
    product?: Partial<Product> | null,
    customer?: Partial<Customer> | null
  ): number {
    return getMaxAllowedDiscount(product, customer);
  }

  /**
   * Central evaluation of requested discount on an item
   */
  evaluateItemDiscount(params: {
    product?: Partial<Product> | null;
    customer?: Partial<Customer> | null;
    requestedDiscountPercentage: number;
    existingApprovalStatus?: 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    userRole?: UserRole;
  }): DiscountEvaluationResult {
    return evaluateCustomerProductDiscount(params);
  }

  /**
   * Validates all items in a transaction (Quotation, Sales Order, Invoice)
   */
  validateDocumentDiscounts(
    customer: Partial<Customer> | null,
    items: Array<{
      product: Partial<Product>;
      discountPercentage: number;
      existingApprovalStatus?: 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    }>,
    userRole?: UserRole
  ): {
    hasDiscountRequiringApproval: boolean;
    hasRejectedDiscounts: boolean;
    evaluations: DiscountEvaluationResult[];
    summaryMessage?: string;
  } {
    let hasDiscountRequiringApproval = false;
    let hasRejectedDiscounts = false;
    const evaluations: DiscountEvaluationResult[] = [];
    const reasons: string[] = [];

    for (const item of items) {
      const evaluation = evaluateCustomerProductDiscount({
        product: item.product,
        customer,
        requestedDiscountPercentage: item.discountPercentage,
        existingApprovalStatus: item.existingApprovalStatus,
        userRole,
      });

      evaluations.push(evaluation);

      if (item.existingApprovalStatus === 'REJECTED') {
        hasRejectedDiscounts = true;
        reasons.push(`Discount on "${item.product.name}" was Rejected.`);
      } else if (evaluation.requiresApproval) {
        hasDiscountRequiringApproval = true;
        reasons.push(evaluation.reason);
      }
    }

    return {
      hasDiscountRequiringApproval,
      hasRejectedDiscounts,
      evaluations,
      summaryMessage: reasons.length > 0 ? reasons.join(' | ') : undefined,
    };
  }

  /**
   * Submits a formal Discount Approval Request linked to central ApprovalService
   */
  async submitDiscountApprovalRequest(params: {
    documentType: 'QUOTATION' | 'ORDER' | 'INVOICE';
    documentId: string;
    documentReferenceNumber?: string;
    documentNumber?: string;
    productId: string;
    productName: string;
    customerId: string;
    customerName: string;
    customerLoyaltyLevel: CustomerLoyaltyLevel;
    requestedDiscountPercentage: number;
    allowedDiscountPercentage: number;
    initiator?: User;
    requestedByUserId?: string;
    requestedByUserName?: string;
    requestedByUserRole?: UserRole;
    note?: string;
  }): Promise<DiscountApprovalRecord> {
    const recordId = `dar-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const docRef = params.documentReferenceNumber || params.documentNumber || params.documentId;
    const requestedById = params.initiator?.id || params.requestedByUserId || 'system';
    const requestedByName = params.initiator?.name || params.requestedByUserName || 'System User';
    const requestedByRole = params.initiator?.role || params.requestedByUserRole || 'SALES_REP';

    const record: DiscountApprovalRecord = {
      id: recordId,
      documentType: params.documentType,
      documentId: params.documentId,
      documentReferenceNumber: docRef,
      productId: params.productId,
      productName: params.productName,
      customerId: params.customerId,
      customerName: params.customerName,
      customerLoyaltyLevel: params.customerLoyaltyLevel,
      requestedDiscountPercentage: params.requestedDiscountPercentage,
      allowedDiscountPercentage: params.allowedDiscountPercentage,
      requestedById,
      requestedByName,
      requestedAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL',
      approvalNote: params.note,
    };

    this.approvalRecords.set(recordId, record);

    // Register with central ApprovalService
    try {
      await this.approvalSvc.createApprovalRequest({
        documentType:
          params.documentType === 'QUOTATION'
            ? 'QUOTATION_DISCOUNT'
            : params.documentType === 'ORDER'
            ? 'SPECIAL_SALES_ORDER'
            : 'QUOTATION_DISCOUNT',
        documentId: params.documentId,
        documentReferenceNumber: docRef,
        title: `Discount Approval Request: ${params.requestedDiscountPercentage}% on ${params.productName}`,
        description: `Customer "${params.customerName}" (${params.customerLoyaltyLevel} Loyalty) permitted up to ${params.allowedDiscountPercentage}%. Requested discount: ${params.requestedDiscountPercentage}%.`,
        initiatorId: requestedById,
        initiatorName: requestedByName,
        initiatorRole: requestedByRole,
        currentApproverRole: 'SALES_MANAGER',
        targetApproverRole: params.requestedDiscountPercentage > 15 ? 'DIRECTOR' : 'SALES_MANAGER',
        isSpecialScenario: true,
        specialReason: `Discount ${params.requestedDiscountPercentage}% exceeds permitted ${params.allowedDiscountPercentage}%.`,
        status: 'PENDING',
        history: [
          {
            id: `h-disc-${Date.now()}`,
            stepNumber: 1,
            actorId: requestedById,
            actorName: requestedByName,
            actorRole: requestedByRole,
            action: 'APPROVE',
            fromStatus: 'DRAFT',
            toStatus: 'PENDING',
            comment: params.note || 'Submitted for management discount approval.',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (e) {
      console.warn('Could not register discount approval with ApprovalService:', e);
    }

    return record;
  }

  /**
   * Approves a discount request (Manager / Director only)
   */
  approveDiscount(
    recordId: string,
    approver: User | string,
    approverNameOrNote?: string,
    note?: string
  ): DiscountApprovalRecord | null {
    const record = this.approvalRecords.get(recordId);
    if (!record) return null;

    let approverId: string;
    let approverName: string;
    let approvalNote: string | undefined;

    if (typeof approver === 'object' && approver !== null) {
      approverId = approver.id;
      approverName = approver.name;
      approvalNote = approverNameOrNote;
    } else {
      approverId = approver;
      approverName = approverNameOrNote || 'Manager';
      approvalNote = note;
    }

    record.status = 'APPROVED';
    record.approvedById = approverId;
    record.approvedByName = approverName;
    record.approvedByUserName = approverName;
    record.approvedAt = new Date().toISOString();
    record.approvalNote = approvalNote || record.approvalNote || 'Discount Approved by Management';

    return record;
  }

  /**
   * Rejects a discount request
   */
  rejectDiscount(
    recordId: string,
    rejecter: User | string,
    rejecterNameOrReason?: string,
    reason?: string
  ): DiscountApprovalRecord | null {
    const record = this.approvalRecords.get(recordId);
    if (!record) return null;

    let rejecterId: string;
    let rejecterName: string;
    let rejectionReason: string | undefined;

    if (typeof rejecter === 'object' && rejecter !== null) {
      rejecterId = rejecter.id;
      rejecterName = rejecter.name;
      rejectionReason = rejecterNameOrReason;
    } else {
      rejecterId = rejecter;
      rejecterName = rejecterNameOrReason || 'Manager';
      rejectionReason = reason;
    }

    record.status = 'REJECTED';
    record.approvedById = rejecterId;
    record.approvedByName = rejecterName;
    record.approvedByUserName = rejecterName;
    record.approvedAt = new Date().toISOString();
    record.rejectionReason = rejectionReason || 'Discount Rejected by Management';

    return record;
  }

  getApprovalRecord(recordId: string): DiscountApprovalRecord | undefined {
    return this.approvalRecords.get(recordId);
  }

  calculateTotals(
    unitPrice: number,
    quantity: number,
    discountPercentage: number,
    taxRatePercentage: number = 0
  ) {
    return calculateLineTotal(unitPrice, quantity, discountPercentage, taxRatePercentage);
  }
}

export const discountRuleService = new DiscountRuleService();
