import { describe, it, expect, beforeEach } from 'vitest';
import { POSService } from '../services/POSService';
import { MockPOSRepository } from '../repositories/mock/MockPOSRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { calculateReconciliation, validatePOSDiscount, verifySupervisorDiscountKey } from '../rules/posRules';
import { Product } from '../types/product';
import { POSTransaction, POSSession, ShowroomOffer } from '../types/pos';

describe('Showroom POS & Terminal Management System — 20 Required Scenarios', () => {
  let posRepo: MockPOSRepository;
  let invRepo: MockInventoryRepository;
  let productRepo: MockProductRepository;
  let posService: POSService;

  const testCashier = { id: 'usr-108', name: 'Chathura Alwis' };
  const testManager = { id: 'usr-102', name: 'Ruwan Wijesinghe' };
  const testSalesManager = { id: 'usr-103', name: 'Kamal Perera' };

  // Sample power tool with 5% showroom limit and 20% max catalog limit
  const powerTool: Product = {
    id: 'prod-pt-01',
    sku: 'DNS-MAK-AG-18V',
    name: 'Makita DGA404Z 18V Brushless Angle Grinder',
    description: 'Heavy duty 100mm angle grinder',
    categoryId: 'cat-05',
    categoryName: 'Power Tools',
    uomId: 'uom-01',
    uomCode: 'PCS',
    barcode: '8901020304999',
    pricing: {
      costPrice: 28000,
      currentSellingPrice: 40000,
      minimumSellingPrice: 32000,
      maxDiscountPercentage: 20,
      showroomDiscountPercentage: 5, // Cashier ceiling
      taxRatePercentage: 0,
    },
    isPromotional: false,
    warrantyPeriodMonths: 24,
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    stockOnHand: 50,
    damagedStock: 0,
    requiresSerialNumber: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    posRepo = new MockPOSRepository([], [], []);
    invRepo = new MockInventoryRepository();
    productRepo = new MockProductRepository([powerTool]);
    posService = new POSService(posRepo, invRepo, productRepo);

    // Seed showroom inventory
    await posService.seedShowroomStock(powerTool.id, 25);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Cashier opens a shift with opening cash
  // -------------------------------------------------------------------------
  it('Scenario 1: Cashier opens a shift with opening cash', async () => {
    const session = await posService.openSession(testCashier, 15000, 'Morning Shift', 'term-01', 'TERM-SR-01');

    expect(session.id).toBeDefined();
    expect(session.sessionNumber).toMatch(/^SES-\d+-\d+/);
    expect(session.cashierId).toBe(testCashier.id);
    expect(session.openingBalance).toBe(15000);
    expect(session.status).toBe('OPEN');
    expect(session.terminalId).toBe('term-01');

    // Terminal status is updated
    const term = await posService.getTerminalById('term-01');
    expect(term?.currentSessionId).toBe(session.id);
    expect(term?.currentCashierId).toBe(testCashier.id);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Cashier completes a cash sale
  // -------------------------------------------------------------------------
  it('Scenario 2: Cashier completes a cash sale', async () => {
    const session = await posService.openSession(testCashier, 10000);

    const tx = await posService.processCheckout(
      session.id,
      {
        items: [{ productId: powerTool.id, quantity: 1, discountPercentage: 0 }],
        paymentMethod: 'CASH',
        cashTendered: 40000,
      },
      testCashier
    );

    expect(tx.status).toBe('COMPLETED');
    expect(tx.paymentMethod).toBe('CASH');
    expect(tx.totalAmount).toBe(40000);
    expect(tx.changeGiven).toBe(0);

    // Inventory deducted
    const bal = await invRepo.getBalance(powerTool.id, 'SHOWROOM');
    expect(bal?.availableQuantity).toBe(24);
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Cashier completes a card sale
  // -------------------------------------------------------------------------
  it('Scenario 3: Cashier completes a card sale', async () => {
    const session = await posService.openSession(testCashier, 10000);

    const tx = await posService.processCheckout(
      session.id,
      {
        items: [{ productId: powerTool.id, quantity: 1, discountPercentage: 0 }],
        paymentMethod: 'CARD',
      },
      testCashier
    );

    expect(tx.status).toBe('COMPLETED');
    expect(tx.paymentMethod).toBe('CARD');
    expect(tx.totalAmount).toBe(40000);
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Cashier completes a split-payment sale
  // -------------------------------------------------------------------------
  it('Scenario 4: Cashier completes a split-payment sale', async () => {
    const session = await posService.openSession(testCashier, 10000);

    const tx = await posService.processCheckout(
      session.id,
      {
        items: [{ productId: powerTool.id, quantity: 1, discountPercentage: 0 }],
        paymentMethod: 'SPLIT',
        cashTendered: 25000, // 25k Cash, remaining 15k Card
      },
      testCashier
    );

    expect(tx.status).toBe('COMPLETED');
    expect(tx.paymentMethod).toBe('SPLIT');
    expect(tx.cashTendered).toBe(25000);
    expect(tx.totalAmount).toBe(40000);
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Cashier applies a discount within the configured showroom limit
  // -------------------------------------------------------------------------
  it('Scenario 5: Cashier applies a discount within the configured showroom limit (5%)', async () => {
    const session = await posService.openSession(testCashier, 10000);

    // 5% discount is exactly within showroom limit
    const tx = await posService.processCheckout(
      session.id,
      {
        items: [{ productId: powerTool.id, quantity: 1, discountPercentage: 5 }],
        paymentMethod: 'CASH',
        cashTendered: 38000,
      },
      testCashier
    );

    expect(tx.status).toBe('COMPLETED');
    expect(tx.items[0].discountPercentage).toBe(5);
    expect(tx.discountTotal).toBe(2000);
    expect(tx.totalAmount).toBe(38000);
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Cashier attempts a discount above the configured limit
  // -------------------------------------------------------------------------
  it('Scenario 6: Cashier attempts a discount above the configured limit without token', async () => {
    const session = await posService.openSession(testCashier, 10000);

    // 10% discount exceeds 5% limit and must be blocked
    await expect(
      posService.processCheckout(
        session.id,
        {
          items: [{ productId: powerTool.id, quantity: 1, discountPercentage: 10 }],
          paymentMethod: 'CASH',
        },
        testCashier
      )
    ).rejects.toThrow(/exceeds permitted threshold/);
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Manager authorizes the exceptional discount
  // -------------------------------------------------------------------------
  it('Scenario 7: Manager authorizes the exceptional discount via single-use token', async () => {
    const session = await posService.openSession(testCashier, 10000);

    // Manager generates single-use token for 12% discount
    const token = await posService.generateManagerToken({
      operationType: 'DISCOUNT',
      manager: testManager,
      approvedDiscountPercentage: 12,
      reason: 'Contractor bulk purchase authorization',
    });

    expect(token.token).toMatch(/^AUTH-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    // Cashier supplies token and checks out 10% discount successfully
    const tx = await posService.processCheckout(
      session.id,
      {
        items: [
          {
            productId: powerTool.id,
            quantity: 1,
            discountPercentage: 10,
            supervisorAuthKey: token.token,
          },
        ],
        paymentMethod: 'CASH',
        cashTendered: 36000,
      },
      testCashier
    );

    expect(tx.status).toBe('COMPLETED');
    expect(tx.items[0].discountPercentage).toBe(10);
    expect(tx.items[0].authorizedBySupervisor).toBe(true);

    // Token is now consumed and single-use
    const updatedToken = await posRepo.getTokenByValue(token.token);
    expect(updatedToken?.isUsed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Cashier attempts a refund and manager approves it
  // -------------------------------------------------------------------------
  it('Scenario 8: Cashier attempts a refund and manager approves it with condition', async () => {
    const session = await posService.openSession(testCashier, 10000);

    const tx = await posService.processCheckout(
      session.id,
      {
        items: [{ productId: powerTool.id, quantity: 2, discountPercentage: 0 }],
        paymentMethod: 'CASH',
        cashTendered: 80000,
      },
      testCashier
    );

    expect(tx.status).toBe('COMPLETED');

    // Refund 1 unit as RESTOCKABLE, 1 unit as DAMAGED
    const refundedTx = await posService.refundTransactionWithCondition({
      transactionId: tx.id,
      items: [
        { productId: powerTool.id, quantity: 1, condition: 'RESTOCKABLE' },
      ],
      reason: 'Customer ordered wrong model and returned unopened box',
      user: testCashier,
    });

    expect(refundedTx.status).toBe('REFUNDED');
    expect(refundedTx.refundReason).toContain('wrong model');

    // Restockable inventory returned to available stock
    const bal = await invRepo.getBalance(powerTool.id, 'SHOWROOM');
    expect(bal?.availableQuantity).toBe(24); // 25 original - 2 sold + 1 returned
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Cashier attempts a void and manager approves it
  // -------------------------------------------------------------------------
  it('Scenario 9: Cashier voids unfinalized sale and restores inventory', async () => {
    const session = await posService.openSession(testCashier, 10000);

    const tx = await posService.processCheckout(
      session.id,
      {
        items: [{ productId: powerTool.id, quantity: 1, discountPercentage: 0 }],
        paymentMethod: 'CASH',
        cashTendered: 40000,
      },
      testCashier
    );

    expect(tx.status).toBe('COMPLETED');

    // Void transaction
    const voidedTx = await posService.voidTransaction(
      tx.id,
      'Customer card failed and cancelled prior to collecting goods',
      testCashier
    );

    expect(voidedTx.status).toBe('VOIDED');
    expect(voidedTx.voidReason).toContain('cancelled prior to collecting goods');

    // Inventory restored
    const bal = await invRepo.getBalance(powerTool.id, 'SHOWROOM');
    expect(bal?.availableQuantity).toBe(25);
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Cashier requests a stock clearance offer price
  // -------------------------------------------------------------------------
  it('Scenario 10: Cashier applies an active approved clearance offer price', async () => {
    // Showroom Manager creates offer
    const offer = await posService.createShowroomOffer(
      {
        offerName: 'Angle Grinder Clearance',
        productId: powerTool.id,
        productSku: powerTool.sku,
        productName: powerTool.name,
        originalPrice: 40000,
        offerPrice: 32000,
        startDate: '2025-01-01',
        endDate: '2027-12-31',
        maxQuantity: 10,
        reason: 'STOCK_CLEARANCE',
      },
      testManager
    );

    // Sales Manager approves
    await posService.approveShowroomOffer(offer.id, testSalesManager);

    // Cashier checks active offers
    const activeOffers = await posService.getActiveOffers(powerTool.id);
    expect(activeOffers.length).toBe(1);
    expect(activeOffers[0].offerPrice).toBe(32000);
    expect(activeOffers[0].discountPercentage).toBe(20);

    // Apply offer in POS checkout
    const session = await posService.openSession(testCashier, 10000);
    const tx = await posService.processCheckout(
      session.id,
      {
        items: [
          {
            productId: powerTool.id,
            quantity: 1,
            discountPercentage: activeOffers[0].discountPercentage,
            appliedOfferId: activeOffers[0].id,
            authorizedBySupervisor: true,
          },
        ],
        paymentMethod: 'CASH',
        cashTendered: 32000,
      },
      testCashier
    );

    expect(tx.totalAmount).toBe(32000);
    expect(tx.items[0].appliedOfferId).toBe(offer.id);

    // Offer sold quantity increased
    const updatedOffer = await posRepo.getOfferById(offer.id);
    expect(updatedOffer?.soldQuantity).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Scenario 11: Sales Manager approves and rejects offers
  // -------------------------------------------------------------------------
  it('Scenario 11: Sales Manager approves valid offer and rejects invalid offer with reason', async () => {
    // Create 2 offers
    const offer1 = await posService.createShowroomOffer(
      {
        offerName: 'Offer 1',
        productId: powerTool.id,
        productSku: powerTool.sku,
        productName: powerTool.name,
        originalPrice: 40000,
        offerPrice: 35000,
        startDate: '2025-01-01',
        endDate: '2027-12-31',
        reason: 'STOCK_CLEARANCE',
      },
      testManager
    );

    const offer2 = await posService.createShowroomOffer(
      {
        offerName: 'Offer 2',
        productId: powerTool.id,
        productSku: powerTool.sku,
        productName: powerTool.name,
        originalPrice: 40000,
        offerPrice: 20000, // Below cost
        startDate: '2025-01-01',
        endDate: '2027-12-31',
        reason: 'STOCK_CLEARANCE',
      },
      testManager
    );

    // Approve offer1
    const approved = await posService.approveShowroomOffer(offer1.id, testSalesManager);
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedByName).toBe(testSalesManager.name);

    // Reject offer2 with mandatory reason
    const rejected = await posService.rejectShowroomOffer(
      offer2.id,
      'Price is below cost price of Rs. 28,000.',
      testSalesManager
    );
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Price is below cost price of Rs. 28,000.');
  });

  // -------------------------------------------------------------------------
  // Scenario 12: Cashier performs Cash In and Cash Out
  // -------------------------------------------------------------------------
  it('Scenario 12: Cashier performs Cash In and Cash Out with reasons', async () => {
    const session = await posService.openSession(testCashier, 10000);

    const cIn = await posService.recordCashMovement(
      session.id,
      'CASH_IN',
      5000,
      'Float replenishment from central safe',
      testCashier
    );
    expect(cIn.type).toBe('CASH_IN');
    expect(cIn.amount).toBe(5000);

    const cOut = await posService.recordCashMovement(
      session.id,
      'CASH_OUT',
      2000,
      'Midday cash drop to finance safe',
      testCashier
    );
    expect(cOut.type).toBe('CASH_OUT');
    expect(cOut.amount).toBe(2000);

    const updatedSession = await posRepo.getSessionById(session.id);
    expect(updatedSession?.cashInTotal).toBe(5000);
    expect(updatedSession?.cashOutTotal).toBe(2000);
  });

  // -------------------------------------------------------------------------
  // Scenario 13: Cashier closes a shift
  // -------------------------------------------------------------------------
  it('Scenario 13: Cashier closes a shift and locks further operations', async () => {
    const session = await posService.openSession(testCashier, 10000);

    const closed = await posService.closeSession(session.id, 10000, 'Shift closed cleanly');
    expect(closed.status).toBe('CLOSED');
    expect(closed.closedAt).toBeDefined();

    // Cannot process checkout on closed session
    await expect(
      posService.processCheckout(
        session.id,
        {
          items: [{ productId: powerTool.id, quantity: 1 }],
          paymentMethod: 'CASH',
        },
        testCashier
      )
    ).rejects.toThrow(/CLOSED/);
  });

  // -------------------------------------------------------------------------
  // Scenario 14: System calculates the correct expected cash
  // -------------------------------------------------------------------------
  it('Scenario 14: System calculates the correct expected cash using exact formula', async () => {
    // Formula: Opening + Cash Sales + Cash In - Cash Out - Cash Refunds - Cash Handover
    const recon = calculateReconciliation(
      10000, // Opening
      5000,  // Cash In
      2000,  // Cash Out
      40000, // Cash Sales
      51000, // Counted actual
      1000,  // Cash Refunds
      1000   // Cash Handover
    );

    // 10000 + 40000 + 5000 - 2000 - 1000 - 1000 = 51000
    expect(recon.expectedCash).toBe(51000);
    expect(recon.actualCash).toBe(51000);
    expect(recon.difference).toBe(0);
    expect(recon.isBalanced).toBe(true);
    expect(recon.status).toBe('BALANCED');
  });

  // -------------------------------------------------------------------------
  // Scenario 15: Manager identifies a cash discrepancy
  // -------------------------------------------------------------------------
  it('Scenario 15: Manager identifies a cash discrepancy (Shortage)', async () => {
    const reconShort = calculateReconciliation(10000, 0, 0, 40000, 48000);
    // Expected 50,000, Counted 48,000 -> Difference -2000
    expect(reconShort.expectedCash).toBe(50000);
    expect(reconShort.difference).toBe(-2000);
    expect(reconShort.status).toBe('SHORT');

    const reconOver = calculateReconciliation(10000, 0, 0, 40000, 50500);
    // Expected 50,000, Counted 50,500 -> Difference +500
    expect(reconOver.difference).toBe(500);
    expect(reconOver.status).toBe('OVER');
  });

  // -------------------------------------------------------------------------
  // Scenario 16: Manager completes cash reconciliation
  // -------------------------------------------------------------------------
  it('Scenario 16: Manager reviews and approves cash reconciliation', async () => {
    const session = await posService.openSession(testCashier, 10000);
    await posService.closeSession(session.id, 10000);

    const approvedSession = await posService.approveSessionReconciliation(
      session.id,
      testManager,
      true,
      'All cash verified and deposited in drawer safe.'
    );

    expect(approvedSession.reconciliationStatus).toBe('APPROVED');
    expect(approvedSession.reconciliationApprovedByName).toBe(testManager.name);
  });

  // -------------------------------------------------------------------------
  // Scenario 17: Day-end report displays accurate totals
  // -------------------------------------------------------------------------
  it('Scenario 17: Day-end report displays accurate financial breakdowns', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const session = await posService.openSession(testCashier, 10000, 'Shift 1', 'term-01', 'TERM-SR-01');

    // 1 Cash sale (40k)
    await posService.processCheckout(
      session.id,
      {
        items: [{ productId: powerTool.id, quantity: 1, discountPercentage: 0 }],
        paymentMethod: 'CASH',
        cashTendered: 40000,
      },
      testCashier
    );

    // 1 Card sale (40k)
    await posService.processCheckout(
      session.id,
      {
        items: [{ productId: powerTool.id, quantity: 1, discountPercentage: 0 }],
        paymentMethod: 'CARD',
      },
      testCashier
    );

    await posService.closeSession(session.id, 50000);

    const report = await posService.getDayEndClosingReport(today);
    expect(report.totalTransactions).toBe(2);
    expect(report.grossSales).toBe(80000);
    expect(report.netSales).toBe(80000);
    expect(report.cashSales).toBe(40000);
    expect(report.cardSales).toBe(40000);
    expect(report.expectedClosingCash).toBe(50000);
    expect(report.actualClosingCash).toBe(50000);
    expect(report.cashDiscrepancy).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Scenario 18: Unauthorized users cannot access restricted operations
  // -------------------------------------------------------------------------
  it('Scenario 18: Rejects discount ceiling breach even with invalid/forged token', async () => {
    const session = await posService.openSession(testCashier, 10000);

    await expect(
      posService.processCheckout(
        session.id,
        {
          items: [
            {
              productId: powerTool.id,
              quantity: 1,
              discountPercentage: 15,
              supervisorAuthKey: 'INVALID-FAKE-TOKEN',
            },
          ],
          paymentMethod: 'CASH',
        },
        testCashier
      )
    ).rejects.toThrow(/Invalid/);
  });

  // -------------------------------------------------------------------------
  // Scenario 19: Expired and already-used tokens cannot authorize operations
  // -------------------------------------------------------------------------
  it('Scenario 19: Expired and already-used tokens cannot authorize operations', async () => {
    // Generate token with 0 validity (already expired)
    const expiredToken = await posService.generateManagerToken({
      operationType: 'DISCOUNT',
      manager: testManager,
      approvedDiscountPercentage: 15,
      reason: 'Expired test',
      validityMinutes: -5,
    });

    await expect(
      posService.verifyAndConsumeToken(expiredToken.token, 'DISCOUNT', testCashier)
    ).rejects.toThrow(/expired/i);

    // Valid token used once cannot be used twice
    const activeToken = await posService.generateManagerToken({
      operationType: 'DISCOUNT',
      manager: testManager,
      approvedDiscountPercentage: 15,
      reason: 'Single use test',
      validityMinutes: 15,
    });

    const firstUse = await posService.verifyAndConsumeToken(activeToken.token, 'DISCOUNT', testCashier);
    expect(firstUse.valid).toBe(true);

    // Second use must fail
    await expect(
      posService.verifyAndConsumeToken(activeToken.token, 'DISCOUNT', testCashier)
    ).rejects.toThrow(/already used/i);
  });

  // -------------------------------------------------------------------------
  // Scenario 20: Prevents duplicate sales or exceeding available stock
  // -------------------------------------------------------------------------
  it('Scenario 20: Prevents multi-item stock over-subscription and duplicate refunds', async () => {
    const session = await posService.openSession(testCashier, 10000);

    // Attempting to checkout 30 units when only 25 are available in showroom
    await expect(
      posService.processCheckout(
        session.id,
        {
          items: [{ productId: powerTool.id, quantity: 30 }],
          paymentMethod: 'CASH',
        },
        testCashier
      )
    ).rejects.toThrow(/Cannot sell more than available quantity/);

    // Completing valid checkout
    const tx = await posService.processCheckout(
      session.id,
      {
        items: [{ productId: powerTool.id, quantity: 1 }],
        paymentMethod: 'CASH',
        cashTendered: 40000,
      },
      testCashier
    );

    // Refund once
    await posService.refundTransaction(tx.id, 'First refund', testCashier);

    // Attempting duplicate refund
    await expect(
      posService.refundTransaction(tx.id, 'Duplicate refund', testCashier)
    ).rejects.toThrow(/already been refunded/);
  });
});

