export type CashVoucherType = 'PAYMENT' | 'RECEIPT';

export type CashVoucherCategory =
  | 'PETTY_CASH'
  | 'OFFICE_EXPENSE'
  | 'UTILITIES'
  | 'SUPPLIER_PAYMENT'
  | 'CASH_SALE'
  | 'FLOAT_REPLENISHMENT'
  | 'TRAVEL_TRANSPORT'
  | 'OTHER';

export type CashVoucherStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface PaymentVoucher {
  id: string;
  voucherNumber: string;
  date: string; // YYYY-MM-DD
  voucherType: CashVoucherType;
  category: CashVoucherCategory;
  payeeOrPayer: string;
  amount: number;
  cashAccountCode: '1010' | '1040';
  cashAccountName: string;
  offsetAccountId: string;
  offsetAccountCode: string;
  offsetAccountName: string;
  description: string;
  status: CashVoucherStatus;
  createdBy: string;
  createdByName: string;
  paymentMethod?: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
  chequeNumber?: string;
  bankName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  glJournalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentVoucherDTO {
  voucherType: CashVoucherType;
  category: CashVoucherCategory;
  payeeOrPayer: string;
  amount: number;
  cashAccountCode: '1010' | '1040';
  offsetAccountCode: string;
  offsetAccountName?: string;
  description: string;
  paymentMethod?: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
  chequeNumber?: string;
  bankName?: string;
  date?: string;
  autoApprove?: boolean;
}

export interface CashBookTransaction {
  id: string;
  journalId?: string;
  entryNumber: string;
  date: string;
  referenceNumber: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  transactionType: 'RECEIPT' | 'PAYMENT';
  status: string;
  source?: string;
}

export interface CashBookSummary {
  account1010Balance: number;
  account1040Balance: number;
  pendingApprovalsCount: number;
  pendingApprovalsAmount: number;
  monthlyDisbursements: number;
  monthlyReceipts: number;
}
