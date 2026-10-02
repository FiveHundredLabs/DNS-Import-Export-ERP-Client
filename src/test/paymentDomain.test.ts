import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentService } from '../services/PaymentService';
import { InvoiceService } from '../services/InvoiceService';
import { OrderService } from '../services/OrderService';
import { MockPaymentRepository } from '../repositories/mock/MockPaymentRepository';
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
import {
  validatePaymentAllocation,
  validateChequeDetails,
  canUserCollectPayment,
  autoAllocatePayment,
} from '../rules/paymentRules';
import { calculateInvoiceStatus } from '../rules/invoiceRules';
import { User } from '../types/auth';

describe('Phase 7 — Payment Domain & Multi-Tier Settlement Verification', () => {
  let paymentRepo: MockPaymentRepository;
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
  let paymentSvc: PaymentService;

  const mockSalesRepUser: User = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    email: 'rep.colombo@dnserp.com',
    phone: '+94 77 123 4567',
    role: 'SALES_REP',
    areaId: 'area-01',
    isActive: true,
  };

  const otherRepUser: User = {
    id: 'usr-107',
    name: 'Dilshan Silva',
    email: 'rep.kandy@dnserp.com',
    phone: '+94 77 765 4321',
    role: 'SALES_REP',
    areaId: 'area-02',
    isActive: true,
  };

  const mockFinanceManagerUser: User = {
    id: 'usr-104',
    name: 'Priyani Fernando',
    email: 'finance.manager@dnserp.com',
    phone: '+94 11 234 5678',
    role: 'FINANCE_MANAGER',
    isActive: true,
  };

  beforeEach(() => {
    paymentRepo = new MockPaymentRepository();
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
    paymentSvc = new PaymentService(paymentRepo, customerSvc, invoiceSvc, approvalSvc);
  });

  describe('1. Two-Step Payment Recording & Balance Isolation (Section 21 & 56)', () => {
    it('recording payment sets status to PENDING_APPROVAL and MUST NOT reduce customer balance or invoice balance', async () => {
      // cust-001 has invoice inv-001 with balanceAmount = 150000
      const customerBefore = await customerSvc.getCustomer('cust-001');
      const priorOutstanding = customerBefore!.financials.totalOutstanding;
      const invoiceBefore = await invoiceSvc.getInvoiceById('inv-001');
      const priorInvoiceBalance = invoiceBefore!.balanceAmount;

      // Sales rep records cash payment of 100,000 allocated to inv-001
      const payment = await paymentSvc.recordPayment(
        {
          customerId: 'cust-001',
          amount: 100000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            {
              invoiceId: 'inv-001',
              invoiceNumber: 'INV-2025-0101',
              allocatedAmount: 100000,
            },
          ],
          notes: 'Cash collected by sales rep in field',
        },
        mockSalesRepUser
      );

      // Verify payment is in PENDING_APPROVAL
      expect(payment).toBeDefined();
      expect(payment.status).toBe('PENDING_APPROVAL');
      expect(payment.receiptNumber).toMatch(/^REC-\d{4}-\d+/);
      expect(payment.amount).toBe(100000);

      // Customer outstanding balance MUST NOT have changed yet!
      const customerAfter = await customerSvc.getCustomer('cust-001');
      expect(customerAfter!.financials.totalOutstanding).toBe(priorOutstanding);

      // Invoice balance MUST NOT have changed yet!
      const invoiceAfter = await invoiceSvc.getInvoiceById('inv-001');
      expect(invoiceAfter!.balanceAmount).toBe(priorInvoiceBalance);
      expect(invoiceAfter!.paidAmount).toBe(0);

      // Verify approval request was created in ApprovalService
      const pendingApprovals = await approvalSvc.getPendingApprovals();
      const approvalReq = pendingApprovals.find(
        (a) => a.documentType === 'PAYMENT_RECEIPT' && a.documentId === payment.id
      );
      expect(approvalReq).toBeDefined();
      expect(approvalReq!.currentApproverRole).toBe('FINANCE_MANAGER');
    });

    it('updates invoice balances and customer financials only upon Finance approval', async () => {
      // Setup payment
      const payment = await paymentSvc.recordPayment(
        {
          customerId: 'cust-001',
          amount: 150000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            {
              invoiceId: 'inv-001',
              invoiceNumber: 'INV-2025-0101',
              allocatedAmount: 150000,
            },
          ],
        },
        mockSalesRepUser
      );

      const customerBefore = await customerSvc.getCustomer('cust-001');
      const priorOutstanding = customerBefore!.financials.totalOutstanding;

      // Finance Manager approves
      const approvedPayment = await paymentSvc.approvePayment(
        payment.id,
        mockFinanceManagerUser,
        'Bank deposit verified.'
      );

      expect(approvedPayment.status).toBe('APPROVED');
      expect(approvedPayment.approvedById).toBe(mockFinanceManagerUser.id);

      // Invoice inv-001 should now be fully PAID
      const invoiceAfter = await invoiceSvc.getInvoiceById('inv-001');
      expect(invoiceAfter!.paidAmount).toBe(150000);
      expect(invoiceAfter!.balanceAmount).toBe(0);
      expect(invoiceAfter!.status).toBe('PAID');

      // Customer financials should be reduced
      const customerAfter = await customerSvc.getCustomer('cust-001');
      expect(customerAfter!.financials.totalOutstanding).toBe(priorOutstanding - 150000);
      expect(customerAfter!.financials.availableCredit).toBe(
        customerAfter!.commercialTerms.creditLimit - customerAfter!.financials.totalOutstanding
      );
    });

    it('rejecting payment sets status to REJECTED and leaves balances untouched', async () => {
      const payment = await paymentSvc.recordPayment(
        {
          customerId: 'cust-001',
          amount: 50000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            {
              invoiceId: 'inv-001',
              invoiceNumber: 'INV-2025-0101',
              allocatedAmount: 50000,
            },
          ],
        },
        mockSalesRepUser
      );

      const customerBefore = await customerSvc.getCustomer('cust-001');
      const invoiceBefore = await invoiceSvc.getInvoiceById('inv-001');

      // Finance Manager rejects
      const rejected = await paymentSvc.rejectPayment(
        payment.id,
        'Counterfeit currency detected in cash batch.',
        mockFinanceManagerUser
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.rejectionReason).toBe('Counterfeit currency detected in cash batch.');

      // Check balances are unaffected
      const customerAfter = await customerSvc.getCustomer('cust-001');
      const invoiceAfter = await invoiceSvc.getInvoiceById('inv-001');
      expect(customerAfter!.financials.totalOutstanding).toBe(customerBefore!.financials.totalOutstanding);
      expect(invoiceAfter!.balanceAmount).toBe(invoiceBefore!.balanceAmount);
    });

    it('prevents non-finance roles from approving payments', async () => {
      const payment = await paymentSvc.recordPayment(
        {
          customerId: 'cust-001',
          amount: 50000,
          paymentMethod: 'CASH',
        },
        mockSalesRepUser
      );

      await expect(
        paymentSvc.approvePayment(payment.id, mockSalesRepUser, 'Unauthorized approval attempt')
      ).rejects.toThrow(/not authorized to approve payments/);
    });

    it('rejects approval if an invoice balance was reduced below allocated amount prior to approval', async () => {
      // Create payment allocating 150000 to inv-001
      const payment = await paymentSvc.recordPayment(
        {
          customerId: 'cust-001',
          amount: 150000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            {
              invoiceId: 'inv-001',
              invoiceNumber: 'INV-2025-0101',
              allocatedAmount: 150000,
            },
          ],
        },
        mockSalesRepUser
      );

      // Simulate concurrent settlement that reduced inv-001 balance to 50000
      await invoiceSvc.updateInvoice('inv-001', {
        balanceAmount: 50000,
        paidAmount: 100000,
      });

      // Attempting to approve 150000 allocation against 50000 balance must fail
      await expect(
        paymentSvc.approvePayment(payment.id, mockFinanceManagerUser, 'Approving')
      ).rejects.toThrow(/exceeds invoice INV-2025-0101 current balance/);
    });

    it('synchronizes approval from central Approvals Engine to payment entity', async () => {
      const payment = await paymentSvc.recordPayment(
        {
          customerId: 'cust-001',
          amount: 100000,
          paymentMethod: 'CASH',
        },
        mockSalesRepUser
      );

      const pending = await approvalSvc.getPendingApprovals();
      const appReq = pending.find(
        (a) => a.documentType === 'PAYMENT_RECEIPT' && a.documentId === payment.id
      );
      expect(appReq).toBeDefined();

      // Finance Manager executes approval via central engine
      await approvalSvc.processAction(
        appReq!.id,
        'APPROVE',
        mockFinanceManagerUser.id,
        mockFinanceManagerUser.name,
        'FINANCE_MANAGER',
        'Verified in central approvals engine.'
      );

      // Payment in repo should be APPROVED with correct approver info
      const updatedPayment = await paymentSvc.getPaymentById(payment.id);
      expect(updatedPayment!.status).toBe('APPROVED');
      expect(updatedPayment!.approvedById).toBe(mockFinanceManagerUser.id);
    });
  });

  describe('2. Allocation Validation Rules', () => {
    it('rejects allocations that exceed the payment total amount', async () => {
      const result = validatePaymentAllocation(
        100000,
        [
          { invoiceId: 'inv-1', invoiceNumber: 'INV-1', allocatedAmount: 70000 },
          { invoiceId: 'inv-2', invoiceNumber: 'INV-2', allocatedAmount: 50000 },
        ],
        { 'inv-1': 100000, 'inv-2': 100000 }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds collected payment amount/);
    });

    it('rejects allocation when allocated amount exceeds the invoice outstanding balance', async () => {
      const result = validatePaymentAllocation(
        200000,
        [
          { invoiceId: 'inv-1', invoiceNumber: 'INV-1', allocatedAmount: 150000 },
        ],
        { 'inv-1': 100000 } // only 100,000 balance available
      );

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds outstanding balance/);
    });

    it('rejects cumulative over-allocation when duplicate entries for the same invoice exceed balance', () => {
      const result = validatePaymentAllocation(
        150000,
        [
          { invoiceId: 'inv-1', invoiceNumber: 'INV-1', allocatedAmount: 60000 },
          { invoiceId: 'inv-1', invoiceNumber: 'INV-1', allocatedAmount: 60000 },
        ],
        { 'inv-1': 100000 } // only 100,000 balance available, but cumulative is 120,000!
      );

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds outstanding balance/);
    });

    it('accepts valid allocation within payment and invoice balance limits', () => {
      const result = validatePaymentAllocation(
        150000,
        [
          { invoiceId: 'inv-1', invoiceNumber: 'INV-1', allocatedAmount: 100000 },
          { invoiceId: 'inv-2', invoiceNumber: 'INV-2', allocatedAmount: 50000 },
        ],
        { 'inv-1': 120000, 'inv-2': 80000 }
      );

      expect(result.valid).toBe(true);
      expect(result.totalAllocated).toBe(150000);
    });

    it('rejects allocation to an invoice belonging to a different customer in recordPayment', async () => {
      // inv-006 belongs to cust-003, not cust-001
      await expect(
        paymentSvc.recordPayment(
          {
            customerId: 'cust-001',
            amount: 50000,
            paymentMethod: 'CASH',
            invoiceAllocations: [
              {
                invoiceId: 'inv-006',
                invoiceNumber: 'INV-2025-0106',
                allocatedAmount: 50000,
              },
            ],
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/belongs to another customer/);
    });

    it('rejects allocation to a fully paid invoice in recordPayment', async () => {
      // inv-004 is PAID (balanceAmount = 0)
      await expect(
        paymentSvc.recordPayment(
          {
            customerId: 'cust-001',
            amount: 50000,
            paymentMethod: 'CASH',
            invoiceAllocations: [
              {
                invoiceId: 'inv-004',
                invoiceNumber: 'INV-2024-0098',
                allocatedAmount: 50000,
              },
            ],
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/already fully paid/);
    });
  });

  describe('3. Cheque Details Validation Rules', () => {
    it('accepts valid cheque within 90 days validity window', () => {
      const reference = new Date('2026-09-24');
      const validChequeDate = '2026-09-01'; // 23 days old

      const result = validateChequeDetails(
        {
          chequeNumber: 'CHQ-123456',
          bankName: 'Commercial Bank',
          chequeDate: validChequeDate,
        },
        reference
      );

      expect(result.valid).toBe(true);
    });

    it('rejects stale cheque older than 90 days', () => {
      const reference = new Date('2026-09-24');
      const staleChequeDate = '2026-05-01'; // ~146 days old

      const result = validateChequeDetails(
        {
          chequeNumber: 'CHQ-123456',
          bankName: 'Commercial Bank',
          chequeDate: staleChequeDate,
        },
        reference
      );

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/older than 90 days/);
    });

    it('rejects cheque missing mandatory fields', () => {
      const missingBank = validateChequeDetails({
        chequeNumber: 'CHQ-123456',
        chequeDate: '2026-09-01',
      });
      expect(missingBank.valid).toBe(false);
      expect(missingBank.error).toMatch(/bank name is required/i);

      const missingNumber = validateChequeDetails({
        bankName: 'HNB',
        chequeDate: '2026-09-01',
      });
      expect(missingNumber.valid).toBe(false);
      expect(missingNumber.error).toMatch(/cheque number is required/i);
    });
  });

  describe('4. Territory & Portfolio Scoping on Payments', () => {
    it('permits sales rep to collect payment for customer in their assigned portfolio', () => {
      const check = canUserCollectPayment(
        mockSalesRepUser, // usr-106
        { assignedRepId: 'usr-106', areaId: 'area-01' }
      );
      expect(check.allowed).toBe(true);
    });

    it('blocks sales rep from collecting payment for customer assigned to another sales rep', async () => {
      const check = canUserCollectPayment(
        otherRepUser, // usr-107 (Kandy)
        { assignedRepId: 'usr-106', areaId: 'area-01' } // assigned to usr-106
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/only collect payments for customers assigned to their portfolio/);

      // Service execution test
      await expect(
        paymentSvc.recordPayment(
          {
            customerId: 'cust-001', // assigned to usr-106
            amount: 50000,
            paymentMethod: 'CASH',
          },
          otherRepUser
        )
      ).rejects.toThrow(/Permission Denied/);
    });
  });

  describe('5. Automatic Oldest-First Allocation & Collected vs Paid Lifecycle', () => {
    it('autoAllocatePayment allocates against oldest outstanding invoices first (25,000 against 5x 10,000)', () => {
      const mockInvoices: any[] = [
        { id: 'inv-1', invoiceNumber: 'INV-001', issueDate: '2025-01-01', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-2', invoiceNumber: 'INV-002', issueDate: '2025-01-02', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-3', invoiceNumber: 'INV-003', issueDate: '2025-01-03', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-4', invoiceNumber: 'INV-004', issueDate: '2025-01-04', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-5', invoiceNumber: 'INV-005', issueDate: '2025-01-05', balanceAmount: 10000, status: 'ISSUED' },
      ];

      // Paying 25,000: first 2 settled (10,000 each), remaining 5,000 to third
      const alloc25k = autoAllocatePayment(25000, mockInvoices);
      expect(alloc25k).toEqual([
        { invoiceId: 'inv-1', invoiceNumber: 'INV-001', allocatedAmount: 10000 },
        { invoiceId: 'inv-2', invoiceNumber: 'INV-002', allocatedAmount: 10000 },
        { invoiceId: 'inv-3', invoiceNumber: 'INV-003', allocatedAmount: 5000 },
      ]);
    });

    it('autoAllocatePayment fully settles all 5 invoices when paying full 50,000', () => {
      const mockInvoices: any[] = [
        { id: 'inv-1', invoiceNumber: 'INV-001', issueDate: '2025-01-01', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-2', invoiceNumber: 'INV-002', issueDate: '2025-01-02', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-3', invoiceNumber: 'INV-003', issueDate: '2025-01-03', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-4', invoiceNumber: 'INV-004', issueDate: '2025-01-04', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-5', invoiceNumber: 'INV-005', issueDate: '2025-01-05', balanceAmount: 10000, status: 'ISSUED' },
      ];

      const alloc50k = autoAllocatePayment(50000, mockInvoices);
      expect(alloc50k).toHaveLength(5);
      expect(alloc50k.every((a) => a.allocatedAmount === 10000)).toBe(true);
    });

    it('autoAllocatePayment settles first 3 invoices when paying 30,000', () => {
      const mockInvoices: any[] = [
        { id: 'inv-1', invoiceNumber: 'INV-001', issueDate: '2025-01-01', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-2', invoiceNumber: 'INV-002', issueDate: '2025-01-02', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-3', invoiceNumber: 'INV-003', issueDate: '2025-01-03', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-4', invoiceNumber: 'INV-004', issueDate: '2025-01-04', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-5', invoiceNumber: 'INV-005', issueDate: '2025-01-05', balanceAmount: 10000, status: 'ISSUED' },
      ];

      const alloc30k = autoAllocatePayment(30000, mockInvoices);
      expect(alloc30k).toEqual([
        { invoiceId: 'inv-1', invoiceNumber: 'INV-001', allocatedAmount: 10000 },
        { invoiceId: 'inv-2', invoiceNumber: 'INV-002', allocatedAmount: 10000 },
        { invoiceId: 'inv-3', invoiceNumber: 'INV-003', allocatedAmount: 10000 },
      ]);
    });

    it('orders by oldest issueDate regardless of initial array order', () => {
      // Invoices passed in reverse or jumbled order
      const mockInvoices: any[] = [
        { id: 'inv-5', invoiceNumber: 'INV-005', issueDate: '2025-01-05', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-1', invoiceNumber: 'INV-001', issueDate: '2025-01-01', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-3', invoiceNumber: 'INV-003', issueDate: '2025-01-03', balanceAmount: 10000, status: 'ISSUED' },
        { id: 'inv-2', invoiceNumber: 'INV-002', issueDate: '2025-01-02', balanceAmount: 10000, status: 'ISSUED' },
      ];

      const alloc15k = autoAllocatePayment(15000, mockInvoices);
      expect(alloc15k).toEqual([
        { invoiceId: 'inv-1', invoiceNumber: 'INV-001', allocatedAmount: 10000 },
        { invoiceId: 'inv-2', invoiceNumber: 'INV-002', allocatedAmount: 5000 },
      ]);
    });

    it('enforces distinct Collected vs Paid lifecycle stages end-to-end', async () => {
      // Setup 3 invoices for cust-001: 10,000 each (total 30,000)
      const inv1 = await invoiceRepo.create({
        invoiceNumber: 'INV-TEST-001',
        orderId: 'ord-test-1',
        orderNumber: 'SO-TEST-1',
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        customerCode: 'DLR-COL-001',
        salesRepId: mockSalesRepUser.id,
        salesRepName: mockSalesRepUser.name,
        issueDate: '2027-01-01',
        dueDate: '2027-02-01',
        items: [],
        subtotal: 10000,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 10000,
        paidAmount: 0,
        balanceAmount: 10000,
        status: 'ISSUED',
      });

      const inv2 = await invoiceRepo.create({
        invoiceNumber: 'INV-TEST-002',
        orderId: 'ord-test-2',
        orderNumber: 'SO-TEST-2',
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        customerCode: 'DLR-COL-001',
        salesRepId: mockSalesRepUser.id,
        salesRepName: mockSalesRepUser.name,
        issueDate: '2027-01-02',
        dueDate: '2027-02-02',
        items: [],
        subtotal: 10000,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 10000,
        paidAmount: 0,
        balanceAmount: 10000,
        status: 'ISSUED',
      });

      const inv3 = await invoiceRepo.create({
        invoiceNumber: 'INV-TEST-003',
        orderId: 'ord-test-3',
        orderNumber: 'SO-TEST-3',
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        customerCode: 'DLR-COL-001',
        salesRepId: mockSalesRepUser.id,
        salesRepName: mockSalesRepUser.name,
        issueDate: '2027-01-03',
        dueDate: '2027-02-03',
        items: [],
        subtotal: 10000,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 10000,
        paidAmount: 0,
        balanceAmount: 10000,
        status: 'ISSUED',
      });

      const customerBefore = await customerSvc.getCustomer('cust-001');
      const priorCustOutstanding = customerBefore!.financials.totalOutstanding;

      // STAGE 1: Sales rep collects LKR 25,000 from customer (without passing manual allocations)
      // System MUST automatically allocate against oldest outstanding invoices first!
      const payment = await paymentSvc.recordPayment(
        {
          customerId: 'cust-001',
          amount: 25000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            { invoiceId: inv1.id, invoiceNumber: inv1.invoiceNumber, allocatedAmount: 10000 },
            { invoiceId: inv2.id, invoiceNumber: inv2.invoiceNumber, allocatedAmount: 10000 },
            { invoiceId: inv3.id, invoiceNumber: inv3.invoiceNumber, allocatedAmount: 5000 },
          ],
        },
        mockSalesRepUser
      );

      // Verify payment is PENDING_APPROVAL
      expect(payment.status).toBe('PENDING_APPROVAL');

      // STAGE 1 VERIFICATION: Invoices MUST be marked Collected / Partially Collected,
      // but money MUST NOT be treated as officially received revenue yet!
      const inv1Collected = await invoiceSvc.getInvoiceById(inv1.id);
      expect(inv1Collected!.status).toBe('COLLECTED');
      expect(inv1Collected!.collectedAmount).toBe(10000);
      expect(inv1Collected!.paidAmount).toBe(0); // NOT recognized revenue yet!
      expect(inv1Collected!.balanceAmount).toBe(10000); // Balance untouched!

      const inv2Collected = await invoiceSvc.getInvoiceById(inv2.id);
      expect(inv2Collected!.status).toBe('COLLECTED');
      expect(inv2Collected!.collectedAmount).toBe(10000);
      expect(inv2Collected!.paidAmount).toBe(0);
      expect(inv2Collected!.balanceAmount).toBe(10000);

      const inv3Collected = await invoiceSvc.getInvoiceById(inv3.id);
      expect(inv3Collected!.status).toBe('PARTIALLY_COLLECTED');
      expect(inv3Collected!.collectedAmount).toBe(5000);
      expect(inv3Collected!.paidAmount).toBe(0);
      expect(inv3Collected!.balanceAmount).toBe(10000);

      // Customer financials MUST be completely untouched at Collected stage
      const custAfterCollection = await customerSvc.getCustomer('cust-001');
      expect(custAfterCollection!.financials.totalOutstanding).toBe(priorCustOutstanding);

      // STAGE 2: Collected money is handed over to Head Office and verified by Finance Manager
      const approvedPayment = await paymentSvc.approvePayment(
        payment.id,
        mockFinanceManagerUser,
        'Money handed over to Head Office, verified, and officially recorded.'
      );

      expect(approvedPayment.status).toBe('APPROVED');

      // STAGE 2 VERIFICATION: Invoices now become PAID / PARTIALLY_PAID and balances reduce
      const inv1Approved = await invoiceSvc.getInvoiceById(inv1.id);
      expect(inv1Approved!.status).toBe('PAID');
      expect(inv1Approved!.paidAmount).toBe(10000);
      expect(inv1Approved!.balanceAmount).toBe(0);
      expect(inv1Approved!.collectedAmount).toBe(0);

      const inv2Approved = await invoiceSvc.getInvoiceById(inv2.id);
      expect(inv2Approved!.status).toBe('PAID');
      expect(inv2Approved!.paidAmount).toBe(10000);
      expect(inv2Approved!.balanceAmount).toBe(0);
      expect(inv2Approved!.collectedAmount).toBe(0);

      const inv3Approved = await invoiceSvc.getInvoiceById(inv3.id);
      expect(inv3Approved!.status).toBe('PARTIALLY_PAID');
      expect(inv3Approved!.paidAmount).toBe(5000);
      expect(inv3Approved!.balanceAmount).toBe(5000);
      expect(inv3Approved!.collectedAmount).toBe(0);

      // Customer master outstanding is now reduced by 25,000
      const custAfterApproval = await customerSvc.getCustomer('cust-001');
      expect(custAfterApproval!.financials.totalOutstanding).toBe(priorCustOutstanding - 25000);
    });

    it('reverts invoice status and collectedAmount if Head Office rejects the collection', async () => {
      const inv = await invoiceRepo.create({
        invoiceNumber: 'INV-TEST-REJECT',
        orderId: 'ord-test-r',
        orderNumber: 'SO-TEST-R',
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        customerCode: 'DLR-COL-001',
        salesRepId: mockSalesRepUser.id,
        salesRepName: mockSalesRepUser.name,
        issueDate: '2026-09-01',
        dueDate: '2026-12-31',
        items: [],
        subtotal: 20000,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 20000,
        paidAmount: 0,
        balanceAmount: 20000,
        status: 'ISSUED',
      });

      const payment = await paymentSvc.recordPayment(
        {
          customerId: 'cust-001',
          amount: 20000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, allocatedAmount: 20000 },
          ],
        },
        mockSalesRepUser
      );

      const collectedInv = await invoiceSvc.getInvoiceById(inv.id);
      expect(collectedInv!.status).toBe('COLLECTED');
      expect(collectedInv!.collectedAmount).toBe(20000);

      // Head Office rejects
      await paymentSvc.rejectPayment(
        payment.id,
        'Shortage in cash batch handed over by sales rep.',
        mockFinanceManagerUser
      );

      // Invoice status reverts to ISSUED and collectedAmount reverts to 0
      const rejectedInv = await invoiceSvc.getInvoiceById(inv.id);
      expect(rejectedInv!.status).toBe('ISSUED');
      expect(rejectedInv!.collectedAmount).toBe(0);
      expect(rejectedInv!.paidAmount).toBe(0);
      expect(rejectedInv!.balanceAmount).toBe(20000);
    });

    it('automatically allocates against oldest invoices when customer makes a payment without specifying allocations', async () => {
      // Create a fresh customer with 5 invoices totaling LKR 50,000 (10,000 each)
      const customer = await customerRepo.create({
        name: 'Auto Allocation Test Hardware',
        code: 'CUST-AUTO-01',
        commercialTerms: {
          creditLimit: 100000,
          creditDays: 30,
          depositBalance: 0,
        },
        financials: {
          totalOutstanding: 50000,
          availableCredit: 50000,
          overdue: 0,
          nearDue: 0,
          currentDue: 50000,
          agingBreakdown: { current: 50000, days1to30: 0, days31to60: 0, days61to90: 0, days90Plus: 0 },
        },
        assignedRepId: mockSalesRepUser.id,
        assignedRepName: mockSalesRepUser.name,
        areaId: 'area-01',
        status: 'ACTIVE',
        riskTier: 'LOW',
        contactPerson: 'Perera',
        email: 'test@auto.lk',
        phone: '+94 77 111 2222',
        address: '10 Galle Road',
        channel: 'HARDWARE',
      });

      // Create 5 invoices of 10,000 each, from oldest to newest
      const invoices = [];
      for (let i = 1; i <= 5; i++) {
        const inv = await invoiceRepo.create({
          invoiceNumber: `INV-AUTO-00${i}`,
          orderId: `ord-auto-${i}`,
          orderNumber: `SO-AUTO-${i}`,
          customerId: customer.id,
          customerName: customer.name,
          customerCode: customer.code,
          salesRepId: mockSalesRepUser.id,
          salesRepName: mockSalesRepUser.name,
          issueDate: `2027-01-0${i}`,
          dueDate: `2027-02-0${i}`,
          items: [],
          subtotal: 10000,
          discountTotal: 0,
          taxTotal: 0,
          totalAmount: 10000,
          paidAmount: 0,
          balanceAmount: 10000,
          status: 'ISSUED',
        });
        invoices.push(inv);
      }

      // Customer makes a payment of LKR 25,000 (no manual allocations provided)
      const payment = await paymentSvc.recordPayment(
        {
          customerId: customer.id,
          amount: 25000,
          paymentMethod: 'CASH',
        },
        mockSalesRepUser
      );

      // Verify the payment allocations were automatically computed:
      // First 2 oldest invoices (10,000 each) fully settled, remaining 5,000 to the 3rd invoice
      expect(payment.invoiceAllocations).toEqual([
        { invoiceId: invoices[0].id, invoiceNumber: invoices[0].invoiceNumber, allocatedAmount: 10000 },
        { invoiceId: invoices[1].id, invoiceNumber: invoices[1].invoiceNumber, allocatedAmount: 10000 },
        { invoiceId: invoices[2].id, invoiceNumber: invoices[2].invoiceNumber, allocatedAmount: 5000 },
      ]);

      // Verify collection statuses on invoices:
      const inv1 = await invoiceSvc.getInvoiceById(invoices[0].id);
      expect(inv1!.status).toBe('COLLECTED');
      expect(inv1!.collectedAmount).toBe(10000);

      const inv2 = await invoiceSvc.getInvoiceById(invoices[1].id);
      expect(inv2!.status).toBe('COLLECTED');
      expect(inv2!.collectedAmount).toBe(10000);

      const inv3 = await invoiceSvc.getInvoiceById(invoices[2].id);
      expect(inv3!.status).toBe('PARTIALLY_COLLECTED');
      expect(inv3!.collectedAmount).toBe(5000);

      const inv4 = await invoiceSvc.getInvoiceById(invoices[3].id);
      expect(inv4!.status).toBe('ISSUED');
      expect(inv4!.collectedAmount || 0).toBe(0);

      const inv5 = await invoiceSvc.getInvoiceById(invoices[4].id);
      expect(inv5!.status).toBe('ISSUED');
      expect(inv5!.collectedAmount || 0).toBe(0);

      // Finance Manager approves the payment:
      await paymentSvc.approvePayment(payment.id, mockFinanceManagerUser, 'Verified funds');

      // Now inv1 and inv2 are PAID, inv3 is PARTIALLY_PAID
      const inv1Paid = await invoiceSvc.getInvoiceById(invoices[0].id);
      expect(inv1Paid!.status).toBe('PAID');
      expect(inv1Paid!.paidAmount).toBe(10000);
      expect(inv1Paid!.balanceAmount).toBe(0);

      const inv2Paid = await invoiceSvc.getInvoiceById(invoices[1].id);
      expect(inv2Paid!.status).toBe('PAID');
      expect(inv2Paid!.paidAmount).toBe(10000);
      expect(inv2Paid!.balanceAmount).toBe(0);

      const inv3Paid = await invoiceSvc.getInvoiceById(invoices[2].id);
      expect(inv3Paid!.status).toBe('PARTIALLY_PAID');
      expect(inv3Paid!.paidAmount).toBe(5000);
      expect(inv3Paid!.balanceAmount).toBe(5000);
    });

    it('correctly allocates consecutive payments without double-allocating to already collected invoices', async () => {
      // 5 invoices of 10,000 each
      const customer = await customerRepo.create({
        name: 'Consecutive Payments Hardware',
        code: 'CUST-CONSEC-01',
        commercialTerms: { creditLimit: 100000, creditDays: 30, depositBalance: 0 },
        financials: {
          totalOutstanding: 50000,
          availableCredit: 50000,
          overdue: 0,
          nearDue: 0,
          currentDue: 50000,
          agingBreakdown: { current: 50000, days1to30: 0, days31to60: 0, days61to90: 0, days90Plus: 0 },
        },
        assignedRepId: mockSalesRepUser.id,
        assignedRepName: mockSalesRepUser.name,
        areaId: 'area-01',
        status: 'ACTIVE',
        riskTier: 'LOW',
        contactPerson: 'Silva',
        email: 'silva@consec.lk',
        phone: '+94 77 333 4444',
        address: '50 Main Street, Kandy',
        channel: 'HARDWARE',
      });

      const invs = [];
      for (let i = 1; i <= 5; i++) {
        const inv = await invoiceRepo.create({
          invoiceNumber: `INV-SEQ-00${i}`,
          orderId: `ord-seq-${i}`,
          orderNumber: `SO-SEQ-${i}`,
          customerId: customer.id,
          customerName: customer.name,
          customerCode: customer.code,
          salesRepId: mockSalesRepUser.id,
          salesRepName: mockSalesRepUser.name,
          issueDate: `2027-01-0${i}`,
          dueDate: `2027-02-0${i}`,
          items: [],
          subtotal: 10000,
          discountTotal: 0,
          taxTotal: 0,
          totalAmount: 10000,
          paidAmount: 0,
          balanceAmount: 10000,
          status: 'ISSUED',
        });
        invs.push(inv);
      }

      // First Payment: 25,000
      const payment1 = await paymentSvc.recordPayment(
        { customerId: customer.id, amount: 25000, paymentMethod: 'CASH' },
        mockSalesRepUser
      );

      // Verify Payment 1 allocated to invs[0] (10k), invs[1] (10k), invs[2] (5k)
      expect(payment1.invoiceAllocations).toEqual([
        { invoiceId: invs[0].id, invoiceNumber: invs[0].invoiceNumber, allocatedAmount: 10000 },
        { invoiceId: invs[1].id, invoiceNumber: invs[1].invoiceNumber, allocatedAmount: 10000 },
        { invoiceId: invs[2].id, invoiceNumber: invs[2].invoiceNumber, allocatedAmount: 5000 },
      ]);

      // Second Payment: 25,000 BEFORE Payment 1 is approved!
      // Must NOT double-allocate to invs[0] or invs[1]. Must allocate remainder to invs[2] (5k), invs[3] (10k), invs[4] (10k).
      const payment2 = await paymentSvc.recordPayment(
        { customerId: customer.id, amount: 25000, paymentMethod: 'CASH' },
        mockSalesRepUser
      );

      expect(payment2.invoiceAllocations).toEqual([
        { invoiceId: invs[2].id, invoiceNumber: invs[2].invoiceNumber, allocatedAmount: 5000 },
        { invoiceId: invs[3].id, invoiceNumber: invs[3].invoiceNumber, allocatedAmount: 10000 },
        { invoiceId: invs[4].id, invoiceNumber: invs[4].invoiceNumber, allocatedAmount: 10000 },
      ]);

      // All invoices should now be COLLECTED
      const checkedInvs = await Promise.all(invs.map((i) => invoiceSvc.getInvoiceById(i.id)));
      expect(checkedInvs.every((i) => i!.status === 'COLLECTED')).toBe(true);
      expect(checkedInvs[2]!.collectedAmount).toBe(10000);

      // Approve Payment 1: invs[0] & invs[1] become PAID; invs[2] stays COLLECTED (5k paid + 5k pending)
      await paymentSvc.approvePayment(payment1.id, mockFinanceManagerUser);
      const afterApprove1 = await invoiceSvc.getInvoiceById(invs[2].id);
      expect(afterApprove1!.paidAmount).toBe(5000);
      expect(afterApprove1!.balanceAmount).toBe(5000);
      expect(afterApprove1!.collectedAmount).toBe(5000);
      expect(afterApprove1!.status).toBe('COLLECTED');

      // Approve Payment 2: all 5 invoices now become PAID!
      await paymentSvc.approvePayment(payment2.id, mockFinanceManagerUser);
      const fullyApproved = await Promise.all(invs.map((i) => invoiceSvc.getInvoiceById(i.id)));
      expect(fullyApproved.every((i) => i!.status === 'PAID')).toBe(true);
      expect(fullyApproved.every((i) => i!.balanceAmount === 0)).toBe(true);

      const custFinal = await customerSvc.getCustomer(customer.id);
      expect(custFinal!.financials.totalOutstanding).toBe(0);
    });

    it('autoAllocatePayment skips COLLECTED and fully-collected invoices', () => {
      const mockInvoices: any[] = [
        { id: 'inv-1', invoiceNumber: 'INV-001', issueDate: '2025-01-01', balanceAmount: 10000, collectedAmount: 10000, status: 'COLLECTED' },
        { id: 'inv-2', invoiceNumber: 'INV-002', issueDate: '2025-01-02', balanceAmount: 10000, collectedAmount: 4000, status: 'PARTIALLY_COLLECTED' },
        { id: 'inv-3', invoiceNumber: 'INV-003', issueDate: '2025-01-03', balanceAmount: 10000, collectedAmount: 0, status: 'ISSUED' },
      ];

      // Paying 10,000:
      // inv-1 is fully collected -> 0
      // inv-2 has 6,000 uncollected -> receives 6,000
      // inv-3 has 10,000 uncollected -> receives remaining 4,000
      const allocs = autoAllocatePayment(10000, mockInvoices);
      expect(allocs).toEqual([
        { invoiceId: 'inv-2', invoiceNumber: 'INV-002', allocatedAmount: 6000 },
        { invoiceId: 'inv-3', invoiceNumber: 'INV-003', allocatedAmount: 4000 },
      ]);
    });

    it('rejects manual allocation exceeding uncollected balance on partially collected invoice', async () => {
      const inv = await invoiceRepo.create({
        invoiceNumber: 'INV-TEST-PARTIAL-OVER',
        orderId: 'ord-test-po',
        orderNumber: 'SO-TEST-PO',
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        customerCode: 'DLR-COL-001',
        salesRepId: mockSalesRepUser.id,
        salesRepName: mockSalesRepUser.name,
        issueDate: '2026-09-01',
        dueDate: '2026-12-31',
        items: [],
        subtotal: 10000,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 10000,
        paidAmount: 0,
        collectedAmount: 6000,
        balanceAmount: 10000,
        status: 'PARTIALLY_COLLECTED',
      });

      // Attempt to allocate 5,000 when only 4,000 uncollected balance remains
      await expect(
        paymentSvc.recordPayment(
          {
            customerId: 'cust-001',
            amount: 5000,
            paymentMethod: 'CASH',
            invoiceAllocations: [
              { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, allocatedAmount: 5000 },
            ],
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/exceeds outstanding balance/);
    });

    it('rejects manual allocation to an already COLLECTED invoice', async () => {
      const inv = await invoiceRepo.create({
        invoiceNumber: 'INV-TEST-FULLY-COLL',
        orderId: 'ord-test-fc',
        orderNumber: 'SO-TEST-FC',
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        customerCode: 'DLR-COL-001',
        salesRepId: mockSalesRepUser.id,
        salesRepName: mockSalesRepUser.name,
        issueDate: '2026-09-01',
        dueDate: '2026-12-31',
        items: [],
        subtotal: 10000,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 10000,
        paidAmount: 0,
        collectedAmount: 10000,
        balanceAmount: 10000,
        status: 'COLLECTED',
      });

      await expect(
        paymentSvc.recordPayment(
          {
            customerId: 'cust-001',
            amount: 5000,
            paymentMethod: 'CASH',
            invoiceAllocations: [
              { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, allocatedAmount: 5000 },
            ],
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/already fully collected/);
    });
  });
});
