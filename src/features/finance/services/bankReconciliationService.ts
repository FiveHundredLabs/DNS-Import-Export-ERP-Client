import { periodLockService } from './periodLockService';

export interface ReconciliationPeriod {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  statementEndingDate: string;
  beginningBalance: number;
  endingBalance: number;
  clearedDeposits: number;
  clearedPayments: number;
  clearedBalance: number;
  difference: number;
  clearedCount: number;
  status: 'RECONCILED' | 'IN_PROGRESS';
  reconciledBy: string;
  reconciledAt: string;
  notes?: string;
}

export interface CompleteReconciliationDTO {
  accountId: string;
  accountCode: string;
  accountName: string;
  statementEndingDate: string;
  beginningBalance: number;
  endingBalance: number;
  clearedDeposits: number;
  clearedPayments: number;
  clearedBalance: number;
  difference: number;
  clearedCount: number;
  reconciledBy?: string;
  notes?: string;
}

const STORAGE_KEY = 'dns_finance_bank_reconciliations';

export const INITIAL_RECONCILIATION_HISTORY: ReconciliationPeriod[] = [
  {
    id: 'recon-seed-1010-aug',
    accountId: 'acc-1010',
    accountCode: '1010',
    accountName: 'Bank Account',
    statementEndingDate: '2026-08-31',
    beginningBalance: 1750000.0,
    endingBalance: 2500000.0,
    clearedDeposits: 1450000.0,
    clearedPayments: 700000.0,
    clearedBalance: 2500000.0,
    difference: 0.0,
    clearedCount: 18,
    status: 'RECONCILED',
    reconciledBy: 'Senior Treasury Manager (N. Perera)',
    reconciledAt: '2026-09-01T10:00:00.000Z',
    notes: 'August 2026 Month-End Closed and Audited. Matched with Commercial Bank Statement #08-2026.',
  },
];

class BankReconciliationService {
  private history: ReconciliationPeriod[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
        return;
      }
    } catch {
      // Fallback
    }
    this.history = JSON.parse(JSON.stringify(INITIAL_RECONCILIATION_HISTORY));
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch {
      // Ignore in non-browser env
    }
  }

  public reset() {
    this.history = JSON.parse(JSON.stringify(INITIAL_RECONCILIATION_HISTORY));
    this.persist();
  }

  /**
   * Retrieves all completed reconciliations, optionally filtered by accountId or code
   */
  public getReconciliationHistory(accountIdOrCode?: string): ReconciliationPeriod[] {
    if (!accountIdOrCode) {
      return [...this.history].sort(
        (a, b) => new Date(b.statementEndingDate).getTime() - new Date(a.statementEndingDate).getTime()
      );
    }

    return this.history
      .filter((h) => h.accountId === accountIdOrCode || h.accountCode === accountIdOrCode)
      .sort((a, b) => new Date(b.statementEndingDate).getTime() - new Date(a.statementEndingDate).getTime());
  }

  /**
   * Finds the most recent reconciled period for an account.
   */
  public getPriorReconciledPeriod(accountIdOrCode: string): ReconciliationPeriod | null {
    const list = this.getReconciliationHistory(accountIdOrCode).filter((h) => h.status === 'RECONCILED');
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Phase 4 Locked Prior Balance Rule:
   * "The beginning balance of any new reconciliation must dynamically lock to the
   * ending balance of the previously reconciled period. It cannot default to the
   * current live ledger balance."
   */
  public getBeginningBalance(
    accountIdOrCode: string,
    fallbackOpeningBalance?: number
  ): {
    balance: number;
    priorPeriod: ReconciliationPeriod | null;
    isLockedFromPrior: boolean;
  } {
    const prior = this.getPriorReconciledPeriod(accountIdOrCode);

    if (prior) {
      return {
        balance: prior.endingBalance,
        priorPeriod: prior,
        isLockedFromPrior: true,
      };
    }

    // If no prior reconciliation exists, fall back to opening balance (NOT live ledger balance)
    return {
      balance: fallbackOpeningBalance ?? 0,
      priorPeriod: null,
      isLockedFromPrior: false,
    };
  }

  /**
   * Completes and locks a bank reconciliation period.
   * Strictly enforces that Difference === 0.00 and period is not closed.
   */
  public completeReconciliation(dto: CompleteReconciliationDTO): ReconciliationPeriod {
    // 1. Audit Difference Check
    const diff = Math.abs(dto.difference);
    if (diff > 0.001) {
      throw new Error(
        `Reconciliation cannot be closed with non-zero difference. Audit variance is LKR ${diff.toFixed(2)}.`
      );
    }

    // 2. Financial Period Lock Check
    periodLockService.assertNotLocked(dto.statementEndingDate);

    // 3. Locked Prior Balance Check
    const expectedBegBal = this.getBeginningBalance(dto.accountId, dto.beginningBalance).balance;
    if (Math.abs(expectedBegBal - dto.beginningBalance) > 0.001) {
      throw new Error(
        `Beginning balance mismatch. Must lock to prior period ending balance of LKR ${expectedBegBal.toLocaleString()}.`
      );
    }

    const newPeriod: ReconciliationPeriod = {
      id: `recon-${Date.now()}`,
      accountId: dto.accountId,
      accountCode: dto.accountCode,
      accountName: dto.accountName,
      statementEndingDate: dto.statementEndingDate,
      beginningBalance: dto.beginningBalance,
      endingBalance: dto.endingBalance,
      clearedDeposits: dto.clearedDeposits,
      clearedPayments: dto.clearedPayments,
      clearedBalance: dto.clearedBalance,
      difference: 0,
      clearedCount: dto.clearedCount,
      status: 'RECONCILED',
      reconciledBy: dto.reconciledBy || 'Finance Manager',
      reconciledAt: new Date().toISOString(),
      notes: dto.notes,
    };

    this.history.unshift(newPeriod);
    this.persist();

    return newPeriod;
  }
}

export const bankReconciliationService = new BankReconciliationService();
