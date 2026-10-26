import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import {
  calculateFifoAllocation,
  filterCustomersByPaymentStatus,
  evaluateCustomerPaymentStatus,
  CustomerPaymentFilterType,
} from '../rules/customerPaymentRules';
import { Customer } from '../types/customer';
import { Invoice } from '../types/invoice';
import { FifoAllocationPreview } from '../features/payments/components/FifoAllocationPreview';
import { CustomerPaymentFilters } from '../features/payments/components/CustomerPaymentFilters';
import { PaymentConfirmationModal } from '../features/payments/components/PaymentConfirmationModal';
import { paymentService } from '../services/PaymentService';
import { invoiceService } from '../services/InvoiceService';

describe('Customer Payments & Collection Management Architecture', () => {
  // Test mock setup
  const mockCustomer: Customer = {
    id: 'cust-test-1',
    name: 'Kelani Valley Lighting Mart',
    code: 'DLR-KEL-003',
    email: 'kelani@example.com',
    phone: '+94 33 228 1122',
    address: {
      street: '128 High Level Rd',
      city: 'Kelaniya',
      district: 'Gampaha',
      postalCode: '11600',
    },
    creditLimit: 500000,
    creditDays: 30,
    assignedSalesRepId: 'rep-001',
    assignedSalesRepName: 'Kasun Bandara',
    outstandingBalance: 50000,
    overdueAmount: 20000,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const sample5FifoInvoices: Invoice[] = [
    {
      id: 'inv-test-1',
      invoiceNumber: 'INV-2026-001',
      orderId: 'so-1',
      customerId: 'cust-test-1',
      customerName: 'Kelani Valley Lighting Mart',
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      subtotal: 10000,
      vatAmount: 0,
      totalAmount: 10000,
      paidAmount: 0,
      balanceAmount: 10000,
      status: 'OVERDUE',
      paymentTerms: '30 Days',
      items: [],
      createdAt: '2026-05-01T08:00:00Z',
    },
    {
      id: 'inv-test-2',
      invoiceNumber: 'INV-2026-002',
      orderId: 'so-2',
      customerId: 'cust-test-1',
      customerName: 'Kelani Valley Lighting Mart',
      issueDate: '2026-06-01',
      dueDate: '2026-06-30',
      subtotal: 10000,
      vatAmount: 0,
      totalAmount: 10000,
      paidAmount: 0,
      balanceAmount: 10000,
      status: 'OVERDUE',
      paymentTerms: '30 Days',
      items: [],
      createdAt: '2026-06-01T08:00:00Z',
    },
    {
      id: 'inv-test-3',
      invoiceNumber: 'INV-2026-003',
      orderId: 'so-3',
      customerId: 'cust-test-1',
      customerName: 'Kelani Valley Lighting Mart',
      issueDate: '2026-07-01',
      dueDate: '2026-07-31',
      subtotal: 10000,
      vatAmount: 0,
      totalAmount: 10000,
      paidAmount: 0,
      balanceAmount: 10000,
      status: 'ISSUED',
      paymentTerms: '30 Days',
      items: [],
      createdAt: '2026-07-01T08:00:00Z',
    },
    {
      id: 'inv-test-4',
      invoiceNumber: 'INV-2026-004',
      orderId: 'so-4',
      customerId: 'cust-test-1',
      customerName: 'Kelani Valley Lighting Mart',
      issueDate: '2026-08-01',
      dueDate: '2026-08-31',
      subtotal: 10000,
      vatAmount: 0,
      totalAmount: 10000,
      paidAmount: 0,
      balanceAmount: 10000,
      status: 'ISSUED',
      paymentTerms: '30 Days',
      items: [],
      createdAt: '2026-08-01T08:00:00Z',
    },
    {
      id: 'inv-test-5',
      invoiceNumber: 'INV-2026-005',
      orderId: 'so-5',
      customerId: 'cust-test-1',
      customerName: 'Kelani Valley Lighting Mart',
      issueDate: '2026-09-01',
      dueDate: '2026-09-30',
      subtotal: 10000,
      vatAmount: 0,
      totalAmount: 10000,
      paidAmount: 0,
      balanceAmount: 10000,
      status: 'ISSUED',
      paymentTerms: '30 Days',
      items: [],
      createdAt: '2026-09-01T08:00:00Z',
    },
  ];

  describe('Requirement 3: Automatic FIFO Allocation Logic', () => {
    it('executes exact specification: 5 x LKR 10,000 invoices with LKR 25,000 payment', () => {
      // 5 invoices of LKR 10,000 each. Payment = 25,000
      const allocation = calculateFifoAllocation(sample5FifoInvoices, 25000);

      expect(allocation.totalAllocated).toBe(25000);
      expect(allocation.unallocatedAmount).toBe(0);
      expect(allocation.lines).toHaveLength(5);

      // Invoice 1: LKR 10,000 — Fully settled (balance 0, status COLLECTED)
      expect(allocation.lines[0].invoiceId).toBe('inv-test-1');
      expect(allocation.lines[0].allocatedAmount).toBe(10000);
      expect(allocation.lines[0].resultingBalance).toBe(0);
      expect(allocation.lines[0].isFullySettled).toBe(true);
      expect(allocation.lines[0].resultingStatus).toBe('COLLECTED');

      // Invoice 2: LKR 10,000 — Fully settled (balance 0, status COLLECTED)
      expect(allocation.lines[1].invoiceId).toBe('inv-test-2');
      expect(allocation.lines[1].allocatedAmount).toBe(10000);
      expect(allocation.lines[1].resultingBalance).toBe(0);
      expect(allocation.lines[1].isFullySettled).toBe(true);
      expect(allocation.lines[1].resultingStatus).toBe('COLLECTED');

      // Invoice 3: LKR 5,000 — Partially collected (balance 5,000, status PARTIALLY_COLLECTED)
      expect(allocation.lines[2].invoiceId).toBe('inv-test-3');
      expect(allocation.lines[2].allocatedAmount).toBe(5000);
      expect(allocation.lines[2].resultingBalance).toBe(5000);
      expect(allocation.lines[2].isFullySettled).toBe(false);
      expect(allocation.lines[2].resultingStatus).toBe('PARTIALLY_COLLECTED');

      // Invoice 4: LKR 0 — Outstanding (balance 10,000, status untouched ISSUED)
      expect(allocation.lines[3].invoiceId).toBe('inv-test-4');
      expect(allocation.lines[3].allocatedAmount).toBe(0);
      expect(allocation.lines[3].resultingBalance).toBe(10000);
      expect(allocation.lines[3].isFullySettled).toBe(false);
      expect(allocation.lines[3].resultingStatus).toBe('ISSUED');

      // Invoice 5: LKR 0 — Outstanding (balance 10,000, status untouched ISSUED)
      expect(allocation.lines[4].invoiceId).toBe('inv-test-5');
      expect(allocation.lines[4].allocatedAmount).toBe(0);
      expect(allocation.lines[4].resultingBalance).toBe(10000);
      expect(allocation.lines[4].isFullySettled).toBe(false);
      expect(allocation.lines[4].resultingStatus).toBe('ISSUED');
    });

    it('handles excess payments without over-allocating invoices', () => {
      // Total outstanding is 50,000. Customer pays 60,000.
      const allocation = calculateFifoAllocation(sample5FifoInvoices, 60000);
      expect(allocation.totalAllocated).toBe(50000);
      expect(allocation.unallocatedAmount).toBe(10000);
      expect(allocation.lines.every((l) => l.isFullySettled)).toBe(true);
    });

    it('prioritizes oldest due date even if invoice array is not sorted by due date', () => {
      // Reverse order array
      const reversed = [...sample5FifoInvoices].reverse();
      const allocation = calculateFifoAllocation(reversed, 15000);

      // Oldest is still inv-test-1 (due May 31), followed by inv-test-2 (due June 30)
      expect(allocation.lines[0].invoiceId).toBe('inv-test-1');
      expect(allocation.lines[0].allocatedAmount).toBe(10000);
      expect(allocation.lines[1].invoiceId).toBe('inv-test-2');
      expect(allocation.lines[1].allocatedAmount).toBe(5000);
    });
  });

  describe('Requirement 1: Customer Status Filters & Evaluation', () => {
    const custOutstanding: Customer = {
      ...mockCustomer,
      id: 'c-out',
      code: 'DLR-OUT-001',
      outstandingBalance: 25000,
      overdueAmount: 0,
    };
    const custOverdue: Customer = {
      ...mockCustomer,
      id: 'c-ovd',
      code: 'DLR-COL-001', // Pettah -> 0.8 km (nearby)
      areaId: 'area-01',
      outstandingBalance: 60000,
      overdueAmount: 30000,
    };
    const custSettled: Customer = {
      ...mockCustomer,
      id: 'c-set',
      code: 'DLR-SET-003',
      outstandingBalance: 0,
      overdueAmount: 0,
    };

    const dummyInvoices: Invoice[] = [
      {
        id: 'inv-out-1',
        invoiceNumber: 'INV-OUT-1',
        orderId: 'so-1',
        customerId: 'c-out',
        customerName: custOutstanding.name,
        issueDate: '2026-10-01',
        dueDate: '2026-11-01',
        subtotal: 25000,
        vatAmount: 0,
        totalAmount: 25000,
        paidAmount: 0,
        balanceAmount: 25000,
        status: 'ISSUED',
        paymentTerms: '30 Days',
        items: [],
        createdAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'inv-ovd-1',
        invoiceNumber: 'INV-OVD-1',
        orderId: 'so-2',
        customerId: 'c-ovd',
        customerName: custOverdue.name,
        issueDate: '2026-08-01',
        dueDate: '2026-08-31',
        subtotal: 60000,
        vatAmount: 0,
        totalAmount: 60000,
        paidAmount: 0,
        balanceAmount: 60000,
        status: 'OVERDUE',
        paymentTerms: '30 Days',
        items: [],
        createdAt: '2026-08-01T00:00:00Z',
      },
    ];

    it('correctly filters customers across all 6 standard statuses', () => {
      const allCustomers = [custOutstanding, custOverdue, custSettled];

      // 1. ALL
      const allResult = filterCustomersByPaymentStatus(allCustomers, dummyInvoices, 'ALL');
      expect(allResult).toHaveLength(3);

      // 2. OUTSTANDING
      const outResult = filterCustomersByPaymentStatus(allCustomers, dummyInvoices, 'OUTSTANDING');
      expect(outResult.map((c) => c.id)).toContain('c-out');
      expect(outResult.map((c) => c.id)).toContain('c-ovd');
      expect(outResult.map((c) => c.id)).not.toContain('c-set');

      // 3. OVERDUE
      const ovdResult = filterCustomersByPaymentStatus(allCustomers, dummyInvoices, 'OVERDUE');
      expect(ovdResult.map((c) => c.id)).toEqual(['c-ovd']);

      // 4. NEARBY
      const nearbyResult = filterCustomersByPaymentStatus(allCustomers, dummyInvoices, 'NEARBY');
      expect(nearbyResult.map((c) => c.id)).toContain('c-ovd');

      // 5. FULLY_SETTLED
      const settledResult = filterCustomersByPaymentStatus(allCustomers, dummyInvoices, 'FULLY_SETTLED');
      expect(settledResult.map((c) => c.id)).toEqual(['c-set']);
    });
  });

  describe('Requirement 4: Payment Status Workflow & Sales Rep Boundary', () => {
    const mockSalesRep = {
      id: 'usr-106',
      name: 'Kasun Wickramasinghe',
      email: 'kasun@dns.lk',
      role: 'SALES_REP' as const,
      areaId: 'area-01',
      isActive: true,
    };

    const mockFinanceMgr = {
      id: 'usr-103',
      name: 'Dilshan Silva',
      email: 'dilshan@dns.lk',
      role: 'FINANCE_MANAGER' as const,
      isActive: true,
    };

    it('ensures Sales Rep collection records payment as PENDING_APPROVAL and invoice as COLLECTED', async () => {
      // Simulate Sales Rep collecting LKR 10,000 for inv-fifo-1
      const res = await paymentService.recordPayment(
        {
          customerId: 'cust-002',
          amount: 10000,
          paymentMethod: 'CASH',
          salesRepId: 'usr-106',
          invoiceAllocations: [
            { invoiceId: 'inv-fifo-1', amount: 10000 },
          ],
        },
        mockSalesRep
      );

      // Verification 1: Payment record is strictly in PENDING_APPROVAL status
      expect(res.status).toBe('PENDING_APPROVAL');

      // Verification 2: Balance amount is NOT immediately cleared from official ledger until Finance confirms
      const invAfter = await invoiceService.getInvoiceById('inv-fifo-1');
      expect(invAfter).toBeDefined();
      // Invoice receives COLLECTED stage from rep
      expect(invAfter?.status).toBe('COLLECTED');
      // Balance remains untouched until Finance confirms
      expect(invAfter?.paidAmount).toBe(0);
      expect(invAfter?.balanceAmount).toBe(10000);
    });

    it('ensures only Finance approval settles invoice to PAID and reduces balance', async () => {
      // 1. Rep records payment
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-002',
          amount: 10000,
          paymentMethod: 'CASH',
          salesRepId: 'usr-106',
          invoiceAllocations: [
            { invoiceId: 'inv-fifo-2', amount: 10000 },
          ],
        },
        mockSalesRep
      );

      // 2. Finance Manager confirms receipt
      const approvedPayment = await paymentService.approvePayment(
        payment.id,
        mockFinanceMgr,
        'Direct cash collection verified with banking slip'
      );

      // Payment moves to APPROVED
      expect(approvedPayment.status).toBe('APPROVED');
      expect(approvedPayment.verifiedByFinance).toBe(true);

      // Invoice is now officially PAID and balance is 0
      const settledInvoice = await invoiceService.getInvoiceById('inv-fifo-2');
      expect(settledInvoice?.status).toBe('PAID');
      expect(settledInvoice?.balanceAmount).toBe(0);
      expect(settledInvoice?.paidAmount).toBe(10000);
    });
  });

  describe('Requirement 5: UI Components & Touch Previews', () => {
    it('renders FifoAllocationPreview with live allocation breakdown', () => {
      const allocation = calculateFifoAllocation(sample5FifoInvoices.slice(0, 3), 15000);

      render(
        <FifoAllocationPreview
          allocation={allocation}
          totalPaymentAmount={15000}
        />
      );

      expect(screen.getByText(/Automatic FIFO Allocation Preview/i)).toBeInTheDocument();
      expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-002')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-003')).toBeInTheDocument();
      // Check Fully Settled vs Partial badges
      expect(screen.getAllByText(/Fully Settled/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Partially Collected/i)).toBeInTheDocument();
    });

    it('renders CustomerPaymentFilters with all 6 filter tabs and count badges', () => {
      const handleSelectFilter = (filter: CustomerPaymentFilterType) => {};

      render(
        <CustomerPaymentFilters
          activeFilter="OUTSTANDING"
          onSelectFilter={handleSelectFilter}
          searchQuery=""
          onSearchChange={() => {}}
          counts={{
            all: 10,
            outstanding: 4,
            overdue: 2,
            nearby: 3,
            pendingCollection: 1,
            fullySettled: 5,
          }}
        />
      );

      expect(screen.getByText('All Customers')).toBeInTheDocument();
      expect(screen.getByText('Outstanding')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Nearby')).toBeInTheDocument();
      expect(screen.getByText('Pending Collection')).toBeInTheDocument();
      expect(screen.getByText('Fully Settled')).toBeInTheDocument();

      // Check counts
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders PaymentConfirmationModal with audit governance statement', () => {
      const allocation = calculateFifoAllocation(sample5FifoInvoices.slice(0, 2), 20000);

      render(
        <PaymentConfirmationModal
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          customer={mockCustomer}
          paymentAmount={20000}
          paymentMethod="CASH"
          referenceNumber="RCP-REF-001"
          allocation={allocation}
          submitting={false}
        />
      );

      expect(screen.getByText(/Confirm Payment Collection/i)).toBeInTheDocument();
      expect(screen.getByText(mockCustomer.name)).toBeInTheDocument();
      expect(screen.getByText(/Field Collection Audit Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Record Collection/i)).toBeInTheDocument();
    });
  });
});
