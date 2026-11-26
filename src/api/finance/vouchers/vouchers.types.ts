export type FinanceVoucherType = 'PAYMENT' | 'RECEIPT';
export type VoucherPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';

export interface FinanceVoucher {
  id: string;
  voucherNumber: string;
  type: FinanceVoucherType;
  transactionDate: string;
  amount: string; // Decimal serialized as string
  liquidAccountId: string;
  liquidAccount: {
    id: string;
    code: string;
    name: string;
  };
  offsetAccountId: string;
  offsetAccount: {
    id: string;
    code: string;
    name: string;
  };
  partyName?: string | null;
  narration: string;
  paymentMethod: VoucherPaymentMethod;
  referenceNumber?: string | null;
  journalEntryId: string;
  journalEntry: {
    id: string;
    entryNumber: string;
    status: string;
  };
  fiscalPeriodId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoucherPayload {
  type: FinanceVoucherType;
  transactionDate: string;
  amount: number;
  liquidAccountId: string;
  offsetAccountId: string;
  partyName?: string;
  narration: string;
  paymentMethod?: VoucherPaymentMethod;
  referenceNumber?: string;
}

export interface VoucherQueryParams {
  type?: FinanceVoucherType;
  paymentMethod?: VoucherPaymentMethod;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
