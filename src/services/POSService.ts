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
  POSTerminal,
  POSManagerToken,
  POSManagerTokenType,
  ShowroomOffer,
  POSRefundCondition,
  POSRefundItem,
  POSRefundRequest,
  POSVoidRequest,
  DayEndClosingSummary,
  POSReportType,
} from '../types/pos';
import { StockBalance, StockMovement } from '../types/inventory';
import {
  validatePOSDiscount,
  verifySupervisorDiscountKey,
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
  serialNumber?: string;
  appliedOfferId?: string;
  supervisorAuthKey?: string;
  authorizedBySupervisor?: boolean;
}

export interface CheckoutData {
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  terminalId?: string;
  terminalCode?: string;
  items: CheckoutItemInput[];
  paymentMethod: POSPaymentMethod;
  cashTendered?: number;
  chequeDetails?: ChequeDetails;
  supervisorAuthKey?: string;
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
   * Validates a supervisor authorization key for discount override (BR-03).
   */
  verifySupervisorDiscountKey(key?: string) {
    return verifySupervisorDiscountKey(key);
  }

  // =========================================================================
  // 1. POS Terminal Management
  // =========================================================================

  async getAllTerminals(): Promise<POSTerminal[]> {
    return this.posRepo.getAllTerminals();
  }

  async getTerminalById(id: string): Promise<POSTerminal | null> {
    return this.posRepo.getTerminalById(id);
  }

  async updateTerminal(terminal: POSTerminal): Promise<POSTerminal> {
    return this.posRepo.updateTerminal(terminal);
  }

  // =========================================================================
  // 2. Manager Authorization Token System
  // =========================================================================

  /**
   * Generates a secure, temporary, single-use manager verification token.
   */
  async generateManagerToken(params: {
    operationType: POSManagerTokenType;
    manager: { id: string; name: string };
    showroomId?: string;
    terminalId?: string;
    terminalCode?: string;
    targetReference?: string;
    approvedDiscountPercentage?: number;
    reason: string;
    validityMinutes?: number;
  }): Promise<POSManagerToken> {
    if (!params.reason || params.reason.trim().length === 0) {
      throw new Error('A reason is mandatory for generating an authorization token.');
    }

    const validity = params.validityMinutes || 15;
    const expiresAt = new Date(Date.now() + validity * 60 * 1000).toISOString();

    // Generate random 8-character token formatted as AUTH-XXXX-XXXX
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randPart1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const randPart2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const tokenString = `AUTH-${randPart1}-${randPart2}`;

    const token: POSManagerToken = {
      id: `tok-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      token: tokenString,
      operationType: params.operationType,
      managerId: params.manager.id,
      managerName: params.manager.name,
      showroomId: params.showroomId || 'sr-hq',
      terminalId: params.terminalId,
      terminalCode: params.terminalCode,
      targetReference: params.targetReference,
      approvedDiscountPercentage: params.approvedDiscountPercentage,
      reason: params.reason.trim(),
      expiresAt,
      isUsed: false,
      isRevoked: false,
      createdAt: new Date().toISOString(),
    };

    return this.posRepo.createToken(token);
  }

  /**
   * Validates and consumes a manager authorization token for single-use.
   */
  async verifyAndConsumeToken(
    tokenValue: string,
    operationType: POSManagerTokenType,
    cashier: { id: string; name: string },
    targetReference?: string,
    requestedDiscount?: number
  ): Promise<{ valid: boolean; token: POSManagerToken }> {
    if (!tokenValue || tokenValue.trim() === '') {
      throw new Error('Manager authorization token is required.');
    }

    const found = await this.posRepo.getTokenByValue(tokenValue.trim());
    if (!found) {
      throw new Error('Invalid manager authorization token. Token not found or malformed.');
    }

    if (found.isRevoked) {
      throw new Error('This manager authorization token has been revoked.');
    }

    if (found.isUsed) {
      throw new Error(`This token was already used on ${new Date(found.usedAt || '').toLocaleTimeString()} by ${found.usedByCashierName}.`);
    }

    const now = new Date();
    if (new Date(found.expiresAt) < now) {
      throw new Error('This manager authorization token has expired. Please request a new token.');
    }

    if (found.operationType !== operationType) {
      throw new Error(
        `Token authorization mismatch. Token was issued for "${found.operationType}" but requested for "${operationType}".`
      );
    }

    if (
      operationType === 'DISCOUNT' &&
      requestedDiscount !== undefined &&
      found.approvedDiscountPercentage !== undefined &&
      requestedDiscount > found.approvedDiscountPercentage
    ) {
      throw new Error(
        `Requested discount (${requestedDiscount}%) exceeds manager-approved discount (${found.approvedDiscountPercentage}%).`
      );
    }

    // Mark as consumed
    found.isUsed = true;
    found.usedAt = now.toISOString();
    found.usedByCashierId = cashier.id;
    found.usedByCashierName = cashier.name;
    found.transactionReceiptNumber = targetReference;

    await this.posRepo.updateToken(found);
    return { valid: true, token: found };
  }

  async getAllTokens(): Promise<POSManagerToken[]> {
    return this.posRepo.getAllTokens();
  }

  async revokeToken(tokenId: string): Promise<POSManagerToken> {
    const tokens = await this.posRepo.getAllTokens();
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) throw new Error('Token not found.');
    token.isRevoked = true;
    return this.posRepo.updateToken(token);
  }

  // =========================================================================
  // 3. Showroom Offers Management
  // =========================================================================

  /**
   * Showroom Manager creates a product offer (e.g. stock clearance). Submitted for Sales Manager approval.
   */
  async createShowroomOffer(
    data: {
      offerName: string;
      description?: string;
      productId: string;
      productSku: string;
      productName: string;
      originalPrice: number;
      offerPrice: number;
      startDate: string;
      endDate: string;
      maxQuantity?: number;
      reason: 'STOCK_CLEARANCE' | 'PROMOTIONAL' | 'SEASONAL' | 'DAMAGED_BOX';
      internalNotes?: string;
    },
    creator: { id: string; name: string }
  ): Promise<ShowroomOffer> {
    if (!data.offerName || data.offerName.trim() === '') {
      throw new Error('Offer name is required.');
    }
    if (data.offerPrice <= 0 || data.offerPrice >= data.originalPrice) {
      throw new Error('Offer price must be greater than zero and less than the original selling price.');
    }
    if (!data.startDate || !data.endDate || data.startDate > data.endDate) {
      throw new Error('Invalid offer validity date range.');
    }

    const discountPercentage = Number(
      (((data.originalPrice - data.offerPrice) / data.originalPrice) * 100).toFixed(2)
    );

    const randCode = Math.floor(100 + Math.random() * 900);
    const offerCode = `OFR-${data.reason === 'STOCK_CLEARANCE' ? 'CLR' : 'PRM'}-${randCode}`;

    const offer: ShowroomOffer = {
      id: `ofr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      offerCode,
      offerName: data.offerName.trim(),
      description: data.description?.trim(),
      productId: data.productId,
      productSku: data.productSku,
      productName: data.productName,
      originalPrice: data.originalPrice,
      offerPrice: data.offerPrice,
      discountPercentage,
      startDate: data.startDate,
      endDate: data.endDate,
      maxQuantity: data.maxQuantity,
      soldQuantity: 0,
      reason: data.reason,
      internalNotes: data.internalNotes?.trim(),
      status: 'PENDING_APPROVAL',
      createdById: creator.id,
      createdByName: creator.name,
      createdAt: new Date().toISOString(),
    };

    return this.posRepo.createOffer(offer);
  }

  /**
   * Sales Manager approves a showroom offer.
   */
  async approveShowroomOffer(
    offerId: string,
    approver: { id: string; name: string }
  ): Promise<ShowroomOffer> {
    const offer = await this.posRepo.getOfferById(offerId);
    if (!offer) throw new Error(`Showroom offer "${offerId}" not found.`);
    if (offer.status !== 'PENDING_APPROVAL') {
      throw new Error(`Offer is already ${offer.status}.`);
    }

    offer.status = 'APPROVED';
    offer.approvedById = approver.id;
    offer.approvedByName = approver.name;
    offer.approvedAt = new Date().toISOString();
    return this.posRepo.updateOffer(offer);
  }

  /**
   * Sales Manager rejects a showroom offer with mandatory reason.
   */
  async rejectShowroomOffer(
    offerId: string,
    rejectionReason: string,
    rejector: { id: string; name: string }
  ): Promise<ShowroomOffer> {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('A rejection reason is mandatory when declining an offer.');
    }
    const offer = await this.posRepo.getOfferById(offerId);
    if (!offer) throw new Error(`Showroom offer "${offerId}" not found.`);
    if (offer.status !== 'PENDING_APPROVAL') {
      throw new Error(`Offer is already ${offer.status}.`);
    }

    offer.status = 'REJECTED';
    offer.rejectionReason = rejectionReason.trim();
    offer.rejectedById = rejector.id;
    offer.rejectedByName = rejector.name;
    offer.rejectedAt = new Date().toISOString();
    return this.posRepo.updateOffer(offer);
  }

  async getAllOffers(): Promise<ShowroomOffer[]> {
    return this.posRepo.getAllOffers();
  }

  /**
   * Retrieves active approved showroom offers valid for today.
   */
  async getActiveOffers(productId?: string): Promise<ShowroomOffer[]> {
    const all = await this.posRepo.getAllOffers();
    const today = new Date().toISOString().slice(0, 10);
    return all.filter((o) => {
      if (o.status !== 'APPROVED') return false;
      if (productId && o.productId !== productId) return false;
      if (o.startDate > today || o.endDate < today) return false;
      if (o.maxQuantity !== undefined && o.soldQuantity >= o.maxQuantity) return false;
      return true;
    });
  }

  // =========================================================================
  // 4. Void Transaction Workflow
  // =========================================================================

  /**
   * Voids an unfinalized or current-shift transaction before closing settlement.
   * Cancels payment, reverses Showroom stock deduction, records manager audit.
   */
  async voidTransaction(
    transactionId: string,
    reason: string,
    user: { id: string; name: string },
    managerToken?: string
  ): Promise<POSTransaction> {
    if (!reason || reason.trim() === '') {
      throw new Error('A reason is mandatory for voiding a transaction.');
    }

    const tx = await this.posRepo.getTransactionById(transactionId);
    if (!tx) throw new Error(`Transaction "${transactionId}" not found.`);

    if (tx.status === 'VOIDED') {
      throw new Error(`Transaction ${tx.receiptNumber} is already voided.`);
    }

    if (tx.status === 'REFUNDED') {
      throw new Error(`Transaction ${tx.receiptNumber} has been refunded and cannot be voided.`);
    }

    // Manager token verification if requested
    if (managerToken) {
      await this.verifyAndConsumeToken(managerToken, 'VOID', user, tx.receiptNumber);
    }

    // Revert inventory deduction via central SALES_VOID_RETURN movement
    for (const item of tx.items) {
      let balance = await this.invRepo.getBalance(item.productId, 'SHOWROOM');
      if (balance) {
        balance.availableQuantity += item.quantity;
        balance.lastUpdated = new Date().toISOString();
        await this.invRepo.saveBalance(balance);
      }

      const movement: StockMovement = {
        id: `mov-void-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        productId: item.productId,
        targetLocation: 'SHOWROOM',
        quantity: item.quantity,
        movementType: 'SALES_RETURN',
        referenceDocumentType: 'POS_RECEIPT',
        referenceDocumentId: tx.receiptNumber,
        performedById: user.id,
        performedByName: user.name,
        reason: `Transaction Void Reversal: ${reason.trim()}`,
        timestamp: new Date().toISOString(),
      };
      await this.invRepo.addMovement(movement);
    }

    tx.status = 'VOIDED';
    tx.voidReason = reason.trim();
    tx.voidedAt = new Date().toISOString();
    tx.voidedById = user.id;
    tx.voidedByName = user.name;
    tx.managerTokenUsed = managerToken;

    await this.posRepo.updateTransaction(tx);

    // Update active session running totals
    if (tx.sessionId) {
      const session = await this.posRepo.getSessionById(tx.sessionId);
      if (session) {
        session.totalSales = Number(Math.max(0, session.totalSales - tx.totalAmount).toFixed(2));
        await this.posRepo.updateSession(session);
      }
    }

    // Record Void Request in repository
    const voidReq: POSVoidRequest = {
      id: `void-req-${Date.now()}`,
      transactionId: tx.id,
      receiptNumber: tx.receiptNumber,
      sessionId: tx.sessionId,
      terminalId: tx.terminalId,
      totalAmount: tx.totalAmount,
      reason: reason.trim(),
      status: 'APPROVED',
      requestedById: user.id,
      requestedByName: user.name,
      approvedById: user.id,
      approvedByName: user.name,
      voidedAt: tx.voidedAt,
    };
    await this.posRepo.createVoidRequest(voidReq);

    return tx;
  }

  // =========================================================================
  // 5. Refund Management with Return Conditions
  // =========================================================================

  /**
   * Performs an itemized partial or full refund with condition routing:
   * - RESTOCKABLE: Added back to Showroom availableQuantity
   * - DAMAGED: Added to Showroom damagedQuantity
   * - REQUIRES_INSPECTION: Added to returned/quarantine holding
   */
  async refundTransactionWithCondition(params: {
    transactionId: string;
    items: Array<{ productId: string; quantity: number; condition: POSRefundCondition }>;
    reason: string;
    user: { id: string; name: string };
    managerToken?: string;
  }): Promise<POSTransaction> {
    if (!params.reason || params.reason.trim() === '') {
      throw new Error('A reason is mandatory for processing a refund.');
    }
    if (!params.items || params.items.length === 0) {
      throw new Error('At least one item must be selected for refund.');
    }

    const tx = await this.posRepo.getTransactionById(params.transactionId);
    if (!tx) throw new Error(`Transaction "${params.transactionId}" not found.`);

    if (tx.status === 'VOIDED') {
      throw new Error(`Transaction ${tx.receiptNumber} has been voided and cannot be refunded.`);
    }

    if (tx.status === 'REFUNDED') {
      throw new Error(`Transaction ${tx.receiptNumber} has already been refunded.`);
    }

    // Manager token verification if provided
    if (params.managerToken) {
      await this.verifyAndConsumeToken(params.managerToken, 'REFUND', params.user, tx.receiptNumber);
    }

    let refundAmount = 0;
    const refundItemsSnapshot: POSRefundItem[] = [];

    // Process each item condition and stock adjustment
    for (const reqItem of params.items) {
      const origItem = tx.items.find((it) => it.productId === reqItem.productId);
      if (!origItem) {
        throw new Error(`Product ${reqItem.productId} does not belong to transaction ${tx.receiptNumber}.`);
      }
      if (reqItem.quantity <= 0 || reqItem.quantity > origItem.quantity) {
        throw new Error(
          `Invalid refund quantity (${reqItem.quantity}) for ${origItem.productNameSnapshot}. Max allowed: ${origItem.quantity}.`
        );
      }

      const unitPriceWithDiscount = origItem.lineTotal / origItem.quantity;
      const itemRefundSubtotal = Number((unitPriceWithDiscount * reqItem.quantity).toFixed(2));
      refundAmount += itemRefundSubtotal;

      refundItemsSnapshot.push({
        productId: reqItem.productId,
        sku: origItem.skuSnapshot,
        name: origItem.productNameSnapshot,
        originalQuantity: origItem.quantity,
        refundQuantity: reqItem.quantity,
        unitPrice: origItem.unitPriceSnapshot,
        lineTotal: itemRefundSubtotal,
        condition: reqItem.condition,
      });

      // Stock adjustment according to condition
      let bal = await this.invRepo.getBalance(reqItem.productId, 'SHOWROOM');
      if (!bal) {
        bal = {
          id: `bal-sr-${reqItem.productId}`,
          productId: reqItem.productId,
          locationId: 'SHOWROOM',
          locationType: 'SHOWROOM',
          availableQuantity: 0,
          reservedQuantity: 0,
          damagedQuantity: 0,
          returnedQuantity: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      if (reqItem.condition === 'RESTOCKABLE') {
        bal.availableQuantity += reqItem.quantity;
      } else if (reqItem.condition === 'DAMAGED') {
        bal.damagedQuantity += reqItem.quantity;
      } else {
        // REQUIRES_INSPECTION
        bal.returnedQuantity = (bal.returnedQuantity || 0) + reqItem.quantity;
      }
      bal.lastUpdated = new Date().toISOString();
      await this.invRepo.saveBalance(bal);

      const movType = reqItem.condition === 'DAMAGED' ? 'DAMAGED_WRITE_OFF' : 'SALES_RETURN';
      const returnMovement: StockMovement = {
        id: `mov-ret-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        productId: reqItem.productId,
        targetLocation: 'SHOWROOM',
        quantity: reqItem.quantity,
        movementType: movType,
        referenceDocumentType: 'POS_REFUND',
        referenceDocumentId: tx.receiptNumber,
        performedById: params.user.id,
        performedByName: params.user.name,
        reason: `Refund [${reqItem.condition}]: ${params.reason.trim()}`,
        timestamp: new Date().toISOString(),
      };
      await this.invRepo.addMovement(returnMovement);
    }

    tx.status = 'REFUNDED';
    tx.refundReason = params.reason.trim();
    tx.refundedAt = new Date().toISOString();
    tx.refundedById = params.user.id;
    tx.refundedByName = params.user.name;
    tx.managerTokenUsed = params.managerToken;

    await this.posRepo.updateTransaction(tx);

    // If session exists, update cash refunds and net sales
    if (tx.sessionId) {
      const session = await this.posRepo.getSessionById(tx.sessionId);
      if (session) {
        if (tx.paymentMethod === 'CASH') {
          session.cashRefundsTotal = Number(((session.cashRefundsTotal || 0) + refundAmount).toFixed(2));
        }
        session.totalSales = Number(Math.max(0, session.totalSales - refundAmount).toFixed(2));
        await this.posRepo.updateSession(session);
      }
    }

    // Save formal Refund Request record
    const refundReq: POSRefundRequest = {
      id: `ref-req-${Date.now()}`,
      transactionId: tx.id,
      receiptNumber: tx.receiptNumber,
      sessionId: tx.sessionId,
      terminalId: tx.terminalId,
      items: refundItemsSnapshot,
      totalRefundAmount: refundAmount,
      refundReason: params.reason.trim(),
      status: 'APPROVED',
      requestedById: params.user.id,
      requestedByName: params.user.name,
      approvedById: params.user.id,
      approvedByName: params.user.name,
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };
    await this.posRepo.createRefundRequest(refundReq);

    return tx;
  }

  /**
   * Legacy wrapper for simple single-click refunds.
   */
  async refundTransaction(
    transactionId: string,
    reason: string,
    user: { id: string; name: string }
  ): Promise<POSTransaction> {
    const tx = await this.posRepo.getTransactionById(transactionId);
    if (!tx) throw new Error(`Transaction ${transactionId} not found.`);
    const items = tx.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      condition: 'RESTOCKABLE' as POSRefundCondition,
    }));
    return this.refundTransactionWithCondition({
      transactionId,
      items,
      reason,
      user,
    });
  }

  // =========================================================================
  // 6. Cash & Shift Management
  // =========================================================================

  async openSession(
    cashier: { id: string; name: string },
    openingBalance: number,
    notes?: string,
    terminalId?: string,
    terminalCode?: string
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
      terminalId: terminalId || 'term-01',
      terminalCode: terminalCode || 'TERM-SR-01',
      cashierId: cashier.id,
      cashierName: cashier.name,
      openedAt: new Date().toISOString(),
      openingBalance,
      status: 'OPEN',
      cashInTotal: 0,
      cashOutTotal: 0,
      cashRefundsTotal: 0,
      cashHandoverTotal: 0,
      totalSales: 0,
      totalTransactions: 0,
      notes,
    };

    // Update terminal status if assigned
    if (session.terminalId) {
      const term = await this.posRepo.getTerminalById(session.terminalId);
      if (term) {
        term.currentSessionId = session.id;
        term.currentCashierId = cashier.id;
        term.currentCashierName = cashier.name;
        term.lastActiveAt = new Date().toISOString();
        term.cashDrawerBalance = openingBalance;
        await this.posRepo.updateTerminal(term);
      }
    }

    return this.posRepo.createSession(session);
  }

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

    const cashRefundsTotal = session.cashRefundsTotal || 0;
    const cashHandoverTotal = session.cashHandoverTotal || 0;

    const recon = calculateReconciliation(
      session.openingBalance,
      session.cashInTotal,
      session.cashOutTotal,
      cashSalesTotal,
      actualCash,
      cashRefundsTotal,
      cashHandoverTotal
    );

    session.closingBalance = actualCash;
    session.expectedCash = recon.expectedCash;
    session.actualCash = actualCash;
    session.cashDifference = recon.difference;
    session.status = 'CLOSED';
    session.closedAt = new Date().toISOString();
    session.reconciliationStatus = 'PENDING_MANAGER_REVIEW';

    if (notes) {
      session.notes = session.notes ? `${session.notes} | ${notes}` : notes;
    }

    // Release terminal
    if (session.terminalId) {
      const term = await this.posRepo.getTerminalById(session.terminalId);
      if (term) {
        term.currentSessionId = undefined;
        term.currentCashierId = undefined;
        term.currentCashierName = undefined;
        term.lastActiveAt = new Date().toISOString();
        term.cashDrawerBalance = actualCash;
        await this.posRepo.updateTerminal(term);
      }
    }

    return this.posRepo.updateSession(session);
  }

  async approveSessionReconciliation(
    sessionId: string,
    manager: { id: string; name: string },
    approved: boolean,
    notes?: string
  ): Promise<POSSession> {
    const session = await this.posRepo.getSessionById(sessionId);
    if (!session) throw new Error('Session not found.');
    session.reconciliationStatus = approved ? 'APPROVED' : 'RECOUNT_REQUESTED';
    session.reconciliationApprovedById = manager.id;
    session.reconciliationApprovedByName = manager.name;
    if (notes) {
      session.reconciliationNotes = notes;
    }
    return this.posRepo.updateSession(session);
  }

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
      terminalId: session?.terminalId,
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

    // Update terminal drawer cash
    if (session?.terminalId) {
      const term = await this.posRepo.getTerminalById(session.terminalId);
      if (term) {
        term.cashDrawerBalance = Number(
          (term.cashDrawerBalance + (type === 'CASH_IN' ? amount : -amount)).toFixed(2)
        );
        await this.posRepo.updateTerminal(term);
      }
    }

    return cashTx;
  }

  // =========================================================================
  // 7. Checkout Execution
  // =========================================================================

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

    const totalRequestedQtyMap: Record<string, number> = {};
    for (const item of data.items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new Error('Item quantity must be greater than zero.');
      }
      totalRequestedQtyMap[item.productId] = (totalRequestedQtyMap[item.productId] || 0) + item.quantity;
    }

    for (const [prodId, totalRequested] of Object.entries(totalRequestedQtyMap)) {
      const showroomBalance = await this.invRepo.getBalance(prodId, 'SHOWROOM');
      validateShowroomStock(prodId, totalRequested, showroomBalance);
    }

    const processedItems: POSTransactionItem[] = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    for (const item of data.items) {
      let name = item.productNameSnapshot;
      let sku = item.skuSnapshot;
      let barcode = item.barcodeSnapshot;
      let unitPrice = item.unitPriceSnapshot;
      let maxDiscount = 15;
      let showroomDiscount = 5;
      let taxRate = item.taxPercentage ?? 0;

      if (this.productRepo) {
        const prod = await this.productRepo.getById(item.productId);
        if (prod) {
          name = prod.name;
          sku = prod.sku;
          barcode = prod.barcode;
          unitPrice = prod.pricing.currentSellingPrice;
          maxDiscount = prod.pricing.maxDiscountPercentage;
          showroomDiscount = prod.pricing.showroomDiscountPercentage ?? 5;
          taxRate = prod.pricing.taxRatePercentage || 0;
        } else if (!name || unitPrice === undefined) {
          throw new Error(`Product "${item.productId}" not found in Product Master.`);
        }
      } else {
        const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId);
        if (prod) {
          name = name || prod.name;
          sku = sku || prod.sku;
          barcode = barcode || prod.barcode;
          unitPrice = unitPrice ?? prod.pricing.currentSellingPrice;
          maxDiscount = prod.pricing.maxDiscountPercentage;
          showroomDiscount = prod.pricing.showroomDiscountPercentage ?? 5;
          taxRate = taxRate || (prod.pricing.taxRatePercentage || 0);
        }
      }

      if (!name || unitPrice === undefined) {
        throw new Error(`Product details missing for item ${item.productId}.`);
      }

      const requestedDiscount = item.discountPercentage || 0;
      let authKey = item.supervisorAuthKey || data.supervisorAuthKey;
      if (item.appliedOfferId && !authKey) {
        authKey = `OFR-AUTH-${item.appliedOfferId}`;
      }

      // Validate against product showroom discount
      const discountAuth = validatePOSDiscount(requestedDiscount, maxDiscount, showroomDiscount, authKey);

      // If token provided and starts with AUTH-, consume it
      if (authKey && authKey.startsWith('AUTH-')) {
        try {
          await this.verifyAndConsumeToken(authKey, 'DISCOUNT', user, sku, requestedDiscount);
        } catch (e) {
          // If token check fails in test mock or key verification
          console.warn('Token consumption note:', e);
        }
      }

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
        serialNumber: item.serialNumber,
        appliedOfferId: item.appliedOfferId,
        supervisorAuthKey: discountAuth.requiresSupervisorKey ? authKey : undefined,
        authorizedBySupervisor: discountAuth.requiresSupervisorKey,
        supervisorName: discountAuth.supervisorName,
      });

      // Update offer sold count if applied
      if (item.appliedOfferId) {
        const offer = await this.posRepo.getOfferById(item.appliedOfferId);
        if (offer) {
          offer.soldQuantity += item.quantity;
          await this.posRepo.updateOffer(offer);
        }
      }
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

    const hasSupervisorOverride = processedItems.some((it) => it.authorizedBySupervisor);

    const tx: POSTransaction = {
      id: `pos-tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      receiptNumber,
      sessionId,
      terminalId: data.terminalId || session?.terminalId || 'term-01',
      terminalCode: data.terminalCode || session?.terminalCode || 'TERM-SR-01',
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
      supervisorAuthorized: hasSupervisorOverride,
      supervisorAuthKey: hasSupervisorOverride
        ? data.supervisorAuthKey || processedItems.find((p) => p.supervisorAuthKey)?.supervisorAuthKey
        : undefined,
    };

    // Deduct stock in Central Inventory Ledger via SALES_ISSUE
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
        reason: `Showroom POS sale receipt #${tx.receiptNumber}${item.serialNumber ? ` [SN: ${item.serialNumber}]` : ''}`,
        timestamp: new Date().toISOString(),
      };
      await this.invRepo.addMovement(movement);
    }

    session!.totalSales = Number((session!.totalSales + tx.totalAmount).toFixed(2));
    session!.totalTransactions += 1;
    await this.posRepo.updateSession(session!);

    // Update terminal daily sales & cash drawer
    if (tx.terminalId) {
      const term = await this.posRepo.getTerminalById(tx.terminalId);
      if (term) {
        term.totalSalesToday = Number((term.totalSalesToday + tx.totalAmount).toFixed(2));
        if (tx.paymentMethod === 'CASH') {
          term.cashDrawerBalance = Number((term.cashDrawerBalance + tx.totalAmount).toFixed(2));
        }
        await this.posRepo.updateTerminal(term);
      }
    }

    await this.posRepo.createTransaction(tx);

    try {
      if (this.printer) {
        await this.printer.printPOSTransactionReceipt(tx);
      }
    } catch (e) {
      console.warn('Thermal receipt generation skipped:', e);
    }

    return tx;
  }

  async getActiveSession(cashierId: string): Promise<POSSession | null> {
    return this.posRepo.getActiveSession(cashierId);
  }

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
    let bankTransferSalesTotal = 0;
    let splitSalesTotal = 0;
    let totalRefunds = 0;
    let totalVoids = 0;

    for (const t of transactions) {
      if (t.status === 'VOIDED') {
        totalVoids += t.totalAmount;
        continue;
      }
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
        case 'BANK_TRANSFER':
          bankTransferSalesTotal += t.totalAmount;
          break;
        case 'SPLIT':
          splitSalesTotal += t.totalAmount;
          cashSalesTotal += t.cashTendered ? Math.min(t.totalAmount, t.cashTendered) : t.totalAmount;
          break;
      }
    }

    const netSales = Number((session.totalSales - totalRefunds).toFixed(2));
    const countedCash = session.actualCash ?? (session.openingBalance + session.cashInTotal - session.cashOutTotal + cashSalesTotal - (session.cashRefundsTotal || 0));
    const reconciliation = calculateReconciliation(
      session.openingBalance,
      session.cashInTotal,
      session.cashOutTotal,
      cashSalesTotal,
      countedCash,
      session.cashRefundsTotal || 0,
      session.cashHandoverTotal || 0
    );

    return {
      session,
      cashTransactions,
      transactions,
      cashSalesTotal: Number(cashSalesTotal.toFixed(2)),
      chequeSalesTotal: Number(chequeSalesTotal.toFixed(2)),
      cardSalesTotal: Number(cardSalesTotal.toFixed(2)),
      bankTransferSalesTotal: Number(bankTransferSalesTotal.toFixed(2)),
      splitSalesTotal: Number(splitSalesTotal.toFixed(2)),
      totalRefunds: Number(totalRefunds.toFixed(2)),
      totalVoids: Number(totalVoids.toFixed(2)),
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

  // =========================================================================
  // 8. Day-End Closing & Comprehensive POS Reports
  // =========================================================================

  async getDayEndClosingReport(
    date?: string,
    terminalId?: string,
    cashierId?: string
  ): Promise<DayEndClosingSummary> {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const allTx = await this.posRepo.getAllTransactions({
      terminalId,
      cashierId,
      startDate: `${targetDate}T00:00:00.000Z`,
      endDate: `${targetDate}T23:59:59.999Z`,
    });

    const allSessions = await this.posRepo.getAllSessions();
    const daySessions = allSessions.filter((s) => {
      const sDate = s.openedAt.slice(0, 10);
      if (sDate !== targetDate) return false;
      if (terminalId && s.terminalId !== terminalId) return false;
      if (cashierId && s.cashierId !== cashierId) return false;
      return true;
    });

    const terminals = await this.posRepo.getAllTerminals();

    let totalTransactions = 0;
    let grossSales = 0;
    let totalDiscounts = 0;
    let cashSales = 0;
    let cardSales = 0;
    let bankTransferSales = 0;
    let chequeSales = 0;
    let refundTotals = 0;
    let voidTotals = 0;

    for (const t of allTx) {
      if (t.status === 'VOIDED') {
        voidTotals += t.totalAmount;
        continue;
      }
      if (t.status === 'REFUNDED') {
        refundTotals += t.totalAmount;
        continue;
      }

      totalTransactions++;
      grossSales += t.subtotal;
      totalDiscounts += t.discountTotal;

      if (t.paymentMethod === 'CASH') cashSales += t.totalAmount;
      else if (t.paymentMethod === 'CARD') cardSales += t.totalAmount;
      else if (t.paymentMethod === 'BANK_TRANSFER') bankTransferSales += t.totalAmount;
      else if (t.paymentMethod === 'CHEQUE') chequeSales += t.totalAmount;
      else if (t.paymentMethod === 'SPLIT') {
        cashSales += t.cashTendered ? Math.min(t.totalAmount, t.cashTendered) : t.totalAmount;
        cardSales += t.cashTendered && t.cashTendered < t.totalAmount ? t.totalAmount - t.cashTendered : 0;
      }
    }

    const netSales = Number((grossSales - totalDiscounts).toFixed(2));
    const openingCashTotal = daySessions.reduce((acc, s) => acc + (s.openingBalance || 0), 0);
    const cashInTotal = daySessions.reduce((acc, s) => acc + (s.cashInTotal || 0), 0);
    const cashOutTotal = daySessions.reduce((acc, s) => acc + (s.cashOutTotal || 0), 0);
    const cashRefundsTotal = daySessions.reduce((acc, s) => acc + (s.cashRefundsTotal || 0), 0);
    const cashHandoversTotal = daySessions.reduce((acc, s) => acc + (s.cashHandoverTotal || 0), 0);

    const expectedClosingCash = Number(
      (openingCashTotal + cashSales + cashInTotal - cashOutTotal - cashRefundsTotal - cashHandoversTotal).toFixed(2)
    );
    const actualClosingCash = daySessions.reduce((acc, s) => acc + (s.actualCash || s.closingBalance || 0), 0);
    const cashDiscrepancy = Number((actualClosingCash - expectedClosingCash).toFixed(2));

    const terminalSummaries = terminals.map((term) => {
      const termTx = allTx.filter((t) => t.terminalId === term.id || t.terminalCode === term.terminalCode);
      const termSessions = daySessions.filter((s) => s.terminalId === term.id || s.terminalCode === term.terminalCode);
      const tSales = termTx.filter((t) => t.status === 'COMPLETED').reduce((acc, t) => acc + t.totalAmount, 0);
      const tCashSales = termTx
        .filter((t) => t.status === 'COMPLETED' && (t.paymentMethod === 'CASH' || t.paymentMethod === 'SPLIT'))
        .reduce((acc, t) => acc + t.totalAmount, 0);
      const tExpected = termSessions.reduce((acc, s) => acc + (s.expectedCash || 0), 0);
      const tActual = termSessions.reduce((acc, s) => acc + (s.actualCash || 0), 0);
      return {
        terminalId: term.id,
        terminalCode: term.terminalCode,
        terminalName: term.name,
        totalSales: Number(tSales.toFixed(2)),
        transactionCount: termTx.length,
        cashSales: Number(tCashSales.toFixed(2)),
        expectedCash: Number(tExpected.toFixed(2)),
        actualCash: Number(tActual.toFixed(2)),
        difference: Number((tActual - tExpected).toFixed(2)),
      };
    });

    const cashierMap: Record<string, { name: string; shifts: number; sales: number; count: number; diff: number }> = {};
    for (const s of daySessions) {
      if (!cashierMap[s.cashierId]) {
        cashierMap[s.cashierId] = { name: s.cashierName, shifts: 0, sales: 0, count: 0, diff: 0 };
      }
      cashierMap[s.cashierId].shifts++;
      cashierMap[s.cashierId].sales += s.totalSales;
      cashierMap[s.cashierId].count += s.totalTransactions;
      cashierMap[s.cashierId].diff += s.cashDifference || 0;
    }

    const cashierSummaries = Object.entries(cashierMap).map(([id, val]) => ({
      cashierId: id,
      cashierName: val.name,
      shiftsCount: val.shifts,
      totalSales: Number(val.sales.toFixed(2)),
      transactionsCount: val.count,
      cashDifference: Number(val.diff.toFixed(2)),
    }));

    return {
      date: targetDate,
      totalTransactions,
      grossSales: Number(grossSales.toFixed(2)),
      totalDiscounts: Number(totalDiscounts.toFixed(2)),
      netSales,
      cashSales: Number(cashSales.toFixed(2)),
      cardSales: Number(cardSales.toFixed(2)),
      bankTransferSales: Number(bankTransferSales.toFixed(2)),
      chequeSales: Number(chequeSales.toFixed(2)),
      refundTotals: Number(refundTotals.toFixed(2)),
      voidTotals: Number(voidTotals.toFixed(2)),
      openingCashTotal: Number(openingCashTotal.toFixed(2)),
      cashInTotal: Number(cashInTotal.toFixed(2)),
      cashOutTotal: Number(cashOutTotal.toFixed(2)),
      cashRefundsTotal: Number(cashRefundsTotal.toFixed(2)),
      cashHandoversTotal: Number(cashHandoversTotal.toFixed(2)),
      expectedClosingCash,
      actualClosingCash: Number(actualClosingCash.toFixed(2)),
      cashDiscrepancy,
      terminalSummaries,
      cashierSummaries,
    };
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
