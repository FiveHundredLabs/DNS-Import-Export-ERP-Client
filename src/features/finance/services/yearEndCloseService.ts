import { financeRepository } from '../api';
import { Account, JournalEntry, CreateJournalLineDTO } from '../api/types';
import { periodLockService } from './periodLockService';

export interface NominalAccountSummary {
  accountId: string;
  code: string;
  name: string;
  type: 'REVENUE' | 'EXPENSE';
  balance: number;
  closingDebit: number;
  closingCredit: number;
}

export interface YearEndClosePreview {
  fiscalYear: number;
  fiscalYearEndDate: string;
  revenueAccounts: NominalAccountSummary[];
  expenseAccounts: NominalAccountSummary[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number; // positive = net profit, negative = net loss
  isProfitable: boolean;
  retainedEarningsAccount: {
    id: string;
    code: string;
    name: string;
  };
  journalLines: CreateJournalLineDTO[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  canExecute: boolean;
  reason?: string;
}

export interface YearEndCloseExecutionResult {
  journalEntry: JournalEntry;
  preview: YearEndClosePreview;
  closedAt: string;
}

export class YearEndCloseService {
  /**
   * Previews the Year-End Closing routine for a given fiscal year end date.
   * Calculates net balances for all 4000 (Revenue) and 5000/6000 (Expense) accounts,
   * and prepares the double-entry closing journal entry sweeping net income into 3010 Retained Earnings.
   */
  async previewClose(fiscalYearEndDate: string): Promise<YearEndClosePreview> {
    const accounts = await financeRepository.getAccounts();
    const journals = await financeRepository.getJournalEntries();
    const cutOff = fiscalYearEndDate.slice(0, 10);
    const fiscalYear = parseInt(cutOff.slice(0, 4), 10);

    // Find Retained Earnings account (Code 3010 priority, or Retained Earnings name, or 3020)
    let retainedEarnings = accounts.find((a) => a.code === '3010');
    if (!retainedEarnings) {
      retainedEarnings = accounts.find(
        (a) =>
          a.name.toLowerCase().includes('retained earnings') ||
          a.code === '3020'
      );
    }
    if (!retainedEarnings) {
      // Fallback: create or find first equity account
      retainedEarnings = accounts.find((a) => a.accountClass === 'EQUITY') || {
        id: 'acc-3010',
        code: '3010',
        name: 'Retained Earnings',
      } as Account;
    }

    // Check if Year-End Close was already executed and posted for this fiscal year
    const closingRef = `YEC-${fiscalYear}`;
    const existingClosing = journals.find(
      (j) =>
        j.status !== 'VOIDED' &&
        (j.reference === closingRef ||
          j.description.includes(`Year-End Close for Fiscal Year Ended ${cutOff}`))
    );

    if (existingClosing) {
      return {
        fiscalYear,
        fiscalYearEndDate: cutOff,
        revenueAccounts: [],
        expenseAccounts: [],
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        isProfitable: true,
        retainedEarningsAccount: {
          id: retainedEarnings.id,
          code: retainedEarnings.code,
          name: retainedEarnings.name,
        },
        journalLines: [],
        totalDebit: 0,
        totalCredit: 0,
        isBalanced: true,
        canExecute: false,
        reason: `Fiscal year ${fiscalYear} has already been closed with voucher ${existingClosing.entryNumber} (${existingClosing.reference || closingRef}). Void the existing closing voucher first if you need to re-run the close.`,
      };
    }

    // Filter relevant journals posted on or before fiscalYearEndDate
    const relevantJournals = journals.filter(
      (j) =>
        j.date <= cutOff &&
        j.status !== 'VOIDED' &&
        j.reference !== closingRef &&
        !j.description.includes(`Year-End Close for Fiscal Year Ended ${cutOff}`)
    );

    // Compute debit/credit sum for each account
    const debitMap = new Map<string, number>();
    const creditMap = new Map<string, number>();

    for (const j of relevantJournals) {
      for (const l of j.lines) {
        debitMap.set(l.accountId, (debitMap.get(l.accountId) || 0) + l.debit);
        creditMap.set(l.accountId, (creditMap.get(l.accountId) || 0) + l.credit);
      }
    }

    const revenueAccounts: NominalAccountSummary[] = [];
    const expenseAccounts: NominalAccountSummary[] = [];

    for (const acc of accounts) {
      const d = debitMap.get(acc.id) || 0;
      const c = creditMap.get(acc.id) || 0;

      // Identify Revenue (4000 series, REVENUE subclass, or INCOME class)
      const isRevenue =
        acc.code.startsWith('4') ||
        acc.accountSubClass === 'REVENUE' ||
        acc.accountClass === 'INCOME';

      // Identify Expense (5000 / 6000 series, DIRECT_COST, OPERATING_EXPENSE, or EXPENSE class)
      const isExpense =
        acc.code.startsWith('5') ||
        acc.code.startsWith('6') ||
        acc.accountSubClass === 'DIRECT_COST' ||
        acc.accountSubClass === 'OPERATING_EXPENSE' ||
        acc.accountClass === 'EXPENSE';

      if (isRevenue) {
        // Revenue has credit balance
        // If no journal lines, fallback to account currentBalance if it has any
        let netCredit = c - d;
        if (netCredit === 0 && d === 0 && c === 0 && acc.currentBalance > 0) {
          netCredit = acc.currentBalance;
        }
        netCredit = Number(netCredit.toFixed(2));

        if (netCredit !== 0) {
          revenueAccounts.push({
            accountId: acc.id,
            code: acc.code,
            name: acc.name,
            type: 'REVENUE',
            balance: netCredit,
            closingDebit: netCredit > 0 ? netCredit : 0,
            closingCredit: netCredit < 0 ? Math.abs(netCredit) : 0,
          });
        }
      } else if (isExpense) {
        // Expense has debit balance
        let netDebit = d - c;
        if (netDebit === 0 && d === 0 && c === 0 && acc.currentBalance > 0) {
          netDebit = acc.currentBalance;
        }
        netDebit = Number(netDebit.toFixed(2));

        if (netDebit !== 0) {
          expenseAccounts.push({
            accountId: acc.id,
            code: acc.code,
            name: acc.name,
            type: 'EXPENSE',
            balance: netDebit,
            closingDebit: netDebit < 0 ? Math.abs(netDebit) : 0,
            closingCredit: netDebit > 0 ? netDebit : 0,
          });
        }
      }
    }

    const totalRevenue = Number(
      revenueAccounts.reduce((s, a) => s + a.balance, 0).toFixed(2)
    );
    const totalExpenses = Number(
      expenseAccounts.reduce((s, a) => s + a.balance, 0).toFixed(2)
    );
    const netIncome = Number((totalRevenue - totalExpenses).toFixed(2));
    const isProfitable = netIncome >= 0;

    // Generate balanced closing journal lines:
    // 1. Zero out Revenues: Debit Revenue Accounts
    const journalLines: CreateJournalLineDTO[] = [];

    for (const rev of revenueAccounts) {
      if (rev.closingDebit > 0) {
        journalLines.push({
          accountId: rev.accountId,
          debit: rev.closingDebit,
          credit: 0,
          description: `Year-end zeroing of revenue account ${rev.code} - ${rev.name}`,
        });
      } else if (rev.closingCredit > 0) {
        journalLines.push({
          accountId: rev.accountId,
          debit: 0,
          credit: rev.closingCredit,
          description: `Year-end balance adjustment for ${rev.code}`,
        });
      }
    }

    // 2. Zero out Expenses: Credit Expense Accounts
    for (const exp of expenseAccounts) {
      if (exp.closingCredit > 0) {
        journalLines.push({
          accountId: exp.accountId,
          debit: 0,
          credit: exp.closingCredit,
          description: `Year-end zeroing of expense account ${exp.code} - ${exp.name}`,
        });
      } else if (exp.closingDebit > 0) {
        journalLines.push({
          accountId: exp.accountId,
          debit: exp.closingDebit,
          credit: 0,
          description: `Year-end balance adjustment for ${exp.code}`,
        });
      }
    }

    // 3. Sweep Net Profit/Loss into 3010 Retained Earnings
    if (netIncome > 0) {
      // Net Profit => Credit Retained Earnings
      journalLines.push({
        accountId: retainedEarnings.id,
        debit: 0,
        credit: netIncome,
        description: `Transfer of fiscal net operating profit to Retained Earnings (${retainedEarnings.code})`,
      });
    } else if (netIncome < 0) {
      // Net Loss => Debit Retained Earnings
      journalLines.push({
        accountId: retainedEarnings.id,
        debit: Math.abs(netIncome),
        credit: 0,
        description: `Transfer of fiscal net operating loss to Retained Earnings (${retainedEarnings.code})`,
      });
    }

    const totalDebit = Number(
      journalLines.reduce((s, l) => s + (l.debit || 0), 0).toFixed(2)
    );
    const totalCredit = Number(
      journalLines.reduce((s, l) => s + (l.credit || 0), 0).toFixed(2)
    );
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    let canExecute = isBalanced && journalLines.length >= 2;
    let reason: string | undefined;

    if (journalLines.length === 0) {
      canExecute = false;
      reason = 'No nominal revenue or expense balances found to close for this fiscal period.';
    } else if (!isBalanced) {
      canExecute = false;
      reason = `Closing entry unbalanced: Debits (${totalDebit}) != Credits (${totalCredit})`;
    }

    return {
      fiscalYear,
      fiscalYearEndDate: cutOff,
      revenueAccounts,
      expenseAccounts,
      totalRevenue,
      totalExpenses,
      netIncome,
      isProfitable,
      retainedEarningsAccount: {
        id: retainedEarnings.id,
        code: retainedEarnings.code,
        name: retainedEarnings.name,
      },
      journalLines,
      totalDebit,
      totalCredit,
      isBalanced,
      canExecute,
      reason,
    };
  }

  /**
   * Executes the Year-End Close routine.
   * Posts the balanced closing journal entry and locks the closed period.
   */
  async executeClose(params: {
    fiscalYearEndDate: string;
    executedBy?: string;
    lockPeriodAfterClose?: boolean;
    notes?: string;
  }): Promise<YearEndCloseExecutionResult> {
    const preview = await this.previewClose(params.fiscalYearEndDate);

    if (!preview.canExecute) {
      throw new Error(
        preview.reason ||
          'Year-End Close cannot be executed: invalid closing journal configuration.'
      );
    }

    // Verify period lock allows Finance Managers to post closing adjusting entry
    periodLockService.assertNotLocked(params.fiscalYearEndDate, 'FINANCE_MANAGER');

    const cutOff = params.fiscalYearEndDate.slice(0, 10);
    const fiscalYear = preview.fiscalYear;

    // Create and post closing journal entry
    const journalEntry = await financeRepository.createJournalEntry({
      date: cutOff,
      description: `Year-End Close for Fiscal Year Ended ${cutOff}${params.notes ? ` - ${params.notes}` : ''}`,
      reference: `YEC-${fiscalYear}`,
      source: 'SYSTEM',
      status: 'POSTED',
      lines: preview.journalLines,
    });

    // Automatically approve closing journal
    try {
      await financeRepository.approveJournalEntry(
        journalEntry.id,
        params.executedBy || 'Finance Director'
      );
    } catch {
      // If already posted, continue
    }

    // Optionally set or advance period lock
    if (params.lockPeriodAfterClose) {
      periodLockService.setConfig(true, cutOff, cutOff);
    }

    return {
      journalEntry,
      preview,
      closedAt: new Date().toISOString(),
    };
  }
}

export const yearEndCloseService = new YearEndCloseService();
