export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  areaId?: string;
  salesRepId?: string;
  customerId?: string;
  categoryId?: string;
}

export interface SalesByDate {
  date: string;
  amount: number;
}

export interface SalesByRep {
  repId: string;
  repName: string;
  amount: number;
  orderCount: number;
}

export interface SalesByCategory {
  category: string;
  amount: number;
  quantity: number;
}

export interface SalesByProduct {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  totalAmount: number;
}

export interface SalesSummaryReport {
  totalSales: number;
  invoiceSales: number;
  posSales: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByDate: SalesByDate[];
  salesByRep: SalesByRep[];
  salesByCategory: SalesByCategory[];
  salesByProduct: SalesByProduct[];
}

export interface StockByLocation {
  location: string;
  units: number;
  value: number;
}

export interface FastMovingProduct {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
}

export interface DamagedStockItemSummary {
  productId: string;
  name: string;
  damagedQty: number;
  estimatedLoss: number;
}

export interface InventoryReport {
  totalStockValue: number;
  warehouseStockValue: number;
  showroomStockValue: number;
  damagedStockValue: number;
  totalStockLines: number;
  lowStockCount: number;
  stockByLocation: StockByLocation[];
  fastMovingProducts: FastMovingProduct[];
  damagedStockSummary: DamagedStockItemSummary[];
}

export interface AgingBucket {
  bucket: string;
  amount: number;
  customerCount: number;
}

export interface CollectionByMethod {
  method: string;
  amount: number;
  count: number;
}

export interface TopDebtor {
  customerId: string;
  customerName: string;
  code: string;
  balance: number;
  overdue: number;
}

export interface FinanceReport {
  totalReceivables: number;
  currentDue: number;
  nearDue: number;
  overdue: number;
  agingBuckets: AgingBucket[];
  totalCollections: number;
  collectionsByMethod: CollectionByMethod[];
  topDebtors: TopDebtor[];
}

export interface ExecutiveKpiSummary {
  grossRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalInventoryValue: number;
  totalOrdersCount: number;
  activeCustomersCount: number;
}

export interface RepPerformanceSummary {
  repId: string;
  repName: string;
  sales: number;
  target: number;
  achievementPercentage: number;
  collections: number;
}

export interface CustomerSalesSummary {
  customerId: string;
  customerName: string;
  customerCode: string;
  totalSales: number;
  outstandingBalance: number;
}

export interface AreaPerformanceReport {
  areaId: string;
  areaName: string;
  region: string;
  areaManagerId?: string;
  areaManagerName?: string;
  totalSales: number;
  totalCollections: number;
  totalTarget: number;
  achievementPercentage: number;
  activeCustomersCount: number;
  repPerformance: RepPerformanceSummary[];
  topCustomers: CustomerSalesSummary[];
}

// --- NEW REPORTS TYPES ---

// 1. Sales Reports
export interface CreditExceptionItem {
  orderId: string;
  customerId: string;
  customerName: string;
  orderAmount: number;
  creditLimit: number;
  exceededAmount: number;
  approvedBy: string;
  approvedAt: string;
  reason: string;
}

export interface CommissionLinkedSalesItem {
  invoiceId: string;
  salesRepId: string;
  salesRepName: string;
  grossAmount: number;
  commissionableAmount: number;
  commissionRate: number;
  commissionEarned: number;
  date: string;
}

export interface ChequeRealizationItem {
  paymentId: string;
  chequeNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  receivedDate: string;
  dueDate: string;
  status: 'PENDING' | 'CLEARED' | 'BOUNCED';
  bankName: string;
}

// 2. Commission Reports
export interface PerformanceCommissionItem {
  salesRepId: string;
  salesRepName: string;
  targetAmount: number;
  achievedAmount: number;
  achievementPercentage: number;
  tier: string;
  baseCommission: number;
  bonus: number;
  totalPayout: number;
}

export interface CommissionAdjustmentItem {
  adjustmentId: string;
  salesRepId: string;
  salesRepName: string;
  originalAmount: number;
  adjustedAmount: number;
  reason: string;
  adjustedBy: string;
  date: string;
}

export interface WeeklySalesPerformanceItem {
  weekStarting: string;
  salesRepId: string;
  salesRepName: string;
  totalSales: number;
  totalCollections: number;
  calculatedPayout: number;
}

// 3. POS Reports
export interface TillReconciliationItem {
  date: string;
  cashierId: string;
  cashierName: string;
  expectedCash: number;
  actualCash: number;
  variance: number;
  expectedCard: number;
  actualCard: number;
  status: 'BALANCED' | 'SHORTAGE' | 'OVERAGE';
}

export interface PosChequeRegisterItem {
  posTransactionId: string;
  chequeNumber: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'CLEARED' | 'BOUNCED';
}

export interface PosAuditLogItem {
  logId: string;
  date: string;
  cashierId: string;
  cashierName: string;
  action: 'VOID' | 'CANCEL' | 'DELETE_ITEM' | 'DISCOUNT_OVERRIDE';
  transactionId: string;
  amountImpact: number;
  reason: string;
  authorizedBy?: string;
}

export interface DailyShowroomSummary {
  date: string;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  chequeSales: number;
  walkInSales: number;
  customerSales: number;
  transactionCount: number;
}

// 4. Inventory Reports
export interface OldStockItem {
  productId: string;
  productName: string;
  sku: string;
  lastMovedDate: string;
  daysUnmoved: number;
  quantity: number;
  stockValue: number;
}

export interface GrnSummaryItem {
  grnId: string;
  date: string;
  supplierName: string;
  totalItems: number;
  totalValue: number;
  receivedBy: string;
}

export interface BatchExpirationItem {
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysToExpiry: number;
}

export interface StockVarianceItem {
  adjustmentId: string;
  date: string;
  productId: string;
  productName: string;
  systemQuantity: number;
  actualQuantity: number;
  variance: number;
  reason: string;
  adjustedBy: string;
}

export interface StockMovementItem {
  productId: string;
  productName: string;
  date: string;
  movementType: 'IN' | 'OUT' | 'TRANSFER';
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  referenceId: string; // GRN, Invoice, Transfer ID
}

export interface SlowMovingProduct {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  stockOnHand: number;
  velocityScore: number;
}
