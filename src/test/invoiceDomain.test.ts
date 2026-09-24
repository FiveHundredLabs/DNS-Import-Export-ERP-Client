import { describe, it, expect, beforeEach } from 'vitest';
import { InvoiceService } from '../services/InvoiceService';
import { OrderService } from '../services/OrderService';
import { MockInvoiceRepository } from '../repositories/mock/MockInvoiceRepository';
import { MockSalesOrderRepository } from '../repositories/mock/MockSalesOrderRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { MockApprovalRepository } from '../repositories/mock/MockApprovalRepository';
import { MockQuotationRepository } from '../repositories/mock/MockQuotationRepository';
import { ProductService } from '../services/ProductService';
import { CustomerService } from '../services/CustomerService';
import { ApprovalService } from '../services/ApprovalService';
import { QuotationService } from '../services/QuotationService';
import { calculateInvoiceStatus, isPastDueDate } from '../rules/invoiceRules';
import { User } from '../types/auth';

describe('Phase 7 — Invoice Domain & Billing Integration', () => {
  let invoiceRepo: MockInvoiceRepository;
  let orderRepo: MockSalesOrderRepository;
  let productRepo: MockProductRepository;
  let customerRepo: MockCustomerRepository;
  let approvalRepo: MockApprovalRepository;
  let quotationRepo: MockQuotationRepository;

  let productSvc: ProductService;
  let customerSvc: CustomerService;
  let approvalSvc: ApprovalService;
  let quotationSvc: QuotationService;
  let orderSvc: OrderService;
  let invoiceSvc: InvoiceService;

  const mockSalesRep: User = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    email: 'rep.colombo@dnserp.com',
    phone: '+94 77 123 4567',
    role: 'SALES_REP',
    areaId: 'area-01',
    isActive: true,
  };

  const mockSalesManager: User = {
    id: 'usr-103',
    name: 'Kamal Perera',
    email: 'sales.manager@dnserp.com',
    phone: '+94 77 234 5678',
    role: 'SALES_MANAGER',
    isActive: true,
  };

  beforeEach(() => {
    invoiceRepo = new MockInvoiceRepository();
    orderRepo = new MockSalesOrderRepository();
    productRepo = new MockProductRepository();
    customerRepo = new MockCustomerRepository();
    approvalRepo = new MockApprovalRepository();
    quotationRepo = new MockQuotationRepository();

    productSvc = new ProductService(productRepo);
    customerSvc = new CustomerService(customerRepo);
    approvalSvc = new ApprovalService(approvalRepo);
    quotationSvc = new QuotationService(quotationRepo, productSvc, customerSvc, approvalSvc);
    orderSvc = new OrderService(orderRepo, productSvc, customerSvc, approvalSvc, quotationSvc);
    invoiceSvc = new InvoiceService(invoiceRepo, orderSvc, customerSvc);
  });

  describe('1. Invoice Creation from Approved / Issued Sales Order', () => {
    it('creates an official invoice from an approved order, preserving immutable product snapshots and linking order', async () => {
      // 1. Create standard order
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: '142 First Cross Street, Colombo 11',
          requestedCreditDays: 30,
          items: [
            {
              productId: 'prod-001',
              orderedQuantity: 10,
              requestedDiscountPercentage: 4,
            },
          ],
        },
        mockSalesRep
      );

      // Approve order
      await orderSvc.approveOrder(order.id, mockSalesManager, 'Approved standard order');

      // Customer before invoice
      const customerBefore = await customerSvc.getCustomer('cust-001');
      const priorOutstanding = customerBefore!.financials.totalOutstanding;

      // 2. Generate invoice from order
      const invoice = await invoiceSvc.createInvoiceFromOrder(order.id, mockSalesRep);

      expect(invoice).toBeDefined();
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d+/);
      expect(invoice.orderId).toBe(order.id);
      expect(invoice.orderNumber).toBe(order.orderNumber);
      expect(invoice.customerId).toBe('cust-001');
      expect(invoice.customerName).toBe(order.customerNameSnapshot);
      expect(invoice.salesRepId).toBe(order.salesRepId);
      expect(invoice.totalAmount).toBe(order.totalAmount);
      expect(invoice.paidAmount).toBe(0);
      expect(invoice.balanceAmount).toBe(order.totalAmount);
      expect(invoice.status).toBe('ISSUED');

      // Verify product snapshot immutability
      expect(invoice.items).toHaveLength(1);
      expect(invoice.items[0].productId).toBe('prod-001');
      expect(invoice.items[0].skuSnapshot).toBe('DNS-MCB-32A-2P');
      expect(invoice.items[0].productNameSnapshot).toBe('Schneider Acti9 32A Double Pole MCB');
      expect(invoice.items[0].unitPriceSnapshot).toBe(3250);
      expect(invoice.items[0].quantity).toBe(10);
      expect(invoice.items[0].discountPercentage).toBe(4);

      // 3. Verify order status advanced to INVOICED
      const updatedOrder = await orderSvc.getOrder(order.id);
      expect(updatedOrder!.status).toBe('INVOICED');

      // 4. Verify Customer Master financials updated (receivables increased)
      const customerAfter = await customerSvc.getCustomer('cust-001');
      expect(customerAfter!.financials.totalOutstanding).toBe(priorOutstanding + order.totalAmount);
    });

    it('rejects invoice generation for DRAFT or unapproved orders', async () => {
      const draftOrder = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo Warehouse',
          saveAsDraft: true,
          items: [{ productId: 'prod-001', orderedQuantity: 5 }],
        },
        mockSalesRep
      );

      await expect(
        invoiceSvc.createInvoiceFromOrder(draftOrder.id, mockSalesRep)
      ).rejects.toThrow(/Cannot generate invoice for order in status 'DRAFT'/);
    });

    it('rejects duplicate invoicing for an already invoiced order', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: '142 First Cross Street, Colombo 11',
          items: [{ productId: 'prod-001', orderedQuantity: 5 }],
        },
        mockSalesRep
      );
      await orderSvc.approveOrder(order.id, mockSalesManager, 'Approved');

      // First invoicing succeeds
      await invoiceSvc.createInvoiceFromOrder(order.id, mockSalesRep);

      // Second attempt rejected
      await expect(
        invoiceSvc.createInvoiceFromOrder(order.id, mockSalesRep)
      ).rejects.toThrow(/is already invoiced/);
    });

    it('preserves immutable snapshot on historical invoice even when Product Master price is updated', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo Warehouse',
          items: [{ productId: 'prod-001', orderedQuantity: 10, requestedDiscountPercentage: 0 }],
        },
        mockSalesRep
      );
      await orderSvc.approveOrder(order.id, mockSalesManager, 'Approved');
      const invoice = await invoiceSvc.createInvoiceFromOrder(order.id, mockSalesRep);

      const originalUnitPrice = invoice.items[0].unitPriceSnapshot;
      const originalLineTotal = invoice.items[0].lineTotal;

      // Update Product Master price dramatically (e.g. 3,250 -> 50,000)
      const origProd = await productSvc.getProduct('prod-001');
      await productSvc.updateProduct('prod-001', {
        pricing: {
          ...origProd!.pricing,
          currentSellingPrice: 50000,
        },
      });

      // Verify invoice items remain unchanged
      const freshInvoice = await invoiceSvc.getInvoiceById(invoice.id);
      expect(freshInvoice!.items[0].unitPriceSnapshot).toBe(originalUnitPrice);
      expect(freshInvoice!.items[0].lineTotal).toBe(originalLineTotal);
    });

    it('allows generating invoice directly from PICKING status fulfillment', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Main Store',
          items: [{ productId: 'prod-001', orderedQuantity: 5 }],
        },
        mockSalesRep
      );
      await orderSvc.approveOrder(order.id, mockSalesManager, 'Approved');
      await orderSvc.updateFulfillmentStatus(order.id, 'PICKING', mockSalesRep);

      const invoice = await invoiceSvc.createInvoiceFromOrder(order.id, mockSalesRep);
      expect(invoice).toBeDefined();
      expect(invoice.status).toBe('ISSUED');

      const updatedOrder = await orderSvc.getOrder(order.id);
      expect(updatedOrder!.status).toBe('INVOICED');
    });

    it('fetches all invoices for a customer via getInvoicesByCustomer', async () => {
      const custInvoices = await invoiceSvc.getInvoicesByCustomer('cust-001');
      expect(Array.isArray(custInvoices)).toBe(true);
      expect(custInvoices.length).toBeGreaterThan(0);
      expect(custInvoices.every((i) => i.customerId === 'cust-001')).toBe(true);
    });
  });

  describe('2. Business Rules & Invoice Status Calculation', () => {
    it('calculates PAID when paidAmount equals totalAmount', () => {
      const status = calculateInvoiceStatus(100000, 100000, '2026-10-01');
      expect(status).toBe('PAID');
    });

    it('calculates PAID when paidAmount exceeds totalAmount', () => {
      const status = calculateInvoiceStatus(100000, 105000, '2026-10-01');
      expect(status).toBe('PAID');
    });

    it('calculates PAID when totalAmount and paidAmount are zero', () => {
      const status = calculateInvoiceStatus(0, 0, '2026-10-01');
      expect(status).toBe('PAID');
    });

    it('calculates PARTIALLY_PAID when paidAmount is positive but less than totalAmount before due date', () => {
      const futureDueDate = '2026-12-31';
      const referenceDate = new Date('2026-09-01');
      const status = calculateInvoiceStatus(100000, 40000, futureDueDate, referenceDate);
      expect(status).toBe('PARTIALLY_PAID');
    });

    it('calculates ISSUED when paidAmount is zero before due date', () => {
      const futureDueDate = '2026-12-31';
      const referenceDate = new Date('2026-09-01');
      const status = calculateInvoiceStatus(100000, 0, futureDueDate, referenceDate);
      expect(status).toBe('ISSUED');
    });

    it('calculates OVERDUE when paidAmount < totalAmount and past due date', () => {
      const pastDueDate = '2026-08-01';
      const referenceDate = new Date('2026-09-01');
      const status = calculateInvoiceStatus(100000, 0, pastDueDate, referenceDate);
      expect(status).toBe('OVERDUE');
    });

    it('calculates OVERDUE when partially paid but past due date', () => {
      const pastDueDate = '2026-08-01';
      const referenceDate = new Date('2026-09-01');
      const status = calculateInvoiceStatus(100000, 30000, pastDueDate, referenceDate);
      expect(status).toBe('OVERDUE');
    });

    it('checks past due date correctly with isPastDueDate helper', () => {
      const reference = new Date('2026-09-24T12:00:00Z');
      expect(isPastDueDate('2026-09-20', reference)).toBe(true);
      expect(isPastDueDate('2026-09-25', reference)).toBe(false);
      expect(isPastDueDate('invalid-date', reference)).toBe(false);
    });
  });
});
