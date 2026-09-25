export type POSSessionStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'CASH_IN' | 'CASH_OUT';
export type POSPaymentMethod = 'CASH' | 'CHEQUE' | 'CARD' | 'SPLIT';
export type POSTransactionStatus = 'COMPLETED' | 'REFUNDED';

export interface POSSession {
  id: string;
  sessionNumber: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  expectedCash?: number;
  actualCash?: number;
  cashDifference?: number;
  status: POSSessionStatus;
  cashInTotal: number;
  cashOutTotal: number;
  totalSales: number;
  totalTransactions: number;
  notes?: string;
}

export interface CashTransaction {
  id: string;
  sessionId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  performedById: string;
  performedByName: string;
  timestamp: string;
}

export interface POSTransactionItem {
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  barcodeSnapshot: string;
  unitPriceSnapshot: number;
  discountPercentage: number;
  taxPercentage: number;
  lineTotal: number;
  quantity: number;
}

export interface ChequeDetails {
  chequeNumber: string;
  bankName: string;
  chequeDate: string;
}

export interface POSTransaction {
  id: string;
  receiptNumber: string;
  sessionId: string;
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  items: POSTransactionItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  paymentMethod: POSPaymentMethod;
  cashTendered?: number;
  changeGiven?: number;
  chequeDetails?: ChequeDetails;
  status: POSTransactionStatus;
  refundReason?: string;
  refundedAt?: string;
  refundedById?: string;
  refundedByName?: string;
  createdAt: string;
  cashierId: string;
  cashierName: string;
}

export interface CashReconciliation {
  expectedCash: number;
  difference: number;
  isBalanced: boolean;
  status: 'BALANCED' | 'OVER' | 'SHORT';
}

export interface POSDiscountValidationResult {
  isValid: boolean;
  allowedDiscount: number;
  error?: string;
}

export interface SessionSummary {
  session: POSSession;
  cashTransactions: CashTransaction[];
  transactions: POSTransaction[];
  cashSalesTotal: number;
  chequeSalesTotal: number;
  cardSalesTotal: number;
  splitSalesTotal: number;
  totalRefunds: number;
  netSales: number;
  reconciliation: CashReconciliation;
}
