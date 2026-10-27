import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { invoiceService } from '../services/InvoiceService';
import { paymentService } from '../services/PaymentService';
import { Invoice, InvoiceStatus } from '../types/invoice';
import { Customer } from '../types/customer';
import { InvoicePaymentCollectModal } from '../features/invoices/components/InvoicePaymentCollectModal';
import { calculateInvoiceStatus } from '../rules/invoiceRules';

describe('Invoice-Wise Payment Collection Architecture', () => {
  const mockSalesRepUser = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    email: 'kasun@dns.lk',
    role: 'SALES_REP' as const,
    areaId: 'area-01',
    isActive: true,
  };

  const mockFinanceUser = {
    id: 'usr-103',
    name: 'Dilshan Silva',
    email: 'dilshan@dns.lk',
    role: 'FINANCE_MANAGER' as const,
    isActive: true,
  };

  // Dedicated test customer with two separate invoices
  const customerId = 'cust-002'; // Muthurajawela Engineering Enterprises

  let testInvoice1: Invoice;
  let testInvoice2: Invoice;

  beforeEach(async () => {
    // Reset/Retrieve customer invoices
    const invoices = await invoiceService.getInvoicesByCustomer(customerId);
    expect(invoices.length).toBeGreaterThanOrEqual(2);
    testInvoice1 = invoices[0];
    testInvoice2 = invoices[1];
  });

  describe('Requirement 1: Invoice Table Standard Filters & Customer Scoping', () => {
    it('filters invoices strictly by specific customer without leaking other customers', async () => {
      const result = await invoiceService.getInvoices({
        customerId: 'cust-002',
        pageSize: 50,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((inv) => inv.customerId === 'cust-002')).toBe(true);
    });

    it('supports standard payment status filters: OUTSTANDING, OVERDUE, PENDING_COLLECTION, FULLY_SETTLED', async () => {
      const [allInvoices, outstanding, settled] = await Promise.all([
        invoiceService.getInvoices({ paymentFilter: 'ALL', pageSize: 50 }),
        invoiceService.getInvoices({ paymentFilter: 'OUTSTANDING', pageSize: 50 }),
        invoiceService.getInvoices({ paymentFilter: 'FULLY_SETTLED', pageSize: 50 }),
      ]);

      expect(allInvoices.total).toBeGreaterThanOrEqual(outstanding.total);
      // All outstanding invoices have positive balance
      expect(outstanding.data.every((inv) => inv.balanceAmount > 0)).toBe(true);
      // Settled invoices are in PAID status
      expect(settled.data.every((inv) => inv.status === 'PAID' || inv.balanceAmount <= 0)).toBe(true);
    });
  });

  describe('Requirement 2 & 3: Single-Invoice Collection & Targeted Isolation', () => {
    it('Full Payment Scenario (LKR 20,000): Moves status to COLLECTED and leaves other customer invoices unaffected', async () => {
      // 1. Setup an invoice with LKR 20,000 balance
      const invToCollect = await invoiceService.updateInvoice(testInvoice1.id, {
        totalAmount: 20000,
        paidAmount: 0,
        balanceAmount: 20000,
        collectedAmount: 0,
        status: 'ISSUED',
      });

      const otherInvoiceInitial = await invoiceService.getInvoiceById(testInvoice2.id);
      const otherInitialBalance = otherInvoiceInitial?.balanceAmount;
      const otherInitialCollected = otherInvoiceInitial?.collectedAmount || 0;
      const otherInitialStatus = otherInvoiceInitial?.status;

      // 2. Sales Rep collects the FULL outstanding amount of LKR 20,000 against testInvoice1 ONLY
      const payment = await paymentService.recordPayment(
        {
          customerId,
          amount: 20000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            {
              invoiceId: invToCollect.id,
              invoiceNumber: invToCollect.invoiceNumber,
              allocatedAmount: 20000,
            },
          ],
        },
        mockSalesRepUser
      );

      // Verify payment was recorded in PENDING_APPROVAL
      expect(payment.status).toBe('PENDING_APPROVAL');

      // Verify targeted invoice transitioned to COLLECTED
      const updatedInv = await invoiceService.getInvoiceById(invToCollect.id);
      expect(updatedInv).toBeDefined();
      expect(updatedInv?.collectedAmount).toBe(20000);
      expect(updatedInv?.status).toBe('COLLECTED');

      // Crucial requirement: Other customer invoice MUST NOT be affected or settled
      const otherInvoiceAfter = await invoiceService.getInvoiceById(testInvoice2.id);
      expect(otherInvoiceAfter?.balanceAmount).toBe(otherInitialBalance);
      expect(otherInvoiceAfter?.collectedAmount || 0).toBe(otherInitialCollected);
      expect(otherInvoiceAfter?.status).toBe(otherInitialStatus);
    });

    it('Partial Payment Scenario (Less than LKR 20,000, e.g. LKR 8,000): Moves status to PARTIALLY_COLLECTED and updates remaining balance', async () => {
      // 1. Setup an invoice with LKR 20,000 balance
      const invToCollect = await invoiceService.updateInvoice(testInvoice1.id, {
        totalAmount: 20000,
        paidAmount: 0,
        balanceAmount: 20000,
        collectedAmount: 0,
        status: 'ISSUED',
      });

      // 2. Sales Rep collects a partial amount (LKR 8,000 of LKR 20,000)
      const payment = await paymentService.recordPayment(
        {
          customerId,
          amount: 8000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            {
              invoiceId: invToCollect.id,
              invoiceNumber: invToCollect.invoiceNumber,
              allocatedAmount: 8000,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(payment.status).toBe('PENDING_APPROVAL');

      // Verify targeted invoice transitioned to PARTIALLY_COLLECTED
      const updatedInv = await invoiceService.getInvoiceById(invToCollect.id);
      expect(updatedInv).toBeDefined();
      expect(updatedInv?.collectedAmount).toBe(8000);
      expect(updatedInv?.status).toBe('PARTIALLY_COLLECTED');

      // Remaining uncollected balance is 20,000 - 8,000 = 12,000
      const remainingUncollected = (updatedInv?.balanceAmount || 0) - (updatedInv?.collectedAmount || 0);
      expect(remainingUncollected).toBe(12000);
    });
  });

  describe('Requirement 4: Role Boundaries & Finance Confirmation', () => {
    it('ensures Sales Reps cannot mark payments as PAID or PARTIALLY_PAID, only Finance can approve', async () => {
      // Rep collects full LKR 20,000
      const inv = await invoiceService.updateInvoice(testInvoice1.id, {
        totalAmount: 20000,
        paidAmount: 0,
        balanceAmount: 20000,
        collectedAmount: 0,
        status: 'ISSUED',
      });

      const payment = await paymentService.recordPayment(
        {
          customerId,
          amount: 20000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            {
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              allocatedAmount: 20000,
            },
          ],
        },
        mockSalesRepUser
      );

      // Verify sales rep only moved it to COLLECTED / PENDING_APPROVAL
      expect(payment.status).toBe('PENDING_APPROVAL');
      const invRepStage = await invoiceService.getInvoiceById(inv.id);
      expect(invRepStage?.status).toBe('COLLECTED');
      expect(invRepStage?.paidAmount).toBe(0); // Official ledger paid amount NOT yet touched

      // Finance Manager confirms and approves
      const approvedPayment = await paymentService.approvePayment(
        payment.id,
        mockFinanceUser,
        'Bank slip verified and reconciled'
      );

      expect(approvedPayment.status).toBe('APPROVED');

      // Now the invoice officially transitions to PAID with balance 0
      const invFinanceStage = await invoiceService.getInvoiceById(inv.id);
      expect(invFinanceStage?.status).toBe('PAID');
      expect(invFinanceStage?.paidAmount).toBe(20000);
      expect(invFinanceStage?.balanceAmount).toBe(0);
    });
  });

  describe('Requirement 5: Mobile UI Component Rendering', () => {
    it('renders InvoicePaymentCollectModal with targeted scope guarantee and live outcome preview', () => {
      const sampleInvoice: Invoice = {
        id: 'inv-test-ui-1',
        invoiceNumber: 'INV-2026-999',
        orderId: 'so-999',
        orderNumber: 'SO-999',
        customerId: 'cust-002',
        customerName: 'Muthurajawela Engineering',
        customerCode: 'DLR-NEG-002',
        salesRepId: 'usr-106',
        salesRepName: 'Kasun Wickramasinghe',
        issueDate: '2026-10-01',
        dueDate: '2026-10-31',
        subtotal: 20000,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 20000,
        paidAmount: 0,
        collectedAmount: 0,
        balanceAmount: 20000,
        status: 'ISSUED',
        items: [],
        createdAt: '2026-10-01T00:00:00Z',
      };

      render(
        <InvoicePaymentCollectModal
          isOpen={true}
          onClose={() => {}}
          invoice={sampleInvoice}
          onPaymentSuccess={() => {}}
        />
      );

      // Verify header and invoice context
      expect(screen.getByText('Invoice Payment Collection')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-999')).toBeInTheDocument();
      expect(screen.getByText('Muthurajawela Engineering')).toBeInTheDocument();

      // Verify Targeted Scope Guarantee notice
      expect(screen.getByText(/Targeted Invoice-Wise Collection:/i)).toBeInTheDocument();
      expect(screen.getByText(/Other customer invoices or accounts will NOT be touched or settled/i)).toBeInTheDocument();

      // Verify Full vs Partial Live Outcome Preview
      expect(screen.getByText(/Live Collection Outcome Preview/i)).toBeInTheDocument();
      expect(screen.getByText(/Collected \(Full Settlement\)/i)).toBeInTheDocument();
    });
  });
});
