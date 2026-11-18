/**
 * Reports Domain Type Contracts and Data Providers
 * Fabricated mock records eliminated in Phase 2.
 * Returns clean empty data sets and zeroed KPI baselines when no live report records exist.
 */

// ─── Shared Formatting ─────────────────────────────────────────────────────────

export const lkr = (n: number) =>
  `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const pct = (n: number) => `${n.toFixed(1)}%`;

// ─── SALES REPORT CONTRACTS ───────────────────────────────────────────────────

export interface SalesSummaryRow {
  period: string;
  orders: number;
  delivered: number;
  revenue: number;
  returns: number;
  netRevenue: number;
}

export const MOCK_SALES_SUMMARY: SalesSummaryRow[] = [];

export const SALES_SUMMARY_KPIS = {
  totalRevenue: 0,
  totalDelivered: 0,
  avgOrderValue: 0,
  totalReturns: 0,
};

// ─── Sales Order Status ────────────────────────────────────────────────────────

export interface SalesOrderRow {
  orderNumber: string;
  customer: string;
  area: string;
  rep: string;
  date: string;
  amount: number;
  status: string;
}

export const MOCK_SALES_ORDERS: SalesOrderRow[] = [];

export const SALES_ORDER_STATUS_COUNTS = {
  DRAFT: 0,
  PENDING_APPROVAL: 0,
  APPROVED: 0,
  DISPATCHED: 0,
  DELIVERED: 0,
  REJECTED: 0,
  CANCELLED: 0,
};

// ─── Sales Rep Performance ─────────────────────────────────────────────────────

export interface SalesRepPerfRow {
  repId: string;
  repName: string;
  area: string;
  deliveredOrders: number;
  customers: number;
  revenue: number;
  target: number;
  achievement: number;
  collections: number;
}

export const MOCK_REP_PERFORMANCE: SalesRepPerfRow[] = [];

export const REP_PERF_KPIS = {
  totalReps: 0,
  avgAchievement: 0,
  topRep: '—',
  totalRevenue: 0,
};

// ─── Area-wise Sales ───────────────────────────────────────────────────────────

export interface AreaSalesRow {
  area: string;
  region: string;
  manager: string;
  orders: number;
  delivered: number;
  revenue: number;
  target: number;
  achievement: number;
}

export const MOCK_AREA_SALES: AreaSalesRow[] = [];

export const AREA_KPIS = {
  totalAreas: 0,
  topArea: '—',
  totalRevenue: 0,
  avgAchievement: 0,
};

// ─── Target Achievement ────────────────────────────────────────────────────────

export interface TargetRow {
  name: string;
  type: 'REP' | 'AREA';
  target: number;
  achieved: number;
  remaining: number;
  achievement: number;
  period: string;
}

export const MOCK_TARGETS: TargetRow[] = [];

export const TARGET_KPIS = {
  onTarget: 0,
  belowTarget: 0,
  avgAchievement: 0,
  monthlyTarget: 0,
};

// ─── Customer-wise Sales ───────────────────────────────────────────────────────

export interface CustomerSalesRow {
  code: string;
  name: string;
  type: string;
  area: string;
  rep: string;
  orders: number;
  delivered: number;
  revenue: number;
  outstanding: number;
  lastOrder: string;
}

export const MOCK_CUSTOMER_SALES: CustomerSalesRow[] = [];

export const CUSTOMER_KPIS = {
  totalCustomers: 0,
  activeCustomers: 0,
  totalRevenue: 0,
  avgOrderValue: 0,
};

// ─── Product-wise Sales ────────────────────────────────────────────────────────

export interface ProductSalesRow {
  sku: string;
  name: string;
  category: string;
  qtySold: number;
  revenue: number;
  avgPrice: number;
  returnQty: number;
}

export const MOCK_PRODUCT_SALES: ProductSalesRow[] = [];

export const PRODUCT_KPIS = {
  totalSKUs: 0,
  topProduct: '—',
  totalRevenue: 0,
  totalQtySold: 0,
};

// ─── Collections ──────────────────────────────────────────────────────────────

export interface CollectionRow {
  receiptNo: string;
  date: string;
  customer: string;
  rep: string;
  area: string;
  method: string;
  amount: number;
  status: string;
}

export const MOCK_COLLECTIONS: CollectionRow[] = [];

export const COLLECTION_KPIS = {
  totalCollected: 0,
  cheque: 0,
  bankTransfer: 0,
  cash: 0,
  bounced: 0,
};

// ─── Outstanding ──────────────────────────────────────────────────────────────

export interface OutstandingRow {
  invoiceNo: string;
  customer: string;
  area: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  paidAmount: number;
  outstanding: number;
  daysOverdue: number;
  aging: string;
}

export const MOCK_OUTSTANDING: OutstandingRow[] = [];

export const OUTSTANDING_KPIS = {
  totalOutstanding: 0,
  current: 0,
  overdue30: 0,
  overdue60: 0,
  overduePlus90: 0,
};

// ─── Profitability ─────────────────────────────────────────────────────────────

export interface ProfitRow {
  sku: string;
  name: string;
  category: string;
  qtySold: number;
  revenue: number;
  landedCost: number;
  cogs: number;
  grossProfit: number;
  margin: number;
}

export const MOCK_PROFITABILITY: ProfitRow[] = [];

export const PROFIT_KPIS = {
  totalRevenue: 0,
  totalCOGS: 0,
  grossProfit: 0,
  avgMargin: 0,
};

// ─── Showroom Sales ────────────────────────────────────────────────────────────

export interface ShowroomRow {
  date: string;
  txnRef: string;
  cashier: string;
  items: number;
  cash: number;
  card: number;
  cheque: number;
  total: number;
}

export const MOCK_SHOWROOM_SALES: ShowroomRow[] = [];

export const SHOWROOM_KPIS = {
  totalSales: 0,
  totalTxns: 0,
  cash: 0,
  card: 0,
  cheque: 0,
  avgTxn: 0,
};

// ─── PURCHASING REPORT CONTRACTS ───────────────────────────────────────────────

export interface PORow {
  poNumber: string;
  supplier: string;
  date: string;
  expectedDelivery: string;
  amount: number;
  status: string;
}

export const MOCK_PO_LIST: PORow[] = [];

export const PO_STATUS_COUNTS = {
  DRAFT: 0,
  PENDING_APPROVAL: 0,
  APPROVED: 0,
  RECEIVED: 0,
  CANCELLED: 0,
  REJECTED: 0,
};

export const PO_KPIS = {
  totalPOs: 0,
  totalValue: 0,
  pendingValue: 0,
  receivedValue: 0,
};

// ─── Purchase Summary ──────────────────────────────────────────────────────────

export interface PurchaseSummaryRow {
  period: string;
  poCount: number;
  received: number;
  value: number;
  avgPOValue: number;
}

export const MOCK_PURCHASE_SUMMARY: PurchaseSummaryRow[] = [];

export const PURCHASE_SUMMARY_KPIS = {
  totalValue: 0,
  totalPOs: 0,
  totalReceived: 0,
  avgMonthly: 0,
};

// ─── Supplier Purchase ─────────────────────────────────────────────────────────

export interface SupplierPurchaseRow {
  supplierCode: string;
  supplierName: string;
  country: string;
  poCount: number;
  received: number;
  totalValue: number;
  avgLead: number;
  lastOrder: string;
}

export const MOCK_SUPPLIER_PURCHASE: SupplierPurchaseRow[] = [];

export const SUPPLIER_KPIS = {
  totalSuppliers: 0,
  topSupplier: '—',
  totalSpend: 0,
  avgLead: 0,
};

// ─── GRN Report ────────────────────────────────────────────────────────────────

export interface GRNRow {
  grnNumber: string;
  poNumber: string;
  supplier: string;
  receivedDate: string;
  items: number;
  value: number;
  status: string;
  receivedBy: string;
}

export const MOCK_GRN: GRNRow[] = [];

export const GRN_KPIS = {
  totalGRNs: 0,
  approved: 0,
  submitted: 0,
  totalValue: 0,
};

// ─── Purchase Returns ──────────────────────────────────────────────────────────

export interface PurchaseReturnRow {
  returnRef: string;
  grnRef: string;
  supplier: string;
  date: string;
  reason: string;
  qty: number;
  value: number;
  status: string;
}

export const MOCK_PURCHASE_RETURNS: PurchaseReturnRow[] = [];

export const RETURNS_KPIS = {
  totalReturns: 0,
  totalValue: 0,
  approved: 0,
  pending: 0,
};

// ─── Cost Analysis ─────────────────────────────────────────────────────────────

export interface CostAnalysisRow {
  sku: string;
  name: string;
  category: string;
  supplier: string;
  avgPurchasePrice: number;
  landedCost: number;
  sellingPrice: number;
  margin: number;
  lastPurchase: string;
}

export const MOCK_COST_ANALYSIS: CostAnalysisRow[] = [];

export const COST_KPIS = {
  avgMargin: 0,
  highestMargin: '—',
  lowestMargin: '—',
  totalSKUs: 0,
};

// ─── Supplier Payments ─────────────────────────────────────────────────────────

export interface SupplierPaymentRow {
  paymentRef: string;
  supplier: string;
  date: string;
  method: string;
  poRef: string;
  amount: number;
  status: string;
}

export const MOCK_SUPPLIER_PAYMENTS: SupplierPaymentRow[] = [];

export const SUPPLIER_PAYMENT_KPIS = {
  totalPaid: 0,
  totalPending: 0,
  totalPayments: 0,
  avgPayment: 0,
};

// ─── Purchase Outstanding ──────────────────────────────────────────────────────

export interface PurchaseOutstandingRow {
  invoiceRef: string;
  supplier: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  outstanding: number;
  daysOverdue: number;
}

export const MOCK_PURCHASE_OUTSTANDING: PurchaseOutstandingRow[] = [];

export const PURCHASE_OUTSTANDING_KPIS = {
  totalOutstanding: 0,
  overdue: 0,
  current: 0,
  totalInvoices: 0,
};

// ─── INVENTORY REPORT CONTRACTS ────────────────────────────────────────────────

export interface StockSummaryRow {
  sku: string;
  name: string;
  category: string;
  warehouse: number;
  showroom: number;
  reserved: number;
  damaged: number;
  available: number;
  reorderLevel: number;
  status: string;
}

export const MOCK_STOCK_SUMMARY: StockSummaryRow[] = [];

export const STOCK_KPIS = {
  totalSKUs: 0,
  lowStock: 0,
  criticalStock: 0,
  totalWarehouse: 0,
  totalShowroom: 0,
};

// ─── Stock Movement ────────────────────────────────────────────────────────────

export interface StockMovementRow {
  date: string;
  movementType: string;
  sku: string;
  name: string;
  qty: number;
  from: string;
  to: string;
  reference: string;
  handledBy: string;
}

export const MOCK_STOCK_MOVEMENTS: StockMovementRow[] = [];

export const MOVEMENT_KPIS = {
  totalIn: 0,
  totalOut: 0,
  transfers: 0,
  adjustments: 0,
  totalMovements: 0,
};

// ─── Stock Valuation ───────────────────────────────────────────────────────────

export interface ValuationRow {
  sku: string;
  name: string;
  category: string;
  totalQty: number;
  landedCost: number;
  totalValue: number;
  location: string;
}

export const MOCK_STOCK_VALUATION: ValuationRow[] = [];

export const VALUATION_KPIS = {
  totalInventoryValue: 0,
  warehouseValue: 0,
  showroomValue: 0,
  totalSKUs: 0,
};

// ─── Low Stock & Reorder ───────────────────────────────────────────────────────

export interface LowStockRow {
  sku: string;
  name: string;
  category: string;
  currentQty: number;
  reorderLevel: number;
  reorderQty: number;
  status: string;
  supplier: string;
  avgLeadDays: number;
}

export const MOCK_LOW_STOCK: LowStockRow[] = [];

export const LOW_STOCK_KPIS = {
  critical: 0,
  low: 0,
  totalItems: 0,
  requireImmediate: 0,
};
