import { IInvoiceRepository } from '../repositories/IInvoiceRepository';
import { MockInvoiceRepository } from '../repositories/mock/MockInvoiceRepository';
import { Invoice, InvoiceFilters, InvoiceItem } from '../types/invoice';
import { User } from '../types/auth';
import { PaginatedResult } from '../types/common';
import { orderService, OrderService } from './OrderService';
import { customerService, CustomerService } from './CustomerService';
import { taxService, TaxService } from './TaxService';

export class InvoiceService {
  private repo: IInvoiceRepository;
  private orderSvc: OrderService;
  private customerSvc: CustomerService;
  private taxSvc: TaxService;

  constructor(
    repo?: IInvoiceRepository,
    orderSvc?: OrderService,
    customerSvc?: CustomerService,
    taxSvc?: TaxService
  ) {
    this.repo = repo || new MockInvoiceRepository();
    this.orderSvc = orderSvc || orderService;
    this.customerSvc = customerSvc || customerService;
    this.taxSvc = taxSvc || taxService;
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

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    return this.repo.update(id, updates);
  }

  /**
   * Generates a tax invoice from an approved or issued sales order.
   * If options.asDraft is true, creates the invoice in DRAFT status.
   * Preserves immutable product snapshots, sets balanceAmount = totalAmount.
   */
  async createInvoiceFromOrder(
    orderId: string,
    currentUser: User,
    options?: { asDraft?: boolean }
  ): Promise<Invoice> {
    const order = await this.orderSvc.getOrder(orderId);
    if (!order) {
      throw new Error(`Sales Order not found: ${orderId}`);
    }

    if (order.status === 'INVOICED') {
      throw new Error(`Order ${order.orderNumber} is already invoiced.`);
    }

    // Check if an invoice already exists for this order in the repository (idempotency safeguard)
    const existingInvoices = await this.repo.getByOrderId(order.id);
    const existingFinalized = existingInvoices.find(
      (inv) => inv.status !== 'DRAFT' && inv.status !== 'CANCELLED'
    );
    if (existingFinalized) {
      throw new Error(`Order ${order.orderNumber} is already invoiced.`);
    }

    const existingDraft = existingInvoices.find((inv) => inv.status === 'DRAFT');
    if (existingDraft && options?.asDraft) {
      return existingDraft;
    }

    const eligibleStatuses = ['APPROVED', 'PICKING', 'PARTIALLY_ISSUED', 'ISSUED'];
    if (!eligibleStatuses.includes(order.status)) {
      throw new Error(
        `Cannot generate invoice for order in status '${order.status}'. Order must be approved or issued first.`
      );
    }

    // Global Tax Configuration enforcement
    const taxConfig = this.taxSvc.getTaxConfig();
    const effectiveTaxRate = taxConfig.taxEnabled ? taxConfig.taxRate : 0;

    // Preserve immutable product snapshots on invoice line items
    let calculatedSubtotal = 0;
    let calculatedDiscountTotal = 0;
    let calculatedTaxTotal = 0;
    let calculatedGrandTotal = 0;

    const invoiceItems: InvoiceItem[] = order.items.map((item, idx) => {
      const qty =
        item.issuedQuantity > 0
          ? item.issuedQuantity
          : item.approvedQuantity > 0
          ? item.approvedQuantity
          : item.orderedQuantity;

      const lineSubtotal = Math.round(item.unitPriceSnapshot * qty * 100) / 100;
      const lineDiscount = Math.round(lineSubtotal * (item.discountPercentage / 100) * 100) / 100;
      const afterDiscount = lineSubtotal - lineDiscount;
      const lineTax = taxConfig.taxEnabled ? Math.round(afterDiscount * (effectiveTaxRate / 100) * 100) / 100 : 0;
      const lineTotal = afterDiscount + lineTax;

      calculatedSubtotal += lineSubtotal;
      calculatedDiscountTotal += lineDiscount;
      calculatedTaxTotal += lineTax;
      calculatedGrandTotal += lineTotal;

      return {
        id: `inv-item-${Date.now().toString().slice(-4)}-${idx + 1}`,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        skuSnapshot: item.skuSnapshot,
        unitPriceSnapshot: item.unitPriceSnapshot,
        discountPercentage: item.discountPercentage,
        discountAmount: lineDiscount,
        taxPercentage: effectiveTaxRate,
        taxAmount: lineTax,
        lineTotal,
        quantity: qty,
        uomSnapshot: item.uomSnapshot,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        discountApprovalStatus: item.discountApprovalStatus,
        discountAllowedPercentage: item.discountAllowedPercentage,
        discountApprovedById: item.discountApprovedById,
        discountApprovedByName: item.discountApprovedByName,
        discountApprovedAt: item.discountApprovedAt,
        discountApprovalNote: item.discountApprovalNote,
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

    // Advance order status to INVOICED if issued
    if (initialStatus === 'ISSUED') {
      await this.orderSvc.updateFulfillmentStatus(order.id, 'INVOICED', currentUser, {
        comment: `Tax Invoice ${newInvoice.invoiceNumber} generated for LKR ${calculatedGrandTotal.toLocaleString()}.`,
      });

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

    const updated = await this.repo.update(invoiceId, {
      status: 'ISSUED',
    });

    // Advance linked order to INVOICED
    try {
      await this.orderSvc.updateFulfillmentStatus(inv.orderId, 'INVOICED', currentUser, {
        comment: `Tax Invoice ${inv.invoiceNumber} finalized and issued.`,
      });
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

}

export const invoiceService = new InvoiceService();
