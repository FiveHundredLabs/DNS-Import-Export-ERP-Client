export type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED';
export type JournalSourceType =
  | 'MANUAL'
  | 'SALES_INVOICE'
  | 'CUSTOMER_PAYMENT'
  | 'SUPPLIER_BILL'
  | 'SUPPLIER_PAYMENT'
  | 'STOCK_MOVEMENT'
  | 'EXPENSE_VOUCHER'
  | 'RECEIPT_VOUCHER'
  | 'BANK_RECONCILIATION'
  | 'PERIOD_CLOSING'
  | 'OPENING_BALANCE'
  | 'SYSTEM_REVERSAL';

export interface JournalLineItem {
  id?: string;
  accountId: string;
  account?: {
    id: string;
    code: string;
    name: string;
  };
  debit?: number;
  credit?: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  sourceType: JournalSourceType;
  sourceId?: string | null;
  status: JournalStatus;
  transactionDate: string;
  description: string;
  totalDebit: string;
  totalCredit: string;
  idempotencyKey?: string | null;
  fiscalPeriodId?: string | null;
  isOpeningBalance: boolean;
  reversesEntryId?: string | null;
  reversedByEntryId?: string | null;
  reversalReason?: string | null;
  reversalDate?: string | null;
  createdAt: string;
  updatedAt: string;
  lines: Array<{
    id: string;
    journalEntryId: string;
    accountId: string;
    account: {
      id: string;
      code: string;
      name: string;
    };
    debit: string;
    credit: string;
    description: string | null;
  }>;
}

export interface CreateJournalPayload {
  transactionDate: string;
  description: string;
  lines: Array<{
    accountId: string;
    debit?: number;
    credit?: number;
    description?: string;
  }>;
  idempotencyKey?: string;
}

export interface UpdateJournalPayload {
  transactionDate?: string;
  description?: string;
  lines?: Array<{
    accountId: string;
    debit?: number;
    credit?: number;
    description?: string;
  }>;
}

export interface ReverseJournalPayload {
  reversalReason: string;
  reversalDate?: string;
}

export interface JournalQueryParams {
  page?: number;
  limit?: number;
  status?: JournalStatus;
  sourceType?: JournalSourceType;
  startDate?: string;
  endDate?: string;
  search?: string;
  fiscalPeriodId?: string;
}
