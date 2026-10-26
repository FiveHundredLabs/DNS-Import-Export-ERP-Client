import { IQuotationRepository, QuotationUserContext } from '../repositories/IQuotationRepository';
import { MockQuotationRepository } from '../repositories/mock/MockQuotationRepository';
import {
  Quotation,
  QuotationFilters,
  CreateQuotationInput,
  UpdateQuotationInput,
  QuotationItem,
  ConvertedOrderPayload,
} from '../types/quotation';
import { Customer } from '../types/customer';
import { Product } from '../types/product';
import { User, UserRole } from '../types/auth';
import { PaginatedResult } from '../types/common';
import { productService, ProductService } from './ProductService';
import { customerService, CustomerService } from './CustomerService';
import { approvalService, ApprovalService } from './ApprovalService';
import { taxService, TaxService } from './TaxService';
import { evaluateDiscount } from '../rules/discountRules';
import { generateOrderNumber } from '../rules/orderRules';

export class QuotationService {
  private repo: IQuotationRepository;
  private productSvc: ProductService;
  private customerSvc: CustomerService;
  private approvalSvc: ApprovalService;
  private taxSvc: TaxService;

  constructor(
    repo?: IQuotationRepository,
    productSvc?: ProductService,
    customerSvc?: CustomerService,
    approvalSvc?: ApprovalService,
    taxSvc?: TaxService
  ) {
    this.repo = repo || new MockQuotationRepository();
    this.productSvc = productSvc || productService;
    this.customerSvc = customerSvc || customerService;
    this.approvalSvc = approvalSvc || approvalService;
    this.taxSvc = taxSvc || taxService;

    // Listen to approvals engine actions so that approving in ApprovalsPage updates quotation
    this.approvalSvc.onAction(async (request, action, actorRole, comment) => {
      if (request.documentType === 'QUOTATION_DISCOUNT' && request.documentId) {
        try {
          const quotation = await this.repo.getById(request.documentId);
          if (quotation && quotation.status === 'PENDING_APPROVAL') {
            if (action === 'APPROVE') {
              await this.repo.update(quotation.id, {
                status: 'APPROVED',
                approvedById: request.initiatorId,
                approvedByName: `${actorRole} Approval`,
                approvedAt: new Date().toISOString(),
              });
            } else if (action === 'REJECT') {
              await this.repo.update(quotation.id, {
                status: 'REJECTED',
                rejectedById: request.initiatorId,
                rejectedByName: `${actorRole} Rejection`,
                rejectedAt: new Date().toISOString(),
                rejectionReason: comment,
              });
            }
          }
        } catch (err) {
          console.error('Error synchronizing approval action to quotation:', err);
        }
      }
    });
  }

  async listQuotations(
    filters?: QuotationFilters,
    userContext?: QuotationUserContext
  ): Promise<PaginatedResult<Quotation>> {
    return this.repo.getAll(filters, userContext);
  }

  async getQuotationById(id: string): Promise<Quotation | null> {
    return this.repo.getById(id);
  }

  /**
   * Helper to build a historical snapshot of a line item with standard pricing,
   * discount evaluation against rep and customer limits, and tax calculations.
   */
  async buildLineItemSnapshot(
    productId: string,
    quantity: number,
    requestedDiscountPercentage: number = 0,
    customer: Customer,
    userRole: UserRole = 'SALES_REP',
    customTaxRate?: number
  ): Promise<QuotationItem> {
    if (quantity <= 0) {
      throw new Error(`Quantity must be greater than zero for product ${productId}`);
    }

    const product = await this.productSvc.getProduct(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Role-based rep discount authority: Rep = 5%, Managers/Directors = 15%
    const repAuthority = userRole === 'SALES_REP' ? 5 : 15;

    // Evaluate discount against central business rules
    const discountEval = evaluateDiscount({
      requestedDiscountPercentage,
      repMaxDiscountPercentage: repAuthority,
      customerMaxDiscountPercentage: customer.commercialTerms?.maxDiscountPercentage || 12,
      productMaxDiscountPercentage: product.pricing.maxDiscountPercentage || 15,
      isPromotional: product.isPromotional,
      promotionalDiscountPercentage: product.pricing.promotionalDiscountPercentage,
      product,
      customer,
    });

    if (!discountEval.isValid) {
      throw new Error(discountEval.reason || `Invalid discount: ${requestedDiscountPercentage}%`);
    }

    const unitPriceSnapshot = product.pricing.currentSellingPrice;
    const subtotal = Number((unitPriceSnapshot * quantity).toFixed(2));
    const discountAmount = Number(((subtotal * requestedDiscountPercentage) / 100).toFixed(2));
    const netAfterDiscount = Number((subtotal - discountAmount).toFixed(2));

    // Global Tax Configuration enforcement
    const taxConfig = this.taxSvc.getTaxConfig();
    const taxPercentage =
      customTaxRate !== undefined
        ? customTaxRate
        : taxConfig.taxEnabled
        ? taxConfig.taxRate
        : 0;

    const taxAmount = Number(((netAfterDiscount * taxPercentage) / 100).toFixed(2));
    const lineTotal = Number((netAfterDiscount + taxAmount).toFixed(2));

    return {
      id: `qti-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      skuSnapshot: product.sku,
      productNameSnapshot: product.name,
      uomSnapshot: product.uomCode,
      unitPriceSnapshot,
      quantity,
      discountPercentage: requestedDiscountPercentage,
      discountAmount,
      taxPercentage,
      taxAmount,
      lineTotal,
      requiresApproval: discountEval.requiresSpecialApproval,
      approvalReason: discountEval.reason,
      discountApprovalStatus: discountEval.requiresSpecialApproval
        ? 'PENDING_APPROVAL'
        : 'NOT_REQUIRED',
      discountAllowedPercentage: discountEval.allowedDiscountPercentage,
    };
  }

  async createQuotation(
    input: CreateQuotationInput,
    currentUser?: User
  ): Promise<Quotation> {
    // 1. Fetch and validate customer
    const customer = await this.customerSvc.getCustomer(input.customerId);
    if (!customer) {
      throw new Error(`Customer not found in Customer Master: ${input.customerId}`);
    }

    const effectiveUser: User = currentUser || {
      id: customer.assignedRepId || input.salesRepId || 'usr-sales-001',
      name: 'Commercial Rep',
      role: 'SALES_REP',
      email: 'rep@dns.com',
      status: 'ACTIVE',
    };

    // 2. Role-based scoping check: Sales Rep can only quote for assigned customers
    if (effectiveUser.role === 'SALES_REP' && customer.assignedRepId && customer.assignedRepId !== effectiveUser.id) {
      throw new Error(
        `Permission Denied: Customer ${customer.name} (${customer.code}) is not assigned to your territory.`
      );
    }

    if (!input.items || input.items.length === 0) {
      throw new Error('A quotation must contain at least one product line item.');
    }

    // 3. Process line items snapshots & check approval requirements
    const taxConfig = this.taxSvc.getTaxConfig();
    const effectiveTaxRate = taxConfig.taxEnabled ? taxConfig.taxRate : 0;
    const snapshotItems: QuotationItem[] = [];
    let quotationRequiresApproval = false;
    const approvalReasons: string[] = [];

    for (const itemInput of input.items) {
      const itemSnapshot = await this.buildLineItemSnapshot(
        itemInput.productId,
        itemInput.quantity,
        itemInput.requestedDiscountPercentage || 0,
        customer,
        effectiveUser.role,
        effectiveTaxRate
      );

      snapshotItems.push(itemSnapshot);

      if (itemSnapshot.requiresApproval) {
        quotationRequiresApproval = true;
        if (itemSnapshot.approvalReason) {
          approvalReasons.push(`${itemSnapshot.productNameSnapshot}: ${itemSnapshot.approvalReason}`);
        }
      }
    }

    // 4. Calculate aggregate totals
    const subtotal = Number(
      snapshotItems.reduce((acc, item) => acc + item.unitPriceSnapshot * item.quantity, 0).toFixed(2)
    );
    const discountAmount = Number(
      snapshotItems.reduce((acc, item) => acc + item.discountAmount, 0).toFixed(2)
    );
    const taxAmount = Number(
      snapshotItems.reduce((acc, item) => acc + item.taxAmount, 0).toFixed(2)
    );
    const totalAmount = Number(
      snapshotItems.reduce((acc, item) => acc + item.lineTotal, 0).toFixed(2)
    );

    // 5. Default validity 30 days
    const validityDate =
      input.validUntil ||
      new Date(Date.now() + (input.validDays || 30) * 86400000).toISOString().split('T')[0];

    // Determine status:
    // If user clicked "Save as Draft", it's DRAFT.
    // Else if quotationRequiresApproval, it becomes PENDING_APPROVAL.
    // Otherwise, direct issue APPROVED.
    let status: Quotation['status'] = 'APPROVED';
    if (input.saveAsDraft) {
      status = 'DRAFT';
    } else if (quotationRequiresApproval) {
      status = 'PENDING_APPROVAL';
    }

    const quotation = await this.repo.create({
      quotationNumber: '', // repo assigns formatted sequence
      customerId: customer.id,
      customerCodeSnapshot: customer.code,
      customerNameSnapshot: customer.name,
      customerPhoneSnapshot: customer.phone,
      customerAddressSnapshot: customer.address,
      salesRepId: effectiveUser.id,
      salesRepNameSnapshot: effectiveUser.name,
      items: snapshotItems,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      taxEnabled: taxConfig.taxEnabled,
      taxRatePercentage: effectiveTaxRate,
      status,
      validUntil: validityDate,
      notes: input.notes,
      termsAndConditions:
        input.termsAndConditions ||
        customer.commercialTerms.paymentTermNotes ||
        'Standard 30 days payment terms upon delivery. Goods warranty as specified per manufacturer guidelines.',
      requiresApproval: quotationRequiresApproval,
      approvalReason: quotationRequiresApproval ? approvalReasons.join('; ') : undefined,
    });

    // 6. If submitted and requires approval, submit an ApprovalRequest to the Approvals Engine
    if (quotation.status === 'PENDING_APPROVAL') {
      const approvalReq = await this.approvalSvc.createApprovalRequest({
        documentType: 'QUOTATION_DISCOUNT',
        documentId: quotation.id,
        documentReferenceNumber: quotation.quotationNumber,
        title: `Discount Approval for ${quotation.customerNameSnapshot}`,
        description: `Quotation ${quotation.quotationNumber} total LKR ${quotation.totalAmount.toLocaleString()} has requested discounts exceeding rep authority limit (5%). Reasons: ${quotation.approvalReason}`,
        initiatorId: effectiveUser.id,
        initiatorName: effectiveUser.name,
        initiatorRole: effectiveUser.role,
        currentApproverRole: 'SALES_MANAGER',
        isSpecialScenario: true,
        specialReason: quotation.approvalReason,
        status: 'PENDING',
        history: [
          {
            id: `hist-${Date.now().toString().slice(-4)}`,
            stepNumber: 1,
            actorId: effectiveUser.id,
            actorName: effectiveUser.name,
            actorRole: effectiveUser.role,
            action: 'APPROVE', // Initiated
            fromStatus: 'DRAFT',
            toStatus: 'PENDING',
            comment: 'Quotation submitted with special discount. Routing to Sales Manager.',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      return await this.repo.update(quotation.id, {
        approvalRequestId: approvalReq.id,
      });
    }

    return quotation;
  }

  async updateQuotation(
    id: string,
    updates: UpdateQuotationInput,
    currentUser: User
  ): Promise<Quotation> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new Error(`Quotation not found: ${id}`);
    }

    if (existing.status !== 'DRAFT') {
      throw new Error(`Only DRAFT quotations can be edited. Current status is ${existing.status}`);
    }

    if (currentUser.role === 'SALES_REP' && existing.salesRepId !== currentUser.id) {
      throw new Error('Permission Denied: You can only edit your own draft quotations.');
    }

    let customer = await this.customerSvc.getCustomer(existing.customerId);
    if (updates.customerId && updates.customerId !== existing.customerId) {
      const newCust = await this.customerSvc.getCustomer(updates.customerId);
      if (newCust) customer = newCust;
    }

    if (!customer) {
      throw new Error('Customer data not found');
    }

    let items = existing.items;
    let requiresApproval = false;
    const approvalReasons: string[] = [];

    const preservedTaxRate =
      existing.taxRatePercentage !== undefined
        ? existing.taxRatePercentage
        : existing.taxEnabled !== undefined
        ? (existing.taxEnabled ? 18 : 0)
        : (existing.taxAmount > 0 ? 18 : 0);
    const preservedTaxEnabled =
      existing.taxEnabled !== undefined
        ? existing.taxEnabled
        : existing.taxAmount > 0;

    if (updates.items && updates.items.length > 0) {
      const snapshotItems: QuotationItem[] = [];
      for (const itemInput of updates.items) {
        const itemSnapshot = await this.buildLineItemSnapshot(
          itemInput.productId,
          itemInput.quantity,
          itemInput.requestedDiscountPercentage || 0,
          customer,
          currentUser.role,
          preservedTaxRate
        );
        snapshotItems.push(itemSnapshot);
        if (itemSnapshot.requiresApproval) {
          requiresApproval = true;
          if (itemSnapshot.approvalReason) {
            approvalReasons.push(`${itemSnapshot.productNameSnapshot}: ${itemSnapshot.approvalReason}`);
          }
        }
      }
      items = snapshotItems;
    }

    const subtotal = Number(
      items.reduce((acc, item) => acc + item.unitPriceSnapshot * item.quantity, 0).toFixed(2)
    );
    const discountAmount = Number(
      items.reduce((acc, item) => acc + item.discountAmount, 0).toFixed(2)
    );
    const taxAmount = Number(
      items.reduce((acc, item) => acc + item.taxAmount, 0).toFixed(2)
    );
    const totalAmount = Number(
      items.reduce((acc, item) => acc + item.lineTotal, 0).toFixed(2)
    );

    let status: Quotation['status'] = 'DRAFT';
    if (!updates.saveAsDraft) {
      status = requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';
    }

    const updated = await this.repo.update(id, {
      customerId: customer.id,
      customerCodeSnapshot: customer.code,
      customerNameSnapshot: customer.name,
      customerPhoneSnapshot: customer.phone,
      customerAddressSnapshot: customer.address,
      items,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      taxEnabled: preservedTaxEnabled,
      taxRatePercentage: preservedTaxRate,
      status,
      validUntil: updates.validUntil || existing.validUntil,
      notes: updates.notes ?? existing.notes,
      termsAndConditions: updates.termsAndConditions ?? existing.termsAndConditions,
      requiresApproval,
      approvalReason: requiresApproval ? approvalReasons.join('; ') : undefined,
    });

    if (status === 'PENDING_APPROVAL') {
      const approvalReq = await this.approvalSvc.createApprovalRequest({
        documentType: 'QUOTATION_DISCOUNT',
        documentId: updated.id,
        documentReferenceNumber: updated.quotationNumber,
        title: `Discount Approval for ${updated.customerNameSnapshot}`,
        description: `Quotation ${updated.quotationNumber} requires approval for discounts. ${updated.approvalReason}`,
        initiatorId: currentUser.id,
        initiatorName: currentUser.name,
        initiatorRole: currentUser.role,
        currentApproverRole: 'SALES_MANAGER',
        isSpecialScenario: true,
        specialReason: updated.approvalReason,
        status: 'PENDING',
        history: [],
      });

      return await this.repo.update(updated.id, {
        approvalRequestId: approvalReq.id,
      });
    }

    return updated;
  }

  async submitForApproval(
    id: string,
    currentUser: User,
    reason?: string
  ): Promise<Quotation> {
    const quotation = await this.repo.getById(id);
    if (!quotation) {
      throw new Error(`Quotation not found: ${id}`);
    }

    if (quotation.status !== 'DRAFT') {
      throw new Error(`Quotation is not in DRAFT status (current: ${quotation.status})`);
    }

    if (currentUser.role === 'SALES_REP' && quotation.salesRepId !== currentUser.id) {
      throw new Error('Permission Denied: You can only submit your own draft quotations for approval.');
    }

    const approvalReq = await this.approvalSvc.createApprovalRequest({
      documentType: 'QUOTATION_DISCOUNT',
      documentId: quotation.id,
      documentReferenceNumber: quotation.quotationNumber,
      title: `Discount Approval for ${quotation.customerNameSnapshot}`,
      description: `Quotation ${quotation.quotationNumber} total LKR ${quotation.totalAmount.toLocaleString()} submitted for manager approval. ${reason || quotation.approvalReason || ''}`,
      initiatorId: currentUser.id,
      initiatorName: currentUser.name,
      initiatorRole: currentUser.role,
      currentApproverRole: 'SALES_MANAGER',
      isSpecialScenario: true,
      specialReason: reason || quotation.approvalReason,
      status: 'PENDING',
      history: [],
    });

    return this.repo.update(id, {
      status: 'PENDING_APPROVAL',
      approvalRequestId: approvalReq.id,
      approvalReason: reason || quotation.approvalReason,
    });
  }

  /**
   * Finalizes and issues a draft quotation directly when within standard sales rep authority.
   */
  async issueQuotation(id: string, currentUser: User): Promise<Quotation> {
    const quotation = await this.repo.getById(id);
    if (!quotation) {
      throw new Error(`Quotation not found: ${id}`);
    }

    if (quotation.status !== 'DRAFT') {
      throw new Error(`Only DRAFT quotations can be issued. Current status is ${quotation.status}`);
    }

    if (currentUser.role === 'SALES_REP' && quotation.salesRepId !== currentUser.id) {
      throw new Error('Permission Denied: You can only issue your own draft quotations.');
    }

    if (quotation.requiresApproval) {
      throw new Error('Cannot directly issue quotation: Requested discounts exceed authority limit. Manager approval is required.');
    }

    return this.repo.update(id, {
      status: 'APPROVED',
      approvedById: currentUser.id,
      approvedByName: currentUser.name,
      approvedAt: new Date().toISOString(),
    });
  }

  async approveQuotation(
    id: string,
    approverUser: User,
    comment: string
  ): Promise<Quotation> {
    const quotation = await this.repo.getById(id);
    if (!quotation) {
      throw new Error(`Quotation not found: ${id}`);
    }

    if (quotation.status !== 'PENDING_APPROVAL') {
      throw new Error(`Quotation is not pending approval (current: ${quotation.status})`);
    }

    // Role check: Only SALES_MANAGER, MANAGER, or DIRECTOR can approve
    const canApprove = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(approverUser.role);
    if (!canApprove) {
      throw new Error(`Role ${approverUser.role} is not authorized to approve quotations.`);
    }

    if (quotation.approvalRequestId) {
      try {
        await this.approvalSvc.processAction(
          quotation.approvalRequestId,
          'APPROVE',
          approverUser.id,
          approverUser.name,
          approverUser.role,
          comment
        );
      } catch (err) {
        console.warn('Approval request already processed or updated:', err);
      }
    }

    const updatedItems = quotation.items.map((it) => {
      if (it.requiresApproval || it.discountApprovalStatus === 'PENDING_APPROVAL') {
        return {
          ...it,
          discountApprovalStatus: 'APPROVED' as const,
          discountApprovedById: approverUser.id,
          discountApprovedByName: approverUser.name,
          discountApprovedAt: new Date().toISOString(),
          discountApprovalNote: comment,
        };
      }
      return it;
    });

    return this.repo.update(id, {
      items: updatedItems,
      status: 'APPROVED',
      approvedById: approverUser.id,
      approvedByName: approverUser.name,
      approvedAt: new Date().toISOString(),
    });
  }

  async rejectQuotation(
    id: string,
    approverUser: User,
    reason: string
  ): Promise<Quotation> {
    const quotation = await this.repo.getById(id);
    if (!quotation) {
      throw new Error(`Quotation not found: ${id}`);
    }

    if (quotation.status !== 'PENDING_APPROVAL') {
      throw new Error(`Quotation is not pending approval (current: ${quotation.status})`);
    }

    const canApprove = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(approverUser.role);
    if (!canApprove) {
      throw new Error(`Role ${approverUser.role} is not authorized to reject quotations.`);
    }

    if (quotation.approvalRequestId) {
      try {
        await this.approvalSvc.processAction(
          quotation.approvalRequestId,
          'REJECT',
          approverUser.id,
          approverUser.name,
          approverUser.role,
          reason
        );
      } catch (err) {
        console.warn('Approval request already processed or updated:', err);
      }
    }

    const updatedItems = quotation.items.map((it) => {
      if (it.requiresApproval || it.discountApprovalStatus === 'PENDING_APPROVAL') {
        return {
          ...it,
          discountApprovalStatus: 'REJECTED' as const,
          discountApprovalNote: reason,
        };
      }
      return it;
    });

    return this.repo.update(id, {
      items: updatedItems,
      status: 'REJECTED',
      rejectedById: approverUser.id,
      rejectedByName: approverUser.name,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    });
  }

  /**
   * Requirement 4: Quotation to Order Conversion Flow
   * Copies compatible quotation data, preserves quotation reference (quotationId, quotationNumber),
   * and copies identical historical item snapshots to avoid retroactive product price mutation.
   */
  async convertToSalesOrder(
    id: string,
    currentUser: User,
    details?: {
      deliveryAddress?: string;
      deliveryDate?: string;
      customerPoNumber?: string;
    }
  ): Promise<ConvertedOrderPayload> {
    const quotation = await this.repo.getById(id);
    if (!quotation) {
      throw new Error(`Quotation not found: ${id}`);
    }

    if (quotation.status !== 'APPROVED') {
      throw new Error(
        `Cannot convert quotation to Sales Order: Quotation status is '${quotation.status}', must be 'APPROVED'.`
      );
    }

    // Role check: Sales Rep can only convert quotations assigned to their territory
    if (currentUser.role === 'SALES_REP' && quotation.salesRepId !== currentUser.id) {
      throw new Error('Permission Denied: You can only convert quotations assigned to your territory.');
    }

    // Check expiration date
    const today = new Date().toISOString().split('T')[0];
    if (quotation.validUntil && quotation.validUntil < today) {
      await this.repo.update(id, { status: 'EXPIRED' });
      throw new Error(
        `Cannot convert quotation to Sales Order: Quotation expired on ${quotation.validUntil}.`
      );
    }

    const orderNumber = generateOrderNumber(
      quotation.customerCodeSnapshot,
      quotation.salesRepNameSnapshot,
      1
    );
    const convertedAt = new Date().toISOString();

    // Update quotation status to CONVERTED
    await this.repo.update(id, {
      status: 'CONVERTED',
      convertedToOrderId: `so-${Date.now().toString().slice(-6)}`,
      convertedOrderNumber: orderNumber,
      convertedAt,
    });

    const payload: ConvertedOrderPayload = {
      orderNumber,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      customerId: quotation.customerId,
      customerNameSnapshot: quotation.customerNameSnapshot,
      salesRepId: quotation.salesRepId,
      salesRepNameSnapshot: quotation.salesRepNameSnapshot,
      items: JSON.parse(JSON.stringify(quotation.items)),
      subtotal: quotation.subtotal,
      discountAmount: quotation.discountAmount,
      taxAmount: quotation.taxAmount,
      totalAmount: quotation.totalAmount,
      taxEnabled: quotation.taxEnabled ?? (quotation.taxAmount > 0),
      taxRatePercentage: quotation.taxRatePercentage ?? (quotation.taxAmount > 0 ? 18 : 0),
      deliveryAddress: details?.deliveryAddress || quotation.customerAddressSnapshot,
      deliveryDate: details?.deliveryDate,
      customerPoNumber: details?.customerPoNumber,
      convertedAt,
    };

    return payload;
  }
}

export const quotationService = new QuotationService();
