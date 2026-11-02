import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { evaluate24hHandoverStatus } from '../rules/paymentRules';
import { Payment } from '../types/payment';
import { Invoice } from '../types/invoice';
import { paymentService } from '../services/PaymentService';
import { handoverService } from '../services/HandoverService';
import { invoiceService } from '../services/InvoiceService';
import { customerService } from '../services/CustomerService';
import { CashHandoverModal } from '../features/payments/components/CashHandoverModal';
import { InvoiceListSelector } from '../features/payments/components/InvoiceListSelector';
import { User } from '../types/auth';

const mockSalesRepUser: User = {
  id: 'usr-106',
  email: 'kamal.sales@dns.lk',
  fullName: 'Kamal Perera',
  role: 'SALES_REP',
  department: 'Sales',
  isActive: true,
};

describe('Sales Rep Cash Collections, 24h Handover & Partial Payment Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('1. 24-Hour Cash Handover Rule Enforcement', () => {
    it('accurately identifies cash collected within 24 hours as due with remaining time', () => {
      // 5 hours ago
      const collected5HoursAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
      const payment: Payment = {
        id: 'pay-001',
        receiptNumber: 'REC-001',
        invoiceAllocations: [{ invoiceId: 'inv-1', invoiceNumber: 'INV-1', amount: 10000 }],
        customerId: 'cust-001',
        customerName: 'Colombo Dist',
        amount: 10000,
        paymentMethod: 'CASH',
        status: 'PENDING_APPROVAL',
        collectedAt: collected5HoursAgo,
        collectedByUserId: 'usr-106',
        salesRepName: 'Kamal Perera',
        handoverStatus: 'PENDING_HANDOVER',
        createdAt: collected5HoursAgo,
        updatedAt: collected5HoursAgo,
      };

      const status = evaluate24hHandoverStatus(payment);
      expect(status.isDue).toBe(true);
      expect(status.isOverdue).toBe(false);
      expect(status.hoursRemaining).toBeGreaterThanOrEqual(18);
      expect(status.hoursRemaining).toBeLessThanOrEqual(19);
      expect(status.badgeLabel).toContain('left');
    });

    it('accurately identifies cash collected older than 24 hours as OVERDUE (>24h)', () => {
      // 28 hours ago
      const collected28HoursAgo = new Date(Date.now() - 28 * 3600 * 1000).toISOString();
      const payment: Payment = {
        id: 'pay-002',
        receiptNumber: 'REC-002',
        invoiceAllocations: [{ invoiceId: 'inv-2', invoiceNumber: 'INV-2', amount: 25000 }],
        customerId: 'cust-001',
        customerName: 'Colombo Dist',
        amount: 25000,
        paymentMethod: 'CASH',
        status: 'PENDING_APPROVAL',
        collectedAt: collected28HoursAgo,
        collectedByUserId: 'usr-106',
        salesRepName: 'Kamal Perera',
        handoverStatus: 'PENDING_HANDOVER',
        createdAt: collected28HoursAgo,
        updatedAt: collected28HoursAgo,
      };

      const status = evaluate24hHandoverStatus(payment);
      expect(status.isOverdue).toBe(true);
      expect(status.badgeVariant).toBe('destructive');
      expect(status.badgeLabel).toContain('OVERDUE (>24h Handover');
      expect(status.badgeLabel).toContain('late');
    });

    it('clears due/overdue status once handed over or approved', () => {
      const collected28HoursAgo = new Date(Date.now() - 28 * 3600 * 1000).toISOString();
      const payment: Payment = {
        id: 'pay-003',
        receiptNumber: 'REC-003',
        invoiceAllocations: [],
        customerId: 'cust-001',
        customerName: 'Colombo Dist',
        amount: 50000,
        paymentMethod: 'CASH',
        status: 'PENDING_APPROVAL',
        collectedAt: collected28HoursAgo,
        collectedByUserId: 'usr-106',
        salesRepName: 'Kamal Perera',
        handoverStatus: 'HANDED_OVER',
        handedOverToUserId: 'usr-103',
        handedOverToUserName: 'Nimal Perera',
        createdAt: collected28HoursAgo,
        updatedAt: collected28HoursAgo,
      };

      const status = evaluate24hHandoverStatus(payment);
      expect(status.isDue).toBe(false);
      expect(status.isOverdue).toBe(false);
      expect(status.badgeVariant).toBe('default');
      expect(status.badgeLabel).toContain('Handed Over');
    });
  });

  describe('2. Cash Handover to Finance by Selecting Finance Officer', () => {
    it('allows sales rep to open CashHandoverModal, see 24h compliance statuses, select Finance Officer and submit', async () => {
      // Mock eligible payments for sales rep
      const past26Hours = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
      const eligiblePayments: Payment[] = [
        {
          id: 'pay-cash-1',
          receiptNumber: 'REC-CASH-1',
          invoiceAllocations: [{ invoiceId: 'inv-1', invoiceNumber: 'INV-101', amount: 30000 }],
          customerId: 'cust-001',
          customerName: 'Apex Traders',
          amount: 30000,
          paymentMethod: 'CASH',
          status: 'PENDING_APPROVAL',
          collectedAt: past26Hours,
          collectedByUserId: 'usr-106',
          salesRepName: 'Kamal Perera',
          handoverStatus: 'PENDING_HANDOVER',
          createdAt: past26Hours,
          updatedAt: past26Hours,
        },
      ];

      vi.spyOn(handoverService, 'getEligibleCollectionsForHandover').mockResolvedValue(eligiblePayments);
      const submitSpy = vi.spyOn(handoverService, 'createHandover').mockResolvedValue({
        id: 'hnd-999',
        handoverNumber: 'HND-20261102-001',
        salesRepId: 'usr-106',
        salesRepName: 'Kamal Perera',
        financeOfficerId: 'usr-103',
        financeOfficerName: 'Nimal Perera',
        status: 'PENDING_APPROVAL',
        totalAmount: 30000,
        currency: 'LKR',
        paymentIds: ['pay-cash-1'],
        paymentCount: 1,
        invoiceCount: 1,
        handedOverAt: new Date().toISOString(),
        customerSummaries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const onHandoverSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <MemoryRouter>
          <CashHandoverModal
            isOpen={true}
            onClose={onClose}
            currentUser={mockSalesRepUser}
            onHandoverSuccess={onHandoverSuccess}
          />
        </MemoryRouter>
      );

      // Wait for eligible collections to load
      await waitFor(() => {
        expect(screen.getByText('REC-CASH-1')).toBeInTheDocument();
      });

      // Confirm overdue badge (>24h) is visible for the collection item
      expect(screen.getByText(/OVERDUE/i)).toBeInTheDocument();

      // Focus recipient search input to open dropdown
      const recipientInput = screen.getByPlaceholderText(/Type recipient name/i);
      fireEvent.focus(recipientInput);

      // Select Nimal Perera from the dropdown list
      const nimalOption = await screen.findByText('Nimal Perera');
      fireEvent.click(nimalOption);

      // Confirm Finance Officer Nimal Perera is designated
      expect(screen.getByText(/Designated recipient:/i)).toBeInTheDocument();
      expect(screen.getAllByText('Nimal Perera').length).toBeGreaterThan(0);

      // Submit handover
      const submitBtn = screen.getByRole('button', { name: /Confirm Handover/i });
      expect(submitBtn).toBeEnabled();
      fireEvent.submit(submitBtn.closest('form')!);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            recipientUserId: 'usr-109',
            paymentIds: ['pay-cash-1'],
          }),
          mockSalesRepUser
        );
        expect(onHandoverSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('3. Partial Invoice Payment Support at /payments/collect/cust-001', () => {
    it('renders partial invoice payment options and updates partial balance when selecting an invoice', async () => {
      const mockInvoices: Invoice[] = [
        {
          id: 'inv-test-101',
          invoiceNumber: 'INV-2026-101',
          orderId: 'ord-101',
          orderNumber: 'ORD-101',
          customerId: 'cust-001',
          customerName: 'Apex Traders',
          issueDate: '2026-10-15',
          dueDate: '2026-11-15',
          status: 'ISSUED',
          totalAmount: 150000,
          subtotal: 150000,
          paidAmount: 0,
          balanceAmount: 150000,
          currency: 'LKR',
          taxTotal: 0,
          paymentTerms: 'NET_30',
          items: [],
          createdAt: '2026-10-15',
          updatedAt: '2026-10-15',
        },
      ];

      const onSelectInvoice = vi.fn();
      const onCollectSingle = vi.fn();
      const onCollectSinglePartial = vi.fn();
      const onPartialAmountChange = vi.fn();

      render(
        <InvoiceListSelector
          invoices={mockInvoices}
          selectedInvoiceIds={['inv-test-101']}
          onSelectInvoice={onSelectInvoice}
          onSelectAll={() => {}}
          onCollectSingle={onCollectSingle}
          onCollectSinglePartial={onCollectSinglePartial}
          partialAmounts={{ 'inv-test-101': 50000 }}
          onPartialAmountChange={onPartialAmountChange}
          activePartialInvoiceId={'inv-test-101'}
        />
      );

      // Verify invoice number and balance
      expect(screen.getByText('INV-2026-101')).toBeInTheDocument();
      expect(screen.getAllByText(/150,000/i).length).toBeGreaterThan(0);

      // Verify "Pay Partial" interactive controls
      expect(screen.getByText(/Partial Amount to Collect/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '25%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '50%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '75%' })).toBeInTheDocument();

      // Click 50% preset
      const preset50Btn = screen.getByRole('button', { name: '50%' });
      fireEvent.click(preset50Btn);
      expect(onPartialAmountChange).toHaveBeenCalledWith('inv-test-101', 75000);

      // Verify Remaining after payment and PARTIALLY_COLLECTED badge
      expect(screen.getByText(/Remaining after payment:/i)).toBeInTheDocument();
      expect(screen.getByText('PARTIALLY_COLLECTED')).toBeInTheDocument();
    });

    it('records partial invoice payment in PaymentService updating invoice status to PARTIALLY_COLLECTED', async () => {
      // Mock customer
      vi.spyOn(customerService, 'getCustomer').mockResolvedValue({
        id: 'cust-001',
        name: 'Apex Traders',
        code: 'CUST-001',
        email: 'apex@dns.lk',
        phone: '+94771234567',
        address: 'Colombo',
        creditLimit: 500000,
        outstandingBalance: 100000,
        paymentTerms: 'NET_30',
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      } as any);

      // Mock invoice with 100,000 balance
      const testInvoice: Invoice = {
        id: 'inv-part-201',
        invoiceNumber: 'INV-PART-201',
        orderId: 'ord-201',
        orderNumber: 'ORD-201',
        customerId: 'cust-001',
        customerName: 'Apex Traders',
        issueDate: '2026-10-20',
        dueDate: '2026-11-20',
        status: 'ISSUED',
        totalAmount: 100000,
        subtotal: 100000,
        paidAmount: 0,
        balanceAmount: 100000,
        currency: 'LKR',
        taxTotal: 0,
        paymentTerms: 'NET_30',
        items: [],
        createdAt: '2026-10-20',
        updatedAt: '2026-10-20',
      };

      vi.spyOn(invoiceService, 'getInvoiceById').mockResolvedValue(testInvoice);
      const updateInvoiceSpy = vi.spyOn(invoiceService, 'updateInvoice').mockResolvedValue({
        ...testInvoice,
        status: 'PARTIALLY_COLLECTED',
      });

      // Sales rep collects partial LKR 40,000 out of 100,000
      const paymentResult = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          customerName: 'Apex Traders',
          amount: 40000,
          paymentMethod: 'CASH',
          collectedAt: new Date().toISOString(),
          invoiceAllocations: [
            {
              invoiceId: 'inv-part-201',
              invoiceNumber: 'INV-PART-201',
              allocatedAmount: 40000,
            },
          ],
        },
        mockSalesRepUser
      );

      // Verification: Payment is recorded with status PENDING_APPROVAL and PENDING_HANDOVER
      expect(paymentResult.id).toBeDefined();
      expect(paymentResult.status).toBe('PENDING_APPROVAL');
      expect(paymentResult.handoverStatus).toBe('PENDING_HANDOVER');
      expect(paymentResult.amount).toBe(40000);

      // Verification: Invoice status is updated to PARTIALLY_COLLECTED
      expect(updateInvoiceSpy).toHaveBeenCalledWith('inv-part-201', {
        collectedAmount: 40000,
        status: 'PARTIALLY_COLLECTED',
      });
    });
  });
});
