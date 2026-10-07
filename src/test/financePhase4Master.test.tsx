import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { financeRepository } from '../features/finance/api';
import {
  bankReconciliationService,
} from '../features/finance/services/bankReconciliationService';
import {
  parseCSVBankStatement,
  parseMT940BankStatement,
  parseBankStatement,
  SAMPLE_CSV_STATEMENT,
  SAMPLE_MT940_STATEMENT,
  normalizeDate,
  parseAmount,
} from '../features/finance/services/bankStatementParser';
import {
  autoMatchTransactions,
  calculateMatchScore,
  getDaysDifference,
} from '../features/finance/services/bankReconciliationMatcher';
import { periodLockService } from '../features/finance/services/periodLockService';

import {
  BankReconciliationPage,
  BankStatementTransaction,
} from '../features/finance/pages/reconciliation/BankReconciliationPage';

describe('Phase 4 Master Test Suite: Bank Reconciliation Workspace', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
    bankReconciliationService.reset();
    periodLockService.setConfig(false, null);
  });

  describe('1. Locked Prior Balance Architecture', () => {
    it('dynamically locks beginning balance to ending balance of previously reconciled period', () => {
      // Seeded August 2026 ended at 2,500,000.00
      const begBalInfo = bankReconciliationService.getBeginningBalance('acc-1010');
      expect(begBalInfo.isLockedFromPrior).toBe(true);
      expect(begBalInfo.balance).toBe(2500000.0);
      expect(begBalInfo.priorPeriod?.statementEndingDate).toBe('2026-08-31');
    });

    it('does NOT default to live ledger balance when live balance differs from prior reconciled balance', async () => {
      // Modify live ledger balance of Account 1010 to LKR 4,200,000 by posting a large journal entry
      const accounts = await financeRepository.getAccounts();
      const bankAcc = accounts.find((a) => a.code === '1010')!;
      const equityAcc = accounts.find((a) => a.code === '3010')!;

      await financeRepository.createJournalEntry({
        date: '2026-09-15',
        description: 'Additional capital injection',
        reference: 'CAP-2026-09',
        source: 'MANUAL',
        lines: [
          { accountId: bankAcc.id, debit: 1700000, credit: 0, description: 'Bank deposit' },
          { accountId: equityAcc.id, debit: 0, credit: 1700000, description: 'Owner capital' },
        ],
      });

      // Fetch live account - currentBalance should now be 2,500,000 + 1,700,000 = 4,200,000
      const updatedBank = await financeRepository.getAccountById(bankAcc.id);
      expect(updatedBank?.currentBalance).toBe(4200000);

      // CRITICAL AUDIT RULE: Beginning balance MUST still be locked to 2,500,000 from August period!
      const begBalInfo = bankReconciliationService.getBeginningBalance(bankAcc.id);
      expect(begBalInfo.balance).toBe(2500000);
      expect(begBalInfo.balance).not.toBe(updatedBank?.currentBalance);
    });

    it('rolls forward locked beginning balance upon completing reconciliation', () => {
      // Complete reconciliation for September 2026 with ending balance LKR 2,360,400.00
      const septPeriod = bankReconciliationService.completeReconciliation({
        accountId: 'acc-1010',
        accountCode: '1010',
        accountName: 'Bank Account',
        statementEndingDate: '2026-09-30',
        beginningBalance: 2500000.0,
        endingBalance: 2360400.0,
        clearedDeposits: 1628400.0,
        clearedPayments: 1768000.0,
        clearedBalance: 2360400.0,
        difference: 0,
        clearedCount: 5,
        reconciledBy: 'Senior Auditor (K. Jayawardena)',
      });

      expect(septPeriod.status).toBe('RECONCILED');
      expect(septPeriod.endingBalance).toBe(2360400.0);

      // Now query beginning balance for October 2026: it MUST dynamically lock to Sept's ending balance (2,360,400.00)
      const octBegBalInfo = bankReconciliationService.getBeginningBalance('acc-1010');
      expect(octBegBalInfo.isLockedFromPrior).toBe(true);
      expect(octBegBalInfo.balance).toBe(2360400.0);
      expect(octBegBalInfo.priorPeriod?.statementEndingDate).toBe('2026-09-30');
    });

    it('rejects reconciliation completion if difference is non-zero', () => {
      expect(() => {
        bankReconciliationService.completeReconciliation({
          accountId: 'acc-1010',
          accountCode: '1010',
          accountName: 'Bank Account',
          statementEndingDate: '2026-09-30',
          beginningBalance: 2500000.0,
          endingBalance: 2360400.0,
          clearedDeposits: 1628400.0,
          clearedPayments: 1768000.0,
          clearedBalance: 2355400.0, // Variance of LKR 5,000
          difference: 5000.0,
          clearedCount: 5,
        });
      }).toThrow(/Reconciliation cannot be closed with non-zero difference/i);
    });

    it('enforces financial period lock preventing closing reconciliation in a closed period', () => {
      // Lock period up to 2026-09-30
      periodLockService.setConfig(true, '2026-09-30');

      expect(() => {
        bankReconciliationService.completeReconciliation({
          accountId: 'acc-1010',
          accountCode: '1010',
          accountName: 'Bank Account',
          statementEndingDate: '2026-09-30',
          beginningBalance: 2500000.0,
          endingBalance: 2360400.0,
          clearedDeposits: 1628400.0,
          clearedPayments: 1768000.0,
          clearedBalance: 2360400.0,
          difference: 0,
          clearedCount: 5,
        });
      }).toThrow(/Transaction date is in a closed financial period/i);
    });
  });

  describe('2. Electronic Statement Parser (CSV & SWIFT MT940)', () => {
    it('normalizes various date formats and currency strings', () => {
      expect(normalizeDate('2026-09-15')).toBe('2026-09-15');
      expect(normalizeDate('15/09/2026')).toBe('2026-09-15');
      expect(normalizeDate('09/15/2026')).toBe('2026-09-15');
      expect(normalizeDate('260915')).toBe('2026-09-15');

      expect(parseAmount('1,250.50')).toBe(1250.5);
      expect(parseAmount('1250,50')).toBe(1250.5);
      expect(parseAmount('LKR 885,000.00')).toBe(885000);
      expect(parseAmount('(450,000.00)')).toBe(450000);
    });

    it('parses standard electronic bank statement CSV', () => {
      const result = parseCSVBankStatement(SAMPLE_CSV_STATEMENT);

      expect(result.success).toBe(true);
      expect(result.metadata.format).toBe('CSV');
      expect(result.transactions.length).toBe(5);

      const dep1 = result.transactions[0];
      expect(dep1.date).toBe('2026-09-02');
      expect(dep1.reference).toBe('DEP-8841');
      expect(dep1.type).toBe('DEPOSIT');
      expect(dep1.amount).toBe(885000);
      expect(dep1.credit).toBe(885000);
      expect(dep1.debit).toBe(0);

      const chq1 = result.transactions[1];
      expect(chq1.date).toBe('2026-09-05');
      expect(chq1.reference).toBe('CHQ-1049');
      expect(chq1.type).toBe('PAYMENT');
      expect(chq1.amount).toBe(450000);
      expect(chq1.debit).toBe(450000);
      expect(chq1.credit).toBe(0);
    });

    it('parses SWIFT MT940 bank statement with tags :20:, :25:, :60F:, :61:, :86:, :62F:', () => {
      const result = parseMT940BankStatement(SAMPLE_MT940_STATEMENT);

      expect(result.success).toBe(true);
      expect(result.metadata.format).toBe('MT940');
      expect(result.metadata.statementNumber).toBe('STMT-SEP-2026');
      expect(result.metadata.accountNumber).toBe('1010-009283-001');
      expect(result.metadata.openingBalance).toBe(2500000);
      expect(result.metadata.openingDate).toBe('2026-09-01');
      expect(result.metadata.closingBalance).toBe(2360400);
      expect(result.metadata.closingDate).toBe('2026-09-30');
      expect(result.transactions.length).toBe(5);

      const tx1 = result.transactions[0];
      expect(tx1.date).toBe('2026-09-02');
      expect(tx1.reference).toBe('DEP-8841');
      expect(tx1.description).toContain('Customer bulk payment deposit');
      expect(tx1.type).toBe('DEPOSIT');
      expect(tx1.amount).toBe(885000);

      const tx2 = result.transactions[1];
      expect(tx2.date).toBe('2026-09-05');
      expect(tx2.reference).toBe('CHQ-1049');
      expect(tx2.description).toContain('Supplier settlement Kelani Cables');
      expect(tx2.type).toBe('PAYMENT');
      expect(tx2.amount).toBe(450000);
    });

    it('auto-detects statement format with parseBankStatement dispatcher', () => {
      const csvResult = parseBankStatement(SAMPLE_CSV_STATEMENT, 'statement.csv');
      expect(csvResult.metadata.format).toBe('CSV');
      expect(csvResult.transactions.length).toBe(5);

      const mt940Result = parseBankStatement(SAMPLE_MT940_STATEMENT, 'statement.940');
      expect(mt940Result.metadata.format).toBe('MT940');
      expect(mt940Result.transactions.length).toBe(5);
    });

    it('returns error for empty or invalid statement input', () => {
      const emptyCsv = parseCSVBankStatement('');
      expect(emptyCsv.success).toBe(false);
      expect(emptyCsv.errors.length).toBeGreaterThan(0);
    });
  });

  describe('3. Heuristic Auto-Matching Engine', () => {
    const mockSystem: BankStatementTransaction[] = [
      {
        id: 'sys-1',
        date: '2026-09-02',
        reference: 'DEP-8841',
        description: 'Customer bulk payment deposit REC-2026-0480',
        type: 'DEPOSIT',
        amount: 885000,
        debit: 885000,
        credit: 0,
        isCleared: false,
      },
      {
        id: 'sys-2',
        date: '2026-09-05',
        reference: 'CHQ-1049',
        description: 'Supplier settlement Kelani Cables PLC BILL-2026-003',
        type: 'PAYMENT',
        amount: 450000,
        debit: 0,
        credit: 450000,
        isCleared: false,
      },
      {
        id: 'sys-3',
        date: '2026-09-11', // 1 day earlier than bank statement
        reference: 'DEP-9012',
        description: 'Wholesale dealer transfer Muthurajawela',
        type: 'DEPOSIT',
        amount: 212400,
        debit: 212400,
        credit: 0,
        isCleared: false,
      },
    ];

    const mockBankRows: BankStatementTransaction[] = [
      {
        id: 'bank-1',
        date: '2026-09-02',
        reference: 'DEP-8841',
        description: 'Customer bulk payment deposit REC-2026-0480',
        type: 'DEPOSIT',
        amount: 885000,
        debit: 0,
        credit: 885000,
        isCleared: false,
      },
      {
        id: 'bank-2',
        date: '2026-09-05',
        reference: 'CHQ-1049',
        description: 'Supplier settlement Kelani Cables PLC',
        type: 'PAYMENT',
        amount: 450000,
        debit: 450000,
        credit: 0,
        isCleared: false,
      },
      {
        id: 'bank-3',
        date: '2026-09-12', // 1 day after system record
        reference: 'DEP-9012',
        description: 'Wholesale dealer direct transfer',
        type: 'DEPOSIT',
        amount: 212400,
        debit: 0,
        credit: 212400,
        isCleared: false,
      },
    ];

    it('calculates high match score for exact date, amount and reference matches', () => {
      const match = calculateMatchScore(mockSystem[0], mockBankRows[0]);
      expect(match).not.toBeNull();
      expect(match?.confidence).toBe('EXACT');
      expect(match?.score).toBeGreaterThanOrEqual(140);
    });

    it('matches transactions within date tolerance window (e.g. ±1 to ±3 days)', () => {
      const daysDiff = getDaysDifference(mockSystem[2].date, mockBankRows[2].date);
      expect(daysDiff).toBe(1);

      const match = calculateMatchScore(mockSystem[2], mockBankRows[2], { dateToleranceDays: 3 });
      expect(match).not.toBeNull();
      expect(match?.confidence).toBe('EXACT'); // Exact amount + 1d + ref token
    });

    it('auto-matches entire batches greedily, marking matched pairs as isCleared: true', () => {
      const matchResult = autoMatchTransactions(mockSystem, mockBankRows, { dateToleranceDays: 3 });

      expect(matchResult.matchedCount).toBe(3);
      expect(matchResult.matchRatePercentage).toBe(100);

      // Verify all system transactions are now cleared and linked
      expect(matchResult.systemTransactions.every((s) => s.isCleared)).toBe(true);
      expect(matchResult.statementTransactions.every((b) => b.isCleared)).toBe(true);

      const matchedPair0 = matchResult.matchedPairs.find((p) => p.systemId === 'sys-1');
      expect(matchedPair0?.statementId).toBe('bank-1');
    });

    it('rejects pairs with incompatible amounts or transaction directions', () => {
      const depositVsPayment = calculateMatchScore(mockSystem[0], mockBankRows[1]);
      expect(depositVsPayment).toBeNull(); // Direction mismatch

      const wrongAmount = calculateMatchScore(
        { ...mockSystem[0], amount: 999999 },
        mockBankRows[0]
      );
      expect(wrongAmount).toBeNull(); // Amount mismatch
    });
  });

  describe('4. Split-Pane Bank Reconciliation Workspace UI Flow', () => {
    it('renders setup form with dynamically locked prior balance and badge', () => {
      render(
        <MemoryRouter>
          <BankReconciliationPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Bank Reconciliation Workspace')).toBeDefined();
      expect(screen.getByText(/Locked Prior Balance/i)).toBeDefined();
      expect(screen.getByText(/Locked to Prior Reconciled Period/i)).toBeDefined();
      expect(screen.getByText(/2,500,000\.00/)).toBeDefined();
    });

    it('opens split-pane workspace showing System Ledger and Bank Statement tables', async () => {
      render(
        <MemoryRouter>
          <BankReconciliationPage />
        </MemoryRouter>
      );

      // Start reconciliation
      const startBtn = screen.getByRole('button', { name: /start reconciliation/i });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(screen.getByText(/System Records \(GL 1010\)/i)).toBeDefined();
        expect(screen.getByText(/Bank Statement Lines \(Feed\)/i)).toBeDefined();
        expect(screen.getByText('Beginning Balance')).toBeDefined();
        expect(screen.getByText(/Statement Difference/i)).toBeDefined();
      });

      // Split pane columns are present
      expect(screen.getByRole('button', { name: /auto-match \(heuristic\)/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /upload statement/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /\+ add adjustment/i })).toBeDefined();
    });

    it('executes Heuristic Auto-Match in the UI and automatically balances to 0.00', async () => {
      render(
        <MemoryRouter>
          <BankReconciliationPage />
        </MemoryRouter>
      );

      // Start reconciliation
      fireEvent.click(screen.getByRole('button', { name: /start reconciliation/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /auto-match \(heuristic\)/i })).toBeDefined();
      });

      // Target balance is 2,360,400.00 (2,500,000 + 1,628,400 - 1,768,000 = 2,360,400)
      // Before auto-match, difference is non-zero
      expect(screen.getByText(/139,600\.00/i)).toBeDefined();

      // Click Auto-Match button
      const autoMatchBtn = screen.getByRole('button', { name: /auto-match \(heuristic\)/i });
      fireEvent.click(autoMatchBtn);

      // After auto-match, all 5 items clear, difference becomes 0.00 (Balanced)!
      await waitFor(() => {
        expect(screen.getByText(/0\.00 \(Balanced\)/i)).toBeDefined();
      });

      // Reconcile Account button is now ENABLED
      const reconcileBtn = screen.getByRole('button', { name: /reconcile account/i });
      expect(reconcileBtn).not.toBeDisabled();
    });

    it('posts inline adjustment (Bank Fee) directly to GL, marks as Cleared, and updates variance', async () => {
      render(
        <MemoryRouter>
          <BankReconciliationPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /start reconciliation/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\+ add adjustment/i })).toBeDefined();
      });

      // Open Inline Adjustment Modal
      fireEvent.click(screen.getByRole('button', { name: /\+ add adjustment/i }));

      await waitFor(() => {
        expect(screen.getByText('Add Bank Reconciliation Adjustment')).toBeDefined();
      });

      // Enter adjustment amount 2500
      const amountInputs = screen.getAllByPlaceholderText('0.00');
      // The currency input inside modal
      const modalAmountInput = amountInputs[amountInputs.length - 1];
      fireEvent.change(modalAmountInput, { target: { value: '2500' } });

      // Enter description
      const descInput = screen.getByPlaceholderText(/monthly corporate account maintenance fee/i);
      fireEvent.change(descInput, { target: { value: 'September Bank Service Charges' } });

      // Save adjustment
      const saveBtn = screen.getByRole('button', { name: /save & cleared to reconciliation/i });
      fireEvent.click(saveBtn);

      // Modal closes, adjustment posted to GL
      await waitFor(() => {
        expect(screen.queryByText('Add Bank Reconciliation Adjustment')).toBeNull();
      });

      // Verify transaction appears in split tables marked as Cleared
      expect(screen.getAllByText('September Bank Service Charges').length).toBe(2);

      // Verify double-entry GL journal posted
      const journals = await financeRepository.getJournalEntries();
      const feeJournal = journals.find((j) => j.description.includes('Bank Fee'));
      expect(feeJournal).toBeDefined();

      const bankLine = feeJournal?.lines.find((l) => l.accountCode === '1010');
      expect(bankLine?.credit).toBe(2500); // Cr Bank 2500
    });

    it('completes month-end reconciliation when balanced and locks prior balance for subsequent period', async () => {
      render(
        <MemoryRouter>
          <BankReconciliationPage />
        </MemoryRouter>
      );

      // Start reconciliation
      fireEvent.click(screen.getByRole('button', { name: /start reconciliation/i }));

      // Run auto-match to achieve exact 0.00 balance
      fireEvent.click(screen.getByRole('button', { name: /auto-match \(heuristic\)/i }));

      await waitFor(() => {
        expect(screen.getByText(/0\.00 \(Balanced\)/i)).toBeDefined();
      });

      // Click Reconcile Account
      const reconcileBtn = screen.getByRole('button', { name: /reconcile account/i });
      fireEvent.click(reconcileBtn);

      // Workspace closes and returns to setup
      await waitFor(() => {
        expect(screen.getByText(/Reconciliation Setup & Statement Opening/i)).toBeDefined();
      });

      // Next reconciliation period beginning balance MUST now be locked to 2,360,400.00!
      expect(screen.getByText(/2,360,400\.00/)).toBeDefined();
      expect(screen.getByText(/As of period ended/i)).toBeDefined();

      // Verify audit history record saved
      const history = bankReconciliationService.getReconciliationHistory('acc-1010');
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].statementEndingDate).toBe('2026-09-30');
      expect(history[0].endingBalance).toBe(2360400);
      expect(history[0].difference).toBe(0);
    });
  });
});
