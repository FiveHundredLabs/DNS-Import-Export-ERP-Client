import { IInvoiceRepository } from '../repositories/IInvoiceRepository';
import { MockInvoiceRepository } from '../repositories/mock/MockInvoiceRepository';
import {
  Invoice,
  InvoiceFilters,
  InvoiceItem,
  OrderDeliveryInvoicingStatus,
  OrderDeliveryInvoicingItem,
} from '../types/invoice';
import { User } from '../types/auth';
import { PaginatedResult } from '../types/common';
import { orderService, OrderService } from './OrderService';
import { customerService, CustomerService } from './CustomerService';
import { taxService, TaxService } from './TaxService';
import { productService } from './ProductService';
import { batchInventoryService } from './BatchInventoryService';
import { deliveryNoteService, DeliveryNoteService } from './DeliveryNoteService';
import { orderActivityService } from './OrderActivityService';
import { OrderStatus } from '../types/order';

export class InvoiceService {
  private repo: IInvoiceRepository;
  private orderSvc: OrderService;
  private customerSvc: CustomerService;
  private taxSvc: TaxService;
  private deliveryNoteSvc: DeliveryNoteService;

  constructor(
    repo?: IInvoiceRepository,
    orderSvc?: OrderService,
    customerSvc?: CustomerService,
    taxSvc?: TaxService,
    deliveryNoteSvc?: DeliveryNoteService
  ) {
    this.repo = repo || new MockInvoiceRepository();
    this.orderSvc = orderSvc || orderService;
    this.customerSvc = customerSvc || customerService;
    this.taxSvc = taxSvc || taxService;
    this.deliveryNoteSvc = deliveryNoteSvc || deliveryNoteService;
  }

  async getInvoices(filters?: InvoiceFilters): Promise<PaginatedResult<Invoice>> {
    return this.repo.getAll(filters);
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    return this.repo.getById(id);
  }

  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    return this.repo.getByCustomerId(customerId);
  }

  async getInvoicesByOrder(orderId: string): Promise<Invoice[]> {
    return this.repo.getByOrderId(orderId);
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    return this.repo.update(id, updates);
  }

  /**
   * Retrieves the comprehensive delivery and invoicing status of an order.
   * Calculates original ordered, delivered (accepted), returned, damaged,
   * previously invoiced, and remaining uninvoiced delivered quantities.
   */
  async getOrderDeliveryInvoicingStatus(orderId: string): Promise<OrderDeliveryInvoicingStatus> {
    const order = await this.orderSvc.getOrder(orderId);
    if (!order) {
      throw new Error(`Sales Order not found: ${orderId}`);
    }

    const deliveryNotes = await this.deliveryNoteSvc.getByOrderId(order.id);
    const existingInvoices = await this.repo.getByOrderId(order.id);
    const activeInvoices = existingInvoices.filter((inv) => inv.status !== 'CANCELLED');

    const taxConfig = this.taxSvc.getTaxConfig();
    const effectiveTaxRate = taxConfig.taxEnabled ? taxConfig.taxRate : 0;

    let totalOrderedUnits = 0;
    let totalDeliveredUnits = 0;
    let totalReturnedUnits = 0;
    let totalDamagedUnits = 0;
    let totalPreviouslyInvoicedUnits = 0;
    let totalUninvoicedDeliveredUnits = 0;
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let totalAmount = 0;

    const items: OrderDeliveryInvoicingItem[] = order.items.map((item) => {
      const targetQty = item.approvedQuantity > 0 ? item.approvedQuantity : item.orderedQuantity;
      totalOrderedUnits += targetQty;

      let deliveredQty = 0;
      let returnedQty = 0;
      let damagedQty = 0;

      if (deliveryNotes.length > 0) {
        for (const note of deliveryNotes) {
          const dnItem = note.items.find((i) => i.productId === item.productId);
          if (dnItem) {
            deliveredQty += dnItem.acceptedQuantity ?? 0;
            const rej = dnItem.rejectedQuantity ?? 0;
            if (rej > 0) {
              const reason = String(dnItem.rejectionReason || '').toUpperCase();
              if (
                reason.includes('DAMAGE') ||
                reason.includes('DEFECT') ||
                reason.includes('PACKAGING')
              ) {
                damagedQty += rej;
              } else {
                returnedQty += rej;
              }
            }
          }
        }
      } else {
        // Fallback for orders without separate Delivery Note records
        deliveredQty = item.issuedQuantity || targetQty;
      }

      const previouslyInvoicedQty = activeInvoices.reduce((sum, inv) => {
        const line = inv.items.find((it) => it.productId === item.productId);
        return sum + (line ? line.quantity : 0);
      }, 0);

      const uninvoicedDeliveredQty = Math.max(0, deliveredQty - previouslyInvoicedQty);

      totalDeliveredUnits += deliveredQty;
      totalReturnedUnits += returnedQty;
      totalDamagedUnits += damagedQty;
      totalPreviouslyInvoicedUnits += previouslyInvoicedQty;
      totalUninvoicedDeliveredUnits += uninvoicedDeliveredQty;

      // Billable amounts for this uninvoiced batch
      const lineSubtotal = Math.round(item.unitPriceSnapshot * uninvoicedDeliveredQty * 100) / 100;
      const lineDiscount = Math.round(lineSubtotal * (item.discountPercentage / 100) * 100) / 100;
      const afterDiscount = lineSubtotal - lineDiscount;
      const lineTax = taxConfig.taxEnabled
        ? Math.round(afterDiscount * (effectiveTaxRate / 100) * 100) / 100
        : 0;
      const lineTotal = afterDiscount + lineTax;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
      totalAmount += lineTotal;

      return {
        productId: item.productId,
        sku: item.skuSnapshot,
        productName: item.productNameSnapshot,
        uom: item.uomSnapshot || 'PCS',
        orderedQuantity: targetQty,
        deliveredQuantity: deliveredQty,
        returnedQuantity: returnedQty,
        damagedQuantity: damagedQty,
        previouslyInvoicedQuantity: previouslyInvoicedQty,
        uninvoicedDeliveredQuantity: uninvoicedDeliveredQty,
        unitPrice: item.unitPriceSnapshot,
        discountPercentage: item.discountPercentage,
        discountAmount: lineDiscount,
        taxPercentage: effectiveTaxRate,
        taxAmount: lineTax,
        lineTotal,
      };
    });

    const isFullyDelivered =
      totalDeliveredUnits === totalOrderedUnits &&
      totalReturnedUnits === 0 &&
      totalDamagedUnits === 0 &&
      totalDeliveredUnits > 0;

    const isPartiallyDelivered =
      (totalDeliveredUnits > 0 && totalDeliveredUnits < totalOrderedUnits) ||
      totalReturnedUnits > 0 ||
      totalDamagedUnits > 0;

    const hasReturns = totalReturnedUnits > 0;
    const hasDamages = totalDamagedUnits > 0;
    const isAlreadyInvoiced = totalDeliveredUnits > 0 && totalUninvoicedDeliveredUnits === 0;
    const isReadyToInvoice = totalUninvoicedDeliveredUnits > 0;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerNameSnapshot,
      customerCode: order.customerCodeSnapshot,
      orderStatus: order.status,
      items,
      summary: {
        totalOrderedUnits,
        totalDeliveredUnits,
        totalReturnedUnits,
        totalDamagedUnits,
        totalPreviouslyInvoicedUnits,
        totalUninvoicedDeliveredUnits,
        isFullyDelivered,
        isPartiallyDelivered,
        hasReturns,
        hasDamages,
        isAlreadyInvoiced,
        isReadyToInvoice,
        subtotal,
        discountTotal,
        taxTotal,
        totalAmount,
      },
    };
  }

  /**
   * Generates a tax invoice from an approved sales order based on actual delivered quantities.
   * Excludes damaged and returned quantities.
   * Allows multiple invoices per order across delivery/replacement batches.
   * Prevents duplicate invoicing of already-invoiced quantities.
   */
  async createInvoiceFromOrder(
    orderId: string,
    currentUser: User,
    options?: {
      asDraft?: boolean;
      allowUnapproved?: boolean;
      partialItems?: Array<{ productId: string; quantity: number }>;
    }
  ): Promise<Invoice> {
    const order = await this.orderSvc.getOrder(orderId);
    if (!order) {
      throw new Error(`Sales Order not found: ${orderId}`);
    }

    if (order.status === 'CLOSED' || order.status === 'CANCELLED') {
      throw new Error(`Cannot generate invoice: Order ${order.orderNumber} is ${order.status.toLowerCase()}.`);
    }

    if (order.status === 'INVOICED') {
      throw new Error(`Cannot generate invoice: Order ${order.orderNumber} is already invoiced.`);
    }

    const eligibleStatuses = options?.allowUnapproved
      ? ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'SPECIAL_APPROVAL', 'APPROVED', 'PICKING', 'PARTIALLY_ISSUED', 'ISSUED', 'DISPATCHED', 'DELIVERED', 'PARTIALLY_INVOICED']
      : ['APPROVED', 'PICKING', 'PARTIALLY_ISSUED', 'ISSUED', 'DISPATCHED', 'DELIVERED', 'PARTIALLY_INVOICED'];

    if (!eligibleStatuses.includes(order.status)) {
      throw new Error(
        `Cannot generate invoice for order in status '${order.status}'. Only APPROVED sales orders can be invoiced.`
      );
    }

    // Compute comprehensive delivery-based quantities
    const delivStatus = await this.getOrderDeliveryInvoicingStatus(order.id);
    const existingInvoices = await this.repo.getByOrderId(order.id);

    // Check if existing draft exists
    const existingDraft = existingInvoices.find((inv) => inv.status === 'DRAFT');
    if (existingDraft && options?.asDraft && !options?.partialItems) {
      return existingDraft;
    }

    if (delivStatus.summary.totalUninvoicedDeliveredUnits <= 0) {
      if (delivStatus.summary.isAlreadyInvoiced) {
        throw new Error(
          `Cannot generate invoice: All delivered units on Order ${order.orderNumber} have already been invoiced.`
        );
      }
      throw new Error(
        `Cannot generate invoice: No uninvoiced delivered quantities available on Order ${order.orderNumber}. Invoices must be based on actual delivered quantities.`
      );
    }

    // Global Tax Configuration enforcement
    const taxConfig = this.taxSvc.getTaxConfig();
    const effectiveTaxRate = taxConfig.taxEnabled ? taxConfig.taxRate : 0;

    // Filter lines that have remaining uninvoiced delivered quantity
    const billableLines = delivStatus.items.filter((item) => {
      if (options?.partialItems && options.partialItems.length > 0) {
        const match = options.partialItems.find((p) => p.productId === item.productId);
        return match && match.quantity > 0;
      }
      return item.uninvoicedDeliveredQuantity > 0;
    });

    if (billableLines.length === 0) {
      throw new Error(`No remaining billable delivered quantities available on Order ${order.orderNumber}.`);
    }

    let calculatedSubtotal = 0;
    let calculatedDiscountTotal = 0;
    let calculatedTaxTotal = 0;
    let calculatedGrandTotal = 0;

    const invoiceItems: InvoiceItem[] = billableLines.map((lp, idx) => {
      const orderItem = order.items.find((i) => i.productId === lp.productId) || order.items[0];
      let qty = lp.uninvoicedDeliveredQuantity;

      if (options?.partialItems) {
        const match = options.partialItems.find((p) => p.productId === lp.productId);
        if (match) {
          if (match.quantity > lp.uninvoicedDeliveredQuantity) {
            throw new Error(
              `Cannot invoice ${match.quantity} units for "${lp.productName}". Maximum remaining deliverable quantity is ${lp.uninvoicedDeliveredQuantity}.`
            );
          }
          qty = match.quantity;
        }
      }

      const lineSubtotal = Math.round(lp.unitPrice * qty * 100) / 100;
      const lineDiscount = Math.round(lineSubtotal * (lp.discountPercentage / 100) * 100) / 100;
      const afterDiscount = lineSubtotal - lineDiscount;
      const lineTax = taxConfig.taxEnabled ? Math.round(afterDiscount * (effectiveTaxRate / 100) * 100) / 100 : 0;
      const lineTotal = afterDiscount + lineTax;

      calculatedSubtotal += lineSubtotal;
      calculatedDiscountTotal += lineDiscount;
      calculatedTaxTotal += lineTax;
      calculatedGrandTotal += lineTotal;

      return {
        id: `inv-item-${Date.now().toString().slice(-4)}-${idx + 1}`,
        productId: lp.productId,
        productNameSnapshot: lp.productName,
        skuSnapshot: lp.sku,
        unitPriceSnapshot: lp.unitPrice,
        discountPercentage: lp.discountPercentage,
        discountAmount: lineDiscount,
        taxPercentage: effectiveTaxRate,
        taxAmount: lineTax,
        lineTotal,
        quantity: qty,
        uomSnapshot: lp.uom,
        batchId: orderItem.batchId,
        batchNumber: orderItem.batchNumber,
        discountApprovalStatus: orderItem.discountApprovalStatus,
        discountAllowedPercentage: orderItem.discountAllowedPercentage,
        discountApprovedById: orderItem.discountApprovedById,
        discountApprovedByName: orderItem.discountApprovedByName,
        discountApprovedAt: orderItem.discountApprovedAt,
        discountApprovalNote: orderItem.discountApprovalNote,
      };
    });

    const now = new Date();
    const issueDateStr = now.toISOString().split('T')[0];

    const creditDays =
      order.requestedCreditDays ||
      order.creditDaysRequested ||
      order.customerCreditDaysSnapshot ||
      30;

    const dueDate = new Date(now.getTime() + creditDays * 24 * 60 * 60 * 1000);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const year = now.getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${year}-${seq}`;
    const initialStatus = options?.asDraft ? 'DRAFT' : 'ISSUED';

    // Create or update the invoice domain entity
    let newInvoice: Invoice;
    if (existingDraft) {
      newInvoice = await this.repo.update(existingDraft.id, {
        items: invoiceItems,
        subtotal: calculatedSubtotal,
        discountTotal: calculatedDiscountTotal,
        taxTotal: calculatedTaxTotal,
        totalAmount: calculatedGrandTotal,
        taxEnabled: taxConfig.taxEnabled,
        taxRatePercentage: effectiveTaxRate,
        balanceAmount: calculatedGrandTotal,
        status: initialStatus,
        paymentTerms: order.paymentTerms || `${creditDays} Days Credit`,
        notes: order.notes,
      });
    } else {
      newInvoice = await this.repo.create({
        invoiceNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerNameSnapshot,
        customerCode: order.customerCodeSnapshot,
        customerAddress: order.customerAddressSnapshot,
        customerPhone: order.customerPhoneSnapshot,
        salesRepId: order.salesRepId,
        salesRepName: order.salesRepNameSnapshot,
        issueDate: issueDateStr,
        dueDate: dueDateStr,
        items: invoiceItems,
        subtotal: calculatedSubtotal,
        discountTotal: calculatedDiscountTotal,
        taxTotal: calculatedTaxTotal,
        totalAmount: calculatedGrandTotal,
        taxEnabled: taxConfig.taxEnabled,
        taxRatePercentage: effectiveTaxRate,
        paidAmount: 0,
        balanceAmount: calculatedGrandTotal,
        status: initialStatus,
        paymentTerms: order.paymentTerms || `${creditDays} Days Credit`,
        notes: order.notes,
      });
    }

    // Advance order status to INVOICED or PARTIALLY_INVOICED if issued
    if (initialStatus === 'ISSUED') {
      const allActiveInvoices = [
        ...existingInvoices.filter((i) => i.id !== newInvoice.id && i.status !== 'CANCELLED'),
        newInvoice,
      ];

      const fullyInvoiced = order.items.every((it) => {
        const targetQty = it.approvedQuantity > 0 ? it.approvedQuantity : it.orderedQuantity;
        const totalInvQty = allActiveInvoices.reduce((sum, inv) => {
          const l = inv.items.find((item) => item.productId === it.productId);
          return sum + (l ? l.quantity : 0);
        }, 0);
        return totalInvQty >= targetQty;
      });

      const nextOrderStatus: OrderStatus = fullyInvoiced ? 'INVOICED' : 'PARTIALLY_INVOICED';

      const invoicedQuantitiesMap: Record<string, number> = {};
      order.items.forEach((it) => {
        const totalInvQty = allActiveInvoices.reduce((sum, inv) => {
          const l = inv.items.find((item) => item.productId === it.productId);
          return sum + (l ? l.quantity : 0);
        }, 0);
        invoicedQuantitiesMap[it.productId] = totalInvQty;
      });

      await this.orderSvc.updateFulfillmentStatus(order.id, nextOrderStatus, currentUser, {
        comment: `Tax Invoice ${newInvoice.invoiceNumber} generated for LKR ${calculatedGrandTotal.toLocaleString()} (${nextOrderStatus.replace('_', ' ')}).`,
        invoicedQuantities: invoicedQuantitiesMap,
      });

      // Record invoice issuance event in chronological Order Activity Timeline
      try {
        await orderActivityService.recordInvoiceIssuance(
          order.id,
          {
            invoiceId: newInvoice.id,
            invoiceNumber: newInvoice.invoiceNumber,
            totalAmount: calculatedGrandTotal,
            orderStatus: nextOrderStatus,
          },
          currentUser
        );
      } catch (err) {
        console.warn('Could not record invoice issuance in order activity log:', err);
      }

      // Update Customer Master financials (single source of truth)
      try {
        const customer = await this.customerSvc.getCustomer(order.customerId);
        if (customer) {
          const newTotalOutstanding = customer.financials.totalOutstanding + calculatedGrandTotal;
          const newAvailableCredit = Math.max(0, customer.commercialTerms.creditLimit - newTotalOutstanding);
          const newCurrentDue = customer.financials.currentDue + calculatedGrandTotal;

          await this.customerSvc.updateCustomer(customer.id, {
            financials: {
              ...customer.financials,
              totalOutstanding: newTotalOutstanding,
              availableCredit: newAvailableCredit,
              currentDue: newCurrentDue,
            },
          });
        }
      } catch (err) {
        console.warn(`Could not update customer financials for customer ${order.customerId}:`, err);
      }
    }

    return newInvoice;
  }

  /**
   * Only SALES_MANAGER (and MANAGER/DIRECTOR) can edit line items on a DRAFT invoice.
   */
  async updateDraftInvoiceItems(
    invoiceId: string,
    items: InvoiceItem[],
    currentUser: User
  ): Promise<Invoice> {
    const inv = await this.repo.getById(invoiceId);
    if (!inv) throw new Error(`Invoice not found: ${invoiceId}`);
    if (inv.status !== 'DRAFT') {
      throw new Error('Only DRAFT invoices can be edited.');
    }
    const isAuthorized = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(currentUser.role);
    if (!isAuthorized) {
      throw new Error('Permission Denied: Only SALES_MANAGER can edit draft invoice line items.');
    }

    // Available stock restriction: line quantity cannot exceed available stock
    for (const it of items) {
      let available = 0;
      if (it.batchId) {
        const batch = batchInventoryService.getBatchById(it.batchId);
        if (batch) available = batch.availableQuantity;
      }
      if (!available) {
        const prod = await productService.getProduct(it.productId);
        if (prod) {
          available = Math.max(0, (prod.stockOnHand ?? 0) - (prod.damagedStock ?? 0));
        }
      }
      if (available > 0 && it.quantity > available) {
        throw new Error(
          `Quantity for "${it.productNameSnapshot || it.productId}" (${it.quantity}) cannot exceed available stock (${available} units).`
        );
      }
    }

    const taxConfig = this.taxSvc.getTaxConfig();
    const effectiveTaxRate = taxConfig.taxEnabled ? (inv.taxRatePercentage || taxConfig.taxRate) : 0;

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    const recalculated: InvoiceItem[] = items.map((it) => {
      const lineSubtotal = Math.round(it.unitPriceSnapshot * it.quantity * 100) / 100;
      const lineDiscount = Math.round(lineSubtotal * (it.discountPercentage / 100) * 100) / 100;
      const afterDiscount = lineSubtotal - lineDiscount;
      const lineTax = inv.taxEnabled ? Math.round(afterDiscount * (effectiveTaxRate / 100) * 100) / 100 : 0;
      const lineTotal = afterDiscount + lineTax;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
      grandTotal += lineTotal;

      return {
        ...it,
        discountAmount: lineDiscount,
        taxPercentage: effectiveTaxRate,
        taxAmount: lineTax,
        lineTotal,
      };
    });

    return this.repo.update(invoiceId, {
      items: recalculated,
      subtotal,
      discountTotal,
      taxTotal,
      totalAmount: grandTotal,
      balanceAmount: grandTotal,
    });
  }

  /**
   * Finalizes and issues a DRAFT invoice, advancing status to ISSUED and updating Customer financials.
   */
  async finalizeAndIssueInvoice(invoiceId: string, currentUser: User): Promise<Invoice> {
    const inv = await this.repo.getById(invoiceId);
    if (!inv) throw new Error(`Invoice not found: ${invoiceId}`);
    if (inv.status !== 'DRAFT') {
      throw new Error(`Invoice is already in status '${inv.status}'`);
    }

    // Available stock restriction before finalizing and issuing
    for (const it of inv.items) {
      let available = 0;
      if (it.batchId) {
        const batch = batchInventoryService.getBatchById(it.batchId);
        if (batch) available = batch.availableQuantity;
      }
      if (!available) {
        const prod = await productService.getProduct(it.productId);
        if (prod) {
          available = Math.max(0, (prod.stockOnHand ?? 0) - (prod.damagedStock ?? 0));
        }
      }
      if (available > 0 && it.quantity > available) {
        throw new Error(
          `Cannot finalize invoice: Quantity for "${it.productNameSnapshot || it.productId}" (${it.quantity}) cannot exceed available stock (${available} units).`
        );
      }
    }

    const updated = await this.repo.update(invoiceId, {
      status: 'ISSUED',
    });

    // Advance linked order to INVOICED or PARTIALLY_INVOICED
    try {
      const linkedOrder = await this.orderSvc.getOrder(inv.orderId);
      if (linkedOrder) {
        const orderInvoices = await this.repo.getByOrderId(linkedOrder.id);
        const activeInvs = orderInvoices.filter((i) => i.status !== 'CANCELLED');
        const isFullyInvoiced = linkedOrder.items.every((it) => {
          const targetQty = it.approvedQuantity > 0 ? it.approvedQuantity : it.orderedQuantity;
          const totalInvQty = activeInvs.reduce((sum, itemInv) => {
            const l = itemInv.items.find((item) => item.productId === it.productId);
            return sum + (l ? l.quantity : 0);
          }, 0);
          return totalInvQty >= targetQty;
        });

        const targetStatus: OrderStatus = isFullyInvoiced ? 'INVOICED' : 'PARTIALLY_INVOICED';
        await this.orderSvc.updateFulfillmentStatus(linkedOrder.id, targetStatus, currentUser, {
          comment: `Tax Invoice ${inv.invoiceNumber} finalized and issued (${targetStatus.replace('_', ' ')}).`,
        });
      }
    } catch (e) {
      console.warn('Order fulfillment advance warning:', e);
    }

    // Update Customer Master financials
    try {
      const customer = await this.customerSvc.getCustomer(inv.customerId);
      if (customer) {
        const newTotalOutstanding = customer.financials.totalOutstanding + inv.totalAmount;
        const newAvailableCredit = Math.max(0, customer.commercialTerms.creditLimit - newTotalOutstanding);
        const newCurrentDue = customer.financials.currentDue + inv.totalAmount;

        await this.customerSvc.updateCustomer(customer.id, {
          financials: {
            ...customer.financials,
            totalOutstanding: newTotalOutstanding,
            availableCredit: newAvailableCredit,
            currentDue: newCurrentDue,
          },
        });
      }
    } catch (err) {
      console.warn(`Could not update customer financials for customer ${inv.customerId}:`, err);
    }

    return updated;
  }

  /**
   * Retrieves order invoicing progress including line-item remaining quantities (BR-04).
   */
  async getOrderInvoicingProgress(orderId: string): Promise<{
    orderId: string;
    orderNumber: string;
    isFullyInvoiced: boolean;
    isPartiallyInvoiced: boolean;
    existingInvoices: Invoice[];
    lines: Array<{
      productId: string;
      productName: string;
      sku: string;
      orderedQuantity: number;
      invoicedQuantity: number;
      remainingQuantity: number;
      unitPrice: number;
      uom?: string;
    }>;
  }> {
    const order = await this.orderSvc.getOrder(orderId);
    if (!order) throw new Error(`Sales Order not found: ${orderId}`);

    const existingInvoices = await this.repo.getByOrderId(order.id);
    const activeInvoices = existingInvoices.filter((inv) => inv.status !== 'CANCELLED');

    const lines = order.items.map((it) => {
      const targetQty = it.approvedQuantity > 0 ? it.approvedQuantity : it.orderedQuantity;
      const invoicedQty = activeInvoices.reduce((sum, inv) => {
        const l = inv.items.find((item) => item.productId === it.productId);
        return sum + (l ? l.quantity : 0);
      }, 0);
      const remainingQty = Math.max(0, targetQty - invoicedQty);

      return {
        productId: it.productId,
        productName: it.productNameSnapshot,
        sku: it.skuSnapshot,
        orderedQuantity: targetQty,
        invoicedQuantity: invoicedQty,
        remainingQuantity: remainingQty,
        unitPrice: it.unitPriceSnapshot,
        uom: it.uomSnapshot,
      };
    });

    const isFullyInvoiced = lines.every((l) => l.remainingQuantity === 0);
    const isPartiallyInvoiced = lines.some((l) => l.invoicedQuantity > 0) && !isFullyInvoiced;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      isFullyInvoiced,
      isPartiallyInvoiced,
      existingInvoices: activeInvoices,
      lines,
    };
  }

}

export const invoiceService = new InvoiceService();
