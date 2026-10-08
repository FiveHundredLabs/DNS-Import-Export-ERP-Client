import { ISalesOrderRepository } from '../repositories/ISalesOrderRepository';
import { MockSalesOrderRepository } from '../repositories/mock/MockSalesOrderRepository';
import {
  SalesOrder,
  SalesOrderItem,
  OrderStatus,
  OrderFilters,
  OrderUserContext,
  CreateOrderInput,
  UpdateOrderInput,
  OrderApprovalAction,
} from '../types/order';
import { User, UserRole } from '../types/auth';
import { PaginatedResult } from '../types/common';
import { productService, ProductService } from './ProductService';
import { customerService, CustomerService } from './CustomerService';
import { approvalService, ApprovalService } from './ApprovalService';
import { quotationService, QuotationService } from './QuotationService';
import { taxService, TaxService } from './TaxService';
import {
  evaluateOrderApproval,
  isValidOrderTransition,
  canCancelOrder,
  canApproveOrder,
  canEscalateOrder,
  getAllowedEscalationTargets,
  generateOrderNumber,
} from '../rules/orderRules';

export class OrderService {
  private repo: ISalesOrderRepository;
  private productSvc: ProductService;
  private customerSvc: CustomerService;
  private approvalSvc: ApprovalService;
  private quotationSvc: QuotationService;
  private taxSvc: TaxService;

  constructor(
    repo?: ISalesOrderRepository,
    productSvc?: ProductService,
    customerSvc?: CustomerService,
    approvalSvc?: ApprovalService,
    quotationSvc?: QuotationService,
    taxSvc?: TaxService
  ) {
    this.repo = repo || new MockSalesOrderRepository();
    this.productSvc = productSvc || productService;
    this.customerSvc = customerSvc || customerService;
    this.approvalSvc = approvalSvc || approvalService;
    this.quotationSvc = quotationSvc || quotationService;
    this.taxSvc = taxSvc || taxService;

    // Listen to global approvals engine actions for SPECIAL_SALES_ORDER documents
    this.approvalSvc.onAction(async (request, action, actorRole, comment) => {
      if (request.documentType === 'SPECIAL_SALES_ORDER' && request.documentId) {
        try {
          const order = await this.repo.getById(request.documentId);
          if (!order) return;

          if (action === 'APPROVE' && (order.status === 'PENDING_APPROVAL' || order.status === 'SPECIAL_APPROVAL')) {
            await this.repo.update(order.id, {
              status: 'APPROVED',
              approvedById: request.initiatorId,
              approvedByName: `${actorRole} Approval`,
              approvedAt: new Date().toISOString(),
              approvalHistory: [
                ...order.approvalHistory,
                {
                  id: `hist-${Date.now().toString().slice(-4)}`,
                  stepNumber: order.approvalHistory.length + 1,
                  actorId: request.initiatorId,
                  actorName: `${actorRole} Approval`,
                  actorRole,
                  action: 'APPROVE',
                  fromStatus: order.status,
                  toStatus: 'APPROVED',
                  comment,
                  timestamp: new Date().toISOString(),
                },
              ],
            });
          } else if (action === 'REJECT' && (order.status === 'PENDING_APPROVAL' || order.status === 'SPECIAL_APPROVAL')) {
            await this.repo.update(order.id, {
              status: 'REJECTED',
              rejectedById: request.initiatorId,
              rejectedByName: `${actorRole} Rejection`,
              rejectedAt: new Date().toISOString(),
              rejectionReason: comment,
              approvalHistory: [
                ...order.approvalHistory,
                {
                  id: `hist-${Date.now().toString().slice(-4)}`,
                  stepNumber: order.approvalHistory.length + 1,
                  actorId: request.initiatorId,
                  actorName: `${actorRole} Rejection`,
                  actorRole,
                  action: 'REJECT',
                  fromStatus: order.status,
                  toStatus: 'REJECTED',
                  comment,
                  timestamp: new Date().toISOString(),
                },
              ],
            });
          } else if (action === 'ESCALATE' && (order.status === 'PENDING_APPROVAL' || order.status === 'SPECIAL_APPROVAL')) {
            const targetRole = (request.currentApproverRole || request.targetApproverRole || 'DIRECTOR') as 'MANAGER' | 'DIRECTOR';
            await this.repo.update(order.id, {
              status: 'SPECIAL_APPROVAL',
              isSpecialApproval: true,
              currentApproverRole: targetRole,
              targetApproverRole: targetRole,
              approvalHistory: [
                ...order.approvalHistory,
                {
                  id: `hist-${Date.now().toString().slice(-4)}`,
                  stepNumber: order.approvalHistory.length + 1,
                  actorId: request.initiatorId,
                  actorName: `${actorRole} Escalation`,
                  actorRole,
                  action: 'ESCALATE',
                  fromStatus: order.status,
                  toStatus: 'SPECIAL_APPROVAL',
                  targetRole,
                  comment,
                  timestamp: new Date().toISOString(),
                },
              ],
            });
          }
        } catch (err) {
          console.error('Error synchronizing approval engine action to sales order:', err);
        }
      }
    });
  }

  async listOrders(
    filters?: OrderFilters,
    userContext?: OrderUserContext
  ): Promise<PaginatedResult<SalesOrder>> {
    return this.repo.getAll(filters, userContext);
  }

  async getOrderById(id: string, userContext?: OrderUserContext): Promise<SalesOrder | null> {
    const order = await this.repo.getById(id);
    if (!order) return null;

    if (userContext?.role === 'SALES_REP' && order.salesRepId !== userContext.userId) {
      throw new Error('Permission Denied: You can only view orders assigned to your territory.');
    }

    return order;
  }

  async getOrder(id: string, userContext?: OrderUserContext): Promise<SalesOrder | null> {
    return this.getOrderById(id, userContext);
  }

  /**
   * Helper to build immutable line item snapshots from Product Master.
   * Product changes in the future will not retroactively alter these snapshots.
   */
  async buildLineItemSnapshots(
    items: Array<{ productId: string; orderedQuantity: number; requestedDiscountPercentage?: number }>,
    customerAllowedDiscount: number
  ): Promise<{ items: SalesOrderItem[]; rawForEvaluation: any[] }> {
    const result: SalesOrderItem[] = [];
    const rawForEvaluation: any[] = [];

    for (const inputItem of items) {
      if (inputItem.orderedQuantity <= 0) {
        throw new Error(`Ordered quantity must be greater than zero for product ${inputItem.productId}`);
      }

      const product = await this.productSvc.getProduct(inputItem.productId);
      if (!product) {
        throw new Error(`Product not found: ${inputItem.productId}`);
      }

      const discountPercentage = inputItem.requestedDiscountPercentage ?? 0;
      if (discountPercentage < 0 || discountPercentage > 100) {
        throw new Error(`Discount percentage must be between 0% and 100%`);
      }

      const unitPriceSnapshot = product.pricing.currentSellingPrice;
      const subtotal = Number((unitPriceSnapshot * inputItem.orderedQuantity).toFixed(2));
      const discountAmount = Number(((subtotal * discountPercentage) / 100).toFixed(2));
      const netLine = Number((subtotal - discountAmount).toFixed(2));
      const taxConfig = this.taxSvc.getTaxConfig();
      const taxPercentage = taxConfig.taxEnabled ? taxConfig.taxRate : 0;
      const taxAmount = Number(((netLine * taxPercentage) / 100).toFixed(2));
      const lineTotal = Number((netLine + taxAmount).toFixed(2));

      const requiresSpecialApproval = discountPercentage > 5;
      const specialApprovalReason = requiresSpecialApproval
        ? `Discount (${discountPercentage}%) exceeds 5% sales rep authority limit.`
        : undefined;

      const salesItem: SalesOrderItem = {
        id: `item-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        skuSnapshot: product.sku,
        productNameSnapshot: product.name,
        uomSnapshot: product.uomCode,
        unitPriceSnapshot,
        discountPercentage,
        discountAmount,
        taxPercentage,
        taxAmount,
        lineTotal,
        orderedQuantity: inputItem.orderedQuantity,
        approvedQuantity: inputItem.orderedQuantity,
        issuedQuantity: 0,
        requiresSpecialApproval,
        specialApprovalReason,
      };

      result.push(salesItem);
      rawForEvaluation.push({
        productId: product.id,
        productNameSnapshot: product.name,
        unitPriceSnapshot,
        orderedQuantity: inputItem.orderedQuantity,
        discountPercentage,
        taxPercentage,
        product,
      });
    }

    return { items: result, rawForEvaluation };
  }

  async createOrder(input: CreateOrderInput, currentUser: User): Promise<SalesOrder> {
    if (!input.items || input.items.length === 0) {
      throw new Error('An order must contain at least one line item.');
    }

    const customer = await this.customerSvc.getCustomer(input.customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${input.customerId}`);
    }

    // Role territory scoping check: Rep can only create order for their assigned customer
    if (currentUser.role === 'SALES_REP') {
      if (customer.assignedRepId && customer.assignedRepId !== currentUser.id) {
        throw new Error(
          `Permission Denied: Customer ${customer.name} is assigned to another sales representative.`
        );
      }
    }

    const { items, rawForEvaluation } = await this.buildLineItemSnapshots(
      input.items,
      customer.commercialTerms?.maxDiscountPercentage ?? 12
    );

    const requestedCreditDays =
      input.requestedCreditDays ?? input.creditDaysRequested ?? customer.commercialTerms?.creditDays ?? 30;

    // Evaluate against Central Business Rules (Standard vs Special Order)
    const evalResult = evaluateOrderApproval({
      customer,
      items: rawForEvaluation,
      requestedCreditDays,
      userRole: currentUser.role,
    });

    const isDraft = !!input.saveAsDraft;
    let initialStatus: OrderStatus = 'DRAFT';

    if (!isDraft) {
      initialStatus = evalResult.isSpecialApproval ? 'SPECIAL_APPROVAL' : 'PENDING_APPROVAL';
    }

    const existingOrders = await this.repo.getAll();
    const nextSeq = existingOrders.data.length + 1;
    const orderNumber = generateOrderNumber(
      customer.areaName || currentUser.areaName,
      currentUser.name,
      nextSeq
    );

    const initialHistory: OrderApprovalAction[] = [
      {
        id: `hist-${Date.now().toString().slice(-4)}-1`,
        stepNumber: 1,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: isDraft ? 'CREATE' : 'SUBMIT',
        fromStatus: 'DRAFT',
        toStatus: initialStatus,
        comment: isDraft
          ? 'Draft order saved.'
          : evalResult.isSpecialApproval
          ? `Special approval order submitted. Deviations: ${evalResult.specialApprovalReasons.join('; ')}`
          : 'Standard order submitted for approval.',
        timestamp: new Date().toISOString(),
      },
    ];

    const newOrder = await this.repo.create({
      orderNumber,
      quotationId: input.quotationId,
      quotationNumber: input.quotationNumber,
      customerId: customer.id,
      customerCodeSnapshot: customer.code,
      customerNameSnapshot: customer.name,
      customerPhoneSnapshot: customer.phone,
      customerAddressSnapshot: customer.address,
      customerCreditLimitSnapshot: customer.commercialTerms?.creditLimit ?? 0,
      customerOutstandingSnapshot: customer.financials?.totalOutstanding ?? 0,
      customerCreditDaysSnapshot: customer.commercialTerms?.creditDays ?? 30,
      requestedCreditDays,
      creditDaysRequested: requestedCreditDays,
      paymentTerms: input.paymentTerms || customer.commercialTerms?.paymentTermNotes || `${requestedCreditDays} Days PDC`,
      salesRepId: currentUser.id,
      salesRepNameSnapshot: currentUser.name,
      deliveryAddress: input.deliveryAddress || customer.deliveryAddress || customer.address,
      requestedDeliveryDate: input.requestedDeliveryDate,
      customerPoNumber: input.customerPoNumber,
      notes: input.notes,
      items,
      subtotal: evalResult.subtotal,
      discountAmount: evalResult.discountAmount,
      taxAmount: evalResult.taxAmount,
      totalAmount: evalResult.totalAmount,
      taxEnabled: this.taxSvc.getTaxConfig().taxEnabled,
      taxRatePercentage: this.taxSvc.getTaxConfig().taxEnabled ? this.taxSvc.getTaxConfig().taxRate : 0,
      status: initialStatus,
      isSpecialApproval: evalResult.isSpecialApproval,
      specialApprovalReasons: evalResult.specialApprovalReasons,
      targetApproverRole: evalResult.targetApproverRole,
      currentApproverRole: evalResult.targetApproverRole,
      approvalHistory: initialHistory,
    });

    // If order is submitted and requires approval, generate approval request linked to order.id
    if (!isDraft) {
      const approvalReq = await this.approvalSvc.createApprovalRequest({
        documentType: 'SPECIAL_SALES_ORDER',
        documentId: newOrder.id,
        documentReferenceNumber: orderNumber,
        title: `${evalResult.isSpecialApproval ? 'Special' : 'Standard'} Order Approval for ${customer.name}`,
        description: `Order ${orderNumber} for LKR ${evalResult.totalAmount.toLocaleString()} submitted. ${evalResult.isSpecialApproval ? evalResult.specialApprovalReasons.join('; ') : 'Within standard commercial terms.'}`,
        initiatorId: currentUser.id,
        initiatorName: currentUser.name,
        initiatorRole: currentUser.role,
        currentApproverRole: evalResult.targetApproverRole,
        targetApproverRole: evalResult.targetApproverRole,
        isSpecialScenario: evalResult.isSpecialApproval,
        specialReason: evalResult.isSpecialApproval ? evalResult.specialApprovalReasons.join('; ') : undefined,
        status: 'PENDING',
        history: [],
      });

      return await this.repo.update(newOrder.id, {
        approvalRequestId: approvalReq.id,
      });
    }

    return newOrder;
  }

  async updateOrder(
    id: string,
    updates: UpdateOrderInput,
    currentUser: User
  ): Promise<SalesOrder> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new Error(`Sales Order not found: ${id}`);
    }

    if (existing.status !== 'DRAFT') {
      throw new Error(`Only DRAFT orders can be edited. Current status is ${existing.status}.`);
    }

    if (currentUser.role === 'SALES_REP' && existing.salesRepId !== currentUser.id) {
      throw new Error('Permission Denied: You can only edit your own draft orders.');
    }

    const customerId = updates.customerId || existing.customerId;
    const customer = await this.customerSvc.getCustomer(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    let items = existing.items;
    let rawForEvaluation: any[] = [];
    if (updates.items && updates.items.length > 0) {
      const built = await this.buildLineItemSnapshots(
        updates.items,
        customer.commercialTerms?.maxDiscountPercentage ?? 12
      );
      items = built.items;
      rawForEvaluation = built.rawForEvaluation;
    } else {
      rawForEvaluation = items.map((i) => ({
        productId: i.productId,
        productNameSnapshot: i.productNameSnapshot,
        unitPriceSnapshot: i.unitPriceSnapshot,
        orderedQuantity: i.orderedQuantity,
        discountPercentage: i.discountPercentage,
      }));
    }

    const requestedCreditDays =
      updates.requestedCreditDays ?? updates.creditDaysRequested ?? existing.requestedCreditDays;

    const evalResult = evaluateOrderApproval({
      customer,
      items: rawForEvaluation,
      requestedCreditDays,
      userRole: currentUser.role,
    });

    const isDraft = updates.saveAsDraft !== undefined ? updates.saveAsDraft : true;
    let nextStatus: OrderStatus = 'DRAFT';
    if (!isDraft) {
      nextStatus = evalResult.isSpecialApproval ? 'SPECIAL_APPROVAL' : 'PENDING_APPROVAL';
    }

    const historyEntry: OrderApprovalAction = {
      id: `hist-${Date.now().toString().slice(-4)}`,
      stepNumber: existing.approvalHistory.length + 1,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: isDraft ? 'CREATE' : 'SUBMIT',
      fromStatus: existing.status,
      toStatus: nextStatus,
      comment: isDraft ? 'Draft order updated.' : 'Order submitted for approval.',
      timestamp: new Date().toISOString(),
    };

    let approvalRequestId = existing.approvalRequestId;
    if (existing.status === 'DRAFT' && !isDraft && !approvalRequestId) {
      const approvalReq = await this.approvalSvc.createApprovalRequest({
        documentType: 'SPECIAL_SALES_ORDER',
        documentId: id,
        documentReferenceNumber: existing.orderNumber,
        title: `${evalResult.isSpecialApproval ? 'Special' : 'Standard'} Order Approval for ${customer.name}`,
        description: `Order ${existing.orderNumber} for LKR ${evalResult.totalAmount.toLocaleString()} submitted. ${evalResult.isSpecialApproval ? evalResult.specialApprovalReasons.join('; ') : 'Within standard commercial terms.'}`,
        initiatorId: currentUser.id,
        initiatorName: currentUser.name,
        initiatorRole: currentUser.role,
        currentApproverRole: evalResult.targetApproverRole,
        targetApproverRole: evalResult.targetApproverRole,
        isSpecialScenario: evalResult.isSpecialApproval,
        specialReason: evalResult.isSpecialApproval ? evalResult.specialApprovalReasons.join('; ') : undefined,
        status: 'PENDING',
        history: [],
      });
      approvalRequestId = approvalReq.id;
    }

    return this.repo.update(id, {
      customerId: customer.id,
      customerCodeSnapshot: customer.code,
      customerNameSnapshot: customer.name,
      customerPhoneSnapshot: customer.phone,
      customerAddressSnapshot: customer.address,
      items,
      subtotal: evalResult.subtotal,
      discountAmount: evalResult.discountAmount,
      taxAmount: evalResult.taxAmount,
      totalAmount: evalResult.totalAmount,
      requestedCreditDays,
      creditDaysRequested: requestedCreditDays,
      deliveryAddress: updates.deliveryAddress ?? existing.deliveryAddress,
      requestedDeliveryDate: updates.requestedDeliveryDate ?? existing.requestedDeliveryDate,
      customerPoNumber: updates.customerPoNumber ?? existing.customerPoNumber,
      paymentTerms: updates.paymentTerms ?? existing.paymentTerms,
      notes: updates.notes ?? existing.notes,
      status: nextStatus,
      isSpecialApproval: evalResult.isSpecialApproval,
      specialApprovalReasons: evalResult.specialApprovalReasons,
      targetApproverRole: evalResult.targetApproverRole,
      currentApproverRole: evalResult.targetApproverRole,
      approvalRequestId,
      approvalHistory: [...existing.approvalHistory, historyEntry],
    });
  }

  async submitOrder(id: string, currentUser: User, note?: string): Promise<SalesOrder> {
    const order = await this.repo.getById(id);
    if (!order) {
      throw new Error(`Sales Order not found: ${id}`);
    }

    if (order.status !== 'DRAFT') {
      throw new Error(`Only DRAFT orders can be submitted. Current status is ${order.status}`);
    }

    if (currentUser.role === 'SALES_REP' && order.salesRepId !== currentUser.id) {
      throw new Error('Permission Denied: You can only submit your own draft orders.');
    }

    const nextStatus: OrderStatus = order.isSpecialApproval ? 'SPECIAL_APPROVAL' : 'PENDING_APPROVAL';

    const approvalReq = await this.approvalSvc.createApprovalRequest({
      documentType: 'SPECIAL_SALES_ORDER',
      documentId: order.id,
      documentReferenceNumber: order.orderNumber,
      title: `${order.isSpecialApproval ? 'Special' : 'Standard'} Order Approval for ${order.customerNameSnapshot}`,
      description: `Order ${order.orderNumber} submitted by ${currentUser.name}. ${note || (order.isSpecialApproval ? order.specialApprovalReasons.join('; ') : '')}`,
      initiatorId: currentUser.id,
      initiatorName: currentUser.name,
      initiatorRole: currentUser.role,
      currentApproverRole: order.targetApproverRole,
      targetApproverRole: order.targetApproverRole,
      isSpecialScenario: order.isSpecialApproval,
      specialReason: order.isSpecialApproval ? order.specialApprovalReasons.join('; ') : undefined,
      status: 'PENDING',
      history: [],
    });

    const historyEntry: OrderApprovalAction = {
      id: `hist-${Date.now().toString().slice(-4)}`,
      stepNumber: order.approvalHistory.length + 1,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'SUBMIT',
      fromStatus: order.status,
      toStatus: nextStatus,
      comment: note || (order.isSpecialApproval ? 'Submitted for special commercial approval.' : 'Submitted for sales manager approval.'),
      timestamp: new Date().toISOString(),
    };

    return this.repo.update(id, {
      status: nextStatus,
      approvalRequestId: approvalReq.id,
      approvalHistory: [...order.approvalHistory, historyEntry],
    });
  }

  async approveOrder(id: string, currentUser: User, comment: string): Promise<SalesOrder> {
    const order = await this.repo.getById(id);
    if (!order) {
      throw new Error(`Sales Order not found: ${id}`);
    }

    if (order.status !== 'PENDING_APPROVAL' && order.status !== 'SPECIAL_APPROVAL') {
      throw new Error(`Cannot approve order in status '${order.status}'. Must be PENDING_APPROVAL or SPECIAL_APPROVAL.`);
    }

    const authorized = canApproveOrder(
      currentUser.role,
      order.currentApproverRole || order.targetApproverRole,
      order.isSpecialApproval
    );

    if (!authorized) {
      throw new Error(
        `Role '${currentUser.role}' is not authorized to approve this order. Current required approver is '${order.currentApproverRole || order.targetApproverRole}'.`
      );
    }

    if (!isValidOrderTransition(order.status, 'APPROVED')) {
      throw new Error(`Invalid state transition from ${order.status} to APPROVED.`);
    }

    if (order.approvalRequestId) {
      try {
        await this.approvalSvc.processAction(
          order.approvalRequestId,
          'APPROVE',
          currentUser.id,
          currentUser.name,
          currentUser.role,
          comment
        );
      } catch (err) {
        console.warn('Approval request already processed or updated:', err);
      }
    }

    const historyEntry: OrderApprovalAction = {
      id: `hist-${Date.now().toString().slice(-4)}`,
      stepNumber: order.approvalHistory.length + 1,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'APPROVE',
      fromStatus: order.status,
      toStatus: 'APPROVED',
      comment,
      timestamp: new Date().toISOString(),
    };

    return this.repo.update(id, {
      status: 'APPROVED',
      approvedById: currentUser.id,
      approvedByName: currentUser.name,
      approvedAt: new Date().toISOString(),
      approvalHistory: [...order.approvalHistory, historyEntry],
    });
  }

  async rejectOrder(id: string, currentUser: User, reason: string): Promise<SalesOrder> {
    const order = await this.repo.getById(id);
    if (!order) {
      throw new Error(`Sales Order not found: ${id}`);
    }

    if (order.status !== 'PENDING_APPROVAL' && order.status !== 'SPECIAL_APPROVAL') {
      throw new Error(`Cannot reject order in status '${order.status}'.`);
    }

    const canReject = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(currentUser.role);
    if (!canReject) {
      throw new Error(`Role ${currentUser.role} is not authorized to reject orders.`);
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error('A detailed rejection reason is required.');
    }

    if (order.approvalRequestId) {
      try {
        await this.approvalSvc.processAction(
          order.approvalRequestId,
          'REJECT',
          currentUser.id,
          currentUser.name,
          currentUser.role,
          reason
        );
      } catch (err) {
        console.warn('Approval request already processed or updated:', err);
      }
    }

    const historyEntry: OrderApprovalAction = {
      id: `hist-${Date.now().toString().slice(-4)}`,
      stepNumber: order.approvalHistory.length + 1,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'REJECT',
      fromStatus: order.status,
      toStatus: 'REJECTED',
      comment: reason,
      timestamp: new Date().toISOString(),
    };

    return this.repo.update(id, {
      status: 'REJECTED',
      rejectedById: currentUser.id,
      rejectedByName: currentUser.name,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
      approvalHistory: [...order.approvalHistory, historyEntry],
    });
  }

  /**
   * Section 18: Special Approval Escalation Hierarchy.
   * Sales Manager can escalate to Manager or Director.
   * Manager can escalate to Director.
   */
  async escalateOrder(
    id: string,
    currentUser: User,
    targetRole: 'MANAGER' | 'DIRECTOR',
    comment: string
  ): Promise<SalesOrder> {
    const order = await this.repo.getById(id);
    if (!order) {
      throw new Error(`Sales Order not found: ${id}`);
    }

    if (order.status !== 'PENDING_APPROVAL' && order.status !== 'SPECIAL_APPROVAL') {
      throw new Error(`Cannot escalate order in status '${order.status}'.`);
    }

    if (!canEscalateOrder(currentUser.role)) {
      throw new Error(`Role ${currentUser.role} cannot escalate orders.`);
    }

    const allowedTargets = getAllowedEscalationTargets(currentUser.role);
    if (!allowedTargets.includes(targetRole)) {
      throw new Error(`User with role ${currentUser.role} cannot escalate to ${targetRole}.`);
    }

    if (!comment || comment.trim().length < 3) {
      throw new Error('An explanatory comment is required for order escalation.');
    }

    if (order.approvalRequestId) {
      try {
        await this.approvalSvc.processAction(
          order.approvalRequestId,
          'ESCALATE',
          currentUser.id,
          currentUser.name,
          currentUser.role,
          comment,
          targetRole
        );
      } catch (err) {
        console.warn('Approval request already processed or updated:', err);
      }
    }

    const historyEntry: OrderApprovalAction = {
      id: `hist-${Date.now().toString().slice(-4)}`,
      stepNumber: order.approvalHistory.length + 1,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'ESCALATE',
      fromStatus: order.status,
      toStatus: 'SPECIAL_APPROVAL',
      targetRole,
      comment,
      timestamp: new Date().toISOString(),
    };

    return this.repo.update(id, {
      status: 'SPECIAL_APPROVAL',
      isSpecialApproval: true,
      currentApproverRole: targetRole,
      targetApproverRole: targetRole,
      approvalHistory: [...order.approvalHistory, historyEntry],
    });
  }

  async cancelOrder(id: string, currentUser: User, reason: string): Promise<SalesOrder> {
    const order = await this.repo.getById(id);
    if (!order) {
      throw new Error(`Sales Order not found: ${id}`);
    }

    if (!canCancelOrder(order.status)) {
      throw new Error(`Cannot cancel order in status '${order.status}'. Cancellation is only permitted before picking/invoicing.`);
    }

    if (currentUser.role === 'SALES_REP' && order.salesRepId !== currentUser.id) {
      throw new Error('Permission Denied: You can only cancel your own territory orders.');
    }

    const historyEntry: OrderApprovalAction = {
      id: `hist-${Date.now().toString().slice(-4)}`,
      stepNumber: order.approvalHistory.length + 1,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'CANCEL',
      fromStatus: order.status,
      toStatus: 'CANCELLED',
      comment: reason,
      timestamp: new Date().toISOString(),
    };

    return this.repo.update(id, {
      status: 'CANCELLED',
      cancelledById: currentUser.id,
      cancelledByName: currentUser.name,
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
      approvalHistory: [...order.approvalHistory, historyEntry],
    });
  }

  /**
   * Advances the order through fulfillment pipeline states:
   * APPROVED -> PICKING -> PARTIALLY_ISSUED / ISSUED -> INVOICED -> DISPATCHED -> DELIVERED.
   */
  async updateFulfillmentStatus(
    id: string,
    nextStatus: OrderStatus,
    currentUser: User,
    details?: { issuedQuantities?: Record<string, number>; comment?: string }
  ): Promise<SalesOrder> {
    const order = await this.repo.getById(id);
    if (!order) {
      throw new Error(`Sales Order not found: ${id}`);
    }

    if (!isValidOrderTransition(order.status, nextStatus)) {
      throw new Error(`Invalid state transition from '${order.status}' to '${nextStatus}'.`);
    }

    let updatedItems = order.items;
    if (details?.issuedQuantities) {
      updatedItems = order.items.map((item) => {
        if (details.issuedQuantities![item.id] !== undefined) {
          return {
            ...item,
            issuedQuantity: details.issuedQuantities![item.id],
          };
        }
        return item;
      });
    }

    const actionMap: Record<OrderStatus, any> = {
      PICKING: 'PICK',
      PARTIALLY_ISSUED: 'ISSUE',
      ISSUED: 'ISSUE',
      INVOICED: 'INVOICE',
      DISPATCHED: 'DISPATCH',
      DELIVERED: 'DELIVERED',
      DRAFT: 'CREATE',
      SUBMITTED: 'SUBMIT',
      PENDING_APPROVAL: 'SUBMIT',
      SPECIAL_APPROVAL: 'SUBMIT',
      APPROVED: 'APPROVE',
      REJECTED: 'REJECT',
      CANCELLED: 'CANCEL',
    };

    const historyEntry: OrderApprovalAction = {
      id: `hist-${Date.now().toString().slice(-4)}`,
      stepNumber: order.approvalHistory.length + 1,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: actionMap[nextStatus] || 'SUBMIT',
      fromStatus: order.status,
      toStatus: nextStatus,
      comment: details?.comment || `Advanced order fulfillment to ${nextStatus}`,
      timestamp: new Date().toISOString(),
    };

    return this.repo.update(id, {
      status: nextStatus,
      items: updatedItems,
      approvalHistory: [...order.approvalHistory, historyEntry],
    });
  }

  /**
   * Convert an APPROVED quotation into a Sales Order.
   * Copies quotation details, preserves immutable snapshots, and creates the Sales Order in repository.
   */
  async createFromQuotation(
    quotationId: string,
    currentUser: User,
    options?: {
      deliveryAddress?: string;
      deliveryDate?: string;
      requestedCreditDays?: number;
      customerPoNumber?: string;
      notes?: string;
      saveAsDraft?: boolean;
    }
  ): Promise<SalesOrder> {
    const payload = await this.quotationSvc.convertToSalesOrder(
      quotationId,
      currentUser,
      {
        deliveryAddress: options?.deliveryAddress,
        deliveryDate: options?.deliveryDate,
        customerPoNumber: options?.customerPoNumber,
      }
    );

    const customer = await this.customerSvc.getCustomer(payload.customerId);
    if (!customer) {
      throw new Error(`Customer not found for quotation: ${payload.customerId}`);
    }

    // Map quotation items to SalesOrderItems with orderedQuantity = quantity
    const orderItems: SalesOrderItem[] = payload.items.map((item) => ({
      id: `item-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`,
      productId: item.productId,
      skuSnapshot: item.skuSnapshot,
      productNameSnapshot: item.productNameSnapshot,
      uomSnapshot: item.uomSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot,
      discountPercentage: item.discountPercentage,
      discountAmount: item.discountAmount,
      taxPercentage: item.taxPercentage,
      taxAmount: item.taxAmount,
      lineTotal: item.lineTotal,
      orderedQuantity: item.quantity,
      approvedQuantity: item.quantity,
      issuedQuantity: 0,
      requiresSpecialApproval: item.requiresApproval,
      specialApprovalReason: item.approvalReason,
    }));

    const requestedCreditDays =
      options?.requestedCreditDays ?? customer.commercialTerms?.creditDays ?? 30;

    const evalResult = evaluateOrderApproval({
      customer,
      items: orderItems.map((i) => ({
        productId: i.productId,
        productNameSnapshot: i.productNameSnapshot,
        unitPriceSnapshot: i.unitPriceSnapshot,
        orderedQuantity: i.orderedQuantity,
        discountPercentage: i.discountPercentage,
        taxPercentage: i.taxPercentage,
      })),
      requestedCreditDays,
      userRole: currentUser.role,
    });

    const isDraft = !!options?.saveAsDraft;
    const initialStatus: OrderStatus = isDraft
      ? 'DRAFT'
      : evalResult.isSpecialApproval
      ? 'SPECIAL_APPROVAL'
      : 'PENDING_APPROVAL';

    const initialHistory: OrderApprovalAction[] = [
      {
        id: `hist-${Date.now().toString().slice(-4)}`,
        stepNumber: 1,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: isDraft ? 'CREATE' : 'SUBMIT',
        fromStatus: 'DRAFT',
        toStatus: initialStatus,
        comment: `Converted from approved Quotation ${payload.quotationNumber}. ${options?.notes || ''}`,
        timestamp: new Date().toISOString(),
      },
    ];

    const order = await this.repo.create({
      orderNumber: payload.orderNumber,
      quotationId: payload.quotationId,
      quotationNumber: payload.quotationNumber,
      customerId: customer.id,
      customerCodeSnapshot: customer.code,
      customerNameSnapshot: customer.name,
      customerPhoneSnapshot: customer.phone,
      customerAddressSnapshot: customer.address,
      customerCreditLimitSnapshot: customer.commercialTerms?.creditLimit ?? 0,
      customerOutstandingSnapshot: customer.financials?.totalOutstanding ?? 0,
      customerCreditDaysSnapshot: customer.commercialTerms?.creditDays ?? 30,
      requestedCreditDays,
      creditDaysRequested: requestedCreditDays,
      paymentTerms: customer.commercialTerms?.paymentTermNotes || `${requestedCreditDays} Days PDC`,
      salesRepId: payload.salesRepId,
      salesRepNameSnapshot: payload.salesRepNameSnapshot,
      deliveryAddress: options?.deliveryAddress || payload.deliveryAddress || customer.address,
      requestedDeliveryDate: options?.deliveryDate || payload.deliveryDate,
      customerPoNumber: options?.customerPoNumber || payload.customerPoNumber,
      notes: options?.notes,
      items: orderItems,
      subtotal: evalResult.subtotal,
      discountAmount: evalResult.discountAmount,
      taxAmount: evalResult.taxAmount,
      totalAmount: evalResult.totalAmount,
      taxEnabled: payload.taxEnabled,
      taxRatePercentage: payload.taxRatePercentage,
      status: initialStatus,
      isSpecialApproval: evalResult.isSpecialApproval,
      specialApprovalReasons: evalResult.specialApprovalReasons,
      targetApproverRole: evalResult.targetApproverRole,
      currentApproverRole: evalResult.targetApproverRole,
      approvalHistory: initialHistory,
    });

    if (!isDraft) {
      const approvalReq = await this.approvalSvc.createApprovalRequest({
        documentType: 'SPECIAL_SALES_ORDER',
        documentId: order.id,
        documentReferenceNumber: payload.orderNumber,
        title: `Order converted from Quotation ${payload.quotationNumber}`,
        description: `Sales Order for ${customer.name} converted from quotation. Total: LKR ${evalResult.totalAmount.toLocaleString()}`,
        initiatorId: currentUser.id,
        initiatorName: currentUser.name,
        initiatorRole: currentUser.role,
        currentApproverRole: evalResult.targetApproverRole,
        targetApproverRole: evalResult.targetApproverRole,
        isSpecialScenario: evalResult.isSpecialApproval,
        specialReason: evalResult.isSpecialApproval ? evalResult.specialApprovalReasons.join('; ') : undefined,
        status: 'PENDING',
        history: [],
      });

      return await this.repo.update(order.id, {
        approvalRequestId: approvalReq.id,
      });
    }

    return order;
  }

  /** Alias used by inventory pages: getOrders with status array filter */
  async getOrders(filters?: { status?: string | string[] }): Promise<SalesOrder[]> {
    const statusFilter = Array.isArray(filters?.status) ? filters!.status[0] : filters?.status;
    const result = await this.listOrders(
      statusFilter && statusFilter !== 'ALL' ? { status: statusFilter as any } : {}
    );
    if (!filters?.status || filters.status === 'ALL') return result.data;
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    return result.data.filter((o) => statuses.includes(o.status));
  }

  /** Alias used by DispatchPage: advance order to the specified status string */
  async advanceOrderStatus(orderId: string, nextStatus: string, user: User): Promise<SalesOrder> {
    return this.updateFulfillmentStatus(orderId, nextStatus as OrderStatus, user);
  }
}

export const orderService = new OrderService();
