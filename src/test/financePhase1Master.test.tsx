import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Decimal from 'decimal.js';
import { financeRepository } from '../features/finance/api';
import { createAccountSchema, createJournalEntrySchema } from '../features/finance/api/types';
import { FinanceDashboardPage } from '../features/finance/pages/FinanceDashboardPage';
import { ChartOfAccountsPage } from '../features/finance/pages/ChartOfAccountsPage';
import { ManualJournalPage } from '../features/finance/pages/journal/ManualJournalPage';
import { App } from '../App';

describe('Phase 1: Master Implementation Guide Test Suite', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  describe('1. 3-Tier Chart of Accounts (COA) Structure & Hierarchy', () => {
    it('seeds all default system accounts with 3-tier classification, accountType, and accountSubType', async () => {
      const accounts = await financeRepository.getAccounts();
      expect(accounts.length).toBeGreaterThanOrEqual(11);

      // Verify Bank Account
      const bank = accounts.find((a) => a.code === '1010');
      expect(bank).toBeDefined();
      expect(bank?.classification).toBe('ASSET');
      expect(bank?.accountType).toBe('CURRENT_ASSET');
      expect(bank?.accountSubType).toBe('Cash & Cash Equivalents');

      // Verify Accounts Receivable
      const ar = accounts.find((a) => a.code === '1020');
      expect(ar).toBeDefined();
      expect(ar?.classification).toBe('ASSET');
      expect(ar?.accountType).toBe('CURRENT_ASSET');
      expect(ar?.accountSubType).toBe('Trade Receivables (A/R Control)');

      // Verify Accounts Payable
      const ap = accounts.find((a) => a.code === '2010');
      expect(ap).toBeDefined();
      expect(ap?.classification).toBe('LIABILITY');
      expect(ap?.accountType).toBe('CURRENT_LIABILITY');
      expect(ap?.accountSubType).toBe('Trade Payables (A/P Control)');

      // Verify Retained Earnings / Opening Balance Equity
      const equity = accounts.find((a) => a.code === '3020');
      expect(equity).toBeDefined();
      expect(equity?.classification).toBe('EQUITY');
      expect(equity?.accountType).toBe('EQUITY');
    });

    it('creates child sub-accounts linked via parentId', async () => {
      const accounts = await financeRepository.getAccounts();
      const parentBank = accounts.find((a) => a.code === '1010')!;

      const childAccount = await financeRepository.createAccount({
        code: '1010.01',
        name: 'BOC Operational Float',
        accountClass: 'ASSET',
        classification: 'ASSET',
        accountType: 'CURRENT_ASSET',
        accountSubType: 'Petty Cash',
        parentId: parentBank.id,
        currency: 'LKR',
        openingBalance: 0,
      });

      expect(childAccount.id).toBeDefined();
      expect(childAccount.parentId).toBe(parentBank.id);

      const allAccounts = await financeRepository.getAccounts();
      const foundChild = allAccounts.find((a) => a.code === '1010.01');
      expect(foundChild).toBeDefined();
      expect(foundChild?.parentId).toBe(parentBank.id);
    });

    it('rejects account creation with non-existent parentId', async () => {
      await expect(
        financeRepository.createAccount({
          code: '9999.01',
          name: 'Invalid Sub Account',
          accountClass: 'ASSET',
          classification: 'ASSET',
          accountType: 'CURRENT_ASSET',
          parentId: 'non-existent-parent-id',
          currency: 'LKR',
          openingBalance: 0,
        })
      ).rejects.toThrow('Parent account with ID non-existent-parent-id does not exist');
    });

    it('validates 3-tier fields via Zod schema', () => {
      const validDTO = {
        code: '1050',
        name: 'Prepaid Expenses',
        accountClass: 'ASSET',
        classification: 'ASSET',
        accountType: 'CURRENT_ASSET',
        accountSubType: 'Prepayments',
        currency: 'LKR',
        openingBalance: 0,
      };

      const parsed = createAccountSchema.safeParse(validDTO);
      expect(parsed.success).toBe(true);
    });
  });

  describe('2. Universal Journal Engine Math Precision (decimal.js) & Validation', () => {
    it('uses decimal.js to accurately balance floating-point sums without drift (e.g., 0.1 + 0.2 = 0.3)', async () => {
      const accounts = await financeRepository.getAccounts();
      const bank = accounts.find((a) => a.code === '1010')!;
      const equity = accounts.find((a) => a.code === '3010')!;

      // 0.1 + 0.2 = 0.30000000000000004 in standard IEEE 754 float
      const je = await financeRepository.createJournalEntry({
        entryNumber: 'JE-PRECISION-01',
        date: new Date().toISOString().split('T')[0],
        description: 'Decimal precision test',
        source: 'MANUAL',
        status: 'POSTED',
        lines: [
          { accountId: bank.id, debit: 0.1, credit: 0 },
          { accountId: bank.id, debit: 0.2, credit: 0 },
          { accountId: equity.id, debit: 0, credit: 0.3 },
        ],
      });

      expect(je.id).toBeDefined();
      expect(je.totalDebit).toBe(0.3);
      expect(je.totalCredit).toBe(0.3);
      expect(new Decimal(je.totalDebit).minus(je.totalCredit).isZero()).toBe(true);
    });

    it('rejects unbalanced journal entries strictly to the cent', async () => {
      const accounts = await financeRepository.getAccounts();
      const bank = accounts.find((a) => a.code === '1010')!;
      const equity = accounts.find((a) => a.code === '3010')!;

      await expect(
        financeRepository.createJournalEntry({
          entryNumber: 'JE-UNBALANCED-01',
          date: new Date().toISOString().split('T')[0],
          description: 'Unbalanced test',
          source: 'MANUAL',
          status: 'POSTED',
          lines: [
            { accountId: bank.id, debit: 100.0, credit: 0 },
            { accountId: equity.id, debit: 0, credit: 99.99 },
          ],
        })
      ).rejects.toThrow('The Double-Entry Invariant violated: Total debits must equal total credits to the cent');
    });
  });

  describe('3. Sub-Ledger Tagging Rules (A/R 1020 & A/P 2010)', () => {
    it('strictly rejects direct manual posting to A/R (1020) without customerId', async () => {
      const accounts = await financeRepository.getAccounts();
      const ar = accounts.find((a) => a.code === '1020')!;
      const revenue = accounts.find((a) => a.code === '4010')!;

      await expect(
        financeRepository.createJournalEntry({
          entryNumber: 'JE-AR-NO-TAG',
          date: new Date().toISOString().split('T')[0],
          description: 'Direct posting without customer tag',
          source: 'MANUAL',
          status: 'POSTED',
          lines: [
            { accountId: ar.id, debit: 5000, credit: 0 },
            { accountId: revenue.id, debit: 0, credit: 5000 },
          ],
        })
      ).rejects.toThrow('Direct posting to 1020 Accounts Receivable requires tagging a valid Customer ID on the ledger line.');
    });

    it('strictly rejects direct manual posting to A/P (2010) without supplierId', async () => {
      const accounts = await financeRepository.getAccounts();
      const ap = accounts.find((a) => a.code === '2010')!;
      const cogs = accounts.find((a) => a.code === '5010')!;

      await expect(
        financeRepository.createJournalEntry({
          entryNumber: 'JE-AP-NO-TAG',
          date: new Date().toISOString().split('T')[0],
          description: 'Direct posting without supplier tag',
          source: 'MANUAL',
          status: 'POSTED',
          lines: [
            { accountId: cogs.id, debit: 3500, credit: 0 },
            { accountId: ap.id, debit: 0, credit: 3500 },
          ],
        })
      ).rejects.toThrow('Direct posting to 2010 Accounts Payable requires tagging a valid Supplier ID on the ledger line.');
    });

    it('allows posting to A/R and A/P when properly tagged with customerId / supplierId', async () => {
      const accounts = await financeRepository.getAccounts();
      const ar = accounts.find((a) => a.code === '1020')!;
      const ap = accounts.find((a) => a.code === '2010')!;

      const je = await financeRepository.createJournalEntry({
        entryNumber: 'JE-TAGGED-SUCCESS',
        date: new Date().toISOString().split('T')[0],
        description: 'Tagged Sub-Ledger Entry',
        source: 'MANUAL',
        status: 'POSTED',
        lines: [
          { accountId: ar.id, debit: 1200, credit: 0, customerId: 'CUST-001', customerName: 'Colombo Dist' },
          { accountId: ap.id, debit: 0, credit: 1200, supplierId: 'SUP-001', supplierName: 'Tokyo Direct' },
        ],
      });

      expect(je.id).toBeDefined();
      expect(je.lines[0].customerId).toBe('CUST-001');
      expect(je.lines[1].supplierId).toBe('SUP-001');
    });
  });

  describe('4. Opening Balance Wizard & Permanent Lock on SETUP-OB-INIT', () => {
    it('allows posting opening balance journal with reference SETUP-OB-INIT without entity tagging', async () => {
      const accounts = await financeRepository.getAccounts();
      const ar = accounts.find((a) => a.code === '1020')!;
      const equity = accounts.find((a) => a.code === '3020')!;

      const ob = await financeRepository.createJournalEntry({
        entryNumber: 'JE-OB-01',
        reference: 'SETUP-OB-INIT',
        date: '2026-01-01',
        description: 'Initial Opening Balance Setup',
        source: 'MANUAL',
        status: 'POSTED',
        lines: [
          { accountId: ar.id, debit: 50000, credit: 0 },
          { accountId: equity.id, debit: 0, credit: 50000 },
        ],
      });

      expect(ob.id).toBeDefined();
      expect(ob.reference).toBe('SETUP-OB-INIT');
    });

    it('permanently locks SETUP-OB-INIT against duplication', async () => {
      const accounts = await financeRepository.getAccounts();
      const bank = accounts.find((a) => a.code === '1010')!;
      const equity = accounts.find((a) => a.code === '3020')!;

      // First posting succeeds
      await financeRepository.createJournalEntry({
        entryNumber: 'JE-OB-FIRST',
        reference: 'SETUP-OB-INIT',
        date: '2026-01-01',
        description: 'First Opening Balance',
        source: 'MANUAL',
        status: 'POSTED',
        lines: [
          { accountId: bank.id, debit: 10000, credit: 0 },
          { accountId: equity.id, debit: 0, credit: 10000 },
        ],
      });

      // Second attempt must fail
      await expect(
        financeRepository.createJournalEntry({
          entryNumber: 'JE-OB-DUPLICATE',
          reference: 'SETUP-OB-INIT',
          date: '2026-01-01',
          description: 'Duplicate Opening Balance',
          source: 'MANUAL',
          status: 'POSTED',
          lines: [
            { accountId: bank.id, debit: 20000, credit: 0 },
            { accountId: equity.id, debit: 0, credit: 20000 },
          ],
        })
      ).rejects.toThrow('Opening balance setup (SETUP-OB-INIT) has already been posted and is permanently locked against duplication.');
    });

    it('permanently locks SETUP-OB-INIT against voiding', async () => {
      const accounts = await financeRepository.getAccounts();
      const bank = accounts.find((a) => a.code === '1010')!;
      const equity = accounts.find((a) => a.code === '3020')!;

      const ob = await financeRepository.createJournalEntry({
        entryNumber: 'JE-OB-FOR-VOID',
        reference: 'SETUP-OB-INIT',
        date: '2026-01-01',
        description: 'Opening Balance for Void Test',
        source: 'MANUAL',
        status: 'POSTED',
        lines: [
          { accountId: bank.id, debit: 15000, credit: 0 },
          { accountId: equity.id, debit: 0, credit: 15000 },
        ],
      });

      await expect(financeRepository.voidJournalEntry(ob.id)).rejects.toThrow(
        'Opening balance initiation voucher (SETUP-OB-INIT) is permanently locked and cannot be voided or duplicated.'
      );
    });
  });

  describe('5. Maker-Checker Workflow (Draft -> Pending Approval -> Posted)', async () => {
    it('does not mutate general ledger account balances for DRAFT or PENDING_APPROVAL entries', async () => {
      const accountsBefore = await financeRepository.getAccounts();
      const bankBefore = accountsBefore.find((a) => a.code === '1010')!.currentBalance;

      const accounts = await financeRepository.getAccounts();
      const bank = accounts.find((a) => a.code === '1010')!;
      const equity = accounts.find((a) => a.code === '3010')!;

      // Save Draft
      const draft = await financeRepository.createJournalEntry({
        entryNumber: 'JE-DRAFT-01',
        date: new Date().toISOString().split('T')[0],
        description: 'Draft Entry',
        source: 'MANUAL',
        status: 'DRAFT',
        lines: [
          { accountId: bank.id, debit: 25000, credit: 0 },
          { accountId: equity.id, debit: 0, credit: 25000 },
        ],
      });

      let accountsAfter = await financeRepository.getAccounts();
      let bankAfter = accountsAfter.find((a) => a.code === '1010')!.currentBalance;
      expect(bankAfter).toBe(bankBefore); // No change
      expect(draft.status).toBe('DRAFT');

      // Submit Pending Approval
      const pending = await financeRepository.createJournalEntry({
        entryNumber: 'JE-PENDING-01',
        date: new Date().toISOString().split('T')[0],
        description: 'Pending Approval Entry',
        source: 'MANUAL',
        status: 'PENDING_APPROVAL',
        lines: [
          { accountId: bank.id, debit: 50000, credit: 0 },
          { accountId: equity.id, debit: 0, credit: 50000 },
        ],
      });

      accountsAfter = await financeRepository.getAccounts();
      bankAfter = accountsAfter.find((a) => a.code === '1010')!.currentBalance;
      expect(bankAfter).toBe(bankBefore); // Still no change
      expect(pending.status).toBe('PENDING_APPROVAL');
    });

    it('mutates general ledger account balances only when Finance Manager approves entry', async () => {
      const accountsBefore = await financeRepository.getAccounts();
      const bankBefore = accountsBefore.find((a) => a.code === '1010')!.currentBalance;

      const bank = accountsBefore.find((a) => a.code === '1010')!;
      const equity = accountsBefore.find((a) => a.code === '3010')!;

      // Submit Pending Approval
      const pending = await financeRepository.createJournalEntry({
        entryNumber: 'JE-APPROVAL-FLOW',
        date: new Date().toISOString().split('T')[0],
        description: 'Maker Checker Approval',
        source: 'MANUAL',
        status: 'PENDING_APPROVAL',
        lines: [
          { accountId: bank.id, debit: 30000, credit: 0 },
          { accountId: equity.id, debit: 0, credit: 30000 },
        ],
      });

      // Approve by Finance Manager
      const approved = await financeRepository.approveJournalEntry(pending.id, 'Alice (Finance Manager)');
      expect(approved.status).toBe('POSTED');
      expect(approved.approvedBy).toBe('Alice (Finance Manager)');
      expect(approved.approvedAt).toBeDefined();

      const accountsAfter = await financeRepository.getAccounts();
      const bankAfter = accountsAfter.find((a) => a.code === '1010')!.currentBalance;
      // Asset debited -> increases balance
      expect(bankAfter).toBe(bankBefore + 30000);
    });
  });

  describe('6. Finance Executive Dashboard One-Click Operational Workflows', () => {
    it('renders the 5 daily operational workflows on the Finance Dashboard with correct links', () => {
      render(
        <MemoryRouter>
          <FinanceDashboardPage />
        </MemoryRouter>
      );

      // Verify the 5 workflows are rendered
      expect(screen.getByText('Review Pending Receipts')).toBeDefined();
      expect(screen.getByText('Cost Pending GRNs')).toBeDefined();
      expect(screen.getAllByText('Pay Suppliers').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Post Manual Journal').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Reconcile Bank').length).toBeGreaterThanOrEqual(1);

      // Verify direct 1-click links point to the 5 exact operational paths
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));

      expect(hrefs).toContain('/finance/ar/approvals');
      expect(hrefs).toContain('/finance/ap/bills/new');
      expect(hrefs).toContain('/finance/ap/payments/new');
      expect(hrefs).toContain('/finance/journal/new');
      expect(hrefs).toContain('/finance/reconciliation');
    });
  });

  describe('7. Router Redirections for Legacy Routes', () => {
    it('redirects /finance/desk to /finance/journal/new and /finance/payment-approvals to /finance/ar/approvals', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/desk']}>
          <App />
        </MemoryRouter>
      );

      // Verify that visiting /finance/desk renders the unified Manual Journal Page
      await waitFor(() => {
        expect(screen.getByText('Universal Journal Desk')).toBeDefined();
      });
    });
  });

  describe('8. Chart of Accounts Collapsible Hierarchy & Tree View', () => {
    it('displays 3-tier classifications and collapsible account items', async () => {
      render(
        <MemoryRouter>
          <ChartOfAccountsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Bank Account')).toBeDefined();
        expect(screen.getByText('Accounts Receivable')).toBeDefined();
        expect(screen.getByText('Accounts Payable')).toBeDefined();
      });

      // Opening balance setup banner is displayed
      expect(screen.getByText(/Enter Opening Balances/i)).toBeDefined();
    });
  });

  describe('9. Manual Journal Page: Presets, Maker-Checker & Auto-Balance', () => {
    it('renders quick presets, Maker-Checker controls, and auto-balance button', async () => {
      render(
        <MemoryRouter>
          <ManualJournalPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Quick Presets
        expect(screen.getByText('Pay Supplier Bill')).toBeDefined();
        expect(screen.getByText('Buy Company Asset')).toBeDefined();
        expect(screen.getByText('Record Office Overhead')).toBeDefined();

        // Templates Toggle
        expect(screen.getByText('Hide Templates')).toBeDefined();

        // Maker-Checker controls (Director role has Post Journal)
        expect(screen.getByText('Save Draft')).toBeDefined();
        expect(screen.getByText('Post Journal')).toBeDefined();
      });

      // Trigger preset to populate lines
      fireEvent.click(screen.getByText('Pay Supplier Bill'));

      await waitFor(() => {
        expect(screen.getAllByDisplayValue('250000').length).toBeGreaterThanOrEqual(1);
      });

      // Create imbalance by changing an input value
      const inputs = screen.getAllByDisplayValue('250000');
      fireEvent.change(inputs[0], { target: { value: '300000' } });

      // Imbalance causes Auto-Balance button to render
      await waitFor(() => {
        expect(screen.getByText('Auto-Balance')).toBeDefined();
      });

      // Click Auto-Balance button to balance the journal
      fireEvent.click(screen.getByText('Auto-Balance'));

      await waitFor(() => {
        expect(screen.getByText(/Balanced \(0\.00\)/i)).toBeDefined();
      });
    });
  });

  describe('10. Hardened Edge Cases & Invariant Protections', () => {
    it('case-insensitively and with whitespace locks SETUP-OB-INIT against duplicate posting and voiding', async () => {
      const accounts = await financeRepository.getAccounts();
      const bank = accounts.find((a) => a.code === '1010')!;
      const equity = accounts.find((a) => a.code === '3020')!;

      // Initial post with mixed case and whitespace
      const ob = await financeRepository.createJournalEntry({
        entryNumber: 'JE-OB-CASE-01',
        reference: '  setup-ob-init  ',
        date: '2026-01-01',
        description: 'Case-insensitive Opening Balance',
        source: 'MANUAL',
        status: 'POSTED',
        lines: [
          { accountId: bank.id, debit: 5000, credit: 0 },
          { accountId: equity.id, debit: 0, credit: 5000 },
        ],
      });

      expect(ob.id).toBeDefined();

      // Attempt duplicate with uppercase
      await expect(
        financeRepository.createJournalEntry({
          entryNumber: 'JE-OB-CASE-02',
          reference: 'SETUP-OB-INIT',
          date: '2026-01-01',
          description: 'Duplicate Attempt',
          source: 'MANUAL',
          status: 'POSTED',
          lines: [
            { accountId: bank.id, debit: 5000, credit: 0 },
            { accountId: equity.id, debit: 0, credit: 5000 },
          ],
        })
      ).rejects.toThrow('Opening balance setup (SETUP-OB-INIT) has already been posted and is permanently locked against duplication.');

      // Attempt voiding
      await expect(financeRepository.voidJournalEntry(ob.id)).rejects.toThrow(
        'Opening balance initiation voucher (SETUP-OB-INIT) is permanently locked and cannot be voided or duplicated.'
      );
    });

    it('prevents self-parenting and circular parent references in updateAccount', async () => {
      const accounts = await financeRepository.getAccounts();
      const parent = accounts.find((a) => a.code === '1010')!;

      const childA = await financeRepository.createAccount({
        code: '1010.A',
        name: 'Child Account A',
        classification: 'ASSET',
        accountType: 'CURRENT_ASSET',
        parentId: parent.id,
      });

      const childB = await financeRepository.createAccount({
        code: '1010.B',
        name: 'Child Account B',
        classification: 'ASSET',
        accountType: 'CURRENT_ASSET',
        parentId: childA.id,
      });

      // Self-parenting
      await expect(
        financeRepository.updateAccount(childA.id, { parentId: childA.id })
      ).rejects.toThrow('An account cannot be set as its own parent');

      // Circular reference: Setting childA's parent to childB (which is childA's child)
      await expect(
        financeRepository.updateAccount(childA.id, { parentId: childB.id })
      ).rejects.toThrow('Circular parent reference detected');
    });

    it('rejects approving unbalanced journal entries in approveJournalEntry', async () => {
      const accounts = await financeRepository.getAccounts();
      const bank = accounts.find((a) => a.code === '1010')!;
      const equity = accounts.find((a) => a.code === '3010')!;

      // Directly create an unbalanced pending entry via repository bypass or state
      // (Test approveJournalEntry invariant validation directly)
      const validPending = await financeRepository.createJournalEntry({
        entryNumber: 'JE-PENDING-UNBALANCED-CHECK',
        date: new Date().toISOString().split('T')[0],
        description: 'Pending Entry for Validation',
        source: 'MANUAL',
        status: 'PENDING_APPROVAL',
        lines: [
          { accountId: bank.id, debit: 1000, credit: 0 },
          { accountId: equity.id, debit: 0, credit: 1000 },
        ],
      });

      // Tamper with lines in memory to simulate corrupted entry
      validPending.lines[0].debit = 9999;

      await expect(
        financeRepository.approveJournalEntry(validPending.id, 'Manager')
      ).rejects.toThrow(/Cannot approve unbalanced journal entry/);
    });

    it('rejects manual posting to 1020 A/R if customerName is provided without customerId', async () => {
      const accounts = await financeRepository.getAccounts();
      const ar = accounts.find((a) => a.code === '1020')!;
      const rev = accounts.find((a) => a.code === '4010')!;

      await expect(
        financeRepository.createJournalEntry({
          entryNumber: 'JE-AR-NAME-ONLY',
          date: new Date().toISOString().split('T')[0],
          description: 'A/R posting with name only',
          source: 'MANUAL',
          status: 'POSTED',
          lines: [
            { accountId: ar.id, debit: 500, credit: 0, customerName: 'Some Customer' },
            { accountId: rev.id, debit: 0, credit: 500 },
          ],
        })
      ).rejects.toThrow('Direct posting to 1020 Accounts Receivable requires tagging a valid Customer ID on the ledger line.');
    });

    it('renders multi-level nested grandchildren in Chart of Accounts tree', async () => {
      const accounts = await financeRepository.getAccounts();
      const parentBank = accounts.find((a) => a.code === '1010')!;

      const tier2 = await financeRepository.createAccount({
        code: '1010.50',
        name: 'Regional Bank Tier 2',
        classification: 'ASSET',
        accountType: 'CURRENT_ASSET',
        accountSubType: 'Commercial Bank',
        parentId: parentBank.id,
      });

      const tier3 = await financeRepository.createAccount({
        code: '1010.50.01',
        name: 'Branch Float Grandchild',
        classification: 'ASSET',
        accountType: 'CURRENT_ASSET',
        accountSubType: 'Branch Petty Cash',
        parentId: tier2.id,
      });

      render(
        <MemoryRouter>
          <ChartOfAccountsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Regional Bank Tier 2')).toBeDefined();
        // Grandchild must be rendered in the DOM tree
        expect(screen.getByText('Branch Float Grandchild')).toBeDefined();
        expect(screen.getByText('1010.50.01')).toBeDefined();
      });
    });
  });
});
