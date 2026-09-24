import { describe, it, expect, beforeEach } from 'vitest';
import { POSService } from '../services/POSService';
import { MockPOSRepository } from '../repositories/mock/MockPOSRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { validatePOSDiscount, calculateReconciliation, validateCashierSession, validateShowroomStock } from '../rules/posRules';
import { POSSession, POSTransaction } from '../types/pos';
import { StockBalance } from '../types/inventory';
import { Product } from '../types/product';

describe('Phase 8 — POS Domain & Showroom Sales Foundation', () => {
  let posRepo: MockPOSRepository;
  let invRepo: MockInventoryRepository;
  let productRepo: MockProductRepository;
  let posService: POSService;

  const testCashier = { id: 'usr-cashier-test', name: 'Test Cashier' };

  beforeEach(async () => {
    posRepo = new MockPOSRepository([], [], []);
    invRepo = new MockInventoryRepository();
    productRepo = new MockProductRepository();
    posService = new POSService(posRepo, invRepo, productRepo);

    // Seed showroom stock for canonical products
    await posService.seedShowroomStock('prod-001', 20); // Schneider Acti9 32A MCB (Price: 3250)
    await posService.seedShowroomStock('prod-002', 15); // Schneider Acti9 63A MCB (Price: 8400)
  });

  describe('1. Shift Session Lifecycle & Cashier Gating', () => {
    it('successfully opens a new cashier shift session with opening float', async () => {
      const session = await posService.openSession(testCashier, 10000, 'Morning register float');

      expect(session).toBeDefined();
      expect(session.sessionNumber).toMatch(/^SES-\d+-\d+$/);
      expect(session.cashierId).toBe(testCashier.id);
      expect(session.cashierName).toBe(testCashier.name);
      expect(session.status).toBe('OPEN');
      expect(session.openingBalance).toBe(10000);
      expect(session.cashInTotal).toBe(0);
      expect(session.cashOutTotal).toBe(0);
      expect(session.totalSales).toBe(0);
    });

    it('enforces single active session rule: blocks opening second shift when one is already active', async () => {
      await posService.openSession(testCashier, 5000);

      await expect(posService.openSession(testCashier, 8000)).rejects.toThrow(
        /already has an active open session/
      );
    });

    it('rejects negative opening balance float', async () => {
      await expect(posService.openSession(testCashier, -500)).rejects.toThrow(
        /cannot be negative/
      );
    });

    it('blocks sales transactions when cashier has no active open session', async () => {
      await expect(
        posService.processCheckout('non-existent-session', {
          items: [{ productId: 'prod-001', quantity: 1 }],
          paymentMethod: 'CASH',
        }, testCashier)
      ).rejects.toThrow(/No active open POS session found/);
    });
  });

  describe('2. Cash Management (Cash In / Cash Out)', () => {
    it('records CASH_IN and increments session cashInTotal', async () => {
      const session = await posService.openSession(testCashier, 10000);
      const cashTx = await posService.recordCashMovement(
        session.id,
        'CASH_IN',
        5000,
        'Replenishment from main vault',
        testCashier
      );

      expect(cashTx.type).toBe('CASH_IN');
      expect(cashTx.amount).toBe(5000);
      expect(cashTx.reason).toBe('Replenishment from main vault');

      const updated = await posRepo.getSessionById(session.id);
      expect(updated?.cashInTotal).toBe(5000);
    });

    it('records CASH_OUT and increments session cashOutTotal', async () => {
      const session = await posService.openSession(testCashier, 10000);
      const cashTx = await posService.recordCashMovement(
        session.id,
        'CASH_OUT',
        2500,
        'Midday excess cash safe drop',
        testCashier
      );

      expect(cashTx.type).toBe('CASH_OUT');
      expect(cashTx.amount).toBe(2500);

      const updated = await posRepo.getSessionById(session.id);
      expect(updated?.cashOutTotal).toBe(2500);
    });

    it('rejects zero or negative cash movement amount and empty reason', async () => {
      const session = await posService.openSession(testCashier, 10000);

      await expect(
        posService.recordCashMovement(session.id, 'CASH_IN', 0, 'Reason', testCashier)
      ).rejects.toThrow(/greater than zero/);

      await expect(
        posService.recordCashMovement(session.id, 'CASH_IN', 500, '', testCashier)
      ).rejects.toThrow(/reason is mandatory/);
    });
  });

  describe('3. Sales Checkout, Showroom Stock Deduction & Central Ledger', () => {
    it('checks out sale and creates SALES_ISSUE movement in central inventory ledger', async () => {
      const session = await posService.openSession(testCashier, 10000);

      const tx = await posService.processCheckout(session.id, {
        items: [{ productId: 'prod-001', quantity: 3, discountPercentage: 0 }],
        paymentMethod: 'CASH',
        cashTendered: 12000,
      }, testCashier);

      expect(tx).toBeDefined();
      expect(tx.receiptNumber).toMatch(/^POS-REC-\d+-\d+$/);
      expect(tx.items).toHaveLength(1);
      expect(tx.items[0].productNameSnapshot).toBe('Schneider Acti9 32A Double Pole MCB');
      expect(tx.items[0].skuSnapshot).toBe('DNS-MCB-32A-2P');
      expect(tx.items[0].barcodeSnapshot).toBe('8901020304011');
      expect(tx.items[0].quantity).toBe(3);

      // Verify showroom stock was deducted from 20 to 17
      const balance = await invRepo.getBalance('prod-001', 'SHOWROOM');
      expect(balance?.availableQuantity).toBe(17);

      // Verify central inventory movement
      const movements = await invRepo.getMovements();
      const issueMovement = movements.find((m) => m.referenceDocumentId === tx.receiptNumber);
      expect(issueMovement).toBeDefined();
      expect(issueMovement?.movementType).toBe('SALES_ISSUE');
      expect(issueMovement?.sourceLocation).toBe('SHOWROOM');
      expect(issueMovement?.quantity).toBe(3);

      // Verify session running totals
      const updatedSession = await posRepo.getSessionById(session.id);
      expect(updatedSession?.totalSales).toBe(tx.totalAmount);
      expect(updatedSession?.totalTransactions).toBe(1);
    });

    it('blocks sale checkout if requested quantity exceeds showroom stock', async () => {
      const session = await posService.openSession(testCashier, 10000);

      // We only have 20 units of prod-001 in showroom
      await expect(
        posService.processCheckout(session.id, {
          items: [{ productId: 'prod-001', quantity: 25 }],
          paymentMethod: 'CASH',
        }, testCashier)
      ).rejects.toThrow(/Cannot sell more than available quantity in Showroom location/);

      // Balance remains intact
      const balance = await invRepo.getBalance('prod-001', 'SHOWROOM');
      expect(balance?.availableQuantity).toBe(20);
    });

    it('calculates cash change accurately and rejects insufficient cash tendered', async () => {
      const session = await posService.openSession(testCashier, 10000);

      // Unit price 3250 * 2 = 6500 + 18% VAT (1170) = 7670
      const tx = await posService.processCheckout(session.id, {
        items: [{ productId: 'prod-001', quantity: 2 }],
        paymentMethod: 'CASH',
        cashTendered: 8000,
      }, testCashier);

      expect(tx.totalAmount).toBe(7670);
      expect(tx.cashTendered).toBe(8000);
      expect(tx.changeGiven).toBe(330);

      // Insufficient tender check
      await expect(
        posService.processCheckout(session.id, {
          items: [{ productId: 'prod-001', quantity: 1 }],
          paymentMethod: 'CASH',
          cashTendered: 1000, // Total is > 3000
        }, testCashier)
      ).rejects.toThrow(/less than total payable amount/);
    });

    it('validates cashier discount limit: permits <= 5% and rejects > 5%', async () => {
      const session = await posService.openSession(testCashier, 10000);

      // 5% discount is permitted for cashier
      const tx = await posService.processCheckout(session.id, {
        items: [{ productId: 'prod-001', quantity: 1, discountPercentage: 5 }],
        paymentMethod: 'CASH',
      }, testCashier);
      expect(tx.items[0].discountPercentage).toBe(5);

      // 8% discount exceeds 5% cashier ceiling and must be rejected
      await expect(
        posService.processCheckout(session.id, {
          items: [{ productId: 'prod-001', quantity: 1, discountPercentage: 8 }],
          paymentMethod: 'CASH',
        }, testCashier)
      ).rejects.toThrow(/exceeds permitted threshold/);

      // Negative discount must be rejected
      await expect(
        posService.processCheckout(session.id, {
          items: [{ productId: 'prod-001', quantity: 1, discountPercentage: -2 }],
          paymentMethod: 'CASH',
        }, testCashier)
      ).rejects.toThrow(/cannot be negative/);
    });
  });

  describe('4. Shift Close & Mathematical Cash Reconciliation', () => {
    it('calculates reconciliation: expected = opening + cashIn - cashOut + cashSales', () => {
      // Opening 10000, CashIn 5000, CashOut 2500, CashSales 20000 -> Expected = 32500
      const reconExact = calculateReconciliation(10000, 5000, 2500, 20000, 32500);
      expect(reconExact.expectedCash).toBe(32500);
      expect(reconExact.difference).toBe(0);
      expect(reconExact.isBalanced).toBe(true);
      expect(reconExact.status).toBe('BALANCED');

      // Actual 32700 -> Surplus 200
      const reconOver = calculateReconciliation(10000, 5000, 2500, 20000, 32700);
      expect(reconOver.difference).toBe(200);
      expect(reconOver.status).toBe('OVER');

      // Actual 32100 -> Shortage 400
      const reconShort = calculateReconciliation(10000, 5000, 2500, 20000, 32100);
      expect(reconShort.difference).toBe(-400);
      expect(reconShort.status).toBe('SHORT');
    });

    it('closes session, locks further transactions, and records expected vs actual cash', async () => {
      const session = await posService.openSession(testCashier, 10000);

      // Perform a cash sale
      const tx = await posService.processCheckout(session.id, {
        items: [{ productId: 'prod-001', quantity: 1 }],
        paymentMethod: 'CASH',
      }, testCashier);

      // Mid-shift Cash In
      await posService.recordCashMovement(session.id, 'CASH_IN', 2000, 'Float replenishment', testCashier);

      // Expected Cash = 10000 + 2000 - 0 + tx.totalAmount
      const expectedCash = 10000 + 2000 + tx.totalAmount;

      const closed = await posService.closeSession(session.id, expectedCash, 'Closed without discrepancy');

      expect(closed.status).toBe('CLOSED');
      expect(closed.expectedCash).toBe(expectedCash);
      expect(closed.actualCash).toBe(expectedCash);
      expect(closed.cashDifference).toBe(0);

      // Transactions blocked after shift closure
      await expect(
        posService.processCheckout(session.id, {
          items: [{ productId: 'prod-001', quantity: 1 }],
          paymentMethod: 'CASH',
        }, testCashier)
      ).rejects.toThrow(/is CLOSED/);
    });
  });

  describe('5. Transaction Refund & Inventory Return Flow (SALES_RETURN)', () => {
    it('refunds transaction and restores stock to Showroom location via SALES_RETURN', async () => {
      const session = await posService.openSession(testCashier, 10000);

      // Sell 4 units (showroom stock decreases from 20 to 16)
      const tx = await posService.processCheckout(session.id, {
        items: [{ productId: 'prod-001', quantity: 4 }],
        paymentMethod: 'CASH',
      }, testCashier);

      let balance = await invRepo.getBalance('prod-001', 'SHOWROOM');
      expect(balance?.availableQuantity).toBe(16);

      // Process refund
      const refundedTx = await posService.refundTransaction(
        tx.id,
        'Customer purchased wrong breaker amp rating',
        testCashier
      );

      expect(refundedTx.status).toBe('REFUNDED');
      expect(refundedTx.refundReason).toBe('Customer purchased wrong breaker amp rating');

      // Verify showroom stock restored back to 20
      balance = await invRepo.getBalance('prod-001', 'SHOWROOM');
      expect(balance?.availableQuantity).toBe(20);

      // Verify SALES_RETURN movement logged in central inventory ledger
      const movements = await invRepo.getMovements();
      const returnMov = movements.find((m) => m.movementType === 'SALES_RETURN');
      expect(returnMov).toBeDefined();
      expect(returnMov?.targetLocation).toBe('SHOWROOM');
      expect(returnMov?.quantity).toBe(4);
      expect(returnMov?.referenceDocumentType).toBe('POS_REFUND');
    });

    it('rejects duplicate refund of an already refunded transaction', async () => {
      const session = await posService.openSession(testCashier, 10000);
      const tx = await posService.processCheckout(session.id, {
        items: [{ productId: 'prod-001', quantity: 1 }],
        paymentMethod: 'CASH',
      }, testCashier);

      await posService.refundTransaction(tx.id, 'First refund', testCashier);

      await expect(
        posService.refundTransaction(tx.id, 'Duplicate refund attempt', testCashier)
      ).rejects.toThrow(/already been refunded/);
    });
  });

  describe('6. Master Data Immutability & Single Source of Truth', () => {
    it('preserves immutable snapshots on POS transactions even if Product Master price updates', async () => {
      const session = await posService.openSession(testCashier, 10000);

      const tx = await posService.processCheckout(session.id, {
        items: [{ productId: 'prod-001', quantity: 1 }],
        paymentMethod: 'CASH',
      }, testCashier);

      expect(tx.items[0].unitPriceSnapshot).toBe(3250);

      // Simulate Product Master price update from 3250 to 4500
      await productRepo.update('prod-001', {
        pricing: {
          costPrice: 2200,
          currentSellingPrice: 4500,
          minimumSellingPrice: 3800,
          maxDiscountPercentage: 12,
          taxRatePercentage: 18,
        },
      });

      // Historical POS transaction must preserve original snapshot price of 3250
      const fetchedTx = await posRepo.getTransactionById(tx.id);
      expect(fetchedTx?.items[0].unitPriceSnapshot).toBe(3250);
      expect(fetchedTx?.totalAmount).toBe(tx.totalAmount);
    });

    it('resolves product directly by barcode from Product Master without separate POSProduct entity', async () => {
      // Look up by barcode '8901020304011' in canonical Product Master
      const resolvedByBarcode = await productRepo.getByBarcode('8901020304011');

      expect(resolvedByBarcode).toBeDefined();
      expect(resolvedByBarcode?.id).toBe('prod-001');
      expect(resolvedByBarcode?.name).toBe('Schneider Acti9 32A Double Pole MCB');
      expect(resolvedByBarcode?.sku).toBe('DNS-MCB-32A-2P');
      expect(resolvedByBarcode?.pricing.currentSellingPrice).toBe(3250);

      // Checkout referencing this canonical product master directly
      const session = await posService.openSession(testCashier, 10000);
      const tx = await posService.processCheckout(session.id, {
        items: [{ productId: resolvedByBarcode!.id, quantity: 1 }],
        paymentMethod: 'CASH',
      }, testCashier);

      expect(tx.items[0].productId).toBe('prod-001');
      expect(tx.items[0].barcodeSnapshot).toBe('8901020304011');
    });
  });

  describe('7. Multi-Line Stock Aggregation & Non-Cash Reconciliation Segregation', () => {
    it('blocks multi-line checkout when cumulative requested quantity across lines exceeds showroom stock', async () => {
      const session = await posService.openSession(testCashier, 10000);

      // prod-002 has 15 units available in showroom
      // 2 lines of 10 units = 20 units total, which breaches stock of 15
      await expect(
        posService.processCheckout(session.id, {
          items: [
            { productId: 'prod-002', quantity: 10 },
            { productId: 'prod-002', quantity: 10 },
          ],
          paymentMethod: 'CASH',
        }, testCashier)
      ).rejects.toThrow(/Cannot sell more than available quantity in Showroom location/);

      // Verify showroom stock remains intact at 15
      const bal = await invRepo.getBalance('prod-002', 'SHOWROOM');
      expect(bal?.availableQuantity).toBe(15);
    });

    it('correctly reconciles drawer cash excluding card and cheque transactions', async () => {
      const session = await posService.openSession(testCashier, 10000);

      // Cash sale: 3250 * 1 + 18% VAT = 3835
      const cashTx = await posService.processCheckout(session.id, {
        items: [{ productId: 'prod-001', quantity: 1 }],
        paymentMethod: 'CASH',
      }, testCashier);

      // Card sale: 3250 * 1 + 18% VAT = 3835 (does NOT go into physical cash drawer)
      const cardTx = await posService.processCheckout(session.id, {
        items: [{ productId: 'prod-001', quantity: 1 }],
        paymentMethod: 'CARD',
      }, testCashier);

      expect(cashTx.totalAmount).toBe(3835);
      expect(cardTx.totalAmount).toBe(3835);

      // Expected drawer cash should ONLY include opening (10000) + cash sale (3835) = 13835
      // Card sale (3835) must be excluded from drawer cash calculation
      const closed = await posService.closeSession(session.id, 13835);
      expect(closed.expectedCash).toBe(13835);
      expect(closed.actualCash).toBe(13835);
      expect(closed.cashDifference).toBe(0);
      expect(closed.totalSales).toBe(7670); // Total sales tracks all tenders
    });
  });
});
