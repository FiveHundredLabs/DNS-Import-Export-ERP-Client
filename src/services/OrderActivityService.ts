import {
  SalesOrder,
  OrderActivityEvent,
  OrderProductModificationDetail,
  StockReservationDetail,
  DeliveryNoteDetail,
  DispatchDetail,
  ProductReturnDetail,
  ReplacementDispatchDetail,
  InvoiceIssuanceDetail,
} from '../types/order';
import { User } from '../types/auth';
import { orderService } from './OrderService';
import { invoiceService } from './InvoiceService';
import { paymentService } from './PaymentService';
import { quotationService } from './QuotationService';

export interface UserActivityItem {
  id: string;
  timestamp: string;
  category: 'ORDER' | 'PAYMENT' | 'QUOTATION' | 'APPROVAL';
  action: string;
  title: string;
  description: string;
  referenceNumber: string;
  customerName: string;
  customerCode?: string;
  amount?: number;
  statusBadge: {
    label: string;
    variant: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'purple' | 'cyan';
  };
  link: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  comment?: string;
}

export class OrderActivityService {
  /**
   * Returns a complete, chronologically sorted activity log for an order.
   * If the order already contains an explicit `activityLog`, it returns it.
   * Otherwise, it synthesizes a comprehensive chronological log based on the order's
   * state, approval history, and fulfillment milestones so that every order has a rich timeline.
   */
  getOrderActivityTimeline(order: SalesOrder): OrderActivityEvent[] {
    if (order.activityLog && order.activityLog.length > 0) {
      return [...order.activityLog].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }

    return this.synthesizeDefaultTimeline(order);
  }

  /**
   * Helper that constructs an initial timeline from basic SalesOrder fields if
   * an explicit activityLog wasn't saved yet.
   */
  synthesizeDefaultTimeline(order: SalesOrder): OrderActivityEvent[] {
    const events: OrderActivityEvent[] = [];
    const baseTime = new Date(order.createdAt).getTime();

    // 1. Order Created
    events.push({
      id: `act-${order.id}-created`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'ORDER_CREATED',
      title: 'Sales Order Created',
      description: `Order ${order.orderNumber} initiated for ${order.customerNameSnapshot}. Total value: LKR ${order.totalAmount.toLocaleString()}.`,
      actorId: order.salesRepId,
      actorName: order.salesRepNameSnapshot,
      actorRole: 'SALES_REP',
      timestamp: order.createdAt,
      statusBadge: { label: 'Created', variant: 'info' },
      comment: order.notes || 'Order placed via Sales Representative mobile portal.',
    });

    // 2. Process approvalHistory entries
    if (order.approvalHistory && order.approvalHistory.length > 0) {
      order.approvalHistory.forEach((h, index) => {
        const hTime = h.timestamp || new Date(baseTime + (index + 1) * 3600000).toISOString();
        if (h.action === 'SUBMIT') {
          events.push({
            id: `act-${h.id}-submit`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            type: 'SUBMITTED_FOR_APPROVAL',
            title: 'Submitted for Area Manager Approval',
            description: `Order submitted by ${h.actorName}. Route assigned to immediate supervisor: Area Manager.`,
            actorId: h.actorId,
            actorName: h.actorName,
            actorRole: h.actorRole,
            timestamp: hTime,
            statusBadge: { label: 'Pending Approval', variant: 'warning' },
            currentApproverRole: 'AREA_MANAGER',
            currentApproverName: 'Nimal Bandara (Area Manager)',
            comment: h.comment || 'Submitted for regular area authorization.',
          });
        } else if (h.action === 'ESCALATE') {
          events.push({
            id: `act-${h.id}-escalate`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            type: 'APPROVAL_ESCALATED',
            title: `Approval Escalated to ${h.targetRole || 'Sales Manager'}`,
            description: `Approval forwarded to senior management due to commercial parameters (credit limit or discount).`,
            actorId: h.actorId,
            actorName: h.actorName,
            actorRole: h.actorRole,
            timestamp: hTime,
            statusBadge: { label: 'Special Approval', variant: 'purple' },
            currentApproverRole: h.targetRole || 'SALES_MANAGER',
            targetApproverRole: h.targetRole || 'SALES_MANAGER',
            comment: h.comment,
          });
        } else if (h.action === 'APPROVE') {
          events.push({
            id: `act-${h.id}-approve`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            type: 'ORDER_APPROVED',
            title: 'Order Approved',
            description: `Commercial review completed and authorized by ${h.actorName} (${h.actorRole}).`,
            actorId: h.actorId,
            actorName: h.actorName,
            actorRole: h.actorRole,
            timestamp: hTime,
            statusBadge: { label: 'Approved', variant: 'success' },
            comment: h.comment || 'Approved within permitted commercial and credit guidelines.',
          });

          // 4. Automatic Stock Reservation immediately after approval
          const reserveTime = new Date(new Date(hTime).getTime() + 120000).toISOString();
          const reservations: StockReservationDetail[] = order.items.map((it) => ({
            productId: it.productId,
            productName: it.productNameSnapshot,
            sku: it.skuSnapshot,
            reservedQuantity: it.approvedQuantity || it.orderedQuantity,
            warehouseName: 'Central Logistics Hub (Warehouse-01)',
            reservedAt: reserveTime,
          }));

          events.push({
            id: `act-${order.id}-stock-reserve`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            type: 'STOCK_RESERVED',
            title: 'Automatic Stock Reserved',
            description: `System automatically committed stock for all ${reservations.length} line items across warehouse inventory.`,
            actorId: 'system-bot',
            actorName: 'Inventory Engine (Auto)',
            actorRole: 'SYSTEM',
            timestamp: reserveTime,
            statusBadge: { label: 'Stock Reserved', variant: 'cyan' as any },
            stockReservations: reservations,
            comment: 'Stock locked to prevent allocation to other sales channels.',
          });
        } else if (h.action === 'REJECT') {
          events.push({
            id: `act-${h.id}-reject`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            type: 'ORDER_REJECTED',
            title: 'Order Rejected',
            description: `Order rejected by ${h.actorName}. Reason: ${h.comment || 'Commercial terms rejected.'}`,
            actorId: h.actorId,
            actorName: h.actorName,
            actorRole: h.actorRole,
            timestamp: hTime,
            statusBadge: { label: 'Rejected', variant: 'danger' },
            comment: h.comment,
          });
        }
      });
    }

    // Sort chronologically
    return events.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Records a product & quantity modification before approval by the Area Manager / Sales Manager.
   * Modifies quantities, adds/removes items, recalculates totals, and logs the diff event.
   */
  async recordProductModification(
    orderId: string,
    modifications: {
      items: Array<{
        productId: string;
        orderedQuantity: number;
        requestedDiscountPercentage?: number;
      }>;
      customerContactNotes: string;
    },
    currentUser: User
  ): Promise<SalesOrder> {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    if (order.status !== 'PENDING_APPROVAL' && order.status !== 'SPECIAL_APPROVAL' && order.status !== 'DRAFT') {
      throw new Error('Product modifications are only permitted before approval.');
    }

    // Build diffs
    const oldItemsMap = new Map(order.items.map((i) => [i.productId, i]));
    const added: OrderProductModificationDetail['added'] = [];
    const modified: OrderProductModificationDetail['modified'] = [];
    const removed: OrderProductModificationDetail['removed'] = [];

    const updated = await orderService.updateOrder(
      orderId,
      {
        items: modifications.items,
        saveAsDraft: order.status === 'DRAFT',
      },
      currentUser
    );

    // Compute diffs against updated items
    const newItemsMap = new Map(updated.items.map((i) => [i.productId, i]));

    newItemsMap.forEach((newIt, prodId) => {
      const oldIt = oldItemsMap.get(prodId);
      if (!oldIt) {
        added.push({
          productId: newIt.productId,
          productName: newIt.productNameSnapshot,
          sku: newIt.skuSnapshot,
          quantity: newIt.orderedQuantity,
          unitPrice: newIt.unitPriceSnapshot,
          lineTotal: newIt.lineTotal,
        });
      } else if (oldIt.orderedQuantity !== newIt.orderedQuantity) {
        modified.push({
          productId: newIt.productId,
          productName: newIt.productNameSnapshot,
          sku: newIt.skuSnapshot,
          previousQuantity: oldIt.orderedQuantity,
          newQuantity: newIt.orderedQuantity,
          unitPrice: newIt.unitPriceSnapshot,
          delta: newIt.orderedQuantity - oldIt.orderedQuantity,
        });
      }
    });

    oldItemsMap.forEach((oldIt, prodId) => {
      if (!newItemsMap.has(prodId)) {
        removed.push({
          productId: oldIt.productId,
          productName: oldIt.productNameSnapshot,
          sku: oldIt.skuSnapshot,
          previousQuantity: oldIt.orderedQuantity,
          unitPrice: oldIt.unitPriceSnapshot,
        });
      }
    });

    const diffDetail: OrderProductModificationDetail = {
      added,
      modified,
      removed,
      reason: modifications.customerContactNotes,
    };

    const newEvent: OrderActivityEvent = {
      id: `act-${Date.now()}-prod-mod`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'PRODUCT_MODIFIED',
      title: 'Order Products & Quantities Modified',
      description: `Order modified by ${currentUser.name} (${currentUser.role}) after customer communication.`,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: new Date().toISOString(),
      statusBadge: { label: 'Modified', variant: 'amber' },
      productChanges: diffDetail,
      comment: modifications.customerContactNotes,
    };

    const existingLog = this.getOrderActivityTimeline(updated);
    const updatedLog = [...existingLog, newEvent];

    return await (orderService as any).repo.update(order.id, {
      activityLog: updatedLog,
    });
  }

  /**
   * Approves the order and immediately appends an automatic Stock Reserved event.
   */
  async approveOrderAndReserveStock(
    orderId: string,
    currentUser: User,
    approvalComment: string
  ): Promise<SalesOrder> {
    const approvedOrder = await orderService.approveOrder(orderId, currentUser, approvalComment);

    const now = new Date();
    const reserveTime = new Date(now.getTime() + 5000).toISOString();

    const stockReservations: StockReservationDetail[] = approvedOrder.items.map((it) => ({
      productId: it.productId,
      productName: it.productNameSnapshot,
      sku: it.skuSnapshot,
      reservedQuantity: it.approvedQuantity || it.orderedQuantity,
      warehouseName: 'Central Logistics Hub (Warehouse-01)',
      reservedAt: reserveTime,
    }));

    const approvalEvent: OrderActivityEvent = {
      id: `act-${Date.now()}-approve`,
      orderId: approvedOrder.id,
      orderNumber: approvedOrder.orderNumber,
      type: 'ORDER_APPROVED',
      title: 'Order Approved',
      description: `Commercial terms and product lines approved by ${currentUser.name} (${currentUser.role}).`,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: now.toISOString(),
      statusBadge: { label: 'Approved', variant: 'success' },
      comment: approvalComment,
    };

    const stockReservedEvent: OrderActivityEvent = {
      id: `act-${Date.now() + 1}-stock-reserve`,
      orderId: approvedOrder.id,
      orderNumber: approvedOrder.orderNumber,
      type: 'STOCK_RESERVED',
      title: 'Automatic Stock Reserved',
      description: `Required quantities reserved automatically from Central Warehouse for all ${stockReservations.length} items.`,
      actorId: 'system-bot',
      actorName: 'Stock Engine (Auto)',
      actorRole: 'SYSTEM',
      timestamp: reserveTime,
      statusBadge: { label: 'Stock Reserved', variant: 'info' },
      stockReservations,
      comment: 'Stock locked for customer order delivery fulfillment.',
    };

    const existingLog = this.getOrderActivityTimeline(approvedOrder);
    const updatedLog = [...existingLog, approvalEvent, stockReservedEvent];

    return await (orderService as any).repo.update(approvedOrder.id, {
      activityLog: updatedLog,
    });
  }

  /**
   * Generates a Delivery Note and initiates dispatch by Stock Keeper.
   */
  async recordDeliveryNoteAndDispatch(
    orderId: string,
    dispatchData: {
      deliveryNoteNumber: string;
      vehicleNumber?: string;
      driverName?: string;
      driverPhone?: string;
      notes?: string;
    },
    currentUser: User
  ): Promise<SalesOrder> {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const now = new Date();
    const dnTime = now.toISOString();
    const dispatchTime = new Date(now.getTime() + 15 * 60000).toISOString();

    const deliveryNote: DeliveryNoteDetail = {
      deliveryNoteNumber: dispatchData.deliveryNoteNumber,
      items: order.items.map((it) => ({
        productId: it.productId,
        productName: it.productNameSnapshot,
        sku: it.skuSnapshot,
        quantity: it.approvedQuantity || it.orderedQuantity,
      })),
      stockKeeperId: currentUser.id,
      stockKeeperName: currentUser.name,
      createdAt: dnTime,
    };

    const dispatchDetails: DispatchDetail = {
      dispatchNumber: `DSP-${dispatchData.deliveryNoteNumber.replace('DN-', '')}`,
      deliveryNoteNumber: dispatchData.deliveryNoteNumber,
      vehicleNumber: dispatchData.vehicleNumber || 'WP-GA-4581 (Isuzu ELF)',
      driverName: dispatchData.driverName || 'Sunil Shantha',
      driverPhone: dispatchData.driverPhone || '+94 71 884 9201',
      dispatchedAt: dispatchTime,
      stockKeeperId: currentUser.id,
      stockKeeperName: currentUser.name,
      status: 'DISPATCHED',
      notes: dispatchData.notes || 'Items checked and loaded in delivery vehicle.',
    };

    const dnEvent: OrderActivityEvent = {
      id: `act-${Date.now()}-dn`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'DELIVERY_NOTE_CREATED',
      title: `Delivery Note Generated (${dispatchData.deliveryNoteNumber})`,
      description: `Stock Keeper ${currentUser.name} issued Delivery Note for ${deliveryNote.items.length} line items.`,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: dnTime,
      statusBadge: { label: 'Prepared', variant: 'purple' },
      deliveryNote,
      documentReference: dispatchData.deliveryNoteNumber,
    };

    const dispatchEvent: OrderActivityEvent = {
      id: `act-${Date.now() + 1}-dispatch`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'DISPATCH_INITIATED',
      title: 'Dispatch Initiated by Stock Keeper',
      description: `Dispatched via vehicle ${dispatchDetails.vehicleNumber} (Driver: ${dispatchDetails.driverName}).`,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: dispatchTime,
      statusBadge: { label: 'Dispatched', variant: 'info' },
      dispatchDetails,
      documentReference: dispatchData.deliveryNoteNumber,
      comment: dispatchData.notes,
    };

    const existingLog = this.getOrderActivityTimeline(order);
    const updatedLog = [...existingLog, dnEvent, dispatchEvent];

    return await (orderService as any).repo.update(order.id, {
      status: 'DISPATCHED',
      deliveryNoteNumber: dispatchData.deliveryNoteNumber,
      activityLog: updatedLog,
    });
  }

  /**
   * Records customer refusal or return without overwriting original history.
   */
  async recordProductReturn(
    orderId: string,
    returnData: {
      productId: string;
      productName: string;
      sku: string;
      returnedQuantity: number;
      reason: string;
    },
    currentUser: User
  ): Promise<SalesOrder> {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const now = new Date().toISOString();

    const returnDetails: ProductReturnDetail = {
      productId: returnData.productId,
      productName: returnData.productName,
      sku: returnData.sku,
      returnedQuantity: returnData.returnedQuantity,
      reason: returnData.reason,
      recordedById: currentUser.id,
      recordedByName: currentUser.name,
      recordedByRole: currentUser.role,
      recordedAt: now,
    };

    const returnEvent: OrderActivityEvent = {
      id: `act-${Date.now()}-return`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'PRODUCT_RETURNED',
      title: 'Customer Product Return / Refusal Recorded',
      description: `Customer refused/returned ${returnData.returnedQuantity}x ${returnData.productName}. Reason: "${returnData.reason}".`,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: now,
      statusBadge: { label: 'Return Recorded', variant: 'danger' },
      returnDetails,
      comment: returnData.reason,
    };

    const existingLog = this.getOrderActivityTimeline(order);
    const updatedLog = [...existingLog, returnEvent];

    return await (orderService as any).repo.update(order.id, {
      activityLog: updatedLog,
    });
  }

  /**
   * Dispatches replacement quantity for returned/refused items.
   */
  async recordReplacementDispatch(
    orderId: string,
    replacementData: {
      replacementDeliveryNoteNumber: string;
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      notes?: string;
    },
    currentUser: User
  ): Promise<SalesOrder> {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const now = new Date().toISOString();

    const replacementDetails: ReplacementDispatchDetail = {
      replacementDeliveryNoteNumber: replacementData.replacementDeliveryNoteNumber,
      productId: replacementData.productId,
      productName: replacementData.productName,
      sku: replacementData.sku,
      quantity: replacementData.quantity,
      stockKeeperId: currentUser.id,
      stockKeeperName: currentUser.name,
      dispatchedAt: now,
      notes: replacementData.notes || 'Replacement stock dispatched to replace damaged/refused delivery.',
    };

    const replacementEvent: OrderActivityEvent = {
      id: `act-${Date.now()}-replacement`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'REPLACEMENT_DISPATCHED',
      title: `Replacement Dispatched (${replacementData.replacementDeliveryNoteNumber})`,
      description: `Stock Keeper ${currentUser.name} dispatched ${replacementData.quantity}x replacement ${replacementData.productName}.`,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: now,
      statusBadge: { label: 'Replacement Sent', variant: 'success' },
      replacementDetails,
      documentReference: replacementData.replacementDeliveryNoteNumber,
      comment: replacementData.notes,
    };

    const existingLog = this.getOrderActivityTimeline(order);
    const updatedLog = [...existingLog, replacementEvent];

    return await (orderService as any).repo.update(order.id, {
      activityLog: updatedLog,
    });
  }

  /**
   * Marks order delivered with customer confirmation.
   */
  async recordDeliveryCompleted(
    orderId: string,
    deliveryData: {
      recipientName: string;
      recipientPhone?: string;
      notes?: string;
    },
    currentUser: User
  ): Promise<SalesOrder> {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const now = new Date().toISOString();

    const deliveredEvent: OrderActivityEvent = {
      id: `act-${Date.now()}-delivered`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'DELIVERED',
      title: 'Order Delivered to Customer',
      description: `Delivered to destination and accepted by ${deliveryData.recipientName}.`,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: now,
      statusBadge: { label: 'Delivered', variant: 'success' },
      comment: deliveryData.notes || `Signed and acknowledged by ${deliveryData.recipientName}.`,
    };

    const existingLog = this.getOrderActivityTimeline(order);
    const updatedLog = [...existingLog, deliveredEvent];

    return await (orderService as any).repo.update(order.id, {
      status: 'DELIVERED',
      activityLog: updatedLog,
    });
  }

  /**
   * Records Invoice Issued event with clickable link & details.
   */
  async recordInvoiceIssuance(
    orderId: string,
    invoiceData: {
      invoiceId?: string;
      invoiceNumber: string;
      totalAmount: number;
    },
    currentUser: User
  ): Promise<SalesOrder> {
    const order = await orderService.getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const now = new Date().toISOString();

    const invoiceDetails: InvoiceIssuanceDetail = {
      invoiceId: invoiceData.invoiceId,
      invoiceNumber: invoiceData.invoiceNumber,
      totalAmount: invoiceData.totalAmount,
      issuedAt: now,
      issuedByName: currentUser.name,
    };

    const invoiceEvent: OrderActivityEvent = {
      id: `act-${Date.now()}-invoice`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'INVOICE_ISSUED',
      title: `Invoice Issued (${invoiceData.invoiceNumber})`,
      description: `Official tax invoice generated for LKR ${invoiceData.totalAmount.toLocaleString()} by ${currentUser.name}.`,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: now,
      statusBadge: { label: 'Invoiced', variant: 'purple' },
      invoiceDetails,
      documentReference: invoiceData.invoiceNumber,
    };

    const existingLog = this.getOrderActivityTimeline(order);
    const updatedLog = [...existingLog, invoiceEvent];

    return await (orderService as any).repo.update(order.id, {
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceId: invoiceData.invoiceId,
      status: 'INVOICED',
      activityLog: updatedLog,
    });
  }

  /**
   * Returns a comprehensive unified activity log for a specific user (or their assigned scope)
   * aggregating orders, payment collections, quotations, and approval workflow milestones.
   */
  async getUserActivityLog(userId: string, role?: string): Promise<UserActivityItem[]> {
    const items: UserActivityItem[] = [];

    // 1. Orders and their approval / milestone history
    try {
      const orderRes = await orderService.listOrders({ pageSize: 500 });
      const userOrders = (orderRes.data || []).filter(
        (o) =>
          o.salesRepId === userId ||
          o.approvalHistory?.some((h) => h.actorId === userId) ||
          role === 'DIRECTOR' ||
          role === 'MANAGER'
      );

      for (const o of userOrders) {
        // Order creation
        items.push({
          id: `act-ord-${o.id}-create`,
          timestamp: o.createdAt,
          category: 'ORDER',
          action: 'ORDER_CREATED',
          title: 'Sales Order Created',
          description: `Order ${o.orderNumber} initiated for ${o.customerNameSnapshot}.`,
          referenceNumber: o.orderNumber,
          customerName: o.customerNameSnapshot,
          customerCode: o.customerCodeSnapshot,
          amount: o.totalAmount,
          statusBadge: { label: o.status, variant: 'info' },
          link: `/orders/${o.id}`,
          actorId: o.salesRepId,
          actorName: o.salesRepNameSnapshot,
          actorRole: 'SALES_REP',
          comment: o.notes,
        });

        // Approval history milestones
        if (o.approvalHistory && o.approvalHistory.length > 0) {
          for (const h of o.approvalHistory) {
            const isUserAction = h.actorId === userId || o.salesRepId === userId;
            if (isUserAction) {
              const hTime = h.timestamp || o.createdAt;
              let title = 'Approval Step Actioned';
              let badgeVariant: UserActivityItem['statusBadge']['variant'] = 'warning';
              if (h.action === 'SUBMIT') {
                title = 'Order Submitted for Approval';
                badgeVariant = 'warning';
              } else if (h.action === 'APPROVE') {
                title = 'Order Approved by Supervisor';
                badgeVariant = 'success';
              } else if (h.action === 'REJECT') {
                title = 'Order Rejected';
                badgeVariant = 'destructive';
              } else if (h.action === 'ESCALATE') {
                title = 'Approval Escalated';
                badgeVariant = 'purple';
              }

              items.push({
                id: `act-ord-${o.id}-hist-${h.id}`,
                timestamp: hTime,
                category: 'APPROVAL',
                action: h.action,
                title,
                description: `${o.orderNumber} • ${h.comment || (h.action === 'SUBMIT' ? 'Sent for review' : 'Commercial review processed')}`,
                referenceNumber: o.orderNumber,
                customerName: o.customerNameSnapshot,
                customerCode: o.customerCodeSnapshot,
                amount: o.totalAmount,
                statusBadge: { label: h.toStatus || h.action, variant: badgeVariant },
                link: `/orders/${o.id}`,
                actorId: h.actorId,
                actorName: h.actorName,
                actorRole: h.actorRole,
                comment: h.comment,
              });
            }
          }
        }

        // Delivery completed
        if (o.status === 'DELIVERED') {
          items.push({
            id: `act-ord-${o.id}-delivered`,
            timestamp: o.updatedAt || o.createdAt,
            category: 'ORDER',
            action: 'DELIVERED',
            title: 'Order Delivered to Customer',
            description: `${o.orderNumber} successfully delivered under ${o.deliveryNoteNumber || 'delivery note'}.`,
            referenceNumber: o.orderNumber,
            customerName: o.customerNameSnapshot,
            customerCode: o.customerCodeSnapshot,
            amount: o.totalAmount,
            statusBadge: { label: 'Delivered', variant: 'success' },
            link: `/orders/${o.id}`,
            actorId: o.salesRepId,
            actorName: o.salesRepNameSnapshot,
            actorRole: 'SALES_REP',
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load orders for user activity log', e);
    }

    // 2. Payments & Collections
    try {
      const payRes = await paymentService.getPayments({ pageSize: 500 });
      const userPayments = (payRes.data || []).filter(
        (p) => p.salesRepId === userId || p.approvedById === userId || role === 'DIRECTOR'
      );

      for (const p of userPayments) {
        items.push({
          id: `act-pay-${p.id}`,
          timestamp: p.collectedAt || p.createdAt,
          category: 'PAYMENT',
          action: 'PAYMENT_COLLECTED',
          title: `Payment Collected (${p.paymentMethod === 'CHEQUE' ? 'Cheque / PDC' : 'Cash'})`,
          description: `Collected receipt ${p.receiptNumber} from ${p.customerName}.`,
          referenceNumber: p.receiptNumber,
          customerName: p.customerName,
          customerCode: p.customerCode,
          amount: p.amount,
          statusBadge: {
            label: p.status,
            variant: p.status === 'APPROVED' ? 'success' : 'warning',
          },
          link: `/payments`,
          actorId: p.salesRepId,
          actorName: p.salesRepName,
          actorRole: 'SALES_REP',
          comment: p.notes,
        });
      }
    } catch (e) {
      console.warn('Failed to load payments for user activity log', e);
    }

    // 3. Quotations
    try {
      const quoteRes = await quotationService.listQuotations({ pageSize: 500 });
      const userQuotes = (quoteRes.data || []).filter(
        (q) => q.salesRepId === userId || role === 'DIRECTOR'
      );

      for (const q of userQuotes) {
        items.push({
          id: `act-quote-${q.id}`,
          timestamp: q.createdAt,
          category: 'QUOTATION',
          action: 'QUOTATION_CREATED',
          title: 'Quotation Generated & Dispatched',
          description: `Quote ${q.quotationNumber} issued for ${q.customerNameSnapshot}.`,
          referenceNumber: q.quotationNumber,
          customerName: q.customerNameSnapshot,
          customerCode: q.customerCodeSnapshot,
          amount: q.totalAmount,
          statusBadge: {
            label: q.status,
            variant: q.status === 'APPROVED' ? 'success' : q.status === 'CONVERTED' ? 'cyan' : 'warning',
          },
          link: `/quotations/${q.id}`,
          actorId: q.salesRepId,
          actorName: q.salesRepNameSnapshot,
          actorRole: 'SALES_REP',
        });
      }
    } catch (e) {
      console.warn('Failed to load quotations for user activity log', e);
    }

    // Sort chronologically descending (newest first)
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const orderActivityService = new OrderActivityService();
