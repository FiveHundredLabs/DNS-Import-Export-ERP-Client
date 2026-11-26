export type ClearanceAction = 'CLEAR' | 'UNCLEAR';
export type BankAdjustmentType = 'PAYMENT' | 'RECEIPT';
export type ReconciliationSessionStatus = 'IN_PROGRESS' | 'RECONCILED' | 'CANCELLED';

export interface StartReconciliationPayload {
  financeAccountId: string;
  statementEndingDate: string; // YYYY-MM-DD
  statementEndingBalance: number;
  notes?: string;
}

export interface ToggleClearancePayload {
  journalLineIds: string[];
  action: ClearanceAction;
}

export interface CreateAdjustmentPayload {
  transactionDate: string;
  type: BankAdjustmentType;
  offsetAccountId: string;
  amount: number;
  description: string;
  referenceNumber?: string;
}

export interface CompleteReconciliationPayload {
  reconciliationNotes?: string;
}

export interface ReconciliationWorkspaceMetrics {
  openingBalance: string;
  closingBookBalance: string;
  clearedDeposits: string;
  clearedWithdrawals: string;
  clearedBalance: string;
  statementBalance: string;
  unclearedDeposits: string;
  unclearedWithdrawals: string;
  difference: string;
  isBalanced: boolean;
}

export interface CashBookJournalLine {
  id: string;
  journalEntryId: string;
  transactionDate: string;
  entryNumber: string;
  sourceType: string;
  referenceNumber: string | null;
  description: string | null;
  debit: string;
  credit: string;
  isCleared: boolean;
  clearedAt: string | null;
}

export interface ReconciliationSession {
  id: string;
  bankAccountId: string;
  bankAccount: {
    id: string;
    code: string;
    name: string;
  };
  statementEndingDate: string;
  statementEndingBalance: string;
  status: ReconciliationSessionStatus;
  reconciledAt: string | null;
  reconciledBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ReconciliationWorkspaceResponse {
  session: ReconciliationSession;
  metrics: ReconciliationWorkspaceMetrics;
  lines: CashBookJournalLine[];
}

export interface BrsReportSection {
  title: string;
  lines: Array<{
    date: string;
    reference: string;
    description: string;
    amount: string;
  }>;
  subtotal: string;
}

export interface BrsReportResponse {
  sessionId: string;
  bankAccount: { code: string; name: string };
  statementDate: string;
  statementBalance: string;
  bookBalance: string;
  difference: string;
  sections: {
    depositsInTransit: BrsReportSection;
    outstandingCheques: BrsReportSection;
    bankAdjustments: BrsReportSection;
  };
  isReconciled: boolean;
}

export interface ReconciliationHistoryItem {
  id: string;
  bankAccountId: string;
  bankAccount: { code: string; name: string };
  statementEndingDate: string;
  statementEndingBalance: string;
  closingBookBalance: string;
  status: ReconciliationSessionStatus;
  reconciledAt: string | null;
  reconciledBy: string | null;
  notes: string | null;
  createdAt: string;
}
