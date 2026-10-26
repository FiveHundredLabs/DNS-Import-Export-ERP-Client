import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { handoverService } from '../services/HandoverService';
import { paymentService } from '../services/PaymentService';
import { invoiceService } from '../services/InvoiceService';
import { customerService } from '../services/CustomerService';
import { UserSearchPicker } from '../features/payments/components/UserSearchPicker';
import { CashHandoverModal } from '../features/payments/components/CashHandoverModal';
import { HandoverDetailModal } from '../features/payments/components/HandoverDetailModal';
import { PaymentListPage } from '../features/payments/PaymentListPage';
import { User } from '../types/auth';
import { MOCK_USERS } from '../mock/mockUsers';

const MOCK_SALES_REP: User = {
  id: 'usr-106',
  name: 'Kasun Wickramasinghe',
  email: 'rep.colombo@dnserp.com',
  role: 'SALES_REP',
  phone: '+94 77 123 4567',
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const MOCK_FINANCE_OFFICER: User = {
  id: 'usr-109',
  name: 'Nimal Perera',
  email: 'nimal.finance@dnserp.com',
  role: 'FINANCE_MANAGER',
  title: 'Finance Officer',
  phone: '+94 71 888 9999',
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

describe('Daily Cash Handover & Payments Dashboard Workflow', () => {
  beforeEach(() => {
    // Reset test state if needed
  });

  describe('1. Payments Dashboard Metrics & KPI Calculations', () => {
    it('accurately calculates the 4 key dashboard metrics (Today Total, Pending Handover, Handed Over, Approved by Finance)', async () => {
      const metrics = await handoverService.getDailyMetrics(MOCK_SALES_REP.id);

      expect(metrics).toBeDefined();
      expect(typeof metrics.todayTotalCollected).toBe('number');
      expect(typeof metrics.pendingHandover).toBe('number');
      expect(typeof metrics.handedOver).toBe('number');
      expect(typeof metrics.approvedByFinance).toBe('number');

      // The initial mock handover has LKR 75,000 awaiting finance approval
      expect(metrics.handedOver).toBeGreaterThanOrEqual(75000);
      // Pending handover has eligible collections
      expect(metrics.pendingHandover).toBeGreaterThanOrEqual(0);
      // Approved payments are tracked
      expect(metrics.approvedByFinance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('2. GitHub-Style Searchable User Selection (UserSearchPicker)', () => {
    it('allows searching Finance recipients by name or role title and selecting a user', async () => {
      let selectedUser: User | null = null;

      render(
        <UserSearchPicker
          selectedUserId={undefined}
          onSelectUser={(u) => {
            selectedUser = u;
          }}
        />
      );

      // Search input should be visible with placeholder
      const searchInput = screen.getByPlaceholderText(/search by name, role, or email/i);
      expect(searchInput).toBeInTheDocument();

      // Focus and type "Nimal"
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Nimal' } });

      // Dropdown should list Nimal Perera with title
      await waitFor(() => {
        expect(screen.getByText('Nimal Perera')).toBeInTheDocument();
        expect(screen.getByText(/Finance Officer/i)).toBeInTheDocument();
      });

      // Click to select
      const userOption = screen.getByText('Nimal Perera').closest('button');
      if (userOption) {
        fireEvent.click(userOption);
      }

      expect(selectedUser).not.toBeNull();
      expect(selectedUser?.id).toBe('usr-109');
    });

    it('renders selected user chip with change action', () => {
      render(
        <UserSearchPicker
          selectedUserId={MOCK_FINANCE_OFFICER.id}
          onSelectUser={() => {}}
        />
      );

      expect(screen.getByText('Nimal Perera')).toBeInTheDocument();
      expect(screen.getByText(/Finance Officer/i)).toBeInTheDocument();

      // Change button
      const changeBtn = screen.getByRole('button', { name: /change/i });
      expect(changeBtn).toBeInTheDocument();
      fireEvent.click(changeBtn);

      // Search input appears
      expect(screen.getByPlaceholderText(/search by name, role, or email/i)).toBeInTheDocument();
    });
  });

  describe('3. Daily Cash Handover Submission Process', () => {
    it('creates a cash handover, locks payment items in HANDED_OVER, and calculates exact amounts and invoice counts', async () => {
      // 1. Record a new cash payment for Lanka Electrical
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 20000,
          paymentMethod: 'CASH',
          notes: 'Customer collection by rep',
          invoiceAllocations: [
            { invoiceId: 'inv-001', invoiceNumber: 'INV-2025-0101', allocatedAmount: 20000 },
          ],
        },
        MOCK_SALES_REP
      );

      expect(payment.status).toBe('PENDING_APPROVAL');

      // 2. Fetch eligible collections
      const eligible = await handoverService.getEligibleCollectionsForHandover(MOCK_SALES_REP.id);
      const targetPayment = eligible.find((p) => p.id === payment.id);
      expect(targetPayment).toBeDefined();

      // 3. Submit Cash Handover to Nimal Perera (Finance Officer)
      const handover = await handoverService.createHandover(
        {
          recipientUserId: MOCK_FINANCE_OFFICER.id,
          paymentIds: [payment.id],
          notes: 'Daily afternoon cash handover',
        },
        MOCK_SALES_REP
      );

      expect(handover.id).toBeDefined();
      expect(handover.handoverNumber).toMatch(/^HND-/);
      expect(handover.salesRepId).toBe(MOCK_SALES_REP.id);
      expect(handover.recipientUserId).toBe(MOCK_FINANCE_OFFICER.id);
      expect(handover.recipientUserName).toBe('Nimal Perera');
      expect(handover.recipientUserRole).toBe('Finance Officer');
      expect(handover.totalAmount).toBe(20000);
      expect(handover.customerCount).toBe(1);
      expect(handover.invoiceCount).toBe(1);
      expect(handover.status).toBe('PENDING_APPROVAL');

      // 4. Verify payment is locked into HANDED_OVER and cannot be re-handed over
      const updatedPayment = await paymentService.getPaymentById(payment.id);
      expect(updatedPayment?.handoverStatus).toBe('HANDED_OVER');
      expect(updatedPayment?.handoverId).toBe(handover.id);

      const remainingEligible = await handoverService.getEligibleCollectionsForHandover(MOCK_SALES_REP.id);
      expect(remainingEligible.some((p) => p.id === payment.id)).toBe(false);
    });

    it('validates the prompt example: Handover of LKR 75,000 across 5 customers and 8 invoices', async () => {
      const handovers = await handoverService.getHandovers({ status: 'PENDING_APPROVAL' });
      const sampleHandover = handovers.data.find((h) => h.totalAmount === 75000);

      expect(sampleHandover).toBeDefined();
      expect(sampleHandover?.totalAmount).toBe(75000);
      expect(sampleHandover?.customerCount).toBe(5);
      expect(sampleHandover?.invoiceCount).toBe(8);
      expect(sampleHandover?.recipientUserName).toBe('Nimal Perera');
      expect(sampleHandover?.recipientUserRole).toBe('Finance Officer');
      expect(sampleHandover?.status).toBe('PENDING_APPROVAL');
      expect(sampleHandover?.items.length).toBe(5);
    });
  });

  describe('4. Finance Approval Workflow & Ledger Reconciliation', () => {
    it('Finance Officer approves handover: status becomes APPROVED, payments become APPROVED, and invoices are credited', async () => {
      // 1. Record and handover a payment
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 10000,
          paymentMethod: 'CASH',
          notes: 'Test collection for approval',
          invoiceAllocations: [
            { invoiceId: 'inv-001', invoiceNumber: 'INV-2025-0101', allocatedAmount: 10000 },
          ],
        },
        MOCK_SALES_REP
      );

      const invBefore = await invoiceService.getInvoiceById('inv-001');
      const balanceBefore = invBefore?.balanceAmount || 0;

      const handover = await handoverService.createHandover(
        {
          recipientUserId: MOCK_FINANCE_OFFICER.id,
          paymentIds: [payment.id],
        },
        MOCK_SALES_REP
      );

      // 2. Finance Officer approves after physical cash receipt
      const approvedHandover = await handoverService.approveHandover(
        handover.id,
        MOCK_FINANCE_OFFICER,
        'Physical currency count verified (LKR 10,000). Cleared.'
      );

      expect(approvedHandover.status).toBe('APPROVED');
      expect(approvedHandover.approvedById).toBe(MOCK_FINANCE_OFFICER.id);
      expect(approvedHandover.approvedByName).toBe(MOCK_FINANCE_OFFICER.name);
      expect(approvedHandover.approvalComment).toContain('Physical currency count verified');

      // 3. Payment record must now be APPROVED
      const approvedPayment = await paymentService.getPaymentById(payment.id);
      expect(approvedPayment?.status).toBe('APPROVED');
      expect(approvedPayment?.handoverStatus).toBe('APPROVED');

      // 4. Invoice balance must be reduced by LKR 10,000
      const invAfter = await invoiceService.getInvoiceById('inv-001');
      expect(invAfter?.balanceAmount).toBe(balanceBefore - 10000);
    });

    it('rejects approval attempts by unauthorized roles (Sales Rep cannot approve cash handovers)', async () => {
      const handovers = await handoverService.getHandovers({ status: 'PENDING_APPROVAL' });
      const target = handovers.data[0];

      await expect(
        handoverService.approveHandover(target.id, MOCK_SALES_REP, 'Attempting rep self-approval')
      ).rejects.toThrow(/not authorized to approve cash handovers/i);
    });
  });

  describe('5. Finance Rejection Workflow with Mandatory Reason', () => {
    it('requires a mandatory reason to reject and releases collections back to PENDING_HANDOVER', async () => {
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 5000,
          paymentMethod: 'CASH',
          invoiceAllocations: [
            { invoiceId: 'inv-001', invoiceNumber: 'INV-2025-0101', allocatedAmount: 5000 },
          ],
        },
        MOCK_SALES_REP
      );

      const handover = await handoverService.createHandover(
        {
          recipientUserId: MOCK_FINANCE_OFFICER.id,
          paymentIds: [payment.id],
        },
        MOCK_SALES_REP
      );

      // Rejection without reason must fail
      await expect(
        handoverService.rejectHandover(handover.id, MOCK_FINANCE_OFFICER, '')
      ).rejects.toThrow(/mandatory reason is required/i);

      // Rejection with reason
      const rejectedHandover = await handoverService.rejectHandover(
        handover.id,
        MOCK_FINANCE_OFFICER,
        'Shortage of LKR 500 in physical cash envelope. Please recount.'
      );

      expect(rejectedHandover.status).toBe('REJECTED');
      expect(rejectedHandover.rejectionReason).toBe(
        'Shortage of LKR 500 in physical cash envelope. Please recount.'
      );

      // Verify payment was released back so Sales Rep can re-submit
      const updatedPayment = await paymentService.getPaymentById(payment.id);
      expect(updatedPayment?.handoverStatus).toBe('REJECTED');

      const eligibleAfter = await handoverService.getEligibleCollectionsForHandover(MOCK_SALES_REP.id);
      expect(eligibleAfter.some((p) => p.id === payment.id)).toBe(true);
    });
  });

  describe('6. UI Modals & Handover Details Modal', () => {
    it('renders HandoverDetailModal with itemized invoices, summary cards, and recipient details', async () => {
      const sampleHandover = (await handoverService.getHandovers({ status: 'PENDING_APPROVAL' })).data[0];

      render(
        <HandoverDetailModal
          isOpen={true}
          onClose={() => {}}
          handover={sampleHandover}
          currentUser={MOCK_FINANCE_OFFICER}
          onUpdate={() => {}}
        />
      );

      // Verify title & numbers
      expect(screen.getByText(new RegExp(sampleHandover.handoverNumber))).toBeInTheDocument();
      expect(screen.getByText(sampleHandover.salesRepName)).toBeInTheDocument();
      expect(screen.getByText(sampleHandover.recipientUserName)).toBeInTheDocument();

      // Action buttons for Finance user
      expect(screen.getByText(/Approve Handover/i)).toBeInTheDocument();
      expect(screen.getByText(/Reject Handover/i)).toBeInTheDocument();
    });
  });

  describe('7. PaymentListPage Tab & Handover UI Integration', () => {
    it('renders the 4 Payments Dashboard KPI Cards and allows switching to Cash Handovers tab', async () => {
      render(
        <MemoryRouter initialEntries={['/payments?tab=handovers']}>
          <PaymentListPage />
        </MemoryRouter>
      );

      // 4 Dashboard KPI Cards
      await waitFor(() => {
        expect(screen.getAllByText(/Today's Collections/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Pending Handover/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Handed Over/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Approved by Finance/i).length).toBeGreaterThan(0);
      });

      // Tabs
      expect(screen.getByTestId('tab-customer-accounts')).toBeInTheDocument();
      expect(screen.getByTestId('tab-cash-handovers')).toBeInTheDocument();
      expect(screen.getByTestId('tab-receipts-ledger')).toBeInTheDocument();

      // Hand Over Cash button
      expect(screen.getByTestId('btn-hand-over-cash')).toBeInTheDocument();

      // Clicking "Hand Over Cash" opens the modal
      fireEvent.click(screen.getByTestId('btn-hand-over-cash'));

      await waitFor(() => {
        expect(screen.getByText(/Daily Cash Handover to Finance/i)).toBeInTheDocument();
        expect(screen.getByText(/Receiving Finance Person/i)).toBeInTheDocument();
      });
    });
  });
});
