import { orderService } from './OrderService';
import {
  DeliveryNote,
  DeliveryNoteItem,
  CreateDeliveryNotePayload,
  SubmitRejectionPayload,
  SubmitDeliveryOutcomePayload,
  ReturnedUnitDetail,
  DeliveryNoteStatus,
} from '../types/deliveryNote';
import { MOCK_DELIVERY_NOTES } from '../mock/mockDeliveryNotes';
import { MOCK_INVOICES } from '../mock/mockInvoices';
import { Invoice } from '../types/invoice';
import { SalesOrder } from '../types/order';
import { User } from '../types/auth';

const STORAGE_KEY = 'dns_delivery_notes_v1';

export interface EligibleOrderForDispatch {
  order: SalesOrder;
  remainingQuantities: Record<string, number>; // productId -> remaining qty
  totalRemainingQty: number;
}

export class DeliveryNoteService {
  private notes: DeliveryNote[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.notes = JSON.parse(stored);
        return;
      }
    } catch {
      // Fallback
    }
    this.notes = [...MOCK_DELIVERY_NOTES];
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes));
    } catch {
      // Ignored in non-browser envs
    }
  }

  public resetToDefaults() {
    this.notes = JSON.parse(JSON.stringify(MOCK_DELIVERY_NOTES));
    this.persist();
  }

  async getAll(filters?: {
    status?: DeliveryNoteStatus | 'ALL';
    search?: string;
  }): Promise<DeliveryNote[]> {
    let result = [...this.notes];

    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter((n) => n.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.deliveryNoteNumber?.toLowerCase().includes(q) ||
          n.orderNumber?.toLowerCase().includes(q) ||
          n.invoiceNumber?.toLowerCase().includes(q) ||
          n.customerName?.toLowerCase().includes(q) ||
          n.customerCode?.toLowerCase().includes(q) ||
          n.driverName?.toLowerCase().includes(q) ||
          n.vehicleNumber?.toLowerCase().includes(q)
      );
    }

    return result.filter(Boolean).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getById(id: string): Promise<DeliveryNote | null> {
    const found = this.notes.find((n) => n.id === id || n.deliveryNoteNumber === id);
    return found ? { ...found } : null;
  }

  async getDeliveryNoteById(id: string): Promise<DeliveryNote | null> {
    return this.getById(id);
  }

  async getByOrderId(orderId: string): Promise<DeliveryNote[]> {
    return this.notes.filter(
      (n) => n.orderId === orderId || n.orderNumber === orderId
    );
  }

  async addDeliveryNote(note: DeliveryNote): Promise<DeliveryNote> {
    const exists = this.notes.findIndex((n) => n.id === note.id || n.deliveryNoteNumber === note.deliveryNoteNumber);
    if (exists >= 0) {
      this.notes[exists] = note;
    } else {
      this.notes.unshift(note);
    }
    this.persist();
    return note;
  }

  /**
   * Retrieves eligible approved orders for Delivery Note creation.
   * Sorted strictly:
   * 1. Orders with scheduled delivery dates first, sorted by earliest date.
   * 2. Orders without delivery dates at the bottom, sorted by creation date desc.
   */
  async getEligibleOrdersForDispatch(): Promise<EligibleOrderForDispatch[]> {
    const ordersRes = await orderService.listOrders({ pageSize: 1000 });
    const allOrders = ordersRes.data || [];

    // Filter to only APPROVED or partially DISPATCHED orders, excluding CLOSED/CANCELLED
    const approvedOrders = allOrders.filter(
      (o) =>
        (o.status === 'APPROVED' || o.status === 'DISPATCHED' || o.status === 'PICKING') &&
        o.status !== 'CLOSED' &&
        o.status !== 'CANCELLED'
    );

    const eligibleList: EligibleOrderForDispatch[] = [];

    for (const order of approvedOrders) {
      // Calculate already dispatched / delivered quantities from existing Delivery Notes
      const existingNotes = this.notes.filter(
        (n) =>
          (n.orderId === order.id || n.orderNumber === order.orderNumber) &&
          n.status !== 'CANCELLED'
      );

      const dispatchedCountByProduct: Record<string, number> = {};
      for (const dn of existingNotes) {
        for (const item of dn.items) {
          dispatchedCountByProduct[item.productId] =
            (dispatchedCountByProduct[item.productId] || 0) + (item.dispatchedQuantity || item.unitBarcodes?.length || 0);
        }
      }

      const remainingQuantities: Record<string, number> = {};
      let totalRemaining = 0;

      for (const lineItem of order.items || []) {
        const ordered = lineItem.orderedQuantity || lineItem.approvedQuantity || 0;
        const alreadyDispatched = dispatchedCountByProduct[lineItem.productId] || 0;
        const remaining = Math.max(0, ordered - alreadyDispatched);
        remainingQuantities[lineItem.productId] = remaining;
        totalRemaining += remaining;
      }

      if (totalRemaining > 0) {
        eligibleList.push({
          order,
          remainingQuantities,
          totalRemainingQty: totalRemaining,
        });
      }
    }

    // Sort:
    // 1. Orders with requestedDeliveryDate first, sorted chronologically (earliest first)
    // 2. Orders without delivery dates at the bottom, sorted by createdAt desc
    eligibleList.sort((a, b) => {
      const dateA = a.order.requestedDeliveryDate;
      const dateB = b.order.requestedDeliveryDate;

      if (dateA && dateB) {
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      }
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;

      // Both have no delivery date -> sort by createdAt desc
      return new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime();
    });

    return eligibleList;
  }

  /**
   * Backwards-compatibility: Retrieves invoices eligible for delivery note generation.
   */
  async getDraftInvoices(): Promise<Invoice[]> {
    const ordersRes = await orderService.listOrders({ pageSize: 1000 });
    const closedOrderIds = new Set(
      (ordersRes.data || []).filter((o) => o.status === 'CLOSED').map((o) => o.id)
    );
    return MOCK_INVOICES.filter(
      (inv) => (inv.status === 'DRAFT' || inv.status === 'ISSUED') && (!inv.orderId || !closedOrderIds.has(inv.orderId))
    );
  }

  /**
   * Generates realistic mock unit barcodes for quick scanning or simulation when picking from stock.
   */
  getSuggestedStockBarcodes(sku: string, neededCount: number): string[] {
    const cleanSku = (sku || 'ITEM').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    const result: string[] = [];
    const seqBase = Math.floor(100 + Math.random() * 800);
    for (let i = 1; i <= neededCount; i++) {
      const unitIdx = String(i).padStart(3, '0');
      result.push(`DNS-${cleanSku}-WH${seqBase}-${unitIdx}`);
    }
    return result;
  }

  /**
   * Creates a new Delivery Note from an approved sales order with scanned physical unit barcodes.
   */
  async createDeliveryNote(
    payload: CreateDeliveryNotePayload,
    currentUser: User
  ): Promise<DeliveryNote> {
    const targetOrderId = payload.orderId;
    let targetOrder: SalesOrder | null = null;

    if (targetOrderId) {
      targetOrder = await orderService.getOrderById(targetOrderId);
      if (targetOrder && targetOrder.status === 'CLOSED') {
        throw new Error(
          `Cannot create delivery note: Sales Order ${targetOrder.orderNumber} is closed. No further deliveries allowed.`
        );
      }
      if (targetOrder && targetOrder.status === 'CANCELLED') {
        throw new Error(
          `Cannot create delivery note: Sales Order ${targetOrder.orderNumber} is cancelled.`
        );
      }
    }

    const year = new Date().getFullYear();
    const seq = String(this.notes.length + 1).padStart(4, '0');
    const deliveryNoteNumber = `DN-${year}-${seq}`;

    let totalDispatchedUnits = 0;

    const deliveryItems: DeliveryNoteItem[] = payload.items.map((i, idx) => {
      const dispatchQty = i.unitBarcodes.length;
      totalDispatchedUnits += dispatchQty;

      return {
        id: `dn-item-${Date.now().toString().slice(-4)}-${idx + 1}`,
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        uom: i.uom || 'PCS',
        invoicedQuantity: i.invoicedQuantity ?? dispatchQty,
        dispatchedQuantity: dispatchQty,
        unitBarcodes: [...i.unitBarcodes],
        acceptedQuantity: dispatchQty, // Initially assumed all dispatched
        rejectedQuantity: 0,
        damagedQuantity: 0,
        reusableQuantity: 0,
        rejectedUnitBarcodes: [],
        damagedUnitBarcodes: [],
        reusableUnitBarcodes: [],
      };
    });

    const newNote: DeliveryNote = {
      id: `dn-${Date.now()}`,
      deliveryNoteNumber,
      invoiceId: payload.invoiceId,
      orderId: targetOrder?.id || payload.orderId,
      orderNumber: targetOrder?.orderNumber || payload.orderNumber,
      customerId: targetOrder?.customerId || payload.customerId || 'cust-001',
      customerName: targetOrder?.customerNameSnapshot || payload.customerName || 'General Customer',
      customerCode: targetOrder?.customerCodeSnapshot || payload.customerCode || 'GEN-001',
      customerAddress: targetOrder?.deliveryAddress || payload.customerAddress,
      customerPhone: targetOrder?.customerPhoneSnapshot || payload.customerPhone,
      driverName: payload.driverName,
      driverPhone: payload.driverPhone,
      vehicleNumber: payload.vehicleNumber.toUpperCase(),
      dispatchDate: payload.dispatchDate || new Date().toISOString().split('T')[0],
      deliveryRoute: payload.deliveryRoute,
      notes: payload.notes,
      status: 'DISPATCHED',
      items: deliveryItems,
      totalDispatchedUnits,
      totalAcceptedUnits: totalDispatchedUnits,
      totalRejectedUnits: 0,
      totalDamagedUnits: 0,
      totalReusableUnits: 0,
      isLocked: true,
      createdBy: `${currentUser.name} (${currentUser.role || 'Stock Keeper'})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If order was APPROVED, mark it DISPATCHED
    if (targetOrder && targetOrder.status === 'APPROVED') {
      try {
        await orderService.updateOrderStatus(targetOrder.id, 'DISPATCHED' as any, {
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role as any,
          comment: `Order partially or fully dispatched via Delivery Note ${deliveryNoteNumber}`,
        });
      } catch {
        // Fallback for mock environments
      }
    }

    this.notes.unshift(newNote);
    this.persist();
    return newNote;
  }

  /**
   * Confirms 100% acceptance when no customer rejections occurred.
   */
  async confirmFullyDelivered(
    id: string,
    customerSignatureName: string = 'Authorized Customer Representative'
  ): Promise<DeliveryNote> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new Error(`Delivery Note ${id} not found.`);
    }

    note.status = 'DELIVERED';
    note.customerSignatureName = customerSignatureName;
    note.customerSignedAt = new Date().toISOString();
    note.receivedInGoodCondition = true;
    note.totalAcceptedUnits = note.totalDispatchedUnits;
    note.totalRejectedUnits = 0;
    note.totalDamagedUnits = 0;
    note.totalReusableUnits = 0;
    note.updatedAt = new Date().toISOString();

    note.items = note.items.map((item) => ({
      ...item,
      acceptedQuantity: item.dispatchedQuantity,
      rejectedQuantity: 0,
      damagedQuantity: 0,
      reusableQuantity: 0,
      rejectedUnitBarcodes: [],
      damagedUnitBarcodes: [],
      reusableUnitBarcodes: [],
    }));

    this.persist();
    return { ...note };
  }

  /**
   * Submits a combined delivery outcome (delivered + returns with damaged/reusable classification).
   * Two-step approval:
   * Stock Keeper submits -> status = REJECTION_PENDING_APPROVAL. Units stay DISPATCHED.
   * Stock Manager / Manager / Director can self-approve directly.
   */
  async submitDeliveryOutcome(
    payload: SubmitDeliveryOutcomePayload,
    currentUser: User
  ): Promise<DeliveryNote> {
    const note = this.notes.find((n) => n.id === payload.deliveryNoteId);
    if (!note) {
      throw new Error(`Delivery Note ${payload.deliveryNoteId} not found.`);
    }

    let overallDelivered = 0;
    let overallRejected = 0;
    let overallDamaged = 0;
    let overallReusable = 0;

    note.items = note.items.map((item) => {
      const summary = payload.productSummary.find((s) => s.productId === item.productId);
      if (summary) {
        const damagedBarcodes = payload.returnedUnits
          .filter((u) => u.productId === item.productId && u.condition === 'DAMAGED')
          .map((u) => u.barcode);
        const reusableBarcodes = payload.returnedUnits
          .filter((u) => u.productId === item.productId && u.condition === 'REUSABLE')
          .map((u) => u.barcode);

        overallDelivered += summary.deliveredQuantity;
        overallRejected += summary.returnedQuantity;
        overallDamaged += summary.damagedQuantity;
        overallReusable += summary.reusableQuantity;

        return {
          ...item,
          acceptedQuantity: summary.deliveredQuantity,
          rejectedQuantity: summary.returnedQuantity,
          damagedQuantity: summary.damagedQuantity,
          reusableQuantity: summary.reusableQuantity,
          rejectedUnitBarcodes: [...damagedBarcodes, ...reusableBarcodes],
          damagedUnitBarcodes: damagedBarcodes,
          reusableUnitBarcodes: reusableBarcodes,
          rejectionReason: summary.damagedQuantity > 0 ? 'DAMAGED' : 'CUSTOMER_REFUSED',
          rejectionNotes: payload.notes,
        };
      }
      return item;
    });

    note.totalAcceptedUnits = overallDelivered;
    note.totalRejectedUnits = overallRejected;
    note.totalDamagedUnits = overallDamaged;
    note.totalReusableUnits = overallReusable;
    note.returnedUnitsDetail = payload.returnedUnits;
    note.updatedAt = new Date().toISOString();

    const isStockManager =
      currentUser.role === 'STOCK_MANAGER' ||
      currentUser.role === 'MANAGER' ||
      currentUser.role === 'DIRECTOR';

    if (isStockManager) {
      // Direct approval by Stock Manager
      note.status = overallRejected > 0 && overallDelivered > 0
        ? 'PARTIALLY_REJECTED'
        : overallRejected > 0
          ? 'REJECTED'
          : 'DELIVERED';
      note.rejectionApprovedBy = `${currentUser.name} (${currentUser.role || 'Stock Manager'})`;
      note.rejectionApprovedAt = new Date().toISOString();
      note.rejectionApprovalRemarks = 'Direct customer rejection processing by Stock Manager.';
      delete note.rejectionApprovalRequest;
      await this.executeRejectionStockAdjustment(note, currentUser);
    } else {
      // Stock Keeper submission -> Requires Stock Manager approval
      note.status = 'REJECTION_PENDING_APPROVAL';
      note.rejectionSubmittedBy = `${currentUser.name} (${currentUser.role || 'Stock Keeper'})`;
      note.rejectionSubmittedAt = new Date().toISOString();
      note.rejectionNotes = payload.notes;
      note.rejectionApprovalRequest = {
        id: `req-${Date.now()}`,
        deliveryNoteId: note.id,
        deliveryNoteNumber: note.deliveryNoteNumber,
        customerId: note.customerId,
        customerName: note.customerName,
        submittedBy: `${currentUser.name} (${currentUser.role || 'Stock Keeper'})`,
        submittedById: currentUser.id,
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
        totalUnits: overallRejected,
        totalDeliveredUnits: overallDelivered,
        totalDamagedUnits: overallDamaged,
        totalReusableUnits: overallReusable,
        items: payload.productSummary
          .filter((s) => s.returnedQuantity > 0)
          .map((s) => ({
            productId: s.productId,
            productName: note.items.find((i) => i.productId === s.productId)?.productName || 'Product',
            sku: note.items.find((i) => i.productId === s.productId)?.sku || '',
            rejectedBarcodes: payload.returnedUnits
              .filter((u) => u.productId === s.productId)
              .map((u) => u.barcode),
            damagedBarcodes: payload.returnedUnits
              .filter((u) => u.productId === s.productId && u.condition === 'DAMAGED')
              .map((u) => u.barcode),
            reusableBarcodes: payload.returnedUnits
              .filter((u) => u.productId === s.productId && u.condition === 'REUSABLE')
              .map((u) => u.barcode),
            reason: s.damagedQuantity > 0 ? 'DAMAGED' : 'CUSTOMER_REFUSED',
            notes: payload.notes,
          })),
        returnedUnitsDetail: payload.returnedUnits,
      };
    }

    this.persist();
    return { ...note };
  }

  /**
   * Backwards-compatibility wrapper for legacy submitRejection.
   */
  async submitRejection(
    id: string,
    payload: SubmitRejectionPayload,
    currentUser: User
  ): Promise<DeliveryNote> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) throw new Error(`Delivery Note ${id} not found.`);

    const returnedUnits: ReturnedUnitDetail[] = [];
    const productSummary = note.items.map((item) => {
      const match = payload.rejectedItems.find((r) => r.productId === item.productId);
      const returnedQty = match ? match.rejectedBarcodes.length : 0;
      const damagedQty = match?.damagedBarcodes?.length || (match?.reason === 'DAMAGED' ? returnedQty : 0);
      const reusableQty = returnedQty - damagedQty;

      if (match) {
        match.rejectedBarcodes.forEach((bc) => {
          const isDamaged = match.damagedBarcodes?.includes(bc) || match.reason === 'DAMAGED';
          returnedUnits.push({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            barcode: bc,
            condition: isDamaged ? 'DAMAGED' : 'REUSABLE',
            reason: match.reason,
            notes: match.notes,
          });
        });
      }

      return {
        productId: item.productId,
        dispatchedQuantity: item.dispatchedQuantity,
        deliveredQuantity: Math.max(0, item.dispatchedQuantity - returnedQty),
        returnedQuantity: returnedQty,
        damagedQuantity: damagedQty,
        reusableQuantity: reusableQty,
      };
    });

    return this.submitDeliveryOutcome(
      {
        deliveryNoteId: id,
        deliveredUnitIds: [],
        returnedUnits,
        productSummary,
        notes: payload.notes,
        submittedBy: currentUser.name,
      },
      currentUser
    );
  }

  /**
   * Stock Manager approves the customer rejection and finalizes stock movements.
   */
  async approveRejection(
    id: string,
    approver: User,
    remarks: string = 'Rejection approved by warehouse operations manager.'
  ): Promise<DeliveryNote> {
    if (
      approver.role === 'STOCK_KEEPER' ||
      (approver.role !== 'STOCK_MANAGER' && approver.role !== 'MANAGER' && approver.role !== 'DIRECTOR')
    ) {
      throw new Error(
        `Role '${approver.role}' is not authorized to approve delivery note rejections. Requires STOCK_MANAGER authorization.`
      );
    }
    const note = this.notes.find((n) => n.id === id);
    if (!note) throw new Error(`Delivery Note ${id} not found.`);

    if (note.status !== 'REJECTION_PENDING_APPROVAL') {
      throw new Error(
        `Cannot approve: Delivery Note ${note.deliveryNoteNumber || id} is not pending rejection approval (current status: ${note.status}).`
      );
    }

    const hasDelivered = (note.totalAcceptedUnits || 0) > 0;
    const hasRejected = (note.totalRejectedUnits || 0) > 0;

    note.status = hasDelivered && hasRejected
      ? 'PARTIALLY_REJECTED'
      : hasRejected
        ? 'REJECTED'
        : 'DELIVERED';

    note.rejectionApprovedBy = `${approver.name} (${approver.role || 'Operations Manager'})`;
    note.rejectionApprovedAt = new Date().toISOString();
    note.rejectionApprovalRemarks = remarks;
    note.updatedAt = new Date().toISOString();

    if (note.rejectionApprovalRequest) {
      note.rejectionApprovalRequest.status = 'APPROVED';
      note.rejectionApprovalRequest.reviewedBy = approver.name;
      note.rejectionApprovalRequest.reviewedById = approver.id;
      note.rejectionApprovalRequest.reviewedAt = new Date().toISOString();
      note.rejectionApprovalRequest.remarks = remarks;
    }

    await this.executeRejectionStockAdjustment(note, approver);

    this.persist();
    return { ...note };
  }

  /**
   * Stock Manager declines the customer rejection.
   */
  async declineRejection(
    id: string,
    approver: User,
    remarks: string = 'Rejection declined. Re-inspection required.'
  ): Promise<DeliveryNote> {
    if (
      approver.role === 'STOCK_KEEPER' ||
      (approver.role !== 'STOCK_MANAGER' && approver.role !== 'MANAGER' && approver.role !== 'DIRECTOR')
    ) {
      throw new Error(
        `Role '${approver.role}' is not authorized to decline delivery note rejections. Requires STOCK_MANAGER authorization.`
      );
    }
    const note = this.notes.find((n) => n.id === id);
    if (!note) throw new Error(`Delivery Note ${id} not found.`);

    if (note.status !== 'REJECTION_PENDING_APPROVAL') {
      throw new Error(
        `Cannot decline: Delivery Note ${note.deliveryNoteNumber || id} is not pending rejection approval (current status: ${note.status}).`
      );
    }

    note.status = 'REJECTION_DECLINED';
    note.rejectionApprovedBy = `${approver.name} (${approver.role || 'Operations Manager'})`;
    note.rejectionApprovedAt = new Date().toISOString();
    note.rejectionApprovalRemarks = remarks;
    note.updatedAt = new Date().toISOString();

    if (note.rejectionApprovalRequest) {
      note.rejectionApprovalRequest.status = 'DECLINED';
      note.rejectionApprovalRequest.reviewedBy = approver.name;
      note.rejectionApprovalRequest.reviewedById = approver.id;
      note.rejectionApprovalRequest.reviewedAt = new Date().toISOString();
      note.rejectionApprovalRequest.remarks = remarks;
    }

    this.persist();
    return { ...note };
  }

  /**
   * Requests cancellation of a dispatched Delivery Note.
   * Requires Stock Manager review & approval.
   */
  async requestCancellation(
    id: string,
    reason: string,
    user: User
  ): Promise<DeliveryNote> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) throw new Error(`Delivery Note ${id} not found.`);

    if (note.status !== 'DISPATCHED') {
      throw new Error(`Only DISPATCHED delivery notes can be cancelled. Current status is ${note.status}.`);
    }

    note.status = 'CANCELLATION_PENDING';
    note.cancellationRequestedBy = `${user.name} (${user.role || 'User'})`;
    note.cancellationRequestedAt = new Date().toISOString();
    note.cancellationReason = reason;
    note.updatedAt = new Date().toISOString();

    this.persist();
    return { ...note };
  }

  /**
   * Stock Manager approves cancellation of the Delivery Note.
   */
  async approveCancellation(
    id: string,
    approver: User,
    remarks: string = 'Cancellation approved. Dispatched units returned to stock.'
  ): Promise<DeliveryNote> {
    if (
      approver.role !== 'STOCK_MANAGER' &&
      approver.role !== 'MANAGER' &&
      approver.role !== 'DIRECTOR'
    ) {
      throw new Error(`Only Stock Managers or Directors can approve Delivery Note cancellations.`);
    }

    const note = this.notes.find((n) => n.id === id);
    if (!note) throw new Error(`Delivery Note ${id} not found.`);

    if (note.status !== 'CANCELLATION_PENDING' && note.status !== 'DISPATCHED') {
      throw new Error(`Delivery Note ${note.deliveryNoteNumber} cannot be cancelled in status ${note.status}.`);
    }

    note.status = 'CANCELLED';
    note.cancellationApprovedBy = `${approver.name} (${approver.role || 'Stock Manager'})`;
    note.cancellationApprovedAt = new Date().toISOString();
    note.cancellationApprovalRemarks = remarks;
    note.updatedAt = new Date().toISOString();

    // Revert inventory balances: return dispatched units back to available / reserved
    try {
      const { inventoryService } = await import('./InventoryService');
      const repo = (inventoryService as any).repo;
      if (repo) {
        for (const item of note.items) {
          const balance = await repo.getBalance(item.productId, 'WH-MAIN');
          if (balance) {
            balance.availableQuantity = (balance.availableQuantity || 0) + item.dispatchedQuantity;
            balance.lastUpdated = new Date().toISOString();
            await repo.saveBalance(balance);
          }
        }
      }
    } catch {}

    this.persist();
    return { ...note };
  }

  /**
   * Stock Manager declines cancellation of the Delivery Note.
   */
  async declineCancellation(
    id: string,
    approver: User,
    remarks: string = 'Cancellation request declined. Delivery note remains in dispatch.'
  ): Promise<DeliveryNote> {
    if (
      approver.role !== 'STOCK_MANAGER' &&
      approver.role !== 'MANAGER' &&
      approver.role !== 'DIRECTOR'
    ) {
      throw new Error(`Only Stock Managers or Directors can decline Delivery Note cancellations.`);
    }

    const note = this.notes.find((n) => n.id === id);
    if (!note) throw new Error(`Delivery Note ${id} not found.`);

    if (note.status !== 'CANCELLATION_PENDING') {
      throw new Error(`Delivery Note ${note.deliveryNoteNumber} is not pending cancellation approval.`);
    }

    note.status = 'DISPATCHED';
    note.cancellationApprovalRemarks = remarks;
    note.updatedAt = new Date().toISOString();

    this.persist();
    return { ...note };
  }

  /**
   * Internal helper to execute atomic stock adjustments and inventory movements upon approval
   */
  private async executeRejectionStockAdjustment(note: DeliveryNote, approver: User): Promise<void> {
    for (const item of note.items) {
      const damagedQty = item.damagedQuantity || 0;
      const reusableQty = item.reusableQuantity || 0;

      try {
        const { inventoryService } = await import('./InventoryService');
        const repo = (inventoryService as any).repo;
        if (repo) {
          let balance = await repo.getBalance(item.productId, 'WH-MAIN');
          if (!balance) {
            const allBalances = await repo.getAllBalances();
            balance =
              allBalances.find((b: any) => b.productId === item.productId && b.locationType === 'WAREHOUSE') ||
              allBalances.find((b: any) => b.productId === item.productId);
          }

          if (balance) {
            // Reusable customer returns go back to available stock
            if (reusableQty > 0) {
              balance.availableQuantity = (balance.availableQuantity || 0) + reusableQty;
            }
            // Damaged units go to damaged stock
            if (damagedQty > 0) {
              balance.damagedQuantity = (balance.damagedQuantity || 0) + damagedQty;
            }
            balance.lastUpdated = new Date().toISOString();
            await repo.saveBalance(balance);
          }

          if (damagedQty > 0) {
            await repo.addMovement({
              id: `mov-dam-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: item.productId,
              sourceLocation: 'CUSTOMER_RETURN',
              targetLocation: 'DAMAGED_QUARANTINE',
              quantity: damagedQty,
              movementType: 'DAMAGE_WRITE_OFF',
              referenceDocumentType: 'DELIVERY_NOTE_REJECTION',
              referenceDocumentId: note.deliveryNoteNumber,
              performedById: approver.id,
              performedByName: approver.name,
              reason: `Customer return (Damaged): Quarantined. Order re-reservation active.`,
              timestamp: new Date().toISOString(),
            });
          }

          if (reusableQty > 0) {
            await repo.addMovement({
              id: `mov-reu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: item.productId,
              sourceLocation: 'CUSTOMER_RETURN',
              targetLocation: 'WH-MAIN',
              quantity: reusableQty,
              movementType: 'SALES_RETURN',
              referenceDocumentType: 'DELIVERY_NOTE_REJECTION',
              referenceDocumentId: note.deliveryNoteNumber,
              performedById: approver.id,
              performedByName: approver.name,
              reason: `Customer return (Reusable): Restocked to available with order re-reservation.`,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.warn('executeRejectionStockAdjustment error:', err);
      }
    }
  }
}

export const deliveryNoteService = new DeliveryNoteService();
