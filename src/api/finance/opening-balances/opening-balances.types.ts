export type OpeningBalanceBatchStatus = 'DRAFT' | 'VALIDATED' | 'POSTED' | 'REJECTED';

export interface OpeningBalanceItemInput {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface CreateOpeningBalancePayload {
  asOfDate: string; // YYYY-MM-DD
  description: string;
  items: OpeningBalanceItemInput[];
}

export interface UpdateOpeningBalancePayload {
  asOfDate?: string;
  description?: string;
  items?: OpeningBalanceItemInput[];
}

export interface RejectOpeningBalancePayload {
  reason: string;
}

export interface OpeningBalanceBatch {
  id: string;
  batchNumber: string;
  status: OpeningBalanceBatchStatus;
  asOfDate: string;
  description: string;
  totalDebit: string;
  totalCredit: string;
  difference: string;
  isEquilibrium: boolean;
  rejectionReason?: string | null;
  journalEntryId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    batchId: string;
    accountId: string;
    account: {
      id: string;
      code: string;
      name: string;
    };
    debit: string;
    credit: string;
    description?: string | null;
  }>;
}

export interface OpeningBalanceQueryParams {
  status?: OpeningBalanceBatchStatus;
  asOfDate?: string;
  page?: number;
  limit?: number;
}
