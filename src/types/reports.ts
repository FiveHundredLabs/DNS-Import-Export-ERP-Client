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
