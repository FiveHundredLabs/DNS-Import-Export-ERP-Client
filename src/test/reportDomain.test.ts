import { describe, it, expect, beforeEach } from 'vitest';
import { ReportService } from '../services/ReportService';
import { MockInvoiceRepository } from '../repositories/mock/MockInvoiceRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { MockPOSRepository } from '../repositories/mock/MockPOSRepository';
import { MockPaymentRepository } from '../repositories/mock/MockPaymentRepository';
import { MockSalesOrderRepository } from '../repositories/mock/MockSalesOrderRepository';
import { MockCommissionRepository } from '../repositories/mock/MockCommissionRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { InvoiceService } from '../services/InvoiceService';
import { CustomerService } from '../services/CustomerService';
import { ProductService } from '../services/ProductService';
import { POSService } from '../services/POSService';
import { PaymentService } from '../services/PaymentService';
import { OrderService } from '../services/OrderService';
import { CommissionService } from '../services/CommissionService';
import { InventoryService } from '../services/InventoryService';
import { exportToCSV } from '../utils/exportUtils';
import { User } from '../types/auth';
import { MOCK_CUSTOMERS } from '../mock/mockCustomers';
import { MOCK_INVOICES } from '../mock/mockInvoices';
import { MOCK_PRODUCTS } from '../mock/mockProducts';
import { MOCK_POS_TRANSACTIONS } from '../mock/mockPOS';
import { MOCK_PAYMENTS } from '../mock/mockPayments';
import { MOCK_SALES_TARGETS } from '../mock/mockCommissions';

describe('Phase 11 — Enterprise Analytics & Reporting Domain', () => {
  let reportSvc: ReportService;
  let customerSvc: CustomerService;
  let invoiceSvc: InvoiceService;
  let posSvc: POSService;
  let productSvc: ProductService;
  let paymentSvc: PaymentService;
  let inventorySvc: InventoryService;
  let commissionSvc: CommissionService;

  const directorUser: User = {
    id: 'usr-101',
    name: 'Saman Jayasuriya',
    email: 'director@dnserp.com',
    role: 'DIRECTOR',
    phone: '+94 77 123 4567',
    isActive: true,
  };

  const areaManagerUser: User = {
    id: 'usr-105',
    name: 'Nimal Bandara',
    email: 'area.western@dnserp.com',
    role: 'AREA_MANAGER',
    areaId: 'area-01',
    areaName: 'Western Province Central',
    phone: '+94 77 567 8901',
    isActive: true,
  };

  const salesRepUser: User = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    email: 'rep.colombo@dnserp.com',
    role: 'SALES_REP',
    areaId: 'area-01',
    areaName: 'Western Province Central',
    assignedCustomersCount: 14,
    phone: '+94 77 678 9012',
    isActive: true,
  };

  beforeEach(() => {
    const customerRepo = new MockCustomerRepository();
    const invoiceRepo = new MockInvoiceRepository();
    const productRepo = new MockProductRepository();
    const posRepo = new MockPOSRepository();
    const paymentRepo = new MockPaymentRepository();
    const orderRepo = new MockSalesOrderRepository();
    const commissionRepo = new MockCommissionRepository();
    const inventoryRepo = new MockInventoryRepository();

    customerSvc = new CustomerService(customerRepo);
    const orderSvc = new OrderService(orderRepo, undefined, customerSvc);
    invoiceSvc = new InvoiceService(invoiceRepo, orderSvc, customerSvc);
    posSvc = new POSService(posRepo, inventoryRepo, productRepo);
    productSvc = new ProductService(productRepo);
    paymentSvc = new PaymentService(paymentRepo, customerSvc, invoiceSvc);
    inventorySvc = new InventoryService(inventoryRepo);
    commissionSvc = new CommissionService(commissionRepo);

    reportSvc = new ReportService(
      productSvc,
      customerSvc,
      orderSvc,
      invoiceSvc,
      paymentSvc,
      inventorySvc,
      posSvc,
      commissionSvc
    );
  });

  describe('1. Revenue Calculation: Invoices + Showroom POS', () => {
    it('calculates gross revenue matching exactly sum of invoice sales + POS sales', async () => {
      const salesReport = await reportSvc.getSalesReport(directorUser);

      expect(salesReport.totalSales).toBeGreaterThan(0);
      expect(salesReport.invoiceSales).toBeGreaterThan(0);
      expect(salesReport.posSales).toBeGreaterThan(0);

      // Revenue calculation matching sum of invoice + POS sales
      const expectedTotal = Math.round((salesReport.invoiceSales + salesReport.posSales) * 100) / 100;
      expect(salesReport.totalSales).toBe(expectedTotal);
    });

    it('calculates average order value accurately across combined orders', async () => {
      const salesReport = await reportSvc.getSalesReport(directorUser);

      expect(salesReport.totalOrders).toBeGreaterThan(0);
      const expectedAOV = Math.round((salesReport.totalSales / salesReport.totalOrders) * 100) / 100;
      expect(salesReport.averageOrderValue).toBe(expectedAOV);
    });

    it('filters sales by date range accurately', async () => {
      const allSales = await reportSvc.getSalesReport(directorUser);
      const filtered = await reportSvc.getSalesReport(directorUser, {
        startDate: '2025-01-01',
        endDate: '2025-01-10',
      });

      expect(filtered.totalSales).toBeLessThanOrEqual(allSales.totalSales);
      for (const item of filtered.salesByDate) {
        expect(item.date >= '2025-01-01' && item.date <= '2025-01-10').toBe(true);
      }
    });

    it('groups sales by category and sales representative correctly', async () => {
      const salesReport = await reportSvc.getSalesReport(directorUser);

      expect(salesReport.salesByCategory.length).toBeGreaterThan(0);
      expect(salesReport.salesByRep.length).toBeGreaterThan(0);

      const repSalesSum = salesReport.salesByRep.reduce((sum, r) => sum + r.amount, 0);
      expect(Math.round(repSalesSum * 100) / 100).toBe(salesReport.totalSales);
    });
  });

  describe('2. Receivables Aging & Customer Outstanding Reconciliation', () => {
    it('ensures sum of aging buckets strictly matches total customer receivables', async () => {
      const finReport = await reportSvc.getFinanceReport(directorUser);

      expect(finReport.totalReceivables).toBeGreaterThan(0);

      const agingSum = Math.round(
        finReport.agingBuckets.reduce((sum, b) => sum + b.amount, 0) * 100
      ) / 100;

      // Single Source of Truth rule: Aging must reconcile to total outstanding customer ledger balance
      expect(agingSum).toBe(finReport.totalReceivables);
    });

    it('ranks top debtors in descending order of outstanding balance', async () => {
      const finReport = await reportSvc.getFinanceReport(directorUser);

      expect(finReport.topDebtors.length).toBeGreaterThan(0);
      for (let i = 0; i < finReport.topDebtors.length - 1; i++) {
        expect(finReport.topDebtors[i].balance).toBeGreaterThanOrEqual(
          finReport.topDebtors[i + 1].balance
        );
      }
    });

    it('aggregates collections by payment method', async () => {
      const finReport = await reportSvc.getFinanceReport(directorUser);

      expect(finReport.totalCollections).toBeGreaterThan(0);
      expect(finReport.collectionsByMethod.length).toBeGreaterThan(0);

      const methodSum = Math.round(
        finReport.collectionsByMethod.reduce((sum, m) => sum + m.amount, 0) * 100
      ) / 100;
      expect(methodSum).toBe(finReport.totalCollections);
    });
  });

  describe('3. Stock Valuation: quantity * costPrice', () => {
    it('computes inventory valuation using costPrice for all locations', async () => {
      const invReport = await reportSvc.getInventoryReport(directorUser);

      expect(invReport.totalStockValue).toBeGreaterThan(0);
      expect(invReport.warehouseStockValue).toBeGreaterThan(0);
      expect(invReport.damagedStockValue).toBeGreaterThan(0);

      const locationSum = Math.round(
        (invReport.warehouseStockValue + invReport.showroomStockValue + invReport.damagedStockValue) * 100
      ) / 100;

      expect(invReport.totalStockValue).toBe(locationSum);
    });

    it('calculates estimated loss on damaged stock accurately (damagedQty * costPrice)', async () => {
      const invReport = await reportSvc.getInventoryReport(directorUser);

      expect(invReport.damagedStockSummary.length).toBeGreaterThan(0);
      const damagedLossSum = Math.round(
        invReport.damagedStockSummary.reduce((sum, d) => sum + d.estimatedLoss, 0) * 100
      ) / 100;

      expect(damagedLossSum).toBe(invReport.damagedStockValue);
    });

    it('identifies fast-moving products based on total units sold', async () => {
      const invReport = await reportSvc.getInventoryReport(directorUser);

      expect(invReport.fastMovingProducts.length).toBeGreaterThan(0);
      for (let i = 0; i < invReport.fastMovingProducts.length - 1; i++) {
        expect(invReport.fastMovingProducts[i].unitsSold).toBeGreaterThanOrEqual(
          invReport.fastMovingProducts[i + 1].unitsSold
        );
      }
    });
  });

  describe('4. Role-Aware Data Scoping', () => {
    it('strictly scopes Area Manager to their assigned territory (areaId)', async () => {
      const amFinanceReport = await reportSvc.getFinanceReport(areaManagerUser);
      const globalFinanceReport = await reportSvc.getFinanceReport(directorUser);

      // Area Manager should only see accounts in area-01
      expect(amFinanceReport.totalReceivables).toBeLessThanOrEqual(globalFinanceReport.totalReceivables);

      // Customer accounts in top debtors must all belong to area-01
      for (const debtor of amFinanceReport.topDebtors) {
        const cust = MOCK_CUSTOMERS.find((c) => c.id === debtor.customerId);
        expect(cust?.areaId).toBe('area-01');
      }
    });

    it('rejects Area Manager attempting to view performance of an unauthorized area', async () => {
      await expect(
        reportSvc.getAreaPerformanceReport('area-02', areaManagerUser)
      ).rejects.toThrow(/Unauthorized/i);
    });

    it('allows Area Manager to view their own assigned area performance', async () => {
      const areaPerf = await reportSvc.getAreaPerformanceReport('area-01', areaManagerUser);
      expect(areaPerf.areaId).toBe('area-01');
      expect(areaPerf.totalSales).toBeGreaterThan(0);
      expect(areaPerf.topCustomers.length).toBeGreaterThan(0);
    });

    it('strictly scopes Sales Rep to their own portfolio and transactions', async () => {
      const repSalesReport = await reportSvc.getSalesReport(salesRepUser);
      const globalSalesReport = await reportSvc.getSalesReport(directorUser);

      expect(repSalesReport.totalSales).toBeLessThanOrEqual(globalSalesReport.totalSales);

      // All rep entries must belong to this sales rep
      for (const rep of repSalesReport.salesByRep) {
        expect(rep.repId).toBe(salesRepUser.id);
      }

      // Finance report for sales rep
      const repFinance = await reportSvc.getFinanceReport(salesRepUser);
      for (const debtor of repFinance.topDebtors) {
        const cust = MOCK_CUSTOMERS.find((c) => c.id === debtor.customerId);
        expect(cust?.assignedRepId).toBe(salesRepUser.id);
      }
    });

    it('rejects Sales Rep attempting to view area performance reports', async () => {
      await expect(
        reportSvc.getAreaPerformanceReport('area-01', salesRepUser)
      ).rejects.toThrow(/Unauthorized/i);
    });

    it('filters area performance transactions and collections by date range', async () => {
      const allAreaPerf = await reportSvc.getAreaPerformanceReport('area-01', directorUser);
      const filteredAreaPerf = await reportSvc.getAreaPerformanceReport('area-01', directorUser, {
        startDate: '2025-01-01',
        endDate: '2025-01-15',
      });

      expect(filteredAreaPerf.totalSales).toBeLessThanOrEqual(allAreaPerf.totalSales);
    });

    it('calculates low stock count and inventory lines accurately', async () => {
      const invReport = await reportSvc.getInventoryReport(directorUser);
      expect(invReport.totalStockLines).toBeGreaterThan(0);
      expect(typeof invReport.lowStockCount).toBe('number');
      expect(invReport.lowStockCount).toBeGreaterThanOrEqual(0);
    });

    it('guarantees all aging buckets are non-negative and sum equals totalReceivables', async () => {
      const finReport = await reportSvc.getFinanceReport(directorUser);
      for (const bucket of finReport.agingBuckets) {
        expect(bucket.amount).toBeGreaterThanOrEqual(0);
      }
      const sum = Math.round(finReport.agingBuckets.reduce((acc, b) => acc + b.amount, 0) * 100) / 100;
      expect(sum).toBe(finReport.totalReceivables);
    });

    it('provides executive KPI summary respecting role scope', async () => {
      const directorKpis = await reportSvc.getExecutiveKpis(directorUser);
      const repKpis = await reportSvc.getExecutiveKpis(salesRepUser);

      expect(directorKpis.grossRevenue).toBeGreaterThanOrEqual(repKpis.grossRevenue);
      expect(directorKpis.activeCustomersCount).toBeGreaterThanOrEqual(repKpis.activeCustomersCount);
    });
  });

  describe('5. Client-Side CSV Export Generation', () => {
    it('generates valid RFC-compliant CSV string escaping quotes and commas', () => {
      const headers = ['SKU', 'Product Name', 'Price'];
      const rows = [
        ['DNS-01', 'Switch, Double Pole', 3250],
        ['DNS-02', 'MCB "Triple" 63A', 8400],
      ];

      const csv = exportToCSV('test_report', headers, rows);

      expect(csv).toContain('SKU,Product Name,Price');
      expect(csv).toContain('"Switch, Double Pole"');
      expect(csv).toContain('"MCB ""Triple"" 63A"');
    });
  });
});
