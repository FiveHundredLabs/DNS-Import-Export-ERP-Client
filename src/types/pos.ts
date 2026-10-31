export type POSSessionStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'CASH_IN' | 'CASH_OUT';
export type POSPaymentMethod = 'CASH' | 'CHEQUE' | 'CARD' | 'SPLIT' | 'BANK_TRANSFER';
export type POSTransactionStatus = 'COMPLETED' | 'REFUNDED' | 'VOIDED';

// ==========================================
// 1. POS Terminal Management
// ==========================================
export type POSTerminalStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface POSTerminal {
  id: string;
  terminalCode: string; // e.g. "TERM-SR-01"
  name: string; // e.g. "Power Tools Bay Main Terminal"
  showroomId: string;
  showroomName: string;
  status: POSTerminalStatus;
  currentSessionId?: string;
  currentCashierId?: string;
  currentCashierName?: string;
  ipAddress?: string;
  lastActiveAt?: string;
  totalSalesToday: number;
  cashDrawerBalance: number;
  pendingHandoverAmount?: number;
}

// ==========================================
// 2. Manager Authorization Token System
// ==========================================
export type POSManagerTokenType = 'DISCOUNT' | 'REFUND' | 'VOID' | 'CASH_MOVEMENT';

export interface POSManagerToken {
  id: string;
  token: string; // e.g. "AUTH-4892-8172"
  operationType: POSManagerTokenType;
  managerId: string;
  managerName: string;
  showroomId: string;
  terminalId?: string;
  terminalCode?: string;
  targetReference?: string; // Product SKU, Receipt Number, or description
  approvedDiscountPercentage?: number; // Exactly approved discount %
  reason: string;
  expiresAt: string; // ISO date
  isUsed: boolean;
  usedAt?: string;
  usedByCashierId?: string;
  usedByCashierName?: string;
  transactionReceiptNumber?: string;
  isRevoked?: boolean;
  createdAt: string;
}

// ==========================================
// 3. Showroom Offers Management
// ==========================================
export type ShowroomOfferReason = 'STOCK_CLEARANCE' | 'PROMOTIONAL' | 'SEASONAL' | 'DAMAGED_BOX';
export type ShowroomOfferStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface ShowroomOffer {
  id: string;
  offerCode: string; // e.g. "OFR-CLR-001"
  offerName: string;
  description?: string;
  productId: string;
  productSku: string;
  productName: string;
  originalPrice: number;
  offerPrice: number;
  discountPercentage: number;
  startDate: string; // ISO Date YYYY-MM-DD
  endDate: string; // ISO Date YYYY-MM-DD
  maxQuantity?: number;
  soldQuantity: number;
  reason: ShowroomOfferReason;
  internalNotes?: string;
  status: ShowroomOfferStatus;
  rejectionReason?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedById?: string;
  rejectedByName?: string;
  rejectedAt?: string;
}

// ==========================================
// 4. Refund & Void Management
// ==========================================
export type POSRefundCondition = 'RESTOCKABLE' | 'DAMAGED' | 'REQUIRES_INSPECTION';

export interface POSRefundItem {
  productId: string;
  sku: string;
  name: string;
  originalQuantity: number;
  refundQuantity: number;
  unitPrice: number;
  lineTotal: number;
  condition: POSRefundCondition;
}

export interface POSRefundRequest {
  id: string;
  transactionId: string;
  receiptNumber: string;
  sessionId: string;
  terminalId?: string;
  items: POSRefundItem[];
  totalRefundAmount: number;
  refundReason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedById: string;
  requestedByName: string;
  managerTokenId?: string;
  approvedById?: string;
  approvedByName?: string;
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface POSVoidRequest {
  id: string;
  transactionId: string;
  receiptNumber: string;
  sessionId: string;
  terminalId?: string;
  totalAmount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedById: string;
  requestedByName: string;
  managerTokenId?: string;
  approvedById?: string;
  approvedByName?: string;
  rejectionReason?: string;
  createdAt: string;
  voidedAt?: string;
}

// ==========================================
// 5. Shift & Session Management
// ==========================================
export interface POSSession {
  id: string;
  sessionNumber: string;
  terminalId?: string;
  terminalCode?: string;
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
  cashRefundsTotal?: number;
  cashHandoverTotal?: number;
  totalSales: number;
  totalTransactions: number;
  notes?: string;
  reconciliationStatus?: 'PENDING_MANAGER_REVIEW' | 'APPROVED' | 'RECOUNT_REQUESTED';
  reconciliationApprovedById?: string;
  reconciliationApprovedByName?: string;
  reconciliationNotes?: string;
}

export interface CashTransaction {
  id: string;
  sessionId: string;
  terminalId?: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  referenceNumber?: string;
  performedById: string;
  performedByName: string;
  approvedById?: string;
  approvedByName?: string;
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
  serialNumber?: string;
  appliedOfferId?: string;
  supervisorAuthKey?: string;
  authorizedBySupervisor?: boolean;
  supervisorName?: string;
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
  terminalId?: string;
  terminalCode?: string;
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
  voidReason?: string;
  voidedAt?: string;
  voidedById?: string;
  voidedByName?: string;
  managerTokenUsed?: string;
  createdAt: string;
  cashierId: string;
  cashierName: string;
  supervisorAuthorized?: boolean;
  supervisorAuthKey?: string;
}

export interface CashReconciliation {
  openingBalance: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  cashRefunds: number;
  cashHandovers: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  isBalanced: boolean;
  status: 'BALANCED' | 'OVER' | 'SHORT';
}

export interface POSDiscountValidationResult {
  isValid: boolean;
  allowedDiscount: number;
  requiresSupervisorKey: boolean;
  error?: string;
}

export interface SessionSummary {
  session: POSSession;
  cashTransactions: CashTransaction[];
  transactions: POSTransaction[];
  cashSalesTotal: number;
  chequeSalesTotal: number;
  cardSalesTotal: number;
  bankTransferSalesTotal?: number;
  splitSalesTotal: number;
  totalRefunds: number;
  totalVoids?: number;
  netSales: number;
  reconciliation: CashReconciliation;
}

// ==========================================
// 6. POS Manager Reports & Analytics
// ==========================================
export type POSReportType =
  | 'DAILY_SALES'
  | 'MONTHLY_SALES'
  | 'TERMINAL_SALES'
  | 'CASHIER_SALES'
  | 'SHIFT_PERFORMANCE'
  | 'CASH_RECONCILIATION'
  | 'CASH_MOVEMENT'
  | 'REFUND_REPORT'
  | 'VOID_REPORT'
  | 'DISCOUNT_REPORT'
  | 'OFFER_PERFORMANCE'
  | 'PAYMENT_METHOD'
  | 'DAY_END_CLOSING';

export interface DayEndClosingSummary {
  date: string;
  totalTransactions: number;
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  cashSales: number;
  cardSales: number;
  bankTransferSales: number;
  chequeSales: number;
  refundTotals: number;
  voidTotals: number;
  openingCashTotal: number;
  cashInTotal: number;
  cashOutTotal: number;
  cashRefundsTotal: number;
  cashHandoversTotal: number;
  expectedClosingCash: number;
  actualClosingCash: number;
  cashDiscrepancy: number;
  terminalSummaries: Array<{
    terminalId: string;
    terminalCode: string;
    terminalName: string;
    totalSales: number;
    transactionCount: number;
    cashSales: number;
    expectedCash: number;
    actualCash: number;
    difference: number;
  }>;
  cashierSummaries: Array<{
    cashierId: string;
    cashierName: string;
    shiftsCount: number;
    totalSales: number;
    transactionsCount: number;
    cashDifference: number;
  }>;
}
