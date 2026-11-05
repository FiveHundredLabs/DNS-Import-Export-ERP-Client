/**
 * Comprehensive mock data for all three new reports modules:
 * Sales, Purchasing, and Inventory.
 * Uses realistic LKR amounts, Colombo-based context, DNS ERP product names.
 */

// ─── Shared Formatting ─────────────────────────────────────────────────────────

export const lkr = (n: number) =>
  `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const pct = (n: number) => `${n.toFixed(1)}%`;

// ─── SALES MOCK DATA ───────────────────────────────────────────────────────────

export interface SalesSummaryRow {
  period: string;
  orders: number;
  delivered: number;
  revenue: number;
  returns: number;
  netRevenue: number;
}

export const MOCK_SALES_SUMMARY: SalesSummaryRow[] = [
  { period: 'Oct 2026', orders: 142, delivered: 128, revenue: 18750000, returns: 320000, netRevenue: 18430000 },
  { period: 'Sep 2026', orders: 136, delivered: 119, revenue: 17200000, returns: 240000, netRevenue: 16960000 },
  { period: 'Aug 2026', orders: 151, delivered: 138, revenue: 19100000, returns: 410000, netRevenue: 18690000 },
  { period: 'Jul 2026', orders: 128, delivered: 115, revenue: 16400000, returns: 180000, netRevenue: 16220000 },
  { period: 'Jun 2026', orders: 118, delivered: 104, revenue: 14900000, returns: 275000, netRevenue: 14625000 },
  { period: 'May 2026', orders: 145, delivered: 132, revenue: 18300000, returns: 390000, netRevenue: 17910000 },
];

export const SALES_SUMMARY_KPIS = {
  totalRevenue: 104650000,
  totalDelivered: 736,
  avgOrderValue: 142200,
  totalReturns: 1815000,
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

export const MOCK_SALES_ORDERS: SalesOrderRow[] = [
  { orderNumber: 'SO-DLR-COL-001-1021', customer: 'Lanka Electrical & Hardware', area: 'Kelaniya', rep: 'Kasun Wickramasinghe', date: '2026-11-01', amount: 183500, status: 'DELIVERED' },
  { orderNumber: 'SO-DLR-NEG-002-0892', customer: 'Muthurajawela Engineering', area: 'Maharagama', rep: 'Kasun Wickramasinghe', date: '2026-11-02', amount: 94200, status: 'APPROVED' },
  { orderNumber: 'SO-DLR-MLB-003-0441', customer: 'Malabe Power Traders', area: 'Malabe', rep: 'Nuwan Pradeep', date: '2026-11-03', amount: 212000, status: 'PENDING_APPROVAL' },
  { orderNumber: 'SO-DLR-KOT-004-0315', customer: 'Kottawa Switchgear Depot', area: 'Kottawa', rep: 'Dinesh Rathnayake', date: '2026-11-03', amount: 67800, status: 'DISPATCHED' },
  { orderNumber: 'SO-DLR-COL-005-1102', customer: 'City Electrics Pvt Ltd', area: 'Kelaniya', rep: 'Kasun Wickramasinghe', date: '2026-11-04', amount: 158400, status: 'DELIVERED' },
  { orderNumber: 'SO-DLR-GAM-006-0211', customer: 'Negombo Electrical Hub', area: 'Gampaha', rep: 'Chaminda Silva', date: '2026-11-04', amount: 89750, status: 'REJECTED' },
  { orderNumber: 'SO-DLR-COL-007-1200', customer: 'Lanka Electrical & Hardware', area: 'Kelaniya', rep: 'Kasun Wickramasinghe', date: '2026-11-05', amount: 345600, status: 'DRAFT' },
  { orderNumber: 'SO-DLR-MLB-008-0501', customer: 'TechBuild Solutions', area: 'Malabe', rep: 'Nuwan Pradeep', date: '2026-11-05', amount: 128900, status: 'APPROVED' },
  { orderNumber: 'SO-DLR-NEG-009-0923', customer: 'Negombo Trade Center', area: 'Maharagama', rep: 'Kasun Wickramasinghe', date: '2026-10-30', amount: 76200, status: 'DELIVERED' },
  { orderNumber: 'SO-DLR-KOT-010-0392', customer: 'Southern Electrical Mart', area: 'Kottawa', rep: 'Dinesh Rathnayake', date: '2026-10-29', amount: 192000, status: 'CANCELLED' },
  { orderNumber: 'SO-DLR-COL-011-1301', customer: 'Colombo Industrial Supply', area: 'Kelaniya', rep: 'Kasun Wickramasinghe', date: '2026-10-28', amount: 234500, status: 'DELIVERED' },
  { orderNumber: 'SO-DLR-GAM-012-0280', customer: 'Gampaha Power Systems', area: 'Gampaha', rep: 'Chaminda Silva', date: '2026-10-27', amount: 112000, status: 'DELIVERED' },
  { orderNumber: 'SO-DLR-MLB-013-0552', customer: 'Malabe Contractors Depot', area: 'Malabe', rep: 'Nuwan Pradeep', date: '2026-10-26', amount: 88200, status: 'APPROVED' },
  { orderNumber: 'SO-DLR-KOT-014-0401', customer: 'Kottawa Builders Mart', area: 'Kottawa', rep: 'Dinesh Rathnayake', date: '2026-10-25', amount: 167400, status: 'DISPATCHED' },
  { orderNumber: 'SO-DLR-COL-015-1402', customer: 'Capital Engineering Supplies', area: 'Kelaniya', rep: 'Kasun Wickramasinghe', date: '2026-10-24', amount: 298000, status: 'DELIVERED' },
];

export const SALES_ORDER_STATUS_COUNTS = {
  DRAFT: 1, PENDING_APPROVAL: 1, APPROVED: 3, DISPATCHED: 2, DELIVERED: 6, REJECTED: 1, CANCELLED: 1,
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

export const MOCK_REP_PERFORMANCE: SalesRepPerfRow[] = [
  { repId: 'usr-106', repName: 'Kasun Wickramasinghe', area: 'Kelaniya', deliveredOrders: 48, customers: 14, revenue: 7250000, target: 7000000, achievement: 103.6, collections: 6800000 },
  { repId: 'usr-112', repName: 'Nuwan Pradeep', area: 'Maharagama', deliveredOrders: 36, customers: 11, revenue: 5420000, target: 6000000, achievement: 90.3, collections: 4950000 },
  { repId: 'usr-113', repName: 'Dinesh Rathnayake', area: 'Galle', deliveredOrders: 42, customers: 16, revenue: 6180000, target: 5500000, achievement: 112.4, collections: 5900000 },
  { repId: 'usr-114', repName: 'Chaminda Silva', area: 'Gampaha', deliveredOrders: 29, customers: 12, revenue: 4320000, target: 5000000, achievement: 86.4, collections: 3980000 },
];

export const REP_PERF_KPIS = {
  totalReps: 4,
  avgAchievement: 98.2,
  topRep: 'Dinesh Rathnayake',
  totalRevenue: 23170000,
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

export const MOCK_AREA_SALES: AreaSalesRow[] = [
  { area: 'Kelaniya', region: 'Colombo North', manager: 'Nimal Bandara', orders: 54, delivered: 48, revenue: 7820000, target: 7000000, achievement: 111.7 },
  { area: 'Maharagama', region: 'Colombo South', manager: 'Nimal Bandara', orders: 42, delivered: 36, revenue: 5680000, target: 6500000, achievement: 87.4 },
  { area: 'Malabe', region: 'Colombo East', manager: 'Nimal Bandara', orders: 38, delivered: 32, revenue: 5120000, target: 5500000, achievement: 93.1 },
  { area: 'Kottawa', region: 'Colombo South', manager: 'Nimal Bandara', orders: 31, delivered: 27, revenue: 4280000, target: 4000000, achievement: 107.0 },
  { area: 'Gampaha', region: 'Gampaha District', manager: 'Nimal Bandara', orders: 29, delivered: 24, revenue: 3940000, target: 4000000, achievement: 98.5 },
];

export const AREA_KPIS = { totalAreas: 5, topArea: 'Kelaniya', totalRevenue: 26840000, avgAchievement: 99.5 };

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

export const MOCK_TARGETS: TargetRow[] = [
  { name: 'Kasun Wickramasinghe', type: 'REP', target: 7000000, achieved: 7250000, remaining: 0, achievement: 103.6, period: 'Oct 2026' },
  { name: 'Nuwan Pradeep', type: 'REP', target: 6000000, achieved: 5420000, remaining: 580000, achievement: 90.3, period: 'Oct 2026' },
  { name: 'Dinesh Rathnayake', type: 'REP', target: 5500000, achieved: 6180000, remaining: 0, achievement: 112.4, period: 'Oct 2026' },
  { name: 'Chaminda Silva', type: 'REP', target: 5000000, achieved: 4320000, remaining: 680000, achievement: 86.4, period: 'Oct 2026' },
  { name: 'Kelaniya', type: 'AREA', target: 7000000, achieved: 7820000, remaining: 0, achievement: 111.7, period: 'Oct 2026' },
  { name: 'Maharagama', type: 'AREA', target: 6500000, achieved: 5680000, remaining: 820000, achievement: 87.4, period: 'Oct 2026' },
  { name: 'Malabe', type: 'AREA', target: 5500000, achieved: 5120000, remaining: 380000, achievement: 93.1, period: 'Oct 2026' },
  { name: 'Kottawa', type: 'AREA', target: 4000000, achieved: 4280000, remaining: 0, achievement: 107.0, period: 'Oct 2026' },
];

export const TARGET_KPIS = { onTarget: 4, belowTarget: 4, avgAchievement: 99.0, monthlyTarget: 34000000 };

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

export const MOCK_CUSTOMER_SALES: CustomerSalesRow[] = [
  { code: 'DLR-COL-001', name: 'Lanka Electrical & Hardware Superstore', type: 'DEALER', area: 'Kelaniya', rep: 'Kasun Wickramasinghe', orders: 18, delivered: 16, revenue: 2940000, outstanding: 1450000, lastOrder: '2026-11-01' },
  { code: 'DLR-NEG-002', name: 'Muthurajawela Engineering Enterprises', type: 'DEALER', area: 'Maharagama', rep: 'Kasun Wickramasinghe', orders: 12, delivered: 11, revenue: 1680000, outstanding: 820000, lastOrder: '2026-11-02' },
  { code: 'RET-MLB-003', name: 'Malabe Power Traders', type: 'RETAILER', area: 'Malabe', rep: 'Nuwan Pradeep', orders: 9, delivered: 8, revenue: 980000, outstanding: 345000, lastOrder: '2026-11-03' },
  { code: 'DLR-KOT-004', name: 'Kottawa Switchgear Depot', type: 'DEALER', area: 'Kottawa', rep: 'Dinesh Rathnayake', orders: 15, delivered: 13, revenue: 2210000, outstanding: 980000, lastOrder: '2026-11-03' },
  { code: 'RET-COL-005', name: 'City Electrics Pvt Ltd', type: 'RETAILER', area: 'Kelaniya', rep: 'Kasun Wickramasinghe', orders: 7, delivered: 7, revenue: 760000, outstanding: 210000, lastOrder: '2026-11-04' },
  { code: 'DLR-GAM-006', name: 'Negombo Electrical Hub', type: 'DEALER', area: 'Gampaha', rep: 'Chaminda Silva', orders: 11, delivered: 9, revenue: 1420000, outstanding: 680000, lastOrder: '2026-10-30' },
  { code: 'RET-COL-007', name: 'TechBuild Solutions', type: 'RETAILER', area: 'Malabe', rep: 'Nuwan Pradeep', orders: 6, delivered: 6, revenue: 840000, outstanding: 290000, lastOrder: '2026-11-05' },
  { code: 'DLR-MLB-008', name: 'Colombo Industrial Supply', type: 'DEALER', area: 'Kelaniya', rep: 'Kasun Wickramasinghe', orders: 14, delivered: 12, revenue: 1950000, outstanding: 740000, lastOrder: '2026-10-28' },
];

export const CUSTOMER_KPIS = { totalCustomers: 8, activeCustomers: 8, totalRevenue: 12780000, avgOrderValue: 141600 };

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

export const MOCK_PRODUCT_SALES: ProductSalesRow[] = [
  { sku: 'DNS-MCB-32A-2P', name: 'Schneider Acti9 32A Double Pole MCB', category: 'Switchgear', qtySold: 840, revenue: 2730000, avgPrice: 3250, returnQty: 12 },
  { sku: 'DNS-MCB-63A-3P', name: 'Schneider Acti9 63A Triple Pole MCB', category: 'Switchgear', qtySold: 420, revenue: 3528000, avgPrice: 8400, returnQty: 6 },
  { sku: 'DNS-RCCB-25A-2P', name: 'Schneider iID 25A 2P 30mA RCCB', category: 'Switchgear', qtySold: 310, revenue: 1457000, avgPrice: 4700, returnQty: 4 },
  { sku: 'DNS-CABLE-4SQ', name: '4mm² PVC Copper Cable (per metre)', category: 'Cables', qtySold: 12400, revenue: 1364000, avgPrice: 110, returnQty: 0 },
  { sku: 'DNS-DB-8WAY', name: 'Hager 8-Way Consumer Unit', category: 'Distribution Boards', qtySold: 180, revenue: 2016000, avgPrice: 11200, returnQty: 2 },
  { sku: 'DNS-CONTACTOR-25A', name: 'Schneider LC1D25 25A AC Contactor', category: 'Control Gear', qtySold: 95, revenue: 741000, avgPrice: 7800, returnQty: 1 },
  { sku: 'DNS-VFD-2.2KW', name: 'ABB ACS355 2.2kW Variable Frequency Drive', category: 'Automation', qtySold: 48, revenue: 1584000, avgPrice: 33000, returnQty: 0 },
  { sku: 'DNS-SURGE-4P', name: '4-Pole Type 2 Surge Protection Device', category: 'Protection', qtySold: 72, revenue: 576000, avgPrice: 8000, returnQty: 1 },
  { sku: 'DNS-TIMER-DIN', name: 'DIN Rail Digital Timer Switch 16A', category: 'Control Gear', qtySold: 136, revenue: 408000, avgPrice: 3000, returnQty: 3 },
  { sku: 'DNS-LED-50W', name: '50W LED Flood Light (IP65)', category: 'Lighting', qtySold: 220, revenue: 572000, avgPrice: 2600, returnQty: 8 },
];

export const PRODUCT_KPIS = { totalSKUs: 10, topProduct: 'Schneider Acti9 63A Triple Pole MCB', totalRevenue: 14976000, totalQtySold: 14725 };

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

export const MOCK_COLLECTIONS: CollectionRow[] = [
  { receiptNo: 'REC-2026-0541', date: '2026-11-01', customer: 'Lanka Electrical & Hardware', rep: 'Kasun Wickramasinghe', area: 'Kelaniya', method: 'CHEQUE', amount: 600000, status: 'CLEARED' },
  { receiptNo: 'REC-2026-0542', date: '2026-11-02', customer: 'Muthurajawela Engineering', rep: 'Kasun Wickramasinghe', area: 'Maharagama', method: 'BANK_TRANSFER', amount: 250000, status: 'CLEARED' },
  { receiptNo: 'REC-2026-0543', date: '2026-11-03', customer: 'Kottawa Switchgear Depot', rep: 'Dinesh Rathnayake', area: 'Kottawa', method: 'CASH', amount: 180000, status: 'PENDING' },
  { receiptNo: 'REC-2026-0544', date: '2026-11-03', customer: 'Malabe Power Traders', rep: 'Nuwan Pradeep', area: 'Malabe', method: 'CHEQUE', amount: 320000, status: 'PENDING' },
  { receiptNo: 'REC-2026-0545', date: '2026-11-04', customer: 'Colombo Industrial Supply', rep: 'Kasun Wickramasinghe', area: 'Kelaniya', method: 'BANK_TRANSFER', amount: 480000, status: 'CLEARED' },
  { receiptNo: 'REC-2026-0546', date: '2026-11-04', customer: 'Negombo Electrical Hub', rep: 'Chaminda Silva', area: 'Gampaha', method: 'CHEQUE', amount: 215000, status: 'BOUNCED' },
  { receiptNo: 'REC-2026-0547', date: '2026-11-05', customer: 'City Electrics Pvt Ltd', rep: 'Kasun Wickramasinghe', area: 'Kelaniya', method: 'CASH', amount: 95000, status: 'PENDING' },
  { receiptNo: 'REC-2026-0548', date: '2026-10-31', customer: 'TechBuild Solutions', rep: 'Nuwan Pradeep', area: 'Malabe', method: 'BANK_TRANSFER', amount: 340000, status: 'CLEARED' },
  { receiptNo: 'REC-2026-0549', date: '2026-10-30', customer: 'Kottawa Builders Mart', rep: 'Dinesh Rathnayake', area: 'Kottawa', method: 'CHEQUE', amount: 420000, status: 'CLEARED' },
  { receiptNo: 'REC-2026-0550', date: '2026-10-29', customer: 'Lanka Electrical & Hardware', rep: 'Kasun Wickramasinghe', area: 'Kelaniya', method: 'CHEQUE', amount: 750000, status: 'CLEARED' },
];

export const COLLECTION_KPIS = { totalCollected: 3650000, cheque: 1985000, bankTransfer: 1070000, cash: 275000, bounced: 215000 };

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

export const MOCK_OUTSTANDING: OutstandingRow[] = [
  { invoiceNo: 'INV-2026-0921', customer: 'Lanka Electrical & Hardware', area: 'Kelaniya', invoiceDate: '2026-10-01', dueDate: '2026-10-31', invoiceAmount: 850000, paidAmount: 400000, outstanding: 450000, daysOverdue: 5, aging: '01–30 days' },
  { invoiceNo: 'INV-2026-0882', customer: 'Muthurajawela Engineering', area: 'Maharagama', invoiceDate: '2026-09-25', dueDate: '2026-10-10', invoiceAmount: 420000, paidAmount: 0, outstanding: 420000, daysOverdue: 26, aging: '01–30 days' },
  { invoiceNo: 'INV-2026-0834', customer: 'Kottawa Switchgear Depot', area: 'Kottawa', invoiceDate: '2026-09-05', dueDate: '2026-09-20', invoiceAmount: 980000, paidAmount: 500000, outstanding: 480000, daysOverdue: 46, aging: '31–60 days' },
  { invoiceNo: 'INV-2026-0812', customer: 'Negombo Electrical Hub', area: 'Gampaha', invoiceDate: '2026-08-28', dueDate: '2026-09-27', invoiceAmount: 680000, paidAmount: 0, outstanding: 680000, daysOverdue: 39, aging: '31–60 days' },
  { invoiceNo: 'INV-2026-0781', customer: 'Malabe Power Traders', area: 'Malabe', invoiceDate: '2026-08-10', dueDate: '2026-09-09', invoiceAmount: 345000, paidAmount: 0, outstanding: 345000, daysOverdue: 57, aging: '31–60 days' },
  { invoiceNo: 'INV-2026-0742', customer: 'City Electrics Pvt Ltd', area: 'Kelaniya', invoiceDate: '2026-07-15', dueDate: '2026-08-14', invoiceAmount: 210000, paidAmount: 0, outstanding: 210000, daysOverdue: 83, aging: '61–90 days' },
  { invoiceNo: 'INV-2026-0701', customer: 'Colombo Industrial Supply', area: 'Kelaniya', invoiceDate: '2026-07-01', dueDate: '2026-07-31', invoiceAmount: 740000, paidAmount: 500000, outstanding: 240000, daysOverdue: 97, aging: '90+ days' },
  { invoiceNo: 'INV-2026-0652', customer: 'TechBuild Solutions', area: 'Malabe', invoiceDate: '2026-06-15', dueDate: '2026-07-15', invoiceAmount: 290000, paidAmount: 0, outstanding: 290000, daysOverdue: 113, aging: '90+ days' },
];

export const OUTSTANDING_KPIS = { totalOutstanding: 3115000, current: 870000, overdue30: 1100000, overdue60: 240000, overduePlus90: 530000 };

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

export const MOCK_PROFITABILITY: ProfitRow[] = [
  { sku: 'DNS-MCB-32A-2P', name: 'Schneider Acti9 32A 2P MCB', category: 'Switchgear', qtySold: 840, revenue: 2730000, landedCost: 2050, cogs: 1722000, grossProfit: 1008000, margin: 36.9 },
  { sku: 'DNS-MCB-63A-3P', name: 'Schneider Acti9 63A 3P MCB', category: 'Switchgear', qtySold: 420, revenue: 3528000, landedCost: 5600, cogs: 2352000, grossProfit: 1176000, margin: 33.3 },
  { sku: 'DNS-RCCB-25A-2P', name: 'Schneider iID 25A RCCB', category: 'Switchgear', qtySold: 310, revenue: 1457000, landedCost: 2900, cogs: 899000, grossProfit: 558000, margin: 38.3 },
  { sku: 'DNS-DB-8WAY', name: 'Hager 8-Way Consumer Unit', category: 'Distribution Boards', qtySold: 180, revenue: 2016000, landedCost: 7200, cogs: 1296000, grossProfit: 720000, margin: 35.7 },
  { sku: 'DNS-VFD-2.2KW', name: 'ABB ACS355 2.2kW VFD', category: 'Automation', qtySold: 48, revenue: 1584000, landedCost: 22000, cogs: 1056000, grossProfit: 528000, margin: 33.3 },
  { sku: 'DNS-CABLE-4SQ', name: '4mm² PVC Copper Cable', category: 'Cables', qtySold: 12400, revenue: 1364000, landedCost: 78, cogs: 967200, grossProfit: 396800, margin: 29.1 },
  { sku: 'DNS-CONTACTOR-25A', name: 'Schneider LC1D25 Contactor', category: 'Control Gear', qtySold: 95, revenue: 741000, landedCost: 4800, cogs: 456000, grossProfit: 285000, margin: 38.5 },
  { sku: 'DNS-LED-50W', name: '50W LED Flood Light (IP65)', category: 'Lighting', qtySold: 220, revenue: 572000, landedCost: 1700, cogs: 374000, grossProfit: 198000, margin: 34.6 },
];

export const PROFIT_KPIS = { totalRevenue: 13992000, totalCOGS: 9122200, grossProfit: 4869800, avgMargin: 34.8 };

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

export const MOCK_SHOWROOM_SALES: ShowroomRow[] = [
  { date: '2026-11-05', txnRef: 'POS-2026-1241', cashier: 'Chathura Alwis', items: 4, cash: 12500, card: 0, cheque: 0, total: 12500 },
  { date: '2026-11-05', txnRef: 'POS-2026-1242', cashier: 'Chathura Alwis', items: 2, cash: 0, card: 8400, cheque: 0, total: 8400 },
  { date: '2026-11-04', txnRef: 'POS-2026-1230', cashier: 'Chathura Alwis', items: 6, cash: 24000, card: 0, cheque: 0, total: 24000 },
  { date: '2026-11-04', txnRef: 'POS-2026-1231', cashier: 'Chathura Alwis', items: 1, cash: 0, card: 0, cheque: 33000, total: 33000 },
  { date: '2026-11-03', txnRef: 'POS-2026-1218', cashier: 'Chathura Alwis', items: 3, cash: 9600, card: 11200, cheque: 0, total: 20800 },
  { date: '2026-11-03', txnRef: 'POS-2026-1219', cashier: 'Chathura Alwis', items: 2, cash: 0, card: 16800, cheque: 0, total: 16800 },
  { date: '2026-11-02', txnRef: 'POS-2026-1205', cashier: 'Chathura Alwis', items: 5, cash: 18000, card: 0, cheque: 0, total: 18000 },
  { date: '2026-11-02', txnRef: 'POS-2026-1206', cashier: 'Chathura Alwis', items: 2, cash: 0, card: 7200, cheque: 0, total: 7200 },
  { date: '2026-11-01', txnRef: 'POS-2026-1190', cashier: 'Chathura Alwis', items: 4, cash: 14400, card: 0, cheque: 0, total: 14400 },
  { date: '2026-11-01', txnRef: 'POS-2026-1191', cashier: 'Chathura Alwis', items: 3, cash: 0, card: 22500, cheque: 0, total: 22500 },
  { date: '2026-10-31', txnRef: 'POS-2026-1178', cashier: 'Chathura Alwis', items: 7, cash: 32000, card: 0, cheque: 0, total: 32000 },
  { date: '2026-10-30', txnRef: 'POS-2026-1162', cashier: 'Chathura Alwis', items: 2, cash: 0, card: 11200, cheque: 0, total: 11200 },
];

export const SHOWROOM_KPIS = { totalSales: 220800, totalTxns: 12, cash: 110500, card: 77300, cheque: 33000, avgTxn: 18400 };

// ─── PURCHASING MOCK DATA ──────────────────────────────────────────────────────

export interface PORow {
  poNumber: string;
  supplier: string;
  date: string;
  expectedDelivery: string;
  amount: number;
  status: string;
}

export const MOCK_PO_LIST: PORow[] = [
  { poNumber: 'PO-2026-0001', supplier: 'DNS Global Logistics & Electronics Ltd', date: '2026-10-25', expectedDelivery: '2026-11-05', amount: 194250, status: 'DRAFT' },
  { poNumber: 'PO-2026-0002', supplier: 'Apex International Importers', date: '2026-10-26', expectedDelivery: '2026-11-08', amount: 342800, status: 'PENDING_APPROVAL' },
  { poNumber: 'PO-2026-0003', supplier: 'Schneider Electric Lanka', date: '2026-10-20', expectedDelivery: '2026-11-01', amount: 1250000, status: 'APPROVED' },
  { poNumber: 'PO-2026-0004', supplier: 'ABB Lanka Pvt Ltd', date: '2026-10-18', expectedDelivery: '2026-10-30', amount: 876500, status: 'RECEIVED' },
  { poNumber: 'PO-2026-0005', supplier: 'Hager Electro Lanka', date: '2026-10-15', expectedDelivery: '2026-10-28', amount: 420000, status: 'RECEIVED' },
  { poNumber: 'PO-2026-0006', supplier: 'Nexans Cable Lanka', date: '2026-10-10', expectedDelivery: '2026-10-22', amount: 680000, status: 'RECEIVED' },
  { poNumber: 'PO-2026-0007', supplier: 'DNS Global Logistics & Electronics Ltd', date: '2026-10-05', expectedDelivery: '2026-10-18', amount: 528000, status: 'CANCELLED' },
  { poNumber: 'PO-2026-0008', supplier: 'Apex International Importers', date: '2026-09-28', expectedDelivery: '2026-10-10', amount: 290000, status: 'RECEIVED' },
  { poNumber: 'PO-2026-0009', supplier: 'Schneider Electric Lanka', date: '2026-09-20', expectedDelivery: '2026-10-02', amount: 1850000, status: 'RECEIVED' },
  { poNumber: 'PO-2026-0010', supplier: 'ABB Lanka Pvt Ltd', date: '2026-09-15', expectedDelivery: '2026-09-28', amount: 740000, status: 'REJECTED' },
];

export const PO_STATUS_COUNTS = { DRAFT: 1, PENDING_APPROVAL: 1, APPROVED: 1, RECEIVED: 5, CANCELLED: 1, REJECTED: 1 };
export const PO_KPIS = { totalPOs: 10, totalValue: 7171550, pendingValue: 537050, receivedValue: 4584500 };

// ─── Purchase Summary ──────────────────────────────────────────────────────────

export interface PurchaseSummaryRow {
  period: string;
  poCount: number;
  received: number;
  value: number;
  avgPOValue: number;
}

export const MOCK_PURCHASE_SUMMARY: PurchaseSummaryRow[] = [
  { period: 'Oct 2026', poCount: 8, received: 5, value: 4584500, avgPOValue: 573063 },
  { period: 'Sep 2026', poCount: 6, received: 6, value: 3920000, avgPOValue: 653333 },
  { period: 'Aug 2026', poCount: 9, received: 8, value: 5240000, avgPOValue: 582222 },
  { period: 'Jul 2026', poCount: 7, received: 7, value: 4180000, avgPOValue: 597143 },
  { period: 'Jun 2026', poCount: 5, received: 5, value: 3350000, avgPOValue: 670000 },
  { period: 'May 2026', poCount: 8, received: 7, value: 4820000, avgPOValue: 602500 },
];

export const PURCHASE_SUMMARY_KPIS = { totalValue: 26094500, totalPOs: 43, totalReceived: 38, avgMonthly: 4349083 };

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

export const MOCK_SUPPLIER_PURCHASE: SupplierPurchaseRow[] = [
  { supplierCode: 'SUP-001', supplierName: 'DNS Global Logistics & Electronics Ltd', country: 'Sri Lanka', poCount: 12, received: 10, totalValue: 6840000, avgLead: 12, lastOrder: '2026-10-25' },
  { supplierCode: 'SUP-002', supplierName: 'Apex International Importers', country: 'Sri Lanka', poCount: 8, received: 7, totalValue: 2630000, avgLead: 14, lastOrder: '2026-10-26' },
  { supplierCode: 'SUP-003', supplierName: 'Schneider Electric Lanka', country: 'Sri Lanka', poCount: 6, received: 6, totalValue: 7200000, avgLead: 10, lastOrder: '2026-10-20' },
  { supplierCode: 'SUP-004', supplierName: 'ABB Lanka Pvt Ltd', country: 'Sri Lanka', poCount: 7, received: 6, totalValue: 4850000, avgLead: 11, lastOrder: '2026-10-18' },
  { supplierCode: 'SUP-005', supplierName: 'Hager Electro Lanka', country: 'Sri Lanka', poCount: 4, received: 4, totalValue: 1680000, avgLead: 13, lastOrder: '2026-10-15' },
  { supplierCode: 'SUP-006', supplierName: 'Nexans Cable Lanka', country: 'Sri Lanka', poCount: 6, received: 5, totalValue: 2894500, avgLead: 12, lastOrder: '2026-10-10' },
];

export const SUPPLIER_KPIS = { totalSuppliers: 6, topSupplier: 'Schneider Electric Lanka', totalSpend: 26094500, avgLead: 12 };

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

export const MOCK_GRN: GRNRow[] = [
  { grnNumber: 'GRN-2026-0041', poNumber: 'PO-2026-0004', supplier: 'ABB Lanka Pvt Ltd', receivedDate: '2026-10-30', items: 4, value: 876500, status: 'APPROVED', receivedBy: 'Gamini Silva' },
  { grnNumber: 'GRN-2026-0040', poNumber: 'PO-2026-0005', supplier: 'Hager Electro Lanka', receivedDate: '2026-10-28', items: 3, value: 420000, status: 'APPROVED', receivedBy: 'Gamini Silva' },
  { grnNumber: 'GRN-2026-0039', poNumber: 'PO-2026-0006', supplier: 'Nexans Cable Lanka', receivedDate: '2026-10-22', items: 2, value: 680000, status: 'APPROVED', receivedBy: 'Gamini Silva' },
  { grnNumber: 'GRN-2026-0038', poNumber: 'PO-2026-0008', supplier: 'Apex International Importers', receivedDate: '2026-10-10', items: 5, value: 290000, status: 'APPROVED', receivedBy: 'Gamini Silva' },
  { grnNumber: 'GRN-2026-0037', poNumber: 'PO-2026-0009', supplier: 'Schneider Electric Lanka', receivedDate: '2026-10-02', items: 8, value: 1850000, status: 'APPROVED', receivedBy: 'Gamini Silva' },
  { grnNumber: 'GRN-2026-0036', poNumber: 'PO-2025-0092', supplier: 'DNS Global Logistics & Electronics Ltd', receivedDate: '2026-09-28', items: 6, value: 940000, status: 'APPROVED', receivedBy: 'Gamini Silva' },
  { grnNumber: 'GRN-2026-0035', poNumber: 'PO-2025-0089', supplier: 'ABB Lanka Pvt Ltd', receivedDate: '2026-09-18', items: 3, value: 580000, status: 'SUBMITTED', receivedBy: 'Gamini Silva' },
  { grnNumber: 'GRN-2026-0034', poNumber: 'PO-2026-0003', supplier: 'Schneider Electric Lanka', receivedDate: '2026-11-01', items: 10, value: 1250000, status: 'SUBMITTED', receivedBy: 'Gamini Silva' },
];

export const GRN_KPIS = { totalGRNs: 8, approved: 6, submitted: 2, totalValue: 6886500 };

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

export const MOCK_PURCHASE_RETURNS: PurchaseReturnRow[] = [
  { returnRef: 'PRN-2026-001', grnRef: 'GRN-2026-0032', supplier: 'Apex International Importers', date: '2026-10-14', reason: 'Damaged packaging on delivery', qty: 10, value: 42000, status: 'APPROVED' },
  { returnRef: 'PRN-2026-002', grnRef: 'GRN-2026-0035', supplier: 'ABB Lanka Pvt Ltd', date: '2026-09-20', reason: 'Non-conforming specifications', qty: 5, value: 29000, status: 'PENDING' },
  { returnRef: 'PRN-2026-003', grnRef: 'GRN-2026-0030', supplier: 'Hager Electro Lanka', date: '2026-09-10', reason: 'Incorrect product supplied', qty: 8, value: 56000, status: 'APPROVED' },
  { returnRef: 'PRN-2026-004', grnRef: 'GRN-2026-0028', supplier: 'Nexans Cable Lanka', date: '2026-09-02', reason: 'Short shipment – missing items', qty: 50, value: 15000, status: 'APPROVED' },
];

export const RETURNS_KPIS = { totalReturns: 4, totalValue: 142000, approved: 3, pending: 1 };

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

export const MOCK_COST_ANALYSIS: CostAnalysisRow[] = [
  { sku: 'DNS-MCB-32A-2P', name: 'Schneider Acti9 32A 2P MCB', category: 'Switchgear', supplier: 'Schneider Electric Lanka', avgPurchasePrice: 1950, landedCost: 2050, sellingPrice: 3250, margin: 36.9, lastPurchase: '2026-10-20' },
  { sku: 'DNS-MCB-63A-3P', name: 'Schneider Acti9 63A 3P MCB', category: 'Switchgear', supplier: 'Schneider Electric Lanka', avgPurchasePrice: 5300, landedCost: 5600, sellingPrice: 8400, margin: 33.3, lastPurchase: '2026-10-20' },
  { sku: 'DNS-DB-8WAY', name: 'Hager 8-Way Consumer Unit', category: 'Distribution Boards', supplier: 'Hager Electro Lanka', avgPurchasePrice: 6800, landedCost: 7200, sellingPrice: 11200, margin: 35.7, lastPurchase: '2026-10-28' },
  { sku: 'DNS-VFD-2.2KW', name: 'ABB ACS355 2.2kW VFD', category: 'Automation', supplier: 'ABB Lanka Pvt Ltd', avgPurchasePrice: 20800, landedCost: 22000, sellingPrice: 33000, margin: 33.3, lastPurchase: '2026-10-30' },
  { sku: 'DNS-CABLE-4SQ', name: '4mm² PVC Copper Cable', category: 'Cables', supplier: 'Nexans Cable Lanka', avgPurchasePrice: 74, landedCost: 78, sellingPrice: 110, margin: 29.1, lastPurchase: '2026-10-22' },
  { sku: 'DNS-RCCB-25A-2P', name: 'Schneider iID 25A RCCB', category: 'Switchgear', supplier: 'Schneider Electric Lanka', avgPurchasePrice: 2750, landedCost: 2900, sellingPrice: 4700, margin: 38.3, lastPurchase: '2026-10-20' },
];

export const COST_KPIS = { avgMargin: 34.4, highestMargin: 'Schneider iID 25A RCCB (38.3%)', lowestMargin: '4mm² PVC Cable (29.1%)', totalSKUs: 6 };

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

export const MOCK_SUPPLIER_PAYMENTS: SupplierPaymentRow[] = [
  { paymentRef: 'SPY-2026-001', supplier: 'Schneider Electric Lanka', date: '2026-10-25', method: 'BANK_TRANSFER', poRef: 'PO-2026-0003', amount: 1250000, status: 'PAID' },
  { paymentRef: 'SPY-2026-002', supplier: 'ABB Lanka Pvt Ltd', date: '2026-11-02', method: 'CHEQUE', poRef: 'PO-2026-0004', amount: 876500, status: 'PAID' },
  { paymentRef: 'SPY-2026-003', supplier: 'Hager Electro Lanka', date: '2026-11-03', method: 'BANK_TRANSFER', poRef: 'PO-2026-0005', amount: 420000, status: 'PAID' },
  { paymentRef: 'SPY-2026-004', supplier: 'Nexans Cable Lanka', date: '2026-11-04', method: 'BANK_TRANSFER', poRef: 'PO-2026-0006', amount: 680000, status: 'PAID' },
  { paymentRef: 'SPY-2026-005', supplier: 'Apex International Importers', date: '2026-11-05', method: 'CHEQUE', poRef: 'PO-2026-0008', amount: 290000, status: 'PENDING' },
  { paymentRef: 'SPY-2026-006', supplier: 'DNS Global Logistics & Electronics Ltd', date: '2026-11-05', method: 'BANK_TRANSFER', poRef: 'PO-2026-0009', amount: 1850000, status: 'PENDING' },
];

export const SUPPLIER_PAYMENT_KPIS = { totalPaid: 3226500, totalPending: 2140000, totalPayments: 6, avgPayment: 894417 };

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

export const MOCK_PURCHASE_OUTSTANDING: PurchaseOutstandingRow[] = [
  { invoiceRef: 'SINV-2026-0041', supplier: 'DNS Global Logistics & Electronics Ltd', invoiceDate: '2026-10-25', dueDate: '2026-11-24', amount: 194250, paid: 0, outstanding: 194250, daysOverdue: 0 },
  { invoiceRef: 'SINV-2026-0040', supplier: 'Apex International Importers', invoiceDate: '2026-10-26', dueDate: '2026-11-10', amount: 342800, paid: 0, outstanding: 342800, daysOverdue: 0 },
  { invoiceRef: 'SINV-2026-0039', supplier: 'Schneider Electric Lanka', invoiceDate: '2026-10-20', dueDate: '2026-11-19', amount: 1250000, paid: 1250000, outstanding: 0, daysOverdue: 0 },
  { invoiceRef: 'SINV-2026-0038', supplier: 'DNS Global Logistics & Electronics Ltd', invoiceDate: '2026-09-25', dueDate: '2026-10-25', amount: 528000, paid: 0, outstanding: 528000, daysOverdue: 11 },
  { invoiceRef: 'SINV-2026-0037', supplier: 'ABB Lanka Pvt Ltd', invoiceDate: '2026-09-15', dueDate: '2026-10-15', amount: 740000, paid: 0, outstanding: 740000, daysOverdue: 21 },
];

export const PURCHASE_OUTSTANDING_KPIS = { totalOutstanding: 1805050, overdue: 1268000, current: 537050, totalInvoices: 5 };

// ─── INVENTORY MOCK DATA ───────────────────────────────────────────────────────

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

export const MOCK_STOCK_SUMMARY: StockSummaryRow[] = [
  { sku: 'DNS-MCB-32A-2P', name: 'Schneider Acti9 32A 2P MCB', category: 'Switchgear', warehouse: 380, showroom: 46, reserved: 30, damaged: 4, available: 392, reorderLevel: 100, status: 'OK' },
  { sku: 'DNS-MCB-63A-3P', name: 'Schneider Acti9 63A 3P MCB', category: 'Switchgear', warehouse: 140, showroom: 28, reserved: 10, damaged: 1, available: 157, reorderLevel: 50, status: 'OK' },
  { sku: 'DNS-RCCB-25A-2P', name: 'Schneider iID 25A RCCB', category: 'Switchgear', warehouse: 72, showroom: 12, reserved: 5, damaged: 0, available: 79, reorderLevel: 40, status: 'OK' },
  { sku: 'DNS-CABLE-4SQ', name: '4mm² PVC Copper Cable', category: 'Cables', warehouse: 8200, showroom: 1200, reserved: 500, damaged: 0, available: 8900, reorderLevel: 2000, status: 'OK' },
  { sku: 'DNS-DB-8WAY', name: 'Hager 8-Way Consumer Unit', category: 'Distribution Boards', warehouse: 28, showroom: 5, reserved: 2, damaged: 0, available: 31, reorderLevel: 20, status: 'LOW' },
  { sku: 'DNS-CONTACTOR-25A', name: 'Schneider LC1D25 Contactor', category: 'Control Gear', warehouse: 45, showroom: 8, reserved: 3, damaged: 0, available: 50, reorderLevel: 25, status: 'OK' },
  { sku: 'DNS-VFD-2.2KW', name: 'ABB ACS355 2.2kW VFD', category: 'Automation', warehouse: 12, showroom: 2, reserved: 0, damaged: 0, available: 14, reorderLevel: 15, status: 'LOW' },
  { sku: 'DNS-SURGE-4P', name: '4-Pole Type 2 SPD', category: 'Protection', warehouse: 38, showroom: 6, reserved: 0, damaged: 0, available: 44, reorderLevel: 20, status: 'OK' },
  { sku: 'DNS-TIMER-DIN', name: 'DIN Rail Digital Timer 16A', category: 'Control Gear', warehouse: 85, showroom: 15, reserved: 5, damaged: 2, available: 93, reorderLevel: 30, status: 'OK' },
  { sku: 'DNS-LED-50W', name: '50W LED Flood Light (IP65)', category: 'Lighting', warehouse: 8, showroom: 4, reserved: 0, damaged: 0, available: 12, reorderLevel: 30, status: 'CRITICAL' },
  { sku: 'DNS-MCB-16A-1P', name: 'Schneider Acti9 16A 1P MCB', category: 'Switchgear', warehouse: 520, showroom: 65, reserved: 40, damaged: 2, available: 543, reorderLevel: 150, status: 'OK' },
  { sku: 'DNS-ELB-100A', name: 'ABB 100A Earth Leakage Breaker', category: 'Switchgear', warehouse: 18, showroom: 3, reserved: 0, damaged: 0, available: 21, reorderLevel: 25, status: 'LOW' },
];

export const STOCK_KPIS = { totalSKUs: 12, lowStock: 3, criticalStock: 1, totalWarehouse: 9546, totalShowroom: 1394 };

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

export const MOCK_STOCK_MOVEMENTS: StockMovementRow[] = [
  { date: '2026-11-05', movementType: 'OUT', sku: 'DNS-MCB-32A-2P', name: 'Schneider Acti9 32A 2P MCB', qty: 10, from: 'WH-MAIN', to: 'DISPATCH', reference: 'DN-2026-01241', handledBy: 'Gamini Silva' },
  { date: '2026-11-04', movementType: 'IN', sku: 'DNS-MCB-63A-3P', name: 'Schneider Acti9 63A 3P MCB', qty: 50, from: 'SUPPLIER', to: 'WH-MAIN', reference: 'GRN-2026-0041', handledBy: 'Gamini Silva' },
  { date: '2026-11-04', movementType: 'OUT', sku: 'DNS-DB-8WAY', name: 'Hager 8-Way Consumer Unit', qty: 5, from: 'WH-MAIN', to: 'DISPATCH', reference: 'DN-2026-01238', handledBy: 'Gamini Silva' },
  { date: '2026-11-03', movementType: 'TRANSFER', sku: 'DNS-MCB-32A-2P', name: 'Schneider Acti9 32A 2P MCB', qty: 20, from: 'WH-MAIN', to: 'SR-MAIN', reference: 'TRF-2026-0082', handledBy: 'Gamini Silva' },
  { date: '2026-11-03', movementType: 'OUT', sku: 'DNS-CABLE-4SQ', name: '4mm² PVC Copper Cable', qty: 1200, from: 'WH-MAIN', to: 'DISPATCH', reference: 'DN-2026-01231', handledBy: 'Gamini Silva' },
  { date: '2026-11-02', movementType: 'IN', sku: 'DNS-VFD-2.2KW', name: 'ABB ACS355 2.2kW VFD', qty: 10, from: 'SUPPLIER', to: 'WH-MAIN', reference: 'GRN-2026-0040', handledBy: 'Gamini Silva' },
  { date: '2026-11-02', movementType: 'ADJUSTMENT', sku: 'DNS-LED-50W', name: '50W LED Flood Light', qty: -3, from: 'WH-MAIN', to: 'DAMAGED', reference: 'ADJ-2026-0021', handledBy: 'Bandara Jayasinghe' },
  { date: '2026-11-01', movementType: 'OUT', sku: 'DNS-RCCB-25A-2P', name: 'Schneider iID 25A RCCB', qty: 15, from: 'WH-MAIN', to: 'DISPATCH', reference: 'DN-2026-01220', handledBy: 'Gamini Silva' },
  { date: '2026-11-01', movementType: 'IN', sku: 'DNS-CABLE-4SQ', name: '4mm² PVC Copper Cable', qty: 5000, from: 'SUPPLIER', to: 'WH-MAIN', reference: 'GRN-2026-0039', handledBy: 'Gamini Silva' },
  { date: '2026-10-31', movementType: 'OUT', sku: 'DNS-CONTACTOR-25A', name: 'Schneider LC1D25 Contactor', qty: 8, from: 'WH-MAIN', to: 'DISPATCH', reference: 'DN-2026-01208', handledBy: 'Gamini Silva' },
  { date: '2026-10-30', movementType: 'TRANSFER', sku: 'DNS-TIMER-DIN', name: 'DIN Rail Timer 16A', qty: 25, from: 'WH-MAIN', to: 'SR-MAIN', reference: 'TRF-2026-0079', handledBy: 'Gamini Silva' },
  { date: '2026-10-30', movementType: 'IN', sku: 'DNS-SURGE-4P', name: '4-Pole Type 2 SPD', qty: 30, from: 'SUPPLIER', to: 'WH-MAIN', reference: 'GRN-2026-0038', handledBy: 'Gamini Silva' },
];

export const MOVEMENT_KPIS = { totalIn: 3, totalOut: 5, transfers: 2, adjustments: 1, totalMovements: 12 };

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

export const MOCK_STOCK_VALUATION: ValuationRow[] = [
  { sku: 'DNS-MCB-32A-2P', name: 'Schneider Acti9 32A 2P MCB', category: 'Switchgear', totalQty: 426, landedCost: 2050, totalValue: 873300, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-MCB-63A-3P', name: 'Schneider Acti9 63A 3P MCB', category: 'Switchgear', totalQty: 168, landedCost: 5600, totalValue: 940800, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-RCCB-25A-2P', name: 'Schneider iID 25A RCCB', category: 'Switchgear', totalQty: 84, landedCost: 2900, totalValue: 243600, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-CABLE-4SQ', name: '4mm² PVC Copper Cable', category: 'Cables', totalQty: 9400, landedCost: 78, totalValue: 733200, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-DB-8WAY', name: 'Hager 8-Way Consumer Unit', category: 'Distribution Boards', totalQty: 33, landedCost: 7200, totalValue: 237600, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-CONTACTOR-25A', name: 'Schneider LC1D25 Contactor', category: 'Control Gear', totalQty: 53, landedCost: 4800, totalValue: 254400, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-VFD-2.2KW', name: 'ABB ACS355 2.2kW VFD', category: 'Automation', totalQty: 14, landedCost: 22000, totalValue: 308000, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-SURGE-4P', name: '4-Pole Type 2 SPD', category: 'Protection', totalQty: 44, landedCost: 8000, totalValue: 352000, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-TIMER-DIN', name: 'DIN Rail Digital Timer 16A', category: 'Control Gear', totalQty: 100, landedCost: 1950, totalValue: 195000, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-LED-50W', name: '50W LED Flood Light (IP65)', category: 'Lighting', totalQty: 12, landedCost: 1700, totalValue: 20400, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-MCB-16A-1P', name: 'Schneider Acti9 16A 1P MCB', category: 'Switchgear', totalQty: 585, landedCost: 1200, totalValue: 702000, location: 'WH-MAIN + SR-MAIN' },
  { sku: 'DNS-ELB-100A', name: 'ABB 100A Earth Leakage Breaker', category: 'Switchgear', totalQty: 21, landedCost: 14500, totalValue: 304500, location: 'WH-MAIN + SR-MAIN' },
];

export const VALUATION_KPIS = { totalInventoryValue: 5164800, warehouseValue: 4750000, showroomValue: 414800, totalSKUs: 12 };

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

export const MOCK_LOW_STOCK: LowStockRow[] = [
  { sku: 'DNS-LED-50W', name: '50W LED Flood Light (IP65)', category: 'Lighting', currentQty: 12, reorderLevel: 30, reorderQty: 100, status: 'CRITICAL', supplier: 'Apex International Importers', avgLeadDays: 14 },
  { sku: 'DNS-VFD-2.2KW', name: 'ABB ACS355 2.2kW VFD', category: 'Automation', currentQty: 14, reorderLevel: 15, reorderQty: 20, status: 'LOW', supplier: 'ABB Lanka Pvt Ltd', avgLeadDays: 11 },
  { sku: 'DNS-DB-8WAY', name: 'Hager 8-Way Consumer Unit', category: 'Distribution Boards', currentQty: 31, reorderLevel: 20, reorderQty: 50, status: 'LOW', supplier: 'Hager Electro Lanka', avgLeadDays: 13 },
  { sku: 'DNS-ELB-100A', name: 'ABB 100A Earth Leakage Breaker', category: 'Switchgear', currentQty: 21, reorderLevel: 25, reorderQty: 30, status: 'LOW', supplier: 'ABB Lanka Pvt Ltd', avgLeadDays: 11 },
];

export const LOW_STOCK_KPIS = { critical: 1, low: 3, totalItems: 4, requireImmediate: 1 };

