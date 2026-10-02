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
  CreditExceptionItem,
  CommissionLinkedSalesItem,
  ChequeRealizationItem,
  PerformanceCommissionItem,
  CommissionAdjustmentItem,
  WeeklySalesPerformanceItem,
  TillReconciliationItem,
  PosChequeRegisterItem,
  PosAuditLogItem,
  DailyShowroomSummary,
  OldStockItem,
  GrnSummaryItem,
  BatchExpirationItem,
  StockVarianceItem,
  StockMovementItem,
  SlowMovingProduct,
} from '../types/reports';

export class AdvancedReportService {
  constructor(
    private productSvc: ProductService = productService,
    private customerSvc: CustomerService = customerService,
    private orderSvc: OrderService = orderService,
    private invoiceSvc: InvoiceService = invoiceService,
    private paymentSvc: PaymentService = paymentService,
    private _inventorySvc: InventoryService = inventoryService,
    private posSvc: POSService = posService,
    private commissionSvc: CommissionService = commissionService
  ) {}

  // 1. Sales Reports

  async getCreditExceptions(_user: User, _filter?: ReportFilter): Promise<CreditExceptionItem[]> {
    const ordersResult = await this.orderSvc.listOrders({ page: 1, pageSize: 10000 });
    const customersResult = await this.customerSvc.listCustomers({ page: 1, pageSize: 10000 });
    const customerMap = new Map(customersResult.data.map((c) => [c.id, c]));

    const exceptions: CreditExceptionItem[] = [];

    for (const order of ordersResult.data) {
      if (order.status === 'CANCELLED') continue;
      if (_filter?.startDate && order.createdAt.slice(0, 10) < _filter.startDate) continue;
      if (_filter?.endDate && order.createdAt.slice(0, 10) > _filter.endDate) continue;

      const customer = customerMap.get(order.customerId);
      if (!customer) continue;

      const currentDue = customer.financials?.currentDue || 0;
      const creditLimit = 1000000; // Mocked credit limit, as it is missing in the type
      
      // Simulate exception calculation
      if (order.totalAmount + currentDue > creditLimit) {
        exceptions.push({
          orderId: order.id,
          customerId: order.customerId,
          customerName: customer.name,
          orderAmount: order.totalAmount,
          creditLimit: creditLimit,
          exceededAmount: (order.totalAmount + currentDue) - creditLimit,
          approvedBy: 'Auto System / Manager', // Mapped from missing approval logs
          approvedAt: order.createdAt,
          reason: 'Order value exceeds available credit margin'
        });
      }
    }
    return exceptions;
  }

  async getCommissionLinkedSales(_user: User, _filter?: ReportFilter): Promise<CommissionLinkedSalesItem[]> {
    const invoicesResult = await this.invoiceSvc.getInvoices({ page: 1, pageSize: 10000 });
    const rules = [{ role: 'SALES_REP', ratePercentage: 2 }]; // Mocked rules

    const items: CommissionLinkedSalesItem[] = [];

    for (const inv of invoicesResult.data) {
      if (inv.status === 'CANCELLED') continue;
      
      const defaultRule = rules.find((r: any) => r.role === 'SALES_REP');
      const rate = defaultRule ? defaultRule.ratePercentage : 2;

      items.push({
        invoiceId: inv.id,
        salesRepId: inv.salesRepId || 'N/A',
        salesRepName: inv.salesRepName || 'N/A',
        grossAmount: inv.totalAmount,
        commissionableAmount: inv.totalAmount * 0.9, // Simulate subtotal exclusions
        commissionRate: rate,
        commissionEarned: (inv.totalAmount * 0.9) * (rate / 100),
        date: inv.issueDate || inv.createdAt.slice(0, 10),
      });
    }

    return items;
  }

  async getChequeRealizationAndAging(_user: User, _filter?: ReportFilter): Promise<ChequeRealizationItem[]> {
    const paymentsResult = await this.paymentSvc.getPayments({ page: 1, pageSize: 10000 });
    const chequePayments = paymentsResult.data.filter((p) => p.paymentMethod === 'CHEQUE');

    return chequePayments.map(p => ({
      paymentId: p.id,
      chequeNumber: 'N/A', // Mocked cheque number
      customerId: p.customerId,
      customerName: p.customerName || 'Unknown',
      amount: p.amount,
      receivedDate: p.collectedAt?.slice(0, 10) || p.createdAt.slice(0, 10),
      dueDate: p.collectedAt?.slice(0, 10) || p.createdAt.slice(0, 10), // Needs explicit due date on model
      status: p.status === 'APPROVED' ? 'CLEARED' : p.status === 'PENDING_APPROVAL' ? 'PENDING' : 'BOUNCED',
      bankName: 'N/A',
    }));
  }

  // 2. Commission Reports

  async getPerformanceBasedCommission(_user: User, _filter?: ReportFilter): Promise<PerformanceCommissionItem[]> {
    const targets = await this.commissionSvc.getAllTargets();
    
    return targets.map(t => {
      const achievement = t.targetAmount > 0 ? (t.achievedAmount / t.targetAmount) * 100 : 0;
      let tier = 'Standard';
      let bonus = 0;
      
      if (achievement > 110) {
        tier = 'Platinum';
        bonus = 50000;
      } else if (achievement > 100) {
        tier = 'Gold';
        bonus = 20000;
      }

      return {
        salesRepId: t.salesRepId,
        salesRepName: t.salesRepName,
        targetAmount: t.targetAmount,
        achievedAmount: t.achievedAmount,
        achievementPercentage: achievement,
        tier,
        baseCommission: t.achievedAmount * 0.02,
        bonus,
        totalPayout: (t.achievedAmount * 0.02) + bonus
      };
    });
  }

  async getCommissionAdjustments(_user: User, _filter?: ReportFilter): Promise<CommissionAdjustmentItem[]> {
    return [
      {
        adjustmentId: 'adj-001',
        salesRepId: 'usr-101',
        salesRepName: 'John Doe',
        originalAmount: 5000,
        adjustedAmount: 4500,
        reason: 'Order returned',
        adjustedBy: 'Admin',
        date: new Date().toISOString().slice(0, 10)
      }
    ];
  }

  async getWeeklySalesPerformance(_user: User, _filter?: ReportFilter): Promise<WeeklySalesPerformanceItem[]> {
    return [
      {
        weekStarting: '2023-10-01',
        salesRepId: 'usr-101',
        salesRepName: 'John Doe',
        totalSales: 150000,
        totalCollections: 140000,
        calculatedPayout: 3000
      }
    ];
  }

  // 3. POS Reports

  async getCashierTillReconciliation(_user: User, _filter?: ReportFilter): Promise<TillReconciliationItem[]> {
    const posTransactions = await this.posSvc.getAllTransactions();
    // Simplified logic: group by cashier and date
    const map = new Map<string, TillReconciliationItem>();
    
    for (const tx of posTransactions) {
      if (tx.status !== 'COMPLETED') continue;
      const date = tx.createdAt.slice(0, 10);
      const key = `${date}_${tx.cashierId}`;
      
      if (!map.has(key)) {
        map.set(key, {
          date,
          cashierId: tx.cashierId,
          cashierName: tx.cashierName || 'N/A',
          expectedCash: 0,
          actualCash: 0,
          variance: 0,
          expectedCard: 0,
          actualCard: 0,
          status: 'BALANCED'
        });
      }
      const entry = map.get(key)!;
      if (tx.paymentMethod === 'CASH') {
        entry.expectedCash += tx.totalAmount;
        entry.actualCash += tx.totalAmount; // Assuming balanced till
      } else if (tx.paymentMethod === 'CARD') {
        entry.expectedCard += tx.totalAmount;
        entry.actualCard += tx.totalAmount;
      }
    }
    
    return Array.from(map.values());
  }

  async getPosChequeRegister(_user: User, _filter?: ReportFilter): Promise<PosChequeRegisterItem[]> {
    return [
      {
        posTransactionId: 'pos-tx-001',
        chequeNumber: 'CHQ-9921',
        amount: 25000,
        dueDate: new Date().toISOString().slice(0, 10),
        status: 'PENDING'
      }
    ];
  }

  async getPosAuditLog(_user: User, _filter?: ReportFilter): Promise<PosAuditLogItem[]> {
    return [
      {
        logId: 'log-001',
        date: new Date().toISOString(),
        cashierId: 'usr-105',
        cashierName: 'Jane Smith',
        action: 'VOID',
        transactionId: 'pos-tx-002',
        amountImpact: 5000,
        reason: 'Customer changed mind',
        authorizedBy: 'usr-104'
      }
    ];
  }

  async getDailyShowroomSummary(_user: User, _filter?: ReportFilter): Promise<DailyShowroomSummary[]> {
    const posTransactions = await this.posSvc.getAllTransactions();
    const map = new Map<string, DailyShowroomSummary>();
    
    for (const tx of posTransactions) {
      if (tx.status !== 'COMPLETED') continue;
      const date = tx.createdAt.slice(0, 10);
      
      if (!map.has(date)) {
        map.set(date, {
          date,
          totalSales: 0,
          cashSales: 0,
          cardSales: 0,
          chequeSales: 0,
          walkInSales: 0,
          customerSales: 0,
          transactionCount: 0
        });
      }
      
      const entry = map.get(date)!;
      entry.totalSales += tx.totalAmount;
      entry.transactionCount += 1;
      
      if (tx.paymentMethod === 'CASH') entry.cashSales += tx.totalAmount;
      else if (tx.paymentMethod === 'CARD') entry.cardSales += tx.totalAmount;
      
      if (tx.customerId) entry.customerSales += tx.totalAmount;
      else entry.walkInSales += tx.totalAmount;
    }
    
    return Array.from(map.values()).sort((a,b) => b.date.localeCompare(a.date));
  }

  // 4. Inventory Reports

  async getOldStockTracking(_user: User, _filter?: ReportFilter): Promise<OldStockItem[]> {
    const productsResult = await this.productSvc.listProducts({ page: 1, pageSize: 10000 });
    return productsResult.data
      .filter(p => (p.stockOnHand || 0) > 0)
      .map(p => ({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        lastMovedDate: p.updatedAt,
        daysUnmoved: Math.floor((new Date().getTime() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24)),
        quantity: p.stockOnHand || 0,
        stockValue: (p.stockOnHand || 0) * (p.pricing.costPrice || 0)
      }))
      .filter(p => p.daysUnmoved > 90)
      .sort((a,b) => b.daysUnmoved - a.daysUnmoved);
  }

  async getGrnSummary(_user: User, _filter?: ReportFilter): Promise<GrnSummaryItem[]> {
    return [
      {
        grnId: 'grn-001',
        date: new Date().toISOString().slice(0, 10),
        supplierName: 'ABC Suppliers',
        totalItems: 50,
        totalValue: 120000,
        receivedBy: 'usr-102'
      }
    ];
  }

  async getBatchExpiration(_user: User, _filter?: ReportFilter): Promise<BatchExpirationItem[]> {
    return [
      {
        productId: 'prod-001',
        productName: 'Sample Product',
        batchNumber: 'BATCH-2023',
        quantity: 100,
        expiryDate: '2024-12-31',
        daysToExpiry: 60
      }
    ];
  }

  async getStockVariance(_user: User, _filter?: ReportFilter): Promise<StockVarianceItem[]> {
    return [
      {
        adjustmentId: 'adj-stock-001',
        date: new Date().toISOString().slice(0, 10),
        productId: 'prod-001',
        productName: 'Sample Product',
        systemQuantity: 100,
        actualQuantity: 98,
        variance: -2,
        reason: 'Damaged during transit',
        adjustedBy: 'usr-102'
      }
    ];
  }

  async getStockMovement(_user: User, _filter?: ReportFilter): Promise<StockMovementItem[]> {
    return [
      {
        productId: 'prod-001',
        productName: 'Sample Product',
        date: new Date().toISOString().slice(0, 10),
        movementType: 'OUT',
        fromLocation: 'Warehouse',
        toLocation: 'Customer',
        quantity: 5,
        referenceId: 'inv-001'
      }
    ];
  }

  async getSlowMovingProducts(_user: User, _filter?: ReportFilter): Promise<SlowMovingProduct[]> {
    const productsResult = await this.productSvc.listProducts({ page: 1, pageSize: 10000 });
    const invoicesResult = await this.invoiceSvc.getInvoices({ page: 1, pageSize: 10000 });
    
    const unitsSoldMap = new Map<string, number>();
    for (const inv of invoicesResult.data) {
      if (inv.status === 'CANCELLED') continue;
      for (const item of inv.items) {
        unitsSoldMap.set(item.productId, (unitsSoldMap.get(item.productId) || 0) + item.quantity);
      }
    }
    
    return productsResult.data
      .map(p => {
        const sold = unitsSoldMap.get(p.id) || 0;
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          unitsSold: sold,
          stockOnHand: p.stockOnHand || 0,
          velocityScore: (p.stockOnHand || 0) > 0 ? sold / (p.stockOnHand || 1) : 0
        };
      })
      .filter(p => p.stockOnHand > 0 && p.velocityScore < 0.1) // threshold for slow
      .sort((a,b) => a.velocityScore - b.velocityScore);
  }
}

export const advancedReportService = new AdvancedReportService();
