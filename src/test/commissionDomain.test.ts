import { describe, it, expect, beforeEach } from 'vitest';
import { CommissionService } from '../services/CommissionService';
import { MockCommissionRepository } from '../repositories/mock/MockCommissionRepository';
import { calculateCommission } from '../rules/commissionRules';
import { determineLoyaltyTier } from '../rules/loyaltyRules';
import { User } from '../types/auth';

describe('Phase 10 — Sales Commission & Loyalty Domain', () => {
  let commissionRepo: MockCommissionRepository;
  let commissionSvc: CommissionService;

  const mockSalesRepUser: User = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    email: 'rep.colombo@dnserp.com',
    role: 'SALES_REP',
    phone: '+94 77 678 9012',
    isActive: true,
  };

  const mockSalesManagerUser: User = {
    id: 'usr-103',
    name: 'Kamal Perera',
    email: 'sales.manager@dnserp.com',
    role: 'SALES_MANAGER',
    phone: '+94 77 345 6789',
    isActive: true,
  };

  const mockDirectorUser: User = {
    id: 'usr-101',
    name: 'Saman Jayasuriya',
    email: 'director@dnserp.com',
    role: 'DIRECTOR',
    phone: '+94 77 123 4567',
    isActive: true,
  };

  beforeEach(() => {
    commissionRepo = new MockCommissionRepository();
    commissionSvc = new CommissionService(commissionRepo);
  });

  describe('1. Pure Commission Business Rules (commissionRules.ts)', () => {
    it('calculates 0% commission for achievement under 80% (<80% base)', () => {
      const target = 1000000;
      const achieved = 750000; // 75%
      const result = calculateCommission(target, achieved);

      expect(result.achievementPercentage).toBe(75.0);
      expect(result.commissionRatePercentage).toBe(0);
      expect(result.bonusAmount).toBe(0);
      expect(result.earnedCommission).toBe(0);
      expect(result.tierName).toContain('<80%');
    });

    it('calculates standard commission (1.5%) for achievement between 80% and 99.99%', () => {
      const target = 1000000;
      const achieved = 850000; // 85%
      const result = calculateCommission(target, achieved);

      expect(result.achievementPercentage).toBe(85.0);
      expect(result.commissionRatePercentage).toBe(1.5);
      expect(result.bonusAmount).toBe(0);
      // 850,000 * 1.5% = 12,750
      expect(result.earnedCommission).toBe(12750);
      expect(result.tierName).toContain('80-99%');
    });

    it('calculates target bonus commission (3.0% + LKR 10,000) for achievement between 100% and 119.99%', () => {
      const target = 2000000;
      const achieved = 2200000; // 110%
      const result = calculateCommission(target, achieved);

      expect(result.achievementPercentage).toBe(110.0);
      expect(result.commissionRatePercentage).toBe(3.0);
      expect(result.bonusAmount).toBe(10000);
      // 2,200,000 * 3.0% + 10,000 = 66,000 + 10,000 = 76,000
      expect(result.earnedCommission).toBe(76000);
      expect(result.tierName).toContain('100-119%');
    });

    it('calculates super achievement commission (5.0% + LKR 25,000) for achievement >= 120%', () => {
      const target = 2000000;
      const achieved = 2500000; // 125%
      const result = calculateCommission(target, achieved);

      expect(result.achievementPercentage).toBe(125.0);
      expect(result.commissionRatePercentage).toBe(5.0);
      expect(result.bonusAmount).toBe(25000);
      // 2,500,000 * 5.0% + 25,000 = 125,000 + 25,000 = 150,000
      expect(result.earnedCommission).toBe(150000);
      expect(result.tierName).toContain('>=120%');
    });

    it('accurately resolves exact tier boundaries without gap vulnerabilities', () => {
      const target = 1000000;

      // 79.99% -> base
      const r79 = calculateCommission(target, 799900);
      expect(r79.commissionRatePercentage).toBe(0);

      // Micro-boundary: 79.999% must NEVER jump to super achievement tier
      const r79_999 = calculateCommission(target, 799990);
      expect(r79_999.commissionRatePercentage).toBe(0);
      expect(r79_999.tierName).toContain('<80%');

      // Exactly 80.0% -> standard
      const r80 = calculateCommission(target, 800000);
      expect(r80.commissionRatePercentage).toBe(1.5);
      expect(r80.tierName).toContain('80-99%');

      // Micro-boundary: 99.999% -> standard
      const r99_999 = calculateCommission(target, 999990);
      expect(r99_999.commissionRatePercentage).toBe(1.5);

      // Exactly 100.0% -> target bonus
      const r100 = calculateCommission(target, 1000000);
      expect(r100.commissionRatePercentage).toBe(3.0);
      expect(r100.bonusAmount).toBe(10000);
      expect(r100.tierName).toContain('100-119%');

      // Micro-boundary: 119.999% -> target bonus
      const r119_999 = calculateCommission(target, 1199990);
      expect(r119_999.commissionRatePercentage).toBe(3.0);

      // Exactly 120.0% -> super achievement
      const r120 = calculateCommission(target, 1200000);
      expect(r120.commissionRatePercentage).toBe(5.0);
      expect(r120.bonusAmount).toBe(25000);
      expect(r120.tierName).toContain('>=120%');
    });

    it('handles zero or negative target gracefully', () => {
      const resultZero = calculateCommission(0, 500000);
      expect(resultZero.achievementPercentage).toBe(0);
      expect(resultZero.earnedCommission).toBe(0);

      const resultNeg = calculateCommission(-1000, 500000);
      expect(resultNeg.achievementPercentage).toBe(0);
      expect(resultNeg.earnedCommission).toBe(0);
    });
  });

  describe('2. Customer Loyalty Tier Determination (loyaltyRules.ts)', () => {
    it('assigns BRONZE tier for annual spend below 2M LKR', () => {
      const tier0 = determineLoyaltyTier(0);
      expect(tier0.tier).toBe('BRONZE');
      expect(tier0.discountPerkPercentage).toBe(0);

      const tier1M = determineLoyaltyTier(1500000);
      expect(tier1M.tier).toBe('BRONZE');
      expect(tier1M.discountPerkPercentage).toBe(0);
    });

    it('assigns SILVER tier for annual spend between 2M and 4.99M LKR', () => {
      const tier2M = determineLoyaltyTier(2000000);
      expect(tier2M.tier).toBe('SILVER');
      expect(tier2M.discountPerkPercentage).toBe(1.5);

      const tier4M = determineLoyaltyTier(4800000);
      expect(tier4M.tier).toBe('SILVER');
    });

    it('assigns GOLD tier for annual spend between 5M and 9.99M LKR', () => {
      const tier5M = determineLoyaltyTier(5000000);
      expect(tier5M.tier).toBe('GOLD');
      expect(tier5M.discountPerkPercentage).toBe(3.0);

      const tier8M = determineLoyaltyTier(8500000);
      expect(tier8M.tier).toBe('GOLD');
    });

    it('assigns PLATINUM tier for annual spend of 10M LKR or above', () => {
      const tier10M = determineLoyaltyTier(10000000);
      expect(tier10M.tier).toBe('PLATINUM');
      expect(tier10M.discountPerkPercentage).toBe(5.0);

      const tier25M = determineLoyaltyTier(25000000);
      expect(tier25M.tier).toBe('PLATINUM');
      expect(tier25M.discountPerkPercentage).toBe(5.0);
    });
  });

  describe('3. Commission Service & Target Configuration Workflows', () => {
    it('allows Sales Manager and Director to configure sales targets', async () => {
      const target = await commissionSvc.setSalesTarget(
        {
          salesRepId: 'usr-106',
          salesRepName: 'Kasun Wickramasinghe',
          periodType: 'MONTHLY',
          startDate: '2025-03-01',
          endDate: '2025-03-31',
          targetAmount: 3000000,
        },
        mockSalesManagerUser
      );

      expect(target.id).toBeDefined();
      expect(target.salesRepId).toBe('usr-106');
      expect(target.targetAmount).toBe(3000000);
      expect(target.status).toBe('ACTIVE');

      const all = await commissionSvc.getAllTargets();
      expect(all.some((t) => t.id === target.id)).toBe(true);

      const directorTarget = await commissionSvc.setSalesTarget(
        {
          salesRepId: 'usr-108',
          salesRepName: 'Dinesh Rathnayake',
          periodType: 'MONTHLY',
          startDate: '2025-03-01',
          endDate: '2025-03-31',
          targetAmount: 3500000,
        },
        mockDirectorUser
      );
      expect(directorTarget.id).toBeDefined();
      expect(directorTarget.targetAmount).toBe(3500000);
    });

    it('blocks non-manager roles (e.g. Sales Rep) from configuring targets', async () => {
      await expect(
        commissionSvc.setSalesTarget(
          {
            salesRepId: 'usr-106',
            salesRepName: 'Kasun Wickramasinghe',
            periodType: 'MONTHLY',
            startDate: '2025-03-01',
            endDate: '2025-03-31',
            targetAmount: 3000000,
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/Only Sales Managers, Managers, and Directors/);
    });

    it('rejects targets with non-positive amounts', async () => {
      await expect(
        commissionSvc.setSalesTarget(
          {
            salesRepId: 'usr-106',
            salesRepName: 'Kasun Wickramasinghe',
            periodType: 'MONTHLY',
            startDate: '2025-03-01',
            endDate: '2025-03-31',
            targetAmount: 0,
          },
          mockSalesManagerUser
        )
      ).rejects.toThrow(/greater than zero/);
    });

    it('calculates real-time rep commission summary against active target', async () => {
      // usr-106 has target 2,500,000 and achieved 2,850,000 (114%)
      const summary = await commissionSvc.getRepCommissionSummary('usr-106');

      expect(summary.salesRepId).toBe('usr-106');
      expect(summary.targetAmount).toBe(2500000);
      expect(summary.achievedAmount).toBe(2850000);
      expect(summary.achievementPercentage).toBe(114.0);
      // 2,850,000 * 3.0% + 10,000 = 85,500 + 10,000 = 95,500
      expect(summary.earnedCommission).toBe(95500);
      expect(summary.paidCommission).toBe(50000);
      expect(summary.pendingCommission).toBe(45500);
      expect(summary.tierName).toContain('100-119%');
    });

    it('generates rep leaderboard ranked by achievement percentage descending', async () => {
      const board = await commissionSvc.getLeaderboard();

      expect(board.length).toBeGreaterThan(1);
      // Verify descending sort order
      for (let i = 0; i < board.length - 1; i++) {
        expect(board[i].achievementPercentage).toBeGreaterThanOrEqual(
          board[i + 1].achievementPercentage
        );
      }

      // First place should be highest achiever (e.g. Dinesh Rathnayake at 125%)
      expect(board[0].achievementPercentage).toBeGreaterThanOrEqual(120);
    });

    it('deduplicates sales representatives in leaderboard when multiple targets exist', async () => {
      // Add a second target for usr-106
      await commissionSvc.setSalesTarget(
        {
          salesRepId: 'usr-106',
          salesRepName: 'Kasun Wickramasinghe',
          periodType: 'MONTHLY',
          startDate: '2025-03-01',
          endDate: '2025-03-31',
          targetAmount: 3200000,
        },
        mockSalesManagerUser
      );

      const board = await commissionSvc.getLeaderboard();
      const kasunEntries = board.filter((r) => r.salesRepId === 'usr-106');
      expect(kasunEntries.length).toBe(1);

      // Verify no duplicates across all reps in leaderboard
      const repIds = board.map((r) => r.salesRepId);
      const uniqueRepIds = new Set(repIds);
      expect(repIds.length).toBe(uniqueRepIds.size);
    });
  });
});
