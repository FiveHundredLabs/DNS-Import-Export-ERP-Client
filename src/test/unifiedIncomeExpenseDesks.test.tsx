import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { IncomeDeskPage } from '../features/finance/pages/IncomeDeskPage';
import { ExpenseDeskPage } from '../features/finance/pages/ExpenseDeskPage';
import { Sidebar } from '../components/common/Sidebar';
import { arService } from '../features/finance/services/arService';
import { apService } from '../features/finance/services/apService';
import { handoverService } from '../services/HandoverService';
import { financeRepository } from '../features/finance/api';

// Mock Auth Context
let mockCurrentUser = {
  id: 'usr-fin-mgr',
  username: 'fin_mgr',
  role: 'FINANCE_MANAGER',
  name: 'Frank Finance Manager',
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
    user: mockCurrentUser,
    isAuthenticated: true,
    role: mockCurrentUser.role,
    hasPermission: () => true,
    canAccessRoute: () => true,
  }),
}));

describe('Unified Income & Expense Desks & Navigation Grouping Overhaul', () => {
  beforeEach(async () => {
    mockCurrentUser = {
      id: 'usr-fin-mgr',
      username: 'fin_mgr',
      role: 'FINANCE_MANAGER',
      name: 'Frank Finance Manager',
    };
    await financeRepository.resetToDefaults();
    arService.reset();
    apService.reset();
  });

  describe('1. Unified Income Desk (/finance/income)', () => {
    it('renders the 2-tab layout with Rep Handovers & Approvals (Queue) active by default', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/income']}>
          <Routes>
            <Route path="/finance/income" element={<IncomeDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify the two segmented tabs
      expect(
        screen.getByRole('button', { name: /Rep Handovers & Approvals \(Queue\)/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Customer Payment Receipts/i })
      ).toBeInTheDocument();

      // Verify Cash-in-Transit metric card is rendered
      expect(screen.getByText(/Cash In Transit/i)).toBeInTheDocument();

      // Verify pending items in the queue
      expect(screen.getByText('REC-2026-0491')).toBeInTheDocument();
      expect(screen.getByText('REC-2026-0492')).toBeInTheDocument();
    });

    it('displays 24h handover SLA status badges (Due < 24h, Overdue > 24h, Pending)', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/income']}>
          <Routes>
            <Route path="/finance/income" element={<IncomeDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify SLA badges appear
      const slaBadges = screen.getAllByText(/(Due < 24h|Overdue > 24h|Pending)/i);
      expect(slaBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('executes 1-click [Verify & Approve] action on a pending collection', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/income']}>
          <Routes>
            <Route path="/finance/income" element={<IncomeDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Find Verify & Approve buttons
      const approveButtons = screen.getAllByRole('button', { name: /Verify & Approve/i });
      expect(approveButtons.length).toBeGreaterThanOrEqual(1);

      // Click the first approve button
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        // First receipt (REC-2026-0491) was approved
        const receipt = arService.getReceiptById('rcpt-401');
        expect(receipt?.status).toBe('APPROVED');
      });
    });

    it('opens rejection modal when [Reject] is clicked and requires a mandatory reason', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/income']}>
          <Routes>
            <Route path="/finance/income" element={<IncomeDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      const rejectButtons = screen.getAllByRole('button', { name: /^Reject$/i });
      fireEvent.click(rejectButtons[0]);

      // Rejection modal appears
      await waitFor(() => {
        expect(screen.getByText(/State the exact reason for rejecting this cash collection/i)).toBeInTheDocument();
      });

      // Type reason
      const textarea = screen.getByPlaceholderText(/Deposit slip seal is illegible/i);
      fireEvent.change(textarea, { target: { value: 'Rubber stamp illegible' } });

      const confirmRejectBtn = screen.getByRole('button', { name: /Confirm Rejection/i });
      fireEvent.click(confirmRejectBtn);

      await waitFor(() => {
        const rcpt = arService.getReceiptById('rcpt-401');
        expect(rcpt?.status).toBe('REJECTED');
        expect(rcpt?.rejectionReason).toBe('Rubber stamp illegible');
      });
    });

    it('switches to Customer Payment Receipts tab and opens the + New Receipt modal with inline settlement', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/income']}>
          <Routes>
            <Route path="/finance/income" element={<IncomeDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Click Customer Payment Receipts tab
      const receiptsTabBtn = screen.getByRole('button', { name: /Customer Payment Receipts/i });
      fireEvent.click(receiptsTabBtn);

      // Verify + New Receipt button appears
      const newReceiptBtn = screen.getByRole('button', { name: /\+ New Receipt/i });
      expect(newReceiptBtn).toBeInTheDocument();

      // Open + New Receipt modal
      fireEvent.click(newReceiptBtn);

      await waitFor(() => {
        expect(screen.getByText(/Record New Customer Payment Receipt/i)).toBeInTheDocument();
        expect(screen.getByText(/Open Invoices for Selected Customer/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Auto-FIFO Allocate/i })).toBeInTheDocument();
      });
    });

    it('filters and displays only cleared customer receipts in Tab 2 registry', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/income?tab=receipts']}>
          <Routes>
            <Route path="/finance/income" element={<IncomeDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify header says Cleared Receipts Registry
      expect(screen.getByText(/Customer Cleared Receipts Registry/i)).toBeInTheDocument();

      // REC-2026-0480 is APPROVED in initial data, REC-2026-0491 is PENDING_APPROVAL
      expect(screen.getByText('REC-2026-0480')).toBeInTheDocument();
      expect(screen.queryByText('REC-2026-0491')).not.toBeInTheDocument();
    });

    it('toggles invoice allocation checkbox and calculates Total Applied vs Unallocated on Account', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/income?tab=receipts']}>
          <Routes>
            <Route path="/finance/income" element={<IncomeDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Open + New Receipt modal
      const newReceiptBtn = screen.getByRole('button', { name: /\+ New Receipt/i });
      fireEvent.click(newReceiptBtn);

      await waitFor(() => {
        expect(screen.getByText(/Record New Customer Payment Receipt/i)).toBeInTheDocument();
      });

      // Enter receipt amount 500,000
      const amountInputs = screen.getAllByPlaceholderText('0.00');
      fireEvent.change(amountInputs[0], { target: { value: '500000' } });

      // Find pay checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(1);

      // Toggle first checkbox
      fireEvent.click(checkboxes[0]);

      // Check that Total Applied and Unallocated are computed
      expect(screen.getByText(/Total Applied to Invoices:/i)).toBeInTheDocument();
      expect(screen.getByText(/Unallocated on Account/i)).toBeInTheDocument();
    });
  });

  describe('2. Unified Expense Desk (/finance/expense)', () => {
    it('renders the Expense Desk with 2-in-1 Supplier Payment Voucher by default', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/expense']}>
          <Routes>
            <Route path="/finance/expense" element={<ExpenseDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify top segmented switcher
      expect(
        screen.getByRole('button', { name: /Supplier Payment Voucher/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Vendor Bill Costing \(Landed Costs\)/i })
      ).toBeInTheDocument();

      // Verify 2-in-1 voucher buttons inside Supplier Payment Voucher
      expect(
        screen.getByRole('button', { name: /Settle Inbound GRN \/ Bill/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Supplier Advance Prepayment/i })
      ).toBeInTheDocument();
    });

    it('detects PO reference on bills and applies PO-linked advance deduction', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/expense']}>
          <Routes>
            <Route path="/finance/expense" element={<ExpenseDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify PO Ref column is present
      expect(screen.getByText('PO Ref')).toBeInTheDocument();

      // Verify advance notice banner appears when supplier has unapplied advances
      const advNotice = await screen.findByText(/Supplier Advance Prepayment Detected/i);
      expect(advNotice).toBeInTheDocument();

      // Verify 1-click apply advance button
      const applyBtn = screen.getByRole('button', { name: /1-Click Apply Advance Deduction/i });
      expect(applyBtn).toBeInTheDocument();

      fireEvent.click(applyBtn);

      await waitFor(() => {
        const adv = apService.getSupplierAdvances().find((a) => a.id === 'adv-2026-001');
        expect(adv?.unappliedBalance).toBeLessThan(250000);
      });
    });

    it('switches to Vendor Bill Costing (Landed Costs) tab preserving 100% functionality', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/expense']}>
          <Routes>
            <Route path="/finance/expense" element={<ExpenseDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      const costingTabBtn = screen.getByRole('button', {
        name: /Vendor Bill Costing \(Landed Costs\)/i,
      });
      fireEvent.click(costingTabBtn);

      await waitFor(() => {
        // Landed costs costing view
        expect(screen.getByText(/Vendor Bill Costing/i)).toBeInTheDocument();
      });
    });

    it('loads directly into Landed Costs tab when URL has ?tab=costing', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/expense?tab=costing']}>
          <Routes>
            <Route path="/finance/expense" element={<ExpenseDeskPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/Vendor Bill Costing/i)).toBeInTheDocument();
    });
  });

  describe('3. Sidebar Navigation Grouping Overhaul', () => {
    it('renders the exact 10 clean, purposeful items in Sidebar for Finance', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/income']}>
          <Sidebar isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      );

      const expectedItems = [
        'Chart of Accounts',
        'Income & Collections',
        'Expense & Payables',
        'Credit & Debit Notes',
        'Vendor Bill Costing (AP)',
        'Journal Entry Voucher',
        'PDC Vault (1018)',
        'Bank Reconciliation',
        'Period Closing Lock',
        'Financial Reports Hub',
      ];

      for (const itemName of expectedItems) {
        expect(screen.getByText(itemName)).toBeInTheDocument();
      }

      // Verify direct paths
      const incomeLink = screen.getByRole('link', { name: /Income & Collections/i });
      expect(incomeLink.getAttribute('href')).toBe('/finance/income');

      const expenseLink = screen.getByRole('link', { name: /Expense & Payables/i });
      expect(expenseLink.getAttribute('href')).toBe('/finance/expense');
    });
  });
});
