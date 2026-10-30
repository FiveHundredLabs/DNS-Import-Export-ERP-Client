import { describe, it, expect, beforeEach } from 'vitest';
import { validatePOSDiscount, verifySupervisorDiscountKey } from '../rules/posRules';
import { POSService } from '../services/POSService';
import { MockPOSRepository } from '../repositories/mock/MockPOSRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { POSSession } from '../types/pos';

describe('Batch 3: POS Discount Supervisor Authorization Key Workflow (BR-03)', () => {
  let posService: POSService;
  let posRepo: MockPOSRepository;
  let invRepo: MockInventoryRepository;
  let productRepo: MockProductRepository;
  let activeSession: POSSession;

  const cashier = { id: 'usr-cashier-01', name: 'Cashier Kamal' };

  beforeEach(async () => {
    posRepo = new MockPOSRepository();
    invRepo = new MockInventoryRepository();
    productRepo = new MockProductRepository();
    posService = new POSService(posRepo, invRepo, productRepo);

    // Seed showroom stock for prod-001 (Schneider MCB, 15% max ceiling)
    await posService.seedShowroomStock('prod-001', 50);

    // Open a fresh cashier session
    activeSession = await posService.openSession(cashier, 10000, 'Morning Shift');
  });

  describe('posRules: validatePOSDiscount & verifySupervisorDiscountKey', () => {
    it('accepts discounts up to 5% without supervisor authorization', () => {
      const res0 = validatePOSDiscount(0, 15, 5);
      expect(res0.valid).toBe(true);
      expect(res0.requiresSupervisorKey).toBe(false);

      const res5 = validatePOSDiscount(5, 15, 5);
      expect(res5.valid).toBe(true);
      expect(res5.requiresSupervisorKey).toBe(false);
    });

    it('rejects discount > 5% when no supervisor key is provided', () => {
      expect(() => validatePOSDiscount(8, 15, 5)).toThrow(/supervisor authorization key required/i);
    });

    it('rejects discount > 5% when an invalid supervisor key is provided', () => {
      expect(() => validatePOSDiscount(10, 15, 5, 'WRONG-KEY-999')).toThrow(
        /invalid supervisor authorization key/i
      );
    });

    it('approves discount > 5% when a valid supervisor key is provided', () => {
      const res = validatePOSDiscount(10, 15, 5, 'SUPER-2026');
      expect(res.valid).toBe(true);
      expect(res.requiresSupervisorKey).toBe(true);
      expect(res.supervisorName).toBe('Showroom Supervisor Bandara');
    });

    it('rejects discount exceeding product ceiling even with supervisor key', () => {
      expect(() => validatePOSDiscount(20, 15, 5, 'SUPER-2026')).toThrow(
        /exceeds product maximum ceiling/i
      );
    });

    it('rejects negative discounts', () => {
      expect(() => validatePOSDiscount(-5, 15, 5)).toThrow(/cannot be negative/i);
    });
  });

  describe('POSService: processCheckout supervisor discount enforcement', () => {
    it('successfully checks out with standard 5% cashier discount', async () => {
      const tx = await posService.processCheckout(
        activeSession.id,
        {
          items: [
            {
              productId: 'prod-001',
              quantity: 2,
              discountPercentage: 5,
            },
          ],
          paymentMethod: 'CASH',
        },
        cashier
      );

      expect(tx).toBeDefined();
      expect(tx.items[0].discountPercentage).toBe(5);
      expect(tx.items[0].authorizedBySupervisor).toBe(false);
      expect(tx.supervisorAuthorized).toBe(false);
    });

    it('blocks checkout with >5% discount when supervisor key is missing', async () => {
      await expect(
        posService.processCheckout(
          activeSession.id,
          {
            items: [
              {
                productId: 'prod-001',
                quantity: 2,
                discountPercentage: 10, // Exceeds 5% limit
              },
            ],
            paymentMethod: 'CASH',
          },
          cashier
        )
      ).rejects.toThrow(/supervisor authorization key required/i);
    });

    it('blocks checkout with >5% discount when supervisor key is invalid', async () => {
      await expect(
        posService.processCheckout(
          activeSession.id,
          {
            items: [
              {
                productId: 'prod-001',
                quantity: 2,
                discountPercentage: 10,
                supervisorAuthKey: 'INVALID-PIN-1234',
              },
            ],
            paymentMethod: 'CASH',
          },
          cashier
        )
      ).rejects.toThrow(/invalid supervisor authorization key/i);
    });

    it('permits checkout with >5% discount when valid supervisor key is supplied', async () => {
      const tx = await posService.processCheckout(
        activeSession.id,
        {
          items: [
            {
              productId: 'prod-001',
              quantity: 2,
              discountPercentage: 12,
              supervisorAuthKey: 'SUPER-2026',
            },
          ],
          paymentMethod: 'CASH',
        },
        cashier
      );

      expect(tx).toBeDefined();
      expect(tx.items[0].discountPercentage).toBe(12);
      expect(tx.items[0].authorizedBySupervisor).toBe(true);
      expect(tx.items[0].supervisorName).toBe('Showroom Supervisor Bandara');
      expect(tx.supervisorAuthorized).toBe(true);
      expect(tx.supervisorAuthKey).toBe('SUPER-2026');
    });
  });
});
