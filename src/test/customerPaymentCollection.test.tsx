import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
    assignedSalesRepId: 'usr-106',
    assignedSalesRepName: 'Kasun Wickramasinghe',
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
      const allocation = calculateFifoAllocation(25000, sample5FifoInvoices);

      expect(allocation.totalAllocated).toBe(25000);
      expect(allocation.unallocatedAmount).toBe(0);
      expect(allocation.items).toHaveLength(5);

      // Invoice 1: LKR 10,000 — Fully settled (balance 0, status FULLY_COLLECTED)
      expect(allocation.items[0].invoiceId).toBe('inv-test-1');
      expect(allocation.items[0].allocatedAmount).toBe(10000);
      expect(allocation.items[0].remainingBalance).toBe(0);
      expect(allocation.items[0].resultingStatus).toBe('FULLY_COLLECTED');

      // Invoice 2: LKR 10,000 — Fully settled (balance 0, status FULLY_COLLECTED)
      expect(allocation.items[1].invoiceId).toBe('inv-test-2');
      expect(allocation.items[1].allocatedAmount).toBe(10000);
      expect(allocation.items[1].remainingBalance).toBe(0);
      expect(allocation.items[1].resultingStatus).toBe('FULLY_COLLECTED');

      // Invoice 3: LKR 5,000 — Partially collected (balance 5,000, status PARTIALLY_COLLECTED)
      expect(allocation.items[2].invoiceId).toBe('inv-test-3');
      expect(allocation.items[2].allocatedAmount).toBe(5000);
      expect(allocation.items[2].remainingBalance).toBe(5000);
      expect(allocation.items[2].resultingStatus).toBe('PARTIALLY_COLLECTED');

      // Invoice 4: LKR 0 — Outstanding (balance 10,000, status untouched UNTOUCHED)
      expect(allocation.items[3].invoiceId).toBe('inv-test-4');
      expect(allocation.items[3].allocatedAmount).toBe(0);
      expect(allocation.items[3].remainingBalance).toBe(10000);
      expect(allocation.items[3].resultingStatus).toBe('UNTOUCHED');

      // Invoice 5: LKR 0 — Outstanding (balance 10,000, status untouched UNTOUCHED)
      expect(allocation.items[4].invoiceId).toBe('inv-test-5');
      expect(allocation.items[4].allocatedAmount).toBe(0);
      expect(allocation.items[4].remainingBalance).toBe(10000);
      expect(allocation.items[4].resultingStatus).toBe('UNTOUCHED');

      expect(allocation.fullySettledCount).toBe(2);
      expect(allocation.partiallySettledCount).toBe(1);
      expect(allocation.untouchedCount).toBe(2);
    });

    it('handles excess payments without over-allocating invoices', () => {
      // Total outstanding is 50,000. Customer pays 60,000.
      const allocation = calculateFifoAllocation(60000, sample5FifoInvoices);
      expect(allocation.totalAllocated).toBe(50000);
      expect(allocation.unallocatedAmount).toBe(10000);
      expect(allocation.items.every((l) => l.resultingStatus === 'FULLY_COLLECTED')).toBe(true);
    });

    it('prioritizes oldest due date even if invoice array is not sorted by due date', () => {
      // Reverse order array
      const reversed = [...sample5FifoInvoices].reverse();
      const allocation = calculateFifoAllocation(15000, reversed);

      // Oldest is still inv-test-1 (due May 31), followed by inv-test-2 (due June 30)
      expect(allocation.items[0].invoiceId).toBe('inv-test-1');
      expect(allocation.items[0].allocatedAmount).toBe(10000);
      expect(allocation.items[1].invoiceId).toBe('inv-test-2');
      expect(allocation.items[1].allocatedAmount).toBe(5000);
    });
  });

  describe('Requirement 1: Customer Status Filters (Near Due, Overdue, Outstanding)', () => {
    const custOutstanding: Customer = {
      ...mockCustomer,
      id: 'c-out',
      code: 'DLR-OUT-001',
      outstandingBalance: 25000,
      overdueAmount: 0,
      financials: {
        totalOutstanding: 25000,
        currentDue: 25000,
        nearDue: 0,
        overdue: 0,
        availableCredit: 475000,
      },
    };

    const custOverdue: Customer = {
      ...mockCustomer,
      id: 'c-ovd',
      code: 'DLR-OVD-002',
      outstandingBalance: 60000,
      overdueAmount: 30000,
      financials: {
        totalOutstanding: 60000,
        currentDue: 30000,
        nearDue: 0,
        overdue: 30000,
        availableCredit: 440000,
      },
    };

    // Customer with balance approaching credit days due date (Nearby Due)
    const custNearDue: Customer = {
      ...mockCustomer,
      id: 'c-near',
      code: 'DLR-NEAR-003',
      outstandingBalance: 40000,
      overdueAmount: 0,
      financials: {
        totalOutstanding: 40000,
        currentDue: 15000,
        nearDue: 25000, // Approaching credit days due date
        overdue: 0,
        availableCredit: 460000,
      },
    };

    const custSettled: Customer = {
      ...mockCustomer,
      id: 'c-set',
      code: 'DLR-SET-004',
      outstandingBalance: 0,
      overdueAmount: 0,
      financials: {
        totalOutstanding: 0,
        currentDue: 0,
        nearDue: 0,
        overdue: 0,
        availableCredit: 500000,
      },
    };

    const dummyInvoices: Invoice[] = [
      {
        id: 'inv-out-1',
        invoiceNumber: 'INV-OUT-1',
        orderId: 'so-1',
        customerId: 'c-out',
        customerName: custOutstanding.name,
        issueDate: '2026-10-01',
        dueDate: '2026-11-30',
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
      {
        id: 'inv-near-1',
        invoiceNumber: 'INV-NEAR-1',
        orderId: 'so-3',
        customerId: 'c-near',
        customerName: custNearDue.name,
        issueDate: '2026-10-01',
        // Approaching due date within 7 days
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 40000,
        vatAmount: 0,
        totalAmount: 40000,
        paidAmount: 0,
        balanceAmount: 40000,
        status: 'ISSUED',
        paymentTerms: '30 Days',
        items: [],
        createdAt: '2026-10-01T00:00:00Z',
      },
    ];

    it('correctly filters customers across standard statuses including Nearby (Near Due)', () => {
      const allCustomers = [custOutstanding, custOverdue, custNearDue, custSettled];

      // 1. ALL
      const allResult = filterCustomersByPaymentStatus(allCustomers, dummyInvoices, 'ALL');
      expect(allResult).toHaveLength(4);

      // 2. OUTSTANDING
      const outResult = filterCustomersByPaymentStatus(allCustomers, dummyInvoices, 'OUTSTANDING');
      expect(outResult.map((c) => c.id)).toContain('c-out');
      expect(outResult.map((c) => c.id)).toContain('c-ovd');
      expect(outResult.map((c) => c.id)).toContain('c-near');
      expect(outResult.map((c) => c.id)).not.toContain('c-set');

      // 3. OVERDUE
      const ovdResult = filterCustomersByPaymentStatus(allCustomers, dummyInvoices, 'OVERDUE');
      expect(ovdResult.map((c) => c.id)).toEqual(['c-ovd']);

      // 4. NEARBY / NEAR_DUE (Approaching Credit Days Due Date)
      const nearbyResult = filterCustomersByPaymentStatus(allCustomers, dummyInvoices, 'NEARBY');
      expect(nearbyResult.map((c) => c.id)).toContain('c-near');
      expect(nearbyResult.map((c) => c.id)).not.toContain('c-set');

      // 5. FULLY_SETTLED / SETTLED
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
          invoiceAllocations: [
            { invoiceId: 'inv-fifo-1', invoiceNumber: 'INV-FIFO-001', allocatedAmount: 10000 },
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
          invoiceAllocations: [
            { invoiceId: 'inv-fifo-2', invoiceNumber: 'INV-FIFO-002', allocatedAmount: 10000 },
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
      expect(approvedPayment.approvedById).toBe('usr-103');

      // Invoice is now officially PAID and balance is 0
      const settledInvoice = await invoiceService.getInvoiceById('inv-fifo-2');
      expect(settledInvoice?.status).toBe('PAID');
      expect(settledInvoice?.balanceAmount).toBe(0);
      expect(settledInvoice?.paidAmount).toBe(10000);
    });
  });

  describe('Requirement 5: UI Components & Touch Previews', () => {
    it('renders FifoAllocationPreview with live allocation breakdown', () => {
      render(
        <FifoAllocationPreview
          paymentAmount={15000}
          invoices={sample5FifoInvoices.slice(0, 3)}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText(/Automatic FIFO Allocation/i)).toBeInTheDocument();
      expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-002')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-003')).toBeInTheDocument();
      expect(screen.getAllByText(/Settled/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Partial/i).length).toBeGreaterThan(0);
    });

    it('renders CustomerPaymentFilters with all 6 filter tabs and count badges', () => {
      render(
        <CustomerPaymentFilters
          activeFilter="OUTSTANDING"
          onFilterChange={() => {}}
          searchQuery=""
          onSearchChange={() => {}}
          counts={{
            all: 10,
            outstanding: 4,
            overdue: 2,
            nearby: 3,
            pendingCollection: 1,
            settled: 5,
          }}
        />
      );

      expect(screen.getByText('All Customers')).toBeInTheDocument();
      expect(screen.getByText('Outstanding')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Near Due')).toBeInTheDocument();
      expect(screen.getByText('Pending Collection')).toBeInTheDocument();
      expect(screen.getByText('Fully Settled')).toBeInTheDocument();

      // Check counts
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders PaymentConfirmationModal with audit governance statement', () => {
      const allocation = calculateFifoAllocation(20000, sample5FifoInvoices.slice(0, 2));

      render(
        <PaymentConfirmationModal
          open={true}
          onOpenChange={() => {}}
          onConfirm={() => {}}
          customer={mockCustomer}
          amount={20000}
          paymentMethod="CASH"
          breakdown={allocation}
          submitting={false}
        />
      );

      expect(screen.getByText(/Confirm Payment Collection/i)).toBeInTheDocument();
      expect(screen.getByText(mockCustomer.name)).toBeInTheDocument();
      expect(screen.getByText(/Balances remain protected in ERP ledger/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirm & Record Collection/i)).toBeInTheDocument();
    });
  });
});
