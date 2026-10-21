import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaxService, taxService, DEFAULT_TAX_CONFIG } from '../services/TaxService';
import { QuotationService } from '../services/QuotationService';
import { OrderService } from '../services/OrderService';
import { InvoiceService } from '../services/InvoiceService';
import { MockQuotationRepository } from '../repositories/mock/MockQuotationRepository';
import { MockSalesOrderRepository } from '../repositories/mock/MockSalesOrderRepository';
import { MockInvoiceRepository } from '../repositories/mock/MockInvoiceRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { MockApprovalRepository } from '../repositories/mock/MockApprovalRepository';
import { ProductService } from '../services/ProductService';
import { CustomerService } from '../services/CustomerService';
import { ApprovalService } from '../services/ApprovalService';
import { User } from '../types/auth';

describe('Global Tax Configuration – Director/Admin System', () => {
  let testTaxSvc: TaxService;
  let quotationRepo: MockQuotationRepository;
  let orderRepo: MockSalesOrderRepository;
  let invoiceRepo: MockInvoiceRepository;
  let productRepo: MockProductRepository;
  let customerRepo: MockCustomerRepository;
  let approvalRepo: MockApprovalRepository;

  let productSvc: ProductService;
  let customerSvc: CustomerService;
  let approvalSvc: ApprovalService;
  let quotationSvc: QuotationService;
  let orderSvc: OrderService;
  let invoiceSvc: InvoiceService;

  const mockDirectorUser: User = {
    id: 'usr-101',
    name: 'Saman Jayasuriya',
    email: 'director@dnserp.com',
    phone: '+94 77 111 2233',
    role: 'DIRECTOR',
    isActive: true,
  };

  const mockSalesRepUser: User = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    email: 'rep.colombo@dnserp.com',
    phone: '+94 77 123 4567',
    role: 'SALES_REP',
    areaId: 'area-01',
    isActive: true,
  };

  const mockSalesManagerUser: User = {
    id: 'usr-103',
    name: 'Kamal Perera',
    email: 'sales.manager@dnserp.com',
    phone: '+94 77 234 5678',
    role: 'SALES_MANAGER',
    isActive: true,
  };

  beforeEach(() => {
    // Isolated repositories & services
    testTaxSvc = new TaxService();
    testTaxSvc.resetToDefaults('DIRECTOR');

    productRepo = new MockProductRepository();
    customerRepo = new MockCustomerRepository();
    approvalRepo = new MockApprovalRepository();
    quotationRepo = new MockQuotationRepository();
    orderRepo = new MockSalesOrderRepository();
    invoiceRepo = new MockInvoiceRepository();

    productSvc = new ProductService(productRepo);
    customerSvc = new CustomerService(customerRepo);
    approvalSvc = new ApprovalService(approvalRepo);
    quotationSvc = new QuotationService(quotationRepo, productSvc, customerSvc, approvalSvc, testTaxSvc);
    orderSvc = new OrderService(orderRepo, productSvc, customerSvc, approvalSvc, quotationSvc, testTaxSvc);
    invoiceSvc = new InvoiceService(invoiceRepo, orderSvc, customerSvc, testTaxSvc);
  });

  afterEach(() => {
    testTaxSvc.resetToDefaults('DIRECTOR');
    taxService.resetToDefaults('DIRECTOR');
  });

  describe('1. Global System-Level Tax Settings & Director Authority', () => {
    it('defaults to Tax Enabled at statutory 18% VAT rate', () => {
      const config = testTaxSvc.getTaxConfig();
      expect(config.taxEnabled).toBe(true);
      expect(config.taxRate).toBe(18);
      expect(config.taxName).toBe('VAT');
    });

    it('permits Director to disable tax globally', () => {
      const result = testTaxSvc.setTaxConfig({ taxEnabled: false }, 'DIRECTOR', mockDirectorUser.name);
      expect(result.success).toBe(true);
      expect(result.config?.taxEnabled).toBe(false);

      const activeConfig = testTaxSvc.getTaxConfig();
      expect(activeConfig.taxEnabled).toBe(false);
    });

    it('permits Director to configure custom tax rates (e.g. 15%)', () => {
      const result = testTaxSvc.setTaxConfig(
        { taxEnabled: true, taxRate: 15, taxName: 'VAT' },
        'DIRECTOR',
        mockDirectorUser.name
      );
      expect(result.success).toBe(true);
      expect(result.config?.taxEnabled).toBe(true);
      expect(result.config?.taxRate).toBe(15);

      const activeConfig = testTaxSvc.getTaxConfig();
      expect(activeConfig.taxRate).toBe(15);
    });

    it('blocks non-Director roles from changing tax configuration', () => {
      const repResult = testTaxSvc.setTaxConfig({ taxEnabled: false }, 'SALES_REP', mockSalesRepUser.name);
      expect(repResult.success).toBe(false);
      expect(repResult.error).toContain('Permission Denied');

      const mgrResult = testTaxSvc.setTaxConfig({ taxRate: 12 }, 'SALES_MANAGER', mockSalesManagerUser.name);
      expect(mgrResult.success).toBe(false);
      expect(mgrResult.error).toContain('Permission Denied');

      // Unchanged
      expect(testTaxSvc.getTaxConfig().taxRate).toBe(18);
      expect(testTaxSvc.getTaxConfig().taxEnabled).toBe(true);
    });

    it('validates tax percentage bounds (0% to 100%)', () => {
      const negativeResult = testTaxSvc.setTaxConfig({ taxRate: -5 }, 'DIRECTOR');
      expect(negativeResult.success).toBe(false);
      expect(negativeResult.error).toContain('Invalid Tax Percentage');

      const overHundredResult = testTaxSvc.setTaxConfig({ taxRate: 105 }, 'DIRECTOR');
      expect(overHundredResult.success).toBe(false);
      expect(overHundredResult.error).toContain('Invalid Tax Percentage');
    });
  });

  describe('2. Impact on New Quotations', () => {
    it('applies configured tax (18%) to new Quotations when enabled (Example: Subtotal 100,000 -> Tax 18,000 -> Grand Total 118,000)', async () => {
      testTaxSvc.setTaxConfig({ taxEnabled: true, taxRate: 18 }, 'DIRECTOR');

      // Product 1: unit price 3250. 10 units = 32,500. Discount 0%. Net = 32,500.
      // Tax (18%) = 32,500 * 0.18 = 5,850. Total = 38,350.
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 10, requestedDiscountPercentage: 0 }],
        },
        mockSalesRepUser
      );

      expect(quotation.subtotal).toBe(32500);
      expect(quotation.discountAmount).toBe(0);
      expect(quotation.taxAmount).toBe(5850);
      expect(quotation.totalAmount).toBe(38350);
      expect(quotation.taxEnabled).toBe(true);
      expect(quotation.taxRatePercentage).toBe(18);
      expect(quotation.items[0].taxPercentage).toBe(18);
      expect(quotation.items[0].taxAmount).toBe(5850);
      expect(quotation.items[0].lineTotal).toBe(38350);
    });

    it('does NOT add tax to new Quotations when tax is disabled by Director (Subtotal 100,000 -> Tax 0 -> Grand Total 100,000)', async () => {
      // Director disables tax
      testTaxSvc.setTaxConfig({ taxEnabled: false }, 'DIRECTOR');

      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 10, requestedDiscountPercentage: 0 }],
        },
        mockSalesRepUser
      );

      // Subtotal = 32,500. Tax = 0. Total = 32,500.
      expect(quotation.subtotal).toBe(32500);
      expect(quotation.discountAmount).toBe(0);
      expect(quotation.taxAmount).toBe(0);
      expect(quotation.totalAmount).toBe(32500);
      expect(quotation.taxEnabled).toBe(false);
      expect(quotation.taxRatePercentage).toBe(0);
      expect(quotation.items[0].taxPercentage).toBe(0);
      expect(quotation.items[0].taxAmount).toBe(0);
      expect(quotation.items[0].lineTotal).toBe(32500);
    });

    it('correctly applies custom tax rate (e.g. 15%) configured by Director', async () => {
      // Director configures tax rate to 15%
      testTaxSvc.setTaxConfig({ taxEnabled: true, taxRate: 15 }, 'DIRECTOR');

      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 10, requestedDiscountPercentage: 0 }],
        },
        mockSalesRepUser
      );

      // Subtotal = 32,500. Tax (15%) = 32,500 * 0.15 = 4,875. Total = 37,375.
      expect(quotation.subtotal).toBe(32500);
      expect(quotation.taxAmount).toBe(4875);
      expect(quotation.totalAmount).toBe(37375);
      expect(quotation.taxEnabled).toBe(true);
      expect(quotation.taxRatePercentage).toBe(15);
    });
  });

  describe('3. Impact on New Invoices', () => {
    it('applies configured tax to newly created Invoices when tax is enabled', async () => {
      testTaxSvc.setTaxConfig({ taxEnabled: true, taxRate: 18 }, 'DIRECTOR');

      // 1. Create and approve order
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: '142 First Cross Street, Colombo 11',
          requestedCreditDays: 30,
          items: [{ productId: 'prod-001', orderedQuantity: 10, requestedDiscountPercentage: 0 }],
        },
        mockSalesRepUser
      );
      await orderSvc.approveOrder(order.id, mockSalesManagerUser, 'Approved');

      // 2. Generate invoice
      const invoice = await invoiceSvc.createInvoiceFromOrder(order.id, mockSalesRepUser);

      expect(invoice.subtotal).toBe(32500);
      expect(invoice.taxTotal).toBe(5850);
      expect(invoice.totalAmount).toBe(38350);
      expect(invoice.balanceAmount).toBe(38350);
      expect(invoice.taxEnabled).toBe(true);
      expect(invoice.taxRatePercentage).toBe(18);
      expect(invoice.items[0].taxPercentage).toBe(18);
      expect(invoice.items[0].taxAmount).toBe(5850);
    });

    it('does NOT add tax to newly created Invoices when tax is disabled by Director', async () => {
      // 1. Order created
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: '142 First Cross Street, Colombo 11',
          requestedCreditDays: 30,
          items: [{ productId: 'prod-001', orderedQuantity: 10, requestedDiscountPercentage: 0 }],
        },
        mockSalesRepUser
      );
      await orderSvc.approveOrder(order.id, mockSalesManagerUser, 'Approved');

      // 2. Director disables tax globally BEFORE invoice is generated
      testTaxSvc.setTaxConfig({ taxEnabled: false }, 'DIRECTOR');

      // 3. Generate invoice
      const invoice = await invoiceSvc.createInvoiceFromOrder(order.id, mockSalesRepUser);

      expect(invoice.subtotal).toBe(32500);
      expect(invoice.taxTotal).toBe(0);
      expect(invoice.totalAmount).toBe(32500);
      expect(invoice.balanceAmount).toBe(32500);
      expect(invoice.taxEnabled).toBe(false);
      expect(invoice.taxRatePercentage).toBe(0);
      expect(invoice.items[0].taxPercentage).toBe(0);
      expect(invoice.items[0].taxAmount).toBe(0);
      expect(invoice.items[0].lineTotal).toBe(32500);
    });
  });

  describe('4. Historical Document Immutability & Audit Guarantee', () => {
    it('does NOT alter existing quotations when Director later changes global tax settings', async () => {
      // 1. Quotation created while Tax is enabled at 18%
      testTaxSvc.setTaxConfig({ taxEnabled: true, taxRate: 18 }, 'DIRECTOR');
      const q1 = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 10 }],
        },
        mockSalesRepUser
      );
      expect(q1.taxAmount).toBe(5850);
      expect(q1.totalAmount).toBe(38350);

      // 2. Director disables tax globally
      testTaxSvc.setTaxConfig({ taxEnabled: false }, 'DIRECTOR');

      // 3. Re-fetch historical quotation q1 from repository
      const fetchedQ1 = await quotationSvc.getQuotationById(q1.id);
      expect(fetchedQ1).toBeDefined();
      expect(fetchedQ1!.taxAmount).toBe(5850);
      expect(fetchedQ1!.totalAmount).toBe(38350);
      expect(fetchedQ1!.taxEnabled).toBe(true);
      expect(fetchedQ1!.taxRatePercentage).toBe(18);

      // 4. Create new quotation q2 under disabled setting
      const q2 = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 10 }],
        },
        mockSalesRepUser
      );
      expect(q2.taxAmount).toBe(0);
      expect(q2.totalAmount).toBe(32500);

      // 5. Historical q1 still unchanged
      const reFetchedQ1 = await quotationSvc.getQuotationById(q1.id);
      expect(reFetchedQ1!.taxAmount).toBe(5850);
      expect(reFetchedQ1!.totalAmount).toBe(38350);
    });

    it('does NOT alter existing invoices when Director later changes global tax settings', async () => {
      // 1. Invoice created while Tax is enabled at 18%
      testTaxSvc.setTaxConfig({ taxEnabled: true, taxRate: 18 }, 'DIRECTOR');

      const order1 = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo',
          items: [{ productId: 'prod-001', orderedQuantity: 10 }],
        },
        mockSalesRepUser
      );
      await orderSvc.approveOrder(order1.id, mockSalesManagerUser, 'Approved');
      const inv1 = await invoiceSvc.createInvoiceFromOrder(order1.id, mockSalesRepUser);
      expect(inv1.taxTotal).toBe(5850);
      expect(inv1.totalAmount).toBe(38350);

      // 2. Director modifies tax to disabled (0%)
      testTaxSvc.setTaxConfig({ taxEnabled: false }, 'DIRECTOR');

      // 3. Existing invoice inv1 is NOT mutated
      const fetchedInv1 = await invoiceSvc.getInvoiceById(inv1.id);
      expect(fetchedInv1!.taxTotal).toBe(5850);
      expect(fetchedInv1!.totalAmount).toBe(38350);
      expect(fetchedInv1!.taxEnabled).toBe(true);
      expect(fetchedInv1!.taxRatePercentage).toBe(18);
    });
  });

  describe('5. Calculation Engine Helper Unit Verification', () => {
    it('computes exact values for Tax Enabled 18% on Rs. 100,000 matching user spec', () => {
      testTaxSvc.setTaxConfig({ taxEnabled: true, taxRate: 18 }, 'DIRECTOR');
      const res = testTaxSvc.calculateDocumentTotals(100000, 0);

      expect(res.subtotal).toBe(100000);
      expect(res.discountAmount).toBe(0);
      expect(res.taxRate).toBe(18);
      expect(res.taxAmount).toBe(18000);
      expect(res.grandTotal).toBe(118000);
      expect(res.taxEnabled).toBe(true);
    });

    it('computes exact values for Tax Disabled on Rs. 100,000 matching user spec', () => {
      testTaxSvc.setTaxConfig({ taxEnabled: false }, 'DIRECTOR');
      const res = testTaxSvc.calculateDocumentTotals(100000, 0);

      expect(res.subtotal).toBe(100000);
      expect(res.discountAmount).toBe(0);
      expect(res.taxRate).toBe(0);
      expect(res.taxAmount).toBe(0);
      expect(res.grandTotal).toBe(100000);
      expect(res.taxEnabled).toBe(false);
    });
  });
});
