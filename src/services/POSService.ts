import { IPOSRepository, POSTransactionFilters } from '../repositories/IPOSRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { IProductRepository } from '../repositories/IProductRepository';
import { IPrinterService, printerService } from './PrinterService';
import {
  POSSession,
  CashTransaction,
  POSTransaction,
  POSTransactionItem,
  POSPaymentMethod,
  ChequeDetails,
  SessionSummary,
} from '../types/pos';
import { StockBalance, StockMovement } from '../types/inventory';
import {
  validatePOSDiscount,
  calculateReconciliation,
  validateCashierSession,
  validateShowroomStock,
} from '../rules/posRules';
import { MockPOSRepository } from '../repositories/mock/MockPOSRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { MOCK_PRODUCTS } from '../mock/mockProducts';

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  discountPercentage?: number;
  productNameSnapshot?: string;
  skuSnapshot?: string;
  barcodeSnapshot?: string;
  unitPriceSnapshot?: number;
  taxPercentage?: number;
}

export interface CheckoutData {
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  items: CheckoutItemInput[];
  paymentMethod: POSPaymentMethod;
  cashTendered?: number;
  chequeDetails?: ChequeDetails;
}

export class POSService {
  constructor(
    private posRepo: IPOSRepository,
    private invRepo: IInventoryRepository,
    private productRepo?: IProductRepository,
    private printer: IPrinterService = printerService
  ) {}

  /**
   * Helper to seed showroom stock for products (central inventory ledger).
   */
  async seedShowroomStock(productId: string, quantity: number): Promise<StockBalance> {
    let bal = await this.invRepo.getBalance(productId, 'SHOWROOM');
    if (!bal) {
      bal = {
        id: `bal-sr-${productId}`,
        productId,
        locationId: 'SHOWROOM',
        locationType: 'SHOWROOM',
        availableQuantity: quantity,
        reservedQuantity: 0,
        damagedQuantity: 0,
        returnedQuantity: 0,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      bal.availableQuantity = quantity;
      bal.lastUpdated = new Date().toISOString();
    }
    await this.invRepo.saveBalance(bal);
    return bal;
  }

  /**
   * Opens a new POS shift session for a cashier.
   * Enforces that only one active open session is allowed per cashier.
   */
  async openSession(
    cashier: { id: string; name: string },
    openingBalance: number,
    notes?: string
  ): Promise<POSSession> {
    if (openingBalance < 0) {
      throw new Error('Opening float balance cannot be negative.');
    }

    const active = await this.posRepo.getActiveSession(cashier.id);
    if (active) {
      throw new Error(
        `Cashier ${cashier.name} already has an active open session (${active.sessionNumber}). Please close the active session first.`
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const sessionNumber = `SES-${dateStr}-${randSuffix}`;

    const session: POSSession = {
      id: `pos-sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sessionNumber,
      cashierId: cashier.id,
      cashierName: cashier.name,
      openedAt: new Date().toISOString(),
      openingBalance,
      status: 'OPEN',
      cashInTotal: 0,
      cashOutTotal: 0,
      totalSales: 0,
      totalTransactions: 0,
      notes,
    };

    return this.posRepo.createSession(session);
  }

  /**
   * Closes an active POS shift session, computing expected cash reconciliation.
   */
  async closeSession(
    sessionId: string,
    actualCash: number,
    notes?: string
  ): Promise<POSSession> {
    if (actualCash < 0) {
      throw new Error('Actual counted cash cannot be negative.');
    }

    const session = await this.posRepo.getSessionById(sessionId);
    if (!session) {
      throw new Error(`POS session with ID "${sessionId}" not found.`);
    }

    if (session.status === 'CLOSED') {
      throw new Error(`POS session ${session.sessionNumber} is already closed.`);
    }

    const transactions = await this.posRepo.getAllTransactions({ sessionId });
    const cashSalesTotal = transactions
      .filter((t) => t.status === 'COMPLETED' && (t.paymentMethod === 'CASH' || t.paymentMethod === 'SPLIT'))
      .reduce((sum, t) => {
        if (t.paymentMethod === 'CASH') {
          return sum + t.totalAmount;
        }
        return sum + (t.cashTendered ? Math.min(t.totalAmount, t.cashTendered) : t.totalAmount);
      }, 0);

    const recon = calculateReconciliation(
      session.openingBalance,
      session.cashInTotal,
      session.cashOutTotal,
      cashSalesTotal,
      actualCash
    );

    session.closingBalance = actualCash;
    session.expectedCash = recon.expectedCash;
    session.actualCash = actualCash;
    session.cashDifference = recon.difference;
    session.status = 'CLOSED';
    session.closedAt = new Date().toISOString();

    if (notes) {
      session.notes = session.notes ? `${session.notes} | ${notes}` : notes;
    }

    return this.posRepo.updateSession(session);
  }

  /**
   * Records a Cash In or Cash Out movement against an active session float.
   */
  async recordCashMovement(
    sessionId: string,
    type: 'CASH_IN' | 'CASH_OUT',
    amount: number,
    reason: string,
    user: { id: string; name: string }
  ): Promise<CashTransaction> {
    const session = await this.posRepo.getSessionById(sessionId);
    validateCashierSession(session);

    if (amount <= 0) {
      throw new Error('Cash movement amount must be greater than zero.');
    }

    if (!reason || reason.trim() === '') {
      throw new Error('A reason is mandatory for cash in / cash out movements.');
    }

    const cashTx: CashTransaction = {
      id: `cash-tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sessionId,
      type,
      amount,
      reason: reason.trim(),
      performedById: user.id,
      performedByName: user.name,
      timestamp: new Date().toISOString(),
    };

    if (type === 'CASH_IN') {
      session!.cashInTotal = Number((session!.cashInTotal + amount).toFixed(2));
    } else {
      session!.cashOutTotal = Number((session!.cashOutTotal + amount).toFixed(2));
    }

    await this.posRepo.addCashTransaction(cashTx);
    await this.posRepo.updateSession(session!);

    return cashTx;
  }

  /**
   * Processes checkout:
   * - Validates session is OPEN
   * - Validates Showroom stock availability
   * - Validates cashier discount against product/role ceiling
   * - Creates immutable POSTransaction & POSTransactionItem snapshots
   * - Deducts Showroom stock via central SALES_ISSUE movement
   * - Updates session sales totals
   */
  async processCheckout(
    sessionId: string,
    data: CheckoutData,
    user: { id: string; name: string }
  ): Promise<POSTransaction> {
    const session = await this.posRepo.getSessionById(sessionId);
    validateCashierSession(session);

    if (!data.items || data.items.length === 0) {
      throw new Error('Transaction must contain at least one item.');
    }

    // Aggregate requested quantities per product to prevent multi-line stock breaches
    const totalRequestedQtyMap: Record<string, number> = {};
    for (const item of data.items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new Error('Item quantity must be greater than zero.');
      }
      totalRequestedQtyMap[item.productId] = (totalRequestedQtyMap[item.productId] || 0) + item.quantity;
    }

    // Verify Showroom stock in central inventory ledger for aggregated quantities
    for (const [prodId, totalRequested] of Object.entries(totalRequestedQtyMap)) {
      const showroomBalance = await this.invRepo.getBalance(prodId, 'SHOWROOM');
      validateShowroomStock(prodId, totalRequested, showroomBalance);
    }

    const processedItems: POSTransactionItem[] = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    for (const item of data.items) {

      // Resolve product master details
      let name = item.productNameSnapshot;
      let sku = item.skuSnapshot;
      let barcode = item.barcodeSnapshot;
      let unitPrice = item.unitPriceSnapshot;
      let maxDiscount = 15; // default fallback product ceiling
      let taxRate = item.taxPercentage ?? 0;

      if (this.productRepo) {
        const prod = await this.productRepo.getById(item.productId);
        if (prod) {
          name = prod.name;
          sku = prod.sku;
          barcode = prod.barcode;
          unitPrice = prod.pricing.currentSellingPrice;
          maxDiscount = prod.pricing.maxDiscountPercentage;
          taxRate = prod.pricing.taxRatePercentage || 0;
        } else if (!name || unitPrice === undefined) {
          throw new Error(`Product "${item.productId}" not found in Product Master.`);
        }
      } else {
        // Fallback to MOCK_PRODUCTS if productRepo not explicitly passed
        const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId);
        if (prod) {
          name = name || prod.name;
          sku = sku || prod.sku;
          barcode = barcode || prod.barcode;
          unitPrice = unitPrice ?? prod.pricing.currentSellingPrice;
          maxDiscount = prod.pricing.maxDiscountPercentage;
          taxRate = taxRate || (prod.pricing.taxRatePercentage || 0);
        }
      }

      if (!name || unitPrice === undefined) {
        throw new Error(`Product details missing for item ${item.productId}.`);
      }

      const requestedDiscount = item.discountPercentage || 0;
      validatePOSDiscount(requestedDiscount, maxDiscount, 5);

      const itemSubtotal = Number((unitPrice * item.quantity).toFixed(2));
      const itemDiscount = Number(((itemSubtotal * requestedDiscount) / 100).toFixed(2));
      const lineNet = Number((itemSubtotal - itemDiscount).toFixed(2));
      const lineTax = Number(((lineNet * taxRate) / 100).toFixed(2));

      subtotal += itemSubtotal;
      discountTotal += itemDiscount;
      taxTotal += lineTax;

      processedItems.push({
        productId: item.productId,
        productNameSnapshot: name,
        skuSnapshot: sku || '',
        barcodeSnapshot: barcode || '',
        unitPriceSnapshot: unitPrice,
        discountPercentage: requestedDiscount,
        taxPercentage: taxRate,
        lineTotal: lineNet,
        quantity: item.quantity,
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    discountTotal = Number(discountTotal.toFixed(2));
    taxTotal = Number(taxTotal.toFixed(2));
    const totalAmount = Number((subtotal - discountTotal + taxTotal).toFixed(2));

    let cashTendered = data.cashTendered;
    let changeGiven: number | undefined;

    if (data.paymentMethod === 'CASH') {
      if (cashTendered === undefined) {
        cashTendered = totalAmount;
      }
      if (cashTendered < totalAmount) {
        throw new Error(
          `Cash tendered (LKR ${cashTendered}) is less than total payable amount (LKR ${totalAmount}).`
        );
      }
      changeGiven = Number((cashTendered - totalAmount).toFixed(2));
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `POS-REC-${dateStr}-${randSuffix}`;

    const tx: POSTransaction = {
      id: `pos-tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      receiptNumber,
      sessionId,
      customerId: data.customerId,
      customerName: data.customerName || 'Walk-in Retail Customer',
      customerCode: data.customerCode,
      items: processedItems,
      subtotal,
      discountTotal,
      taxTotal,
      totalAmount,
      paymentMethod: data.paymentMethod,
      cashTendered,
      changeGiven,
      chequeDetails: data.chequeDetails,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      cashierId: user.id,
      cashierName: user.name,
    };

    // Deduct Showroom stock in Central Inventory Ledger via SALES_ISSUE
    for (const item of processedItems) {
      let balance = await this.invRepo.getBalance(item.productId, 'SHOWROOM');
      if (!balance) {
        throw new Error(`Showroom stock balance record missing for product ${item.productId}.`);
      }

      balance.availableQuantity -= item.quantity;
      balance.lastUpdated = new Date().toISOString();
      await this.invRepo.saveBalance(balance);

      const movement: StockMovement = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        productId: item.productId,
        sourceLocation: 'SHOWROOM',
        quantity: item.quantity,
        movementType: 'SALES_ISSUE',
        referenceDocumentType: 'POS_RECEIPT',
        referenceDocumentId: tx.receiptNumber,
        performedById: user.id,
        performedByName: user.name,
        reason: `Showroom POS sale receipt #${tx.receiptNumber}`,
        timestamp: new Date().toISOString(),
      };
      await this.invRepo.addMovement(movement);
    }

    // Update session running totals
    session!.totalSales = Number((session!.totalSales + tx.totalAmount).toFixed(2));
    session!.totalTransactions += 1;
    await this.posRepo.updateSession(session!);

    // Save transaction
    await this.posRepo.createTransaction(tx);

    // Connect with PrinterService to generate 80mm thermal receipt
    try {
      if (this.printer) {
        await this.printer.printPOSTransactionReceipt(tx);
      }
    } catch (e) {
      // Non-blocking in headless / testing environments
      console.warn('Thermal receipt generation skipped or failed:', e);
    }

    return tx;
  }

  /**
   * Processes a refund:
   * - Returns items to Showroom stock via central SALES_RETURN movement
   * - Marks transaction as REFUNDED with reason and audit timestamp
   * - Updates session sales totals
   */
  async refundTransaction(
    transactionId: string,
    reason: string,
    user: { id: string; name: string }
  ): Promise<POSTransaction> {
    const tx = await this.posRepo.getTransactionById(transactionId);
    if (!tx) {
      throw new Error(`POS transaction with ID "${transactionId}" not found.`);
    }

    if (tx.status === 'REFUNDED') {
      throw new Error(`Transaction ${tx.receiptNumber} has already been refunded.`);
    }

    if (!reason || reason.trim() === '') {
      throw new Error('A reason is mandatory for processing a transaction refund.');
    }

    // Return items to Showroom inventory via central SALES_RETURN movement
    for (const item of tx.items) {
      let balance = await this.invRepo.getBalance(item.productId, 'SHOWROOM');
      if (!balance) {
        balance = {
          id: `bal-sr-${item.productId}`,
          productId: item.productId,
          locationId: 'SHOWROOM',
          locationType: 'SHOWROOM',
          availableQuantity: 0,
          reservedQuantity: 0,
          damagedQuantity: 0,
          returnedQuantity: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      balance.availableQuantity += item.quantity;
      balance.lastUpdated = new Date().toISOString();
      await this.invRepo.saveBalance(balance);

      const returnMovement: StockMovement = {
        id: `mov-ret-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        productId: item.productId,
        targetLocation: 'SHOWROOM',
        quantity: item.quantity,
        movementType: 'SALES_RETURN',
        referenceDocumentType: 'POS_REFUND',
        referenceDocumentId: tx.receiptNumber,
        performedById: user.id,
        performedByName: user.name,
        reason: reason.trim(),
        timestamp: new Date().toISOString(),
      };
      await this.invRepo.addMovement(returnMovement);
    }

    tx.status = 'REFUNDED';
    tx.refundReason = reason.trim();
    tx.refundedAt = new Date().toISOString();
    tx.refundedById = user.id;
    tx.refundedByName = user.name;

    await this.posRepo.updateTransaction(tx);

    // If session exists, adjust sales
    if (tx.sessionId) {
      const session = await this.posRepo.getSessionById(tx.sessionId);
      if (session) {
        session.totalSales = Number(Math.max(0, session.totalSales - tx.totalAmount).toFixed(2));
        await this.posRepo.updateSession(session);
      }
    }

    return tx;
  }

  /**
   * Retrieves active open session for a cashier.
   */
  async getActiveSession(cashierId: string): Promise<POSSession | null> {
    return this.posRepo.getActiveSession(cashierId);
  }

  /**
   * Generates a comprehensive shift summary with breakdown by payment method and reconciliation.
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    const session = await this.posRepo.getSessionById(sessionId);
    if (!session) {
      throw new Error(`POS session with ID "${sessionId}" not found.`);
    }

    const cashTransactions = await this.posRepo.getCashTransactionsBySession(sessionId);
    const transactions = await this.posRepo.getAllTransactions({ sessionId });

    let cashSalesTotal = 0;
    let chequeSalesTotal = 0;
    let cardSalesTotal = 0;
    let splitSalesTotal = 0;
    let totalRefunds = 0;

    for (const t of transactions) {
      if (t.status === 'REFUNDED') {
        totalRefunds += t.totalAmount;
        continue;
      }
      switch (t.paymentMethod) {
        case 'CASH':
          cashSalesTotal += t.totalAmount;
          break;
        case 'CHEQUE':
          chequeSalesTotal += t.totalAmount;
          break;
        case 'CARD':
          cardSalesTotal += t.totalAmount;
          break;
        case 'SPLIT':
          splitSalesTotal += t.totalAmount;
          cashSalesTotal += t.cashTendered ? Math.min(t.totalAmount, t.cashTendered) : t.totalAmount;
          break;
      }
    }

    const netSales = Number((session.totalSales - totalRefunds).toFixed(2));
    const countedCash = session.actualCash ?? (session.openingBalance + session.cashInTotal - session.cashOutTotal + cashSalesTotal);
    const reconciliation = calculateReconciliation(
      session.openingBalance,
      session.cashInTotal,
      session.cashOutTotal,
      cashSalesTotal,
      countedCash
    );

    return {
      session,
      cashTransactions,
      transactions,
      cashSalesTotal: Number(cashSalesTotal.toFixed(2)),
      chequeSalesTotal: Number(chequeSalesTotal.toFixed(2)),
      cardSalesTotal: Number(cardSalesTotal.toFixed(2)),
      splitSalesTotal: Number(splitSalesTotal.toFixed(2)),
      totalRefunds: Number(totalRefunds.toFixed(2)),
      netSales,
      reconciliation,
    };
  }

  async getAllSessions(): Promise<POSSession[]> {
    return this.posRepo.getAllSessions();
  }

  async getAllTransactions(filters?: POSTransactionFilters): Promise<POSTransaction[]> {
    return this.posRepo.getAllTransactions(filters);
  }

  async getTransactionById(id: string): Promise<POSTransaction | null> {
    return this.posRepo.getTransactionById(id);
  }
}

// Global singleton instances for UI consumption
export const mockPOSRepository = new MockPOSRepository();
export const mockInventoryRepositoryForPOS = new MockInventoryRepository();
export const mockProductRepositoryForPOS = new MockProductRepository();

export const posService = new POSService(
  mockPOSRepository,
  mockInventoryRepositoryForPOS,
  mockProductRepositoryForPOS,
  printerService
);

// Seed initial showroom stock for mock products in the singleton instance
for (const p of MOCK_PRODUCTS) {
  posService.seedShowroomStock(p.id, Math.min(50, p.stockOnHand || 50));
}
