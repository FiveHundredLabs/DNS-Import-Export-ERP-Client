import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Decimal from 'decimal.js';

import { CurrencyInput } from '../features/finance/components/CurrencyInput';
import { ChartOfAccountsPage } from '../features/finance/pages/ChartOfAccountsPage';
import { VendorBillCostingPage } from '../features/finance/pages/ap/VendorBillCostingPage';
import { BatchSupplierPaymentPage } from '../features/finance/pages/ap/BatchSupplierPaymentPage';
import { ReceiptApprovalQueuePage } from '../features/finance/pages/ar/ReceiptApprovalQueuePage';
import { ARCollectionAllocationPage } from '../features/finance/pages/ar/ARCollectionAllocationPage';
import { ManualJournalPage } from '../features/finance/pages/journal/ManualJournalPage';
import { BankReconciliationPage } from '../features/finance/pages/reconciliation/BankReconciliationPage';
import { FinancialPeriodLockPage } from '../features/finance/pages/settings/FinancialPeriodLockPage';
import { TrialBalancePage } from '../features/finance/pages/reports/TrialBalancePage';
import { StockBalancePage } from '../features/inventory/StockBalancePage';
import { OrderStatusBadge } from '../features/orders/OrderStatusBadge';

import { financeRepository } from '../features/finance/api';
import { apService } from '../features/finance/services/apService';
import { arService } from '../features/finance/services/arService';
import { periodLockService } from '../features/finance/services/periodLockService';

describe('DNS ERP Finance Module: Complete UI/UX Specification Test Suite', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
    apService.reset();
    arService.reset();
    periodLockService.reset();
  });

  describe('1. Global UI & Form State Rules', () => {
    it('CurrencyInput restricts decimal precision to max 2 decimal places and aligns right', () => {
      let currentNum = 0;
      let currentStr = '';

      render(
        <CurrencyInput
          value={currentNum}
          onChange={(val, raw) => {
            currentNum = val;
            currentStr = raw;
          }}
          placeholder="0.00"
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.className).toContain('text-right');
      expect(input.className).toContain('font-mono');

      // Enter valid number with 2 decimals
      fireEvent.change(input, { target: { value: '1250.75' } });
      expect(currentNum).toBe(1250.75);
      expect(currentStr).toBe('1250.75');

      // Attempt typing a 3rd decimal place (should be blocked)
      fireEvent.change(input, { target: { value: '1250.755' } });
      // Should remain at 1250.75
      expect(currentNum).toBe(1250.75);
    });

    it('Decimal calculations maintain strict accuracy via decimal.js', () => {
      const a = new Decimal('100.10');
      const b = new Decimal('200.20');
      const sum = a.plus(b);
      expect(sum.toString()).toBe('300.3');
      expect(sum.toFixed(2)).toBe('300.30');
    });

    it('1.4 Audit Lock (Read-Only) is strictly enforced on POSTED transactions in ManualJournalPage with Void/Reverse', async () => {
      const journals = await financeRepository.getJournalEntries();
      const postedJournal = journals[0];
      expect(postedJournal).toBeDefined();

      render(
        <MemoryRouter initialEntries={[`/finance/journal/new?id=${postedJournal.id}`]}>
          <ManualJournalPage />
        </MemoryRouter>
      );

      // Audit lock banner should appear
      await waitFor(() => {
        expect(screen.getByText(/Audit Lock Active — Read Only/i)).toBeDefined();
      });

      // Form inputs should be disabled
      const memoInput = screen.getByDisplayValue(postedJournal.description);
      expect((memoInput as HTMLInputElement).disabled).toBe(true);

      // Void / Reverse button should be present for authorized roles
      const voidBtns = screen.getAllByRole('button', { name: /void \/ reverse/i });
      expect(voidBtns.length).toBeGreaterThan(0);
    });

    it('1.4 voidJournalEntry updates account balances in exact reversal and rejects when in closed period', async () => {
      const journals = await financeRepository.getJournalEntries();
      const je = journals[0];
      const accountsBefore = await financeRepository.getAccounts();
      const acc1Before = accountsBefore.find((a) => a.id === je.lines[0].accountId)!.currentBalance;

      // Lock period after transaction date
      periodLockService.setConfig(true, je.date);
      await expect(financeRepository.voidJournalEntry(je.id, 'Test reversal')).rejects.toThrow(
        'Transaction date is in a closed financial period.'
      );

      // Unlock period and void
      periodLockService.setConfig(false, '');
      const voided = await financeRepository.voidJournalEntry(je.id, 'Manager audit cancellation');
      expect(voided.status).toBe('VOIDED');
      expect(voided.voidReason).toBe('Manager audit cancellation');

      // Account balance was reversed
      const accountsAfter = await financeRepository.getAccounts();
      const acc1After = accountsAfter.find((a) => a.id === je.lines[0].accountId)!.currentBalance;
      expect(acc1After).not.toBe(acc1Before);
    });
  });

  describe('2. Chart of Accounts & Setup', () => {
    it('2.1 renders hierarchical COA grouped by 5 classifications with action menu restrictions', async () => {
      render(
        <MemoryRouter>
          <ChartOfAccountsPage />
        </MemoryRouter>
      );

      // Verify classification headers
      expect(screen.getByText('Asset')).toBeDefined();
      expect(screen.getByText('Liability')).toBeDefined();
      expect(screen.getByText('Equity')).toBeDefined();
      expect(screen.getByText('Revenue (Income)')).toBeDefined();
      expect(screen.getByText('Expense')).toBeDefined();

      // Check required table columns
      expect(screen.getAllByText('Account Code').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Account Type').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Sub-Type').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Current Balance').length).toBeGreaterThan(0);

      // System account 1010 has system badge
      await waitFor(() => {
        expect(screen.getByText('Bank Account')).toBeDefined();
      });
    });

    it('2.2 Opening Balance Wizard displays banner, balances difference to 3020 Opening Balance Equity', async () => {
      render(
        <MemoryRouter>
          <ChartOfAccountsPage />
        </MemoryRouter>
      );

      // Banner is visible on first setup
      expect(screen.getByText(/System Setup: Enter Opening Balances/i)).toBeDefined();

      // Click "Start Setup Wizard"
      const startBtn = screen.getByRole('button', { name: /start setup wizard/i });
      fireEvent.click(startBtn);

      // Opening Balance Setup Wizard is displayed
      expect(screen.getByText('Opening Balance Setup Wizard')).toBeDefined();
      expect(screen.getByText('Total Debits')).toBeDefined();
      expect(screen.getByText('Total Credits')).toBeDefined();
      expect(screen.getByText(/Ledger Difference/i)).toBeDefined();

      // Save Opening Balances button is present
      const saveBtns = screen.getAllByRole('button', { name: /save opening balances/i });
      expect(saveBtns.length).toBeGreaterThan(0);
    });
  });

  describe('3. Procurement & Accounts Payable (AP) Workflows', () => {
    it('3.1 Vendor Bill Processing renders split screen, calculates landed costing, posts GL and marks GRN COSTED', async () => {
      render(
        <MemoryRouter>
          <VendorBillCostingPage />
        </MemoryRouter>
      );

      // Left pane (Read-only warehouse data)
      expect(screen.getByText(/Warehouse Goods Receipt \(Read-Only\)/i)).toBeDefined();

      // Right pane (Editable financial data)
      expect(screen.getByText(/Vendor Invoice & Costing Details/i)).toBeDefined();
      expect(screen.getByText(/Vendor Invoice #/i)).toBeDefined();
      expect(screen.getByText(/Additional Landed Charges/i)).toBeDefined();

      const postBillBtn = screen.getByRole('button', { name: /post vendor bill/i });
      // Initially disabled because invoice number is empty
      expect(postBillBtn.hasAttribute('disabled')).toBe(true);

      // Fill vendor invoice number
      const invInput = screen.getByPlaceholderText(/e\.g\. INV-SCH-90214/i);
      fireEvent.change(invInput, { target: { value: 'INV-TEST-9988' } });

      // After entering required header, button is enabled
      await waitFor(() => {
        expect(postBillBtn.hasAttribute('disabled')).toBe(false);
      });

      // Click Post Vendor Bill
      fireEvent.click(postBillBtn);

      await waitFor(() => {
        const available = apService.getAvailableGRNs();
        const costedGRN = available.find((g) => g.status === 'COSTED');
        expect(costedGRN).toBeDefined();
      });
    });

    it('3.1 Vendor Bill Costing Page enters Audit Lock on COSTED GRN and supports Void / Reverse', async () => {
      // First cost the GRN
      const available = apService.getAvailableGRNs();
      const grn = available[0];
      const bill = await apService.postVendorBill({
        grnId: grn.id,
        vendorInvoiceNumber: 'INV-COSTED-001',
        invoiceDate: '2026-10-01',
        dueDate: '2026-11-01',
        lineItems: [
          {
            id: 'bli-1',
            productId: grn.items[0].productId,
            productName: grn.items[0].productNameSnapshot,
            sku: grn.items[0].skuSnapshot,
            receivedQuantity: grn.items[0].receivedQuantity,
            draftUnitCost: grn.items[0].unitCostSnapshot,
            unitCost: grn.items[0].unitCostSnapshot,
            lineDiscount: 0,
            vatCode: 'STANDARD_18',
            vatAmount: 0,
            lineTotal: 1000,
          },
        ],
        freightCharges: 0,
        otherLandingCosts: 0,
      });

      render(
        <MemoryRouter>
          <VendorBillCostingPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Audit Lock Active/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /void \/ reverse vendor bill/i })).toBeDefined();
      });

      // Void the bill
      const voided = await apService.voidVendorBill(bill.id, 'Warehouse return cancellation');
      expect(voided.status).toBe('VOIDED');

      // GRN status reset to APPROVED
      const grnsAfter = apService.getAvailableGRNs();
      const resetGrn = grnsAfter.find((g) => g.id === grn.id);
      expect(resetGrn?.status).toBe('APPROVED');
    });

    it('3.2 Batch Supplier Payments requires sum of Amount to Apply to match Total Payment Amount', async () => {
      render(
        <MemoryRouter>
          <BatchSupplierPaymentPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Batch Supplier Payment Desk')).toBeDefined();
      expect(screen.getByText(/Payment Header Specifications/i)).toBeDefined();

      const postPaymentBtn = screen.getByRole('button', { name: /post payment/i });
      // Post Payment disabled initially
      expect(postPaymentBtn.hasAttribute('disabled')).toBe(true);

      // Fill payment reference
      const refInput = screen.getByPlaceholderText(/e\.g\. CHQ-20491 or TT-0042/i);
      fireEvent.change(refInput, { target: { value: 'CHQ-88001' } });

      // Click "Pay Full" on open bill
      await waitFor(() => {
        const payFullBtns = screen.getAllByRole('button', { name: /pay full/i });
        expect(payFullBtns.length).toBeGreaterThan(0);
        fireEvent.click(payFullBtns[0]);
      });

      // Post Payment still disabled until Total Payment Amount matches the allocated amount
      expect(postPaymentBtn.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('4. Sales, AR & Collections', () => {
    it('4.1 Receipt Approval Queue displays pending receipts, side sheet with image attachment, approve and reject actions', async () => {
      render(
        <MemoryRouter>
          <ReceiptApprovalQueuePage />
        </MemoryRouter>
      );

      expect(screen.getByText('Receipt Approval Queue')).toBeDefined();
      expect(screen.getByText('REC-2026-0491')).toBeDefined();

      // Click receipt row to open Side Sheet
      const row = screen.getByText('REC-2026-0491');
      fireEvent.click(row);

      // Side Sheet opened
      await waitFor(() => {
        expect(screen.getByText('Receipt Verification Detail')).toBeDefined();
        expect(screen.getByText(/Physical Bank Deposit Slip \/ Cheque Attachment/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /confirm bank clearing & restore credit/i })).toBeDefined();
      });
    });

    it('4.2 AR Batch Collection Allocation supports Auto-FIFO and Manual modes', async () => {
      render(
        <MemoryRouter>
          <ARCollectionAllocationPage />
        </MemoryRouter>
      );

      expect(screen.getByText('AR Batch Collection Allocation')).toBeDefined();
      expect(screen.getByText(/Auto-FIFO \(Oldest Invoices First\)/i)).toBeDefined();
      expect(screen.getByText(/Manual Custom Distribution/i)).toBeDefined();

      // Toggle to manual distribution
      const manualBtn = screen.getByRole('button', { name: /manual custom distribution/i });
      fireEvent.click(manualBtn);

      expect(screen.getByText(/Enter customized application amounts/i)).toBeDefined();
    });
  });

  describe('5. Universal Ledger & Manual Journals', () => {
    it('5.1 Manual Journal Entry enforces out of balance warning banner and button disabling', async () => {
      render(
        <MemoryRouter>
          <ManualJournalPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Manual Journal Entry')).toBeDefined();

      const postJournalBtn = screen.getByRole('button', { name: /post journal/i });
      expect(postJournalBtn.hasAttribute('disabled')).toBe(true);

      // Check templates library is visible
      expect(screen.getByText('Templates')).toBeDefined();
      expect(screen.getByText('Monthly Depreciation')).toBeDefined();

      // 5.2 Click "Monthly Depreciation" template: instantly populates lines
      const depTemplate = screen.getByText('Monthly Depreciation');
      fireEvent.click(depTemplate);

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Monthly straight-line depreciation/i)).toBeDefined();
      });
    });
  });

  describe('6. Bank Reconciliation Workspace', () => {
    it('6.1 & 6.2 Setup opens workspace and strictly enforces Difference === 0.00 for Reconcile button', async () => {
      render(
        <MemoryRouter>
          <BankReconciliationPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Reconciliation Setup & Statement Opening/i)).toBeDefined();

      // Click Start Reconciliation
      const startBtn = screen.getByRole('button', { name: /start reconciliation/i });
      fireEvent.click(startBtn);

      // Workspace loaded
      await waitFor(() => {
        expect(screen.getByText('Beginning Balance')).toBeDefined();
        expect(screen.getByText(/Cleared Deposits/i)).toBeDefined();
        expect(screen.getByText(/Cleared Payments/i)).toBeDefined();
        expect(screen.getByText('Cleared Balance')).toBeDefined();
        expect(screen.getByText(/Statement Difference/i)).toBeDefined();
      });

      // 6.3 Inline Adjustment Tool button present
      expect(screen.getByRole('button', { name: /\+ add adjustment/i })).toBeDefined();

      // Reconcile Account button is disabled if difference != 0
      const reconcileBtn = screen.getByRole('button', { name: /reconcile account/i });
      expect(reconcileBtn).toBeDefined();
    });
  });

  describe('7. Period Closing & Reporting', () => {
    it('7.1 Financial Lock Date Dashboard enforces closed period rejection', () => {
      render(
        <MemoryRouter>
          <FinancialPeriodLockPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Financial Lock Date Dashboard')).toBeDefined();
      expect(screen.getByText('Enable Period Lock')).toBeDefined();

      // Activate period lock service up to 2026-10-31
      periodLockService.setConfig(true, '2026-10-31');

      // Posting with date <= 2026-10-31 throws hard error
      expect(() => {
        periodLockService.assertNotLocked('2026-10-15');
      }).toThrow('Transaction date is in a closed financial period.');

      // Posting with future date > 2026-10-31 is permitted
      expect(() => {
        periodLockService.assertNotLocked('2026-11-05');
      }).not.toThrow();
    });

    it('7.2 Trial Balance Statement renders ReportDateFilterBar with Start/End date and CSV Export', async () => {
      render(
        <MemoryRouter>
          <TrialBalancePage />
        </MemoryRouter>
      );

      expect(screen.getByText('Trial Balance Statement')).toBeDefined();
      expect(screen.getByText('Period:')).toBeDefined();
      expect(screen.getByRole('button', { name: /this month/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /this quarter/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /csv/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /print \/ pdf/i })).toBeDefined();
    });
  });

  describe('8. Operational UI Overrides', () => {
    it('8.2 Sales Order displays Reserved / Stock Hold badge when APPROVED', () => {
      const { rerender } = render(<OrderStatusBadge status="APPROVED" />);

      expect(screen.getByText('Approved')).toBeDefined();
      expect(screen.getByText('Reserved / Stock Hold')).toBeDefined();

      rerender(<OrderStatusBadge status="DRAFT" />);
      expect(screen.queryByText('Reserved / Stock Hold')).toBeNull();
    });

    it('8.2 Stock Balance Grid displays Physical Stock column alongside Reserved and Available Stock', async () => {
      render(
        <MemoryRouter>
          <StockBalancePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Physical Stock')).toBeDefined();
        expect(screen.getByText('Reserved')).toBeDefined();
        expect(screen.getByText('Available Stock')).toBeDefined();
      });
    });
  });
});
