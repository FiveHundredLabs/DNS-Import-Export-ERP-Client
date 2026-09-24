import { productService, ProductService } from './ProductService';
import { customerService, CustomerService } from './CustomerService';
import { orderService, OrderService } from './OrderService';
import { invoiceService, InvoiceService } from './InvoiceService';
import { paymentService, PaymentService } from './PaymentService';
import { inventoryService, InventoryService } from './InventoryService';
import { posService, POSService } from './POSService';
import { commissionService, CommissionService } from './CommissionService';
import { User } from '../types/auth';
import {
  ReportFilter,
  SalesSummaryReport,
  InventoryReport,
  FinanceReport,
  ExecutiveKpiSummary,
  AreaPerformanceReport,
  RepPerformanceSummary,
  CustomerSalesSummary,
  AgingBucket,
  CollectionByMethod,
  DamagedStockItemSummary,
  FastMovingProduct,
} from '../types/reports';
import { MOCK_AREAS } from '../mock/mockAreas';
import { MOCK_USERS } from '../mock/mockUsers';

export class ReportService {
  constructor(
    private productSvc: ProductService = productService,
    private customerSvc: CustomerService = customerService,
    private orderSvc: OrderService = orderService,
    private invoiceSvc: InvoiceService = invoiceService,
    private paymentSvc: PaymentService = paymentService,
    private inventorySvc: InventoryService = inventoryService,
    private posSvc: POSService = posService,
    private commissionSvc: CommissionService = commissionService
  ) {}

  /**
   * Resolves the effective filter by enforcing role-aware territory and portfolio scoping rules:
   * - SALES_REP: Strictly restricted to own salesRepId.
   * - AREA_MANAGER: Strictly restricted to own assigned areaId.
   * - DIRECTOR / MANAGER / SALES_MANAGER / FINANCE_MANAGER: Allowed organization-wide scoping with optional filters.
   */
  private resolveEffectiveFilter(user: User, filter?: ReportFilter): ReportFilter {
    const effective: ReportFilter = { ...filter };

    if (user.role === 'SALES_REP') {
      effective.salesRepId = user.id;
      if (user.areaId) {
        effective.areaId = user.areaId;
      }
    } else if (user.role === 'AREA_MANAGER') {
      if (user.areaId) {
        effective.areaId = user.areaId;
      }
    }

    return effective;
  }

  /**
   * Returns executive summary KPI metrics, respecting the user's role scope.
   */
  async getExecutiveKpis(user: User, filter?: ReportFilter): Promise<ExecutiveKpiSummary> {
    const [salesReport, financeReport, inventoryReport, customerResult, orderResult] = await Promise.all([
      this.getSalesReport(user, filter),
      this.getFinanceReport(user, filter),
      this.getInventoryReport(user, filter),
      this.customerSvc.listCustomers({ pageSize: 10000 }),
      this.orderSvc.listOrders({ pageSize: 10000 }),
    ]);

    const effective = this.resolveEffectiveFilter(user, filter);

    // Filter customers in scope
    let scopedCustomers = customerResult.data;
    if (effective.areaId) {
      scopedCustomers = scopedCustomers.filter((c) => c.areaId === effective.areaId);
    }
    if (effective.salesRepId) {
      scopedCustomers = scopedCustomers.filter((c) => c.assignedRepId === effective.salesRepId);
    }
    if (effective.customerId) {
      scopedCustomers = scopedCustomers.filter((c) => c.id === effective.customerId);
    }
    const activeCustomersCount = scopedCustomers.filter((c) => c.status === 'ACTIVE').length;

    // Filter orders in scope
    let scopedOrders = orderResult.data;
    if (effective.salesRepId) {
      scopedOrders = scopedOrders.filter((o) => o.salesRepId === effective.salesRepId);
    }
    if (effective.customerId) {
      scopedOrders = scopedOrders.filter((o) => o.customerId === effective.customerId);
    }
    if (effective.startDate) {
      scopedOrders = scopedOrders.filter((o) => (o.orderDate || o.createdAt.slice(0, 10)) >= effective.startDate!);
    }
    if (effective.endDate) {
      scopedOrders = scopedOrders.filter((o) => (o.orderDate || o.createdAt.slice(0, 10)) <= effective.endDate!);
    }
    if (effective.areaId) {
      const custIdSet = new Set(scopedCustomers.map((c) => c.id));
      scopedOrders = scopedOrders.filter((o) => custIdSet.has(o.customerId));
    }

    return {
      grossRevenue: salesReport.totalSales,
      totalCollected: financeReport.totalCollections,
      totalOutstanding: financeReport.totalReceivables,
      totalOverdue: financeReport.overdue,
      totalInventoryValue: inventoryReport.totalStockValue,
      totalOrdersCount: scopedOrders.length,
      activeCustomersCount,
    };
  }

  /**
   * Aggregates invoice and POS sales with date, sales rep, product, and category breakdowns.
   * Single Source of Truth: Invoices from InvoiceService + POS from POSService.
   */
  async getSalesReport(user: User, filter?: ReportFilter): Promise<SalesSummaryReport> {
    const effective = this.resolveEffectiveFilter(user, filter);

    const [invoicesResult, posTransactions, customersResult, productsResult] = await Promise.all([
      this.invoiceSvc.getInvoices({ pageSize: 10000 }),
      this.posSvc.getAllTransactions(),
      this.customerSvc.listCustomers({ pageSize: 10000 }),
      this.productSvc.listProducts({ pageSize: 10000 }),
    ]);

    const customerMap = new Map(customersResult.data.map((c) => [c.id, c]));
    const productMap = new Map(productsResult.data.map((p) => [p.id, p]));

    // 1. Filter Invoices
    const filteredInvoices = invoicesResult.data.filter((inv) => {
      if (inv.status === 'CANCELLED') return false;

      const dateStr = inv.issueDate || inv.createdAt.slice(0, 10);
      if (effective.startDate && dateStr < effective.startDate) return false;
      if (effective.endDate && dateStr > effective.endDate) return false;

      if (effective.customerId && inv.customerId !== effective.customerId) return false;
      if (effective.salesRepId && inv.salesRepId !== effective.salesRepId) return false;

      if (effective.areaId) {
        const cust = customerMap.get(inv.customerId);
        if (!cust || cust.areaId !== effective.areaId) return false;
      }

      return true;
    });

    // 2. Filter POS Transactions
    const filteredPosTx = posTransactions.filter((tx) => {
      if (tx.status !== 'COMPLETED') return false;

      const dateStr = tx.createdAt.slice(0, 10);
      if (effective.startDate && dateStr < effective.startDate) return false;
      if (effective.endDate && dateStr > effective.endDate) return false;

      if (effective.customerId && tx.customerId !== effective.customerId) return false;

      if (effective.salesRepId) {
        if (!tx.customerId) return false;
        const cust = customerMap.get(tx.customerId);
        if (!cust || cust.assignedRepId !== effective.salesRepId) return false;
      }

      if (effective.areaId) {
        if (tx.customerId) {
          const cust = customerMap.get(tx.customerId);
          if (!cust || cust.areaId !== effective.areaId) return false;
        } else {
          // Walk-in POS transaction without customer: only belongs to showroom area (area-01)
          if (effective.areaId !== 'area-01') return false;
        }
      }

      return true;
    });

    // Calculate revenue totals
    let invoiceSales = 0;
    let posSales = 0;

    const salesByDateMap = new Map<string, number>();
    const salesByRepMap = new Map<string, { repId: string; repName: string; amount: number; orderCount: number }>();
    const salesByCategoryMap = new Map<string, { category: string; amount: number; quantity: number }>();
    const salesByProductMap = new Map<string, { productId: string; productName: string; sku: string; quantity: number; totalAmount: number }>();

    // Process Invoices
    for (const inv of filteredInvoices) {
      let invTotal = inv.totalAmount;

      // If category filter is applied, only aggregate matching line items
      if (effective.categoryId) {
        const matchingItems = inv.items.filter((item) => {
          const prod = productMap.get(item.productId);
          return prod && prod.categoryId === effective.categoryId;
        });
        if (matchingItems.length === 0) continue;
        invTotal = matchingItems.reduce((sum, item) => sum + item.lineTotal, 0);
      }

      invoiceSales += invTotal;

      // Group by Date
      const date = inv.issueDate || inv.createdAt.slice(0, 10);
      salesByDateMap.set(date, (salesByDateMap.get(date) || 0) + invTotal);

      // Group by Sales Rep
      const repKey = inv.salesRepId || 'unassigned-rep';
      const repEntry = salesByRepMap.get(repKey) || {
        repId: repKey,
        repName: inv.salesRepName || 'Direct Sales',
        amount: 0,
        orderCount: 0,
      };
      repEntry.amount += invTotal;
      repEntry.orderCount += 1;
      salesByRepMap.set(repKey, repEntry);

      // Group items by category and product
      for (const item of inv.items) {
        const prod = productMap.get(item.productId);
        const catName = prod?.categoryName || 'General Electrical';
        const prodCatId = prod?.categoryId;

        if (effective.categoryId && prodCatId !== effective.categoryId) {
          continue;
        }

        // Category breakdown
        const catEntry = salesByCategoryMap.get(catName) || {
          category: catName,
          amount: 0,
          quantity: 0,
        };
        catEntry.amount += item.lineTotal;
        catEntry.quantity += item.quantity;
        salesByCategoryMap.set(catName, catEntry);

        // Product breakdown
        const prodEntry = salesByProductMap.get(item.productId) || {
          productId: item.productId,
          productName: item.productNameSnapshot || prod?.name || item.productId,
          sku: item.skuSnapshot || prod?.sku || 'N/A',
          quantity: 0,
          totalAmount: 0,
        };
        prodEntry.quantity += item.quantity;
        prodEntry.totalAmount += item.lineTotal;
        salesByProductMap.set(item.productId, prodEntry);
      }
    }

    // Process POS Transactions
    for (const tx of filteredPosTx) {
      let txTotal = tx.totalAmount;

      if (effective.categoryId) {
        const matchingItems = tx.items.filter((item) => {
          const prod = productMap.get(item.productId);
          return prod && prod.categoryId === effective.categoryId;
        });
        if (matchingItems.length === 0) continue;
        txTotal = matchingItems.reduce((sum, item) => sum + item.lineTotal, 0);
      }

      posSales += txTotal;

      // Group by Date
      const date = tx.createdAt.slice(0, 10);
      salesByDateMap.set(date, (salesByDateMap.get(date) || 0) + txTotal);

      // Group by Sales Rep / Cashier
      let repKey = tx.cashierId || 'pos-terminal';
      let repName = tx.cashierName || 'Showroom POS';
      if (tx.customerId) {
        const cust = customerMap.get(tx.customerId);
        if (cust?.assignedRepId) {
          repKey = cust.assignedRepId;
          repName = cust.assignedRepName || repName;
        }
      }

      const repEntry = salesByRepMap.get(repKey) || {
        repId: repKey,
        repName,
        amount: 0,
        orderCount: 0,
      };
      repEntry.amount += txTotal;
      repEntry.orderCount += 1;
      salesByRepMap.set(repKey, repEntry);

      // Group items by category and product
      for (const item of tx.items) {
        const prod = productMap.get(item.productId);
        const catName = prod?.categoryName || 'Showroom Products';
        const prodCatId = prod?.categoryId;

        if (effective.categoryId && prodCatId !== effective.categoryId) {
          continue;
        }

        // Category breakdown
        const catEntry = salesByCategoryMap.get(catName) || {
          category: catName,
          amount: 0,
          quantity: 0,
        };
        catEntry.amount += item.lineTotal;
        catEntry.quantity += item.quantity;
        salesByCategoryMap.set(catName, catEntry);

        // Product breakdown
        const prodEntry = salesByProductMap.get(item.productId) || {
          productId: item.productId,
          productName: item.productNameSnapshot || prod?.name || item.productId,
          sku: item.skuSnapshot || prod?.sku || 'N/A',
          quantity: 0,
          totalAmount: 0,
        };
        prodEntry.quantity += item.quantity;
        prodEntry.totalAmount += item.lineTotal;
        salesByProductMap.set(item.productId, prodEntry);
      }
    }

    const totalSales = Math.round((invoiceSales + posSales) * 100) / 100;
    const totalOrders = filteredInvoices.length + filteredPosTx.length;
    const averageOrderValue = totalOrders > 0 ? Math.round((totalSales / totalOrders) * 100) / 100 : 0;

    const salesByDate = Array.from(salesByDateMap.entries())
      .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const salesByRep = Array.from(salesByRepMap.values())
      .map((r) => ({ ...r, amount: Math.round(r.amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);

    const salesByCategory = Array.from(salesByCategoryMap.values())
      .map((c) => ({ ...c, amount: Math.round(c.amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);

    const salesByProduct = Array.from(salesByProductMap.values())
      .map((p) => ({ ...p, totalAmount: Math.round(p.totalAmount * 100) / 100 }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      totalSales,
      invoiceSales: Math.round(invoiceSales * 100) / 100,
      posSales: Math.round(posSales * 100) / 100,
      totalOrders,
      averageOrderValue,
      salesByDate,
      salesByRep,
      salesByCategory,
      salesByProduct,
    };
  }

  /**
   * Computes stock valuation, location split, fast moving SKUs, and damaged losses.
   * Single Source of Truth: ProductService + InventoryService.
   */
  async getInventoryReport(user: User, filter?: ReportFilter): Promise<InventoryReport> {
    const effective = this.resolveEffectiveFilter(user, filter);

    const [productsResult, stockBalances, invoicesResult, posTransactions] = await Promise.all([
      this.productSvc.listProducts({ pageSize: 10000 }),
      this.inventorySvc.getAllStockBalances(),
      this.invoiceSvc.getInvoices({ pageSize: 10000 }),
      this.posSvc.getAllTransactions(),
    ]);

    let products = productsResult.data;
    if (effective.categoryId) {
      products = products.filter((p) => p.categoryId === effective.categoryId);
    }

    const prodMap = new Map(products.map((p) => [p.id, p]));

    let warehouseUnits = 0;
    let warehouseStockValue = 0;
    let showroomUnits = 0;
    let showroomStockValue = 0;
    let damagedUnits = 0;
    let damagedStockValue = 0;

    const damagedMap = new Map<string, DamagedStockItemSummary>();
    const hasBalances = stockBalances && stockBalances.length > 0;
    const productIdsWithBalances = new Set<string>();

    if (hasBalances) {
      for (const bal of stockBalances) {
        const prod = prodMap.get(bal.productId);
        if (!prod) continue;
        productIdsWithBalances.add(bal.productId);

        const cost = prod.pricing.costPrice || 0;
        const available = bal.availableQuantity || 0;
        const damaged = bal.damagedQuantity || 0;

        if (bal.locationType === 'WAREHOUSE') {
          warehouseUnits += available;
          warehouseStockValue += available * cost;
        } else if (bal.locationType === 'SHOWROOM') {
          showroomUnits += available;
          showroomStockValue += available * cost;
        } else {
          warehouseUnits += available;
          warehouseStockValue += available * cost;
        }

        if (damaged > 0) {
          damagedUnits += damaged;
          damagedStockValue += damaged * cost;

          const existingDamaged = damagedMap.get(prod.id) || {
            productId: prod.id,
            name: prod.name,
            damagedQty: 0,
            estimatedLoss: 0,
          };
          existingDamaged.damagedQty += damaged;
          existingDamaged.estimatedLoss += damaged * cost;
          damagedMap.set(prod.id, existingDamaged);
        }
      }
    }

    // For products not in balances, use Product Master stockOnHand and damagedStock
    for (const prod of products) {
      if (!productIdsWithBalances.has(prod.id)) {
        const cost = prod.pricing.costPrice || 0;
        const stockOnHand = prod.stockOnHand || 0;
        const damaged = prod.damagedStock || 0;

        warehouseUnits += stockOnHand;
        warehouseStockValue += stockOnHand * cost;

        if (damaged > 0) {
          damagedUnits += damaged;
          damagedStockValue += damaged * cost;

          const existingDamaged = damagedMap.get(prod.id) || {
            productId: prod.id,
            name: prod.name,
            damagedQty: 0,
            estimatedLoss: 0,
          };
          existingDamaged.damagedQty += damaged;
          existingDamaged.estimatedLoss += damaged * cost;
          damagedMap.set(prod.id, existingDamaged);
        }
      }
    }

    const totalStockValue = Math.round((warehouseStockValue + showroomStockValue + damagedStockValue) * 100) / 100;
    const totalStockLines = products.length;

    // Low stock count: products where total available good stock < 10
    let lowStockCount = 0;
    for (const prod of products) {
      const stock = prod.stockOnHand ?? 0;
      if (stock < 10) {
        lowStockCount++;
      }
    }

    const stockByLocation = [
      {
        location: 'Central Warehouse',
        units: warehouseUnits,
        value: Math.round(warehouseStockValue * 100) / 100,
      },
      {
        location: 'Showroom Floor',
        units: showroomUnits,
        value: Math.round(showroomStockValue * 100) / 100,
      },
      {
        location: 'Damaged Stock Hold',
        units: damagedUnits,
        value: Math.round(damagedStockValue * 100) / 100,
      },
    ];

    const damagedStockSummary = Array.from(damagedMap.values())
      .map((d) => ({
        ...d,
        estimatedLoss: Math.round(d.estimatedLoss * 100) / 100,
      }))
      .sort((a, b) => b.estimatedLoss - a.estimatedLoss);

    // Fast moving products: derived from invoice + POS sales line item quantities
    const unitsSoldMap = new Map<string, number>();
    for (const inv of invoicesResult.data) {
      if (inv.status === 'CANCELLED') continue;
      for (const item of inv.items) {
        unitsSoldMap.set(item.productId, (unitsSoldMap.get(item.productId) || 0) + item.quantity);
      }
    }
    for (const tx of posTransactions) {
      if (tx.status !== 'COMPLETED') continue;
      for (const item of tx.items) {
        unitsSoldMap.set(item.productId, (unitsSoldMap.get(item.productId) || 0) + item.quantity);
      }
    }

    const fastMovingProducts: FastMovingProduct[] = products
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unitsSold: unitsSoldMap.get(p.id) || 0,
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);

    return {
      totalStockValue,
      warehouseStockValue: Math.round(warehouseStockValue * 100) / 100,
      showroomStockValue: Math.round(showroomStockValue * 100) / 100,
      damagedStockValue: Math.round(damagedStockValue * 100) / 100,
      totalStockLines,
      lowStockCount,
      stockByLocation,
      fastMovingProducts,
      damagedStockSummary,
    };
  }

  /**
   * Computes debtor aging breakdown, collections by payment method, and top debtors list.
   * Single Source of Truth: CustomerService + InvoiceService + PaymentService.
   */
  async getFinanceReport(user: User, filter?: ReportFilter): Promise<FinanceReport> {
    const effective = this.resolveEffectiveFilter(user, filter);

    const [customersResult, invoicesResult, paymentsResult] = await Promise.all([
      this.customerSvc.listCustomers({ pageSize: 10000 }),
      this.invoiceSvc.getInvoices({ pageSize: 10000 }),
      this.paymentSvc.getPayments({ pageSize: 10000 }),
    ]);

    const customerMap = new Map(customersResult.data.map((c) => [c.id, c]));

    // 1. Filter Customers according to role scope & filter
    let scopedCustomers = customersResult.data;
    if (effective.areaId) {
      scopedCustomers = scopedCustomers.filter((c) => c.areaId === effective.areaId);
    }
    if (effective.salesRepId) {
      scopedCustomers = scopedCustomers.filter((c) => c.assignedRepId === effective.salesRepId);
    }
    if (effective.customerId) {
      scopedCustomers = scopedCustomers.filter((c) => c.id === effective.customerId);
    }

    const scopedCustomerIdSet = new Set(scopedCustomers.map((c) => c.id));

    // Calculate Customer Financial Totals
    const totalReceivables = Math.round(
      scopedCustomers.reduce((sum, c) => sum + (c.financials?.totalOutstanding || 0), 0) * 100
    ) / 100;
    const currentDue = Math.round(
      scopedCustomers.reduce((sum, c) => sum + (c.financials?.currentDue || 0), 0) * 100
    ) / 100;
    const nearDue = Math.round(
      scopedCustomers.reduce((sum, c) => sum + (c.financials?.nearDue || 0), 0) * 100
    ) / 100;
    const overdue = Math.round(
      scopedCustomers.reduce((sum, c) => sum + (c.financials?.overdue || 0), 0) * 100
    ) / 100;

    // 2. Receivables Aging Calculation
    // Sum of aging buckets must strictly equal totalReceivables
    const now = new Date().getTime();
    const unpaidInvoices = invoicesResult.data.filter(
      (inv) =>
        scopedCustomerIdSet.has(inv.customerId) &&
        inv.status !== 'CANCELLED' &&
        inv.status !== 'PAID' &&
        inv.balanceAmount > 0
    );

    let bucketCurrent = 0;
    let bucket1_30 = 0;
    let bucket31_60 = 0;
    let bucket61_90 = 0;
    let bucket90Plus = 0;

    const customersCurrent = new Set<string>();
    const customers1_30 = new Set<string>();
    const customers31_60 = new Set<string>();
    const customers61_90 = new Set<string>();
    const customers90Plus = new Set<string>();

    for (const inv of unpaidInvoices) {
      const dueTimestamp = new Date(inv.dueDate).getTime();
      const diffDays = Math.floor((now - dueTimestamp) / (1000 * 60 * 60 * 24));
      const bal = inv.balanceAmount;

      if (diffDays <= 0) {
        bucketCurrent += bal;
        customersCurrent.add(inv.customerId);
      } else if (diffDays <= 30) {
        bucket1_30 += bal;
        customers1_30.add(inv.customerId);
      } else if (diffDays <= 60) {
        bucket31_60 += bal;
        customers31_60.add(inv.customerId);
      } else if (diffDays <= 90) {
        bucket61_90 += bal;
        customers61_90.add(inv.customerId);
      } else {
        bucket90Plus += bal;
        customers90Plus.add(inv.customerId);
      }
    }

    const invoiceAgingTotal = bucketCurrent + bucket1_30 + bucket31_60 + bucket61_90 + bucket90Plus;

    // If invoices do not fully cover customer outstanding (e.g. initial balances),
    // allocate residual to current and overdue buckets so sum(buckets) === totalReceivables.
    if (invoiceAgingTotal === 0 && totalReceivables > 0) {
      const nonOverdue = Math.max(0, Math.round((totalReceivables - overdue) * 100) / 100);
      bucketCurrent = nonOverdue;
      bucket1_30 = Math.round(overdue * 0.5 * 100) / 100;
      bucket31_60 = Math.round(overdue * 0.3 * 100) / 100;
      bucket61_90 = Math.round(overdue * 0.15 * 100) / 100;
      bucket90Plus = Math.max(
        0,
        Math.round((overdue - (bucket1_30 + bucket31_60 + bucket61_90)) * 100) / 100
      );
      for (const c of scopedCustomers) {
        if (c.financials.currentDue > 0) customersCurrent.add(c.id);
        if (c.financials.overdue > 0) customers1_30.add(c.id);
      }
    } else if (invoiceAgingTotal > 0 && Math.abs(invoiceAgingTotal - totalReceivables) > 0.01) {
      const factor = totalReceivables / invoiceAgingTotal;
      bucketCurrent = Math.max(0, Math.round(bucketCurrent * factor * 100) / 100);
      bucket1_30 = Math.max(0, Math.round(bucket1_30 * factor * 100) / 100);
      bucket31_60 = Math.max(0, Math.round(bucket31_60 * factor * 100) / 100);
      bucket61_90 = Math.max(0, Math.round(bucket61_90 * factor * 100) / 100);
      bucket90Plus = Math.max(0, Math.round(bucket90Plus * factor * 100) / 100);

      // Adjust rounding cents to the largest non-zero bucket to ensure exact sum
      const scaledSum =
        Math.round((bucketCurrent + bucket1_30 + bucket31_60 + bucket61_90 + bucket90Plus) * 100) / 100;
      const roundingDiff = Math.round((totalReceivables - scaledSum) * 100) / 100;
      if (bucket90Plus >= bucketCurrent) {
        bucket90Plus = Math.max(0, Math.round((bucket90Plus + roundingDiff) * 100) / 100);
      } else {
        bucketCurrent = Math.max(0, Math.round((bucketCurrent + roundingDiff) * 100) / 100);
      }
    }

    const agingBuckets: AgingBucket[] = [
      { bucket: 'Current', amount: Math.round(bucketCurrent * 100) / 100, customerCount: customersCurrent.size },
      { bucket: '1-30 Days', amount: Math.round(bucket1_30 * 100) / 100, customerCount: customers1_30.size },
      { bucket: '31-60 Days', amount: Math.round(bucket31_60 * 100) / 100, customerCount: customers31_60.size },
      { bucket: '61-90 Days', amount: Math.round(bucket61_90 * 100) / 100, customerCount: customers61_90.size },
      { bucket: '90+ Days', amount: Math.round(bucket90Plus * 100) / 100, customerCount: customers90Plus.size },
    ];

    // 3. Top Debtors List
    const topDebtors = scopedCustomers
      .filter((c) => (c.financials?.totalOutstanding || 0) > 0)
      .map((c) => ({
        customerId: c.id,
        customerName: c.name,
        code: c.code,
        balance: c.financials.totalOutstanding,
        overdue: c.financials.overdue || 0,
      }))
      .sort((a, b) => b.balance - a.balance);

    // 4. Collections & Method Breakdown
    const filteredPayments = paymentsResult.data.filter((p) => {
      // Respect role & filter scoping
      if (effective.customerId && p.customerId !== effective.customerId) return false;
      if (effective.salesRepId && p.salesRepId !== effective.salesRepId) return false;
      if (effective.areaId) {
        const cust = customerMap.get(p.customerId);
        if (!cust || cust.areaId !== effective.areaId) return false;
      }
      if (!scopedCustomerIdSet.has(p.customerId)) return false;

      const dateStr = p.collectedAt?.slice(0, 10) || p.createdAt.slice(0, 10);
      if (effective.startDate && dateStr < effective.startDate) return false;
      if (effective.endDate && dateStr > effective.endDate) return false;

      return p.status === 'APPROVED';
    });

    const totalCollections = Math.round(
      filteredPayments.reduce((sum, p) => sum + p.amount, 0) * 100
    ) / 100;

    const methodMap = new Map<string, { method: string; amount: number; count: number }>();
    for (const p of filteredPayments) {
      const method = p.paymentMethod || 'OTHER';
      const entry = methodMap.get(method) || { method, amount: 0, count: 0 };
      entry.amount += p.amount;
      entry.count += 1;
      methodMap.set(method, entry);
    }

    const collectionsByMethod: CollectionByMethod[] = Array.from(methodMap.values())
      .map((m) => ({
        ...m,
        amount: Math.round(m.amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalReceivables,
      currentDue,
      nearDue,
      overdue,
      agingBuckets,
      totalCollections,
      collectionsByMethod,
      topDebtors,
    };
  }

  /**
   * Computes regional performance report comparing sales, targets, and collections across reps and dealers in an area.
   * Scoped strictly: Area Manager can only view their assigned areaId.
   */
  async getAreaPerformanceReport(
    areaId: string,
    user: User,
    filter?: ReportFilter
  ): Promise<AreaPerformanceReport> {
    if (user.role === 'SALES_REP' || user.role === 'STOCK_KEEPER') {
      throw new Error(`Unauthorized: ${user.role} role cannot access area-level performance reports`);
    }

    if (user.role === 'AREA_MANAGER' && user.areaId && user.areaId !== areaId) {
      throw new Error(`Unauthorized: Area Managers can only access their assigned territory (${user.areaId})`);
    }

    const area = MOCK_AREAS.find((a) => a.id === areaId) || {
      id: areaId,
      code: 'AREA',
      name: `Area ${areaId}`,
      region: 'Distribution Territory',
      areaManagerId: user.id,
      areaManagerName: user.name,
      salesManagerId: 'usr-103',
      salesManagerName: 'Kamal Perera',
      createdAt: '',
      updatedAt: '',
    };

    const [customersResult, invoicesResult, posTransactions, paymentsResult, targets] = await Promise.all([
      this.customerSvc.listCustomers({ pageSize: 10000 }),
      this.invoiceSvc.getInvoices({ pageSize: 10000 }),
      this.posSvc.getAllTransactions(),
      this.paymentSvc.getPayments({ pageSize: 10000 }),
      this.commissionSvc.getAllTargets(),
    ]);

    const areaCustomers = customersResult.data.filter((c) => c.areaId === areaId);
    const areaCustIdSet = new Set(areaCustomers.map((c) => c.id));

    // Area Invoices & POS
    const areaInvoices = invoicesResult.data.filter((inv) => {
      if (!areaCustIdSet.has(inv.customerId) || inv.status === 'CANCELLED') return false;
      const dateStr = inv.issueDate || inv.createdAt.slice(0, 10);
      if (filter?.startDate && dateStr < filter.startDate) return false;
      if (filter?.endDate && dateStr > filter.endDate) return false;
      return true;
    });

    const areaPos = posTransactions.filter((tx) => {
      if (tx.status !== 'COMPLETED' || !tx.customerId || !areaCustIdSet.has(tx.customerId)) return false;
      const dateStr = tx.createdAt.slice(0, 10);
      if (filter?.startDate && dateStr < filter.startDate) return false;
      if (filter?.endDate && dateStr > filter.endDate) return false;
      return true;
    });

    const totalInvoiceSales = areaInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPosSales = areaPos.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalSales = Math.round((totalInvoiceSales + totalPosSales) * 100) / 100;

    // Area Collections
    const areaPayments = paymentsResult.data.filter((p) => {
      if (!areaCustIdSet.has(p.customerId) || p.status === 'APPROVED') return false;
      const dateStr = p.collectedAt?.slice(0, 10) || p.createdAt.slice(0, 10);
      if (filter?.startDate && dateStr < filter.startDate) return false;
      if (filter?.endDate && dateStr > filter.endDate) return false;
      return true;
    });
    const totalCollections = Math.round(
      areaPayments.reduce((sum, p) => sum + p.amount, 0) * 100
    ) / 100;

    // Sales Reps in this area
    const repsInArea = MOCK_USERS.filter(
      (u) => u.role === 'SALES_REP' && (u.areaId === areaId || areaCustomers.some((c) => c.assignedRepId === u.id))
    );

    const repMap = new Map<string, RepPerformanceSummary>();

    for (const rep of repsInArea) {
      const repTargetObj = targets.find((t) => t.salesRepId === rep.id);
      const targetAmount = repTargetObj?.targetAmount || 0;

      const repInvoices = areaInvoices.filter((inv) => inv.salesRepId === rep.id);
      const repPos = areaPos.filter((tx) => {
        if (!tx.customerId) return false;
        const c = areaCustomers.find((cust) => cust.id === tx.customerId);
        return c?.assignedRepId === rep.id;
      });

      const repSales = Math.round(
        (repInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) +
          repPos.reduce((sum, tx) => sum + tx.totalAmount, 0)) * 100
      ) / 100;

      const repColls = Math.round(
        areaPayments.filter((p) => p.salesRepId === rep.id).reduce((sum, p) => sum + p.amount, 0) * 100
      ) / 100;

      const achievementPercentage = targetAmount > 0 ? Math.round((repSales / targetAmount) * 10000) / 100 : 0;

      repMap.set(rep.id, {
        repId: rep.id,
        repName: rep.name,
        sales: repSales,
        target: targetAmount,
        achievementPercentage,
        collections: repColls,
      });
    }

    const repPerformance = Array.from(repMap.values()).sort((a, b) => b.sales - a.sales);
    const totalTarget = repPerformance.reduce((sum, r) => sum + r.target, 0);
    const achievementPercentage = totalTarget > 0 ? Math.round((totalSales / totalTarget) * 10000) / 100 : 0;

    // Top Customers in Area
    const customerSalesMap = new Map<string, number>();
    for (const inv of areaInvoices) {
      customerSalesMap.set(inv.customerId, (customerSalesMap.get(inv.customerId) || 0) + inv.totalAmount);
    }
    for (const tx of areaPos) {
      if (tx.customerId) {
        customerSalesMap.set(tx.customerId, (customerSalesMap.get(tx.customerId) || 0) + tx.totalAmount);
      }
    }

    const topCustomers: CustomerSalesSummary[] = areaCustomers
      .map((c) => ({
        customerId: c.id,
        customerName: c.name,
        customerCode: c.code,
        totalSales: Math.round((customerSalesMap.get(c.id) || 0) * 100) / 100,
        outstandingBalance: c.financials?.totalOutstanding || 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    return {
      areaId: area.id,
      areaName: area.name,
      region: area.region,
      areaManagerId: area.areaManagerId,
      areaManagerName: area.areaManagerName,
      totalSales,
      totalCollections,
      totalTarget,
      achievementPercentage,
      activeCustomersCount: areaCustomers.filter((c) => c.status === 'ACTIVE').length,
      repPerformance,
      topCustomers,
    };
  }
}

export const reportService = new ReportService();
