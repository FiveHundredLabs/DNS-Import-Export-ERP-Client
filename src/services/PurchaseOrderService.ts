import { IPurchaseOrderRepository } from '../repositories/IPurchaseOrderRepository';
import { mockPurchaseOrderRepository } from '../repositories/mock/MockPurchaseOrderRepository';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  CreatePurchaseOrderDTO,
  PurchaseOrderFilter,
  PurchaseOrderStatus,
} from '../types/purchasing';
import { approvalService } from './ApprovalService';
import { User, UserRole } from '../types/auth';

export interface CalculatedOrderLine {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
}

export interface CalculatedOrderSummary {
  items: PurchaseOrderItem[];
  subtotal: number;
  totalDiscount: number;
  taxTotal: number;
  shippingCharges: number;
  otherCharges: number;
  grandTotal: number;
}

export class PurchaseOrderService {
  private repo: IPurchaseOrderRepository;

  constructor(repo?: IPurchaseOrderRepository) {
    this.repo = repo || mockPurchaseOrderRepository;
    this.registerApprovalListener();
  }

  private registerApprovalListener() {
    approvalService.onAction(async (request, action, actorRole, comment) => {
      if (request.documentType !== 'PURCHASE_ORDER') return;

      const po = await this.repo.getById(request.documentId);
      if (!po) return;

      if (action === 'APPROVE') {
        await this.repo.update(po.id, {
          status: 'APPROVED',
          approvedBy: request.history[request.history.length - 1]?.actorId || 'mgr',
          approvedByName: `${request.history[request.history.length - 1]?.actorName || 'Approver'} (${actorRole})`,
          approvedAt: new Date().toISOString(),
        });
      } else if (action === 'REJECT') {
        await this.repo.update(po.id, {
          status: 'REJECTED',
          rejectionReason: comment || 'Purchase order rejected during internal review.',
        });
      }
    });
  }

  calculateTotals(
    rawItems: Array<{
      id?: string;
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      taxRate?: number;
      notes?: string;
    }>,
    shippingCharges: number = 0,
    otherCharges: number = 0
  ): CalculatedOrderSummary {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxTotal = 0;

    const items: PurchaseOrderItem[] = rawItems.map((item, idx) => {
      const qty = Math.max(0, Number(item.quantity) || 0);
      const price = Math.max(0, Number(item.unitPrice) || 0);
      const discPct = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
      const taxRate = Math.max(0, Number(item.taxRate) || 0);

      const rawLineTotal = qty * price;
      const discountAmount = Number(((rawLineTotal * discPct) / 100).toFixed(2));
      const netLine = rawLineTotal - discountAmount;
      const taxAmount = Number(((netLine * taxRate) / 100).toFixed(2));
      const lineTotal = Number((netLine + taxAmount).toFixed(2));

      subtotal += rawLineTotal;
      totalDiscount += discountAmount;
      taxTotal += taxAmount;

      return {
        id: item.id || `poi-${Date.now()}-${idx}`,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: qty,
        unitPrice: price,
        discountPercent: discPct,
        discountAmount,
        taxRate,
        taxAmount,
        total: lineTotal,
        notes: item.notes,
      };
    });

    const roundedSubtotal = Number(subtotal.toFixed(2));
    const roundedDiscount = Number(totalDiscount.toFixed(2));
    const roundedTax = Number(taxTotal.toFixed(2));
    const roundedShipping = Math.max(0, Number(shippingCharges) || 0);
    const roundedOther = Math.max(0, Number(otherCharges) || 0);
    const grandTotal = Number(
      (roundedSubtotal - roundedDiscount + roundedTax + roundedShipping + roundedOther).toFixed(2)
    );

    return {
      items,
      subtotal: roundedSubtotal,
      totalDiscount: roundedDiscount,
      taxTotal: roundedTax,
      shippingCharges: roundedShipping,
      otherCharges: roundedOther,
      grandTotal,
    };
  }

  async getAll(filters?: PurchaseOrderFilter): Promise<PurchaseOrder[]> {
    return this.repo.getAll(filters);
  }

  async getById(id: string): Promise<PurchaseOrder | null> {
    return this.repo.getById(id);
  }

  async getByPONumber(poNumber: string): Promise<PurchaseOrder | null> {
    return this.repo.getByPONumber(poNumber);
  }

  async createPurchaseOrder(
    dto: CreatePurchaseOrderDTO,
    user: User
  ): Promise<PurchaseOrder> {
    if (!dto.items || dto.items.length === 0) {
      throw new Error('At least one product line item is required.');
    }
    if (!dto.supplierId) {
      throw new Error('Supplier selection is required.');
    }

    const calculated = this.calculateTotals(
      dto.items,
      dto.shippingCharges || 0,
      dto.otherCharges || 0
    );

    const poNumber = await this.repo.getNextPONumber();
    const shouldSubmit = dto.submitForApproval ?? false;

    // Determine target approver based on amount threshold
    // Above 500,000 LKR requires DIRECTOR; otherwise MANAGER approval
    const targetApproverRole: UserRole = calculated.grandTotal > 500000 ? 'DIRECTOR' : 'MANAGER';

    const newPO = await this.repo.create({
      poNumber,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      supplierCode: dto.supplierCode,
      supplierContactPerson: dto.supplierContactPerson,
      supplierEmail: dto.supplierEmail,
      supplierPhone: dto.supplierPhone,
      supplierAddress: dto.supplierAddress,
      supplierVatNumber: dto.supplierVatNumber,
      orderDate: dto.orderDate,
      expectedDeliveryDate: dto.expectedDeliveryDate,
      paymentTerms: dto.paymentTerms,
      currency: dto.currency || 'LKR',
      status: shouldSubmit ? 'PENDING_APPROVAL' : 'DRAFT',
      items: calculated.items,
      subtotal: calculated.subtotal,
      totalDiscount: calculated.totalDiscount,
      taxTotal: calculated.taxTotal,
      shippingCharges: calculated.shippingCharges,
      otherCharges: calculated.otherCharges,
      grandTotal: calculated.grandTotal,
      notes: dto.notes,
      deliveryInstructions: dto.deliveryInstructions,
      createdBy: user.id,
      createdByName: `${user.name} (${user.role})`,
    });

    if (shouldSubmit) {
      const approvalReq = await approvalService.createApprovalRequest({
        documentType: 'PURCHASE_ORDER',
        documentId: newPO.id,
        documentReferenceNumber: newPO.poNumber,
        title: `Purchase Order Approval (${newPO.poNumber})`,
        description: `Purchase Order for ${newPO.supplierName} totaling LKR ${newPO.grandTotal.toLocaleString()} submitted for internal approval.`,
        initiatorId: user.id,
        initiatorName: `${user.name} (${user.role})`,
        initiatorRole: user.role,
        currentApproverRole: targetApproverRole,
        isSpecialScenario: calculated.grandTotal > 500000,
        specialReason:
          calculated.grandTotal > 500000
            ? 'Order value exceeds standard manager approval limit of LKR 500,000.'
            : undefined,
        status: 'PENDING',
        history: [
          {
            id: `h-po-${Date.now().toString().slice(-4)}`,
            stepNumber: 1,
            actorId: user.id,
            actorName: user.name,
            actorRole: user.role,
            action: 'APPROVE',
            fromStatus: 'DRAFT',
            toStatus: 'PENDING_APPROVAL',
            comment: 'Submitted for managerial authorization.',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      return this.repo.update(newPO.id, {
        approvalRequestId: approvalReq.id,
      });
    }

    return newPO;
  }

  async updatePurchaseOrder(
    id: string,
    dto: Partial<CreatePurchaseOrderDTO>,
    user: User
  ): Promise<PurchaseOrder> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new Error(`Purchase order ${id} not found.`);
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new Error(`Cannot modify Purchase Order in status '${existing.status}'.`);
    }

    let calculated: CalculatedOrderSummary | undefined;
    if (dto.items) {
      calculated = this.calculateTotals(
        dto.items,
        dto.shippingCharges ?? existing.shippingCharges,
        dto.otherCharges ?? existing.otherCharges
      );
    }

    const updates: Partial<PurchaseOrder> = {
      ...(dto.supplierId && { supplierId: dto.supplierId }),
      ...(dto.supplierName && { supplierName: dto.supplierName }),
      ...(dto.supplierCode && { supplierCode: dto.supplierCode }),
      ...(dto.supplierContactPerson && { supplierContactPerson: dto.supplierContactPerson }),
      ...(dto.supplierEmail && { supplierEmail: dto.supplierEmail }),
      ...(dto.supplierPhone && { supplierPhone: dto.supplierPhone }),
      ...(dto.supplierAddress && { supplierAddress: dto.supplierAddress }),
      ...(dto.supplierVatNumber && { supplierVatNumber: dto.supplierVatNumber }),
      ...(dto.orderDate && { orderDate: dto.orderDate }),
      ...(dto.expectedDeliveryDate && { expectedDeliveryDate: dto.expectedDeliveryDate }),
      ...(dto.paymentTerms && { paymentTerms: dto.paymentTerms }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.deliveryInstructions !== undefined && { deliveryInstructions: dto.deliveryInstructions }),
      ...(calculated && {
        items: calculated.items,
        subtotal: calculated.subtotal,
        totalDiscount: calculated.totalDiscount,
        taxTotal: calculated.taxTotal,
        shippingCharges: calculated.shippingCharges,
        otherCharges: calculated.otherCharges,
        grandTotal: calculated.grandTotal,
      }),
    };

    return this.repo.update(id, updates);
  }

  async submitForApproval(id: string, user: User): Promise<PurchaseOrder> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new Error(`Purchase order ${id} not found.`);
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new Error(`Cannot submit Purchase Order in '${existing.status}' status.`);
    }

    const targetApproverRole: UserRole = existing.grandTotal > 500000 ? 'DIRECTOR' : 'MANAGER';

    const approvalReq = await approvalService.createApprovalRequest({
      documentType: 'PURCHASE_ORDER',
      documentId: existing.id,
      documentReferenceNumber: existing.poNumber,
      title: `Purchase Order Approval (${existing.poNumber})`,
      description: `Purchase Order for ${existing.supplierName} totaling LKR ${existing.grandTotal.toLocaleString()} submitted for internal approval.`,
      initiatorId: user.id,
      initiatorName: `${user.name} (${user.role})`,
      initiatorRole: user.role,
      currentApproverRole: targetApproverRole,
      isSpecialScenario: existing.grandTotal > 500000,
      specialReason:
        existing.grandTotal > 500000
          ? 'Order value exceeds standard manager approval limit of LKR 500,000.'
          : undefined,
      status: 'PENDING',
      history: [
        {
          id: `h-po-${Date.now().toString().slice(-4)}`,
          stepNumber: 1,
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          action: 'APPROVE',
          fromStatus: existing.status,
          toStatus: 'PENDING_APPROVAL',
          comment: 'Submitted for internal review and manager authorization.',
          timestamp: new Date().toISOString(),
        },
      ],
    });

    return this.repo.update(id, {
      status: 'PENDING_APPROVAL',
      approvalRequestId: approvalReq.id,
      rejectionReason: undefined,
    });
  }

  async markAsSentToSupplier(id: string, user: User): Promise<PurchaseOrder> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new Error(`Purchase order ${id} not found.`);
    }

    if (existing.status !== 'APPROVED') {
      throw new Error(`Only approved purchase orders can be sent to suppliers. Current status: ${existing.status}`);
    }

    return this.repo.update(id, {
      status: 'SENT_TO_SUPPLIER',
      sentAt: new Date().toISOString(),
    });
  }

  async deletePurchaseOrder(id: string): Promise<boolean> {
    const existing = await this.repo.getById(id);
    if (!existing) return false;
    if (existing.status !== 'DRAFT') {
      throw new Error('Only draft purchase orders can be deleted.');
    }
    return this.repo.delete(id);
  }
}

export const purchaseOrderService = new PurchaseOrderService();
