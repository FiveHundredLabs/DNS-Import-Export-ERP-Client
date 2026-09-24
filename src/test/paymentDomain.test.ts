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
import { validatePaymentAllocation, validateChequeDetails, canUserCollectPayment } from '../rules/paymentRules';
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
});
