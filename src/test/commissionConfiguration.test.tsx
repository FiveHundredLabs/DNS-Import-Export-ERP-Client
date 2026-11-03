import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CommissionConfigPage } from '../features/commissions/CommissionConfigPage';
import { commissionConfigService } from '../services/CommissionConfigService';
import { User } from '../types/auth';
import { CommissionRole, RoleCommissionConfig } from '../types/commissionConfig';

const mockDirectorUser: User = {
  id: 'usr-dir-01',
  name: 'Director Jane',
  email: 'director@example.com',
  role: 'DIRECTOR',
  phone: '0771234567',
  isActive: true,
};

const mockSalesRepUser: User = {
  id: 'usr-rep-01',
  name: 'Kasun Rep',
  email: 'rep@example.com',
  role: 'SALES_REP',
  phone: '0779876543',
  isActive: true,
};

let currentUserMock: User = mockDirectorUser;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentUserMock,
    role: currentUserMock.role,
    user: currentUserMock,
    canAccessRoute: () => true,
  }),
}));

describe('Commission Configuration & Monthly Reports Domain & UI', () => {
  beforeEach(async () => {
    currentUserMock = mockDirectorUser;
    await commissionConfigService.resetToDefaults();
  });

  describe('1. Commission Calculation Engine Scenarios', () => {
    it('Scenario 1: Calculates Collection-Based Commission accurately', async () => {
      const config: RoleCommissionConfig = {
        role: 'SHOWROOM_MANAGER',
        activeScenario: 'COLLECTION_BASED',
        collectionConfig: { commissionPercentage: 3.0 },
        tierConfig: { tiers: [] },
        targetConfig: { targetSalesAmount: 0, commissionPercentage: 0, applyOnSurplusOnly: true },
        updatedAt: new Date().toISOString(),
        updatedBy: 'Test Runner',
      };

      const result = commissionConfigService.calculateCommission(
        mockSalesRepUser,
        '2026-10',
        100000,
        50000, // collections: 50,000 * 3% = 1,500
        config
      );

      expect(result.commissionEarned).toBe(1500);
      expect(result.calculationMethod).toContain('Collection-Based');
      expect(result.applicableRateOrTier).toBe('3% of Collections');
      expect(result.breakdown.explanation).toContain('50,000');
    });

    it('Scenario 2: Calculates Tier-Based Commission accurately based on predefined tiers', async () => {
      const config: RoleCommissionConfig = {
        role: 'SALES_REP',
        activeScenario: 'TIER_BASED',
        collectionConfig: { commissionPercentage: 0 },
        tierConfig: {
          tiers: [
            { id: 't1', minSalesAmount: 10000, commissionReward: 2000, tierLabel: 'Tier 1 (>10k)' },
            { id: 't2', minSalesAmount: 20000, commissionReward: 4000, tierLabel: 'Tier 2 (>20k)' },
            { id: 't3', minSalesAmount: 50000, commissionReward: 10000, tierLabel: 'Tier 3 (>50k)' },
          ],
        },
        targetConfig: { targetSalesAmount: 0, commissionPercentage: 0, applyOnSurplusOnly: true },
        updatedAt: new Date().toISOString(),
        updatedBy: 'Test Runner',
      };

      // Case A: Sales below Tier 1
      const resLow = commissionConfigService.calculateCommission(
        mockSalesRepUser,
        '2026-10',
        8000,
        5000,
        config
      );
      expect(resLow.commissionEarned).toBe(0);
      expect(resLow.applicableRateOrTier).toContain('Below Entry Tier');

      // Case B: Sales in Tier 1 (10,000 <= 15,000 < 20,000)
      const resT1 = commissionConfigService.calculateCommission(
        mockSalesRepUser,
        '2026-10',
        15000,
        10000,
        config
      );
      expect(resT1.commissionEarned).toBe(2000);

      // Case C: Sales in Tier 2 (20,000 <= 25,000 < 50,000)
      const resT2 = commissionConfigService.calculateCommission(
        mockSalesRepUser,
        '2026-10',
        25000,
        15000,
        config
      );
      expect(resT2.commissionEarned).toBe(4000);

      // Case D: Sales in Tier 3 (>= 50,000)
      const resT3 = commissionConfigService.calculateCommission(
        mockSalesRepUser,
        '2026-10',
        85000,
        60000,
        config
      );
      expect(resT3.commissionEarned).toBe(10000);
    });

    it('Scenario 3: Calculates Target-Based Commission with bonus on surplus sales exceeding target', async () => {
      const config: RoleCommissionConfig = {
        role: 'AREA_MANAGER',
        activeScenario: 'TARGET_BASED',
        collectionConfig: { commissionPercentage: 0 },
        tierConfig: { tiers: [] },
        targetConfig: {
          targetSalesAmount: 50000,
          commissionPercentage: 5.0,
          applyOnSurplusOnly: true,
        },
        updatedAt: new Date().toISOString(),
        updatedBy: 'Test Runner',
      };

      // Case A: Sales below target
      const resBelow = commissionConfigService.calculateCommission(
        mockSalesRepUser,
        '2026-10',
        40000,
        30000,
        config
      );
      expect(resBelow.commissionEarned).toBe(0);
      expect(resBelow.applicableRateOrTier).toContain('Target Not Achieved');

      // Case B: Sales exceeding target: 70,000 - 50,000 = 20,000 surplus * 5% = 1,000
      const resAbove = commissionConfigService.calculateCommission(
        mockSalesRepUser,
        '2026-10',
        70000,
        50000,
        config
      );
      expect(resAbove.commissionEarned).toBe(1000);
      expect(resAbove.applicableRateOrTier).toContain('5% on Surplus');
    });
  });

  describe('2. Service Role Management & Reports', () => {
    it('allows updating role configuration dynamically without hardcoded values', async () => {
      const updated = await commissionConfigService.updateRoleConfig(
        'CASHIER',
        {
          activeScenario: 'COLLECTION_BASED',
          collectionConfig: { commissionPercentage: 1.8 },
        },
        'Director Jane'
      );

      expect(updated.activeScenario).toBe('COLLECTION_BASED');
      expect(updated.collectionConfig.commissionPercentage).toBe(1.8);
      expect(updated.updatedBy).toBe('Director Jane');

      const fetched = await commissionConfigService.getRoleConfig('CASHIER');
      expect(fetched.collectionConfig.commissionPercentage).toBe(1.8);
    });

    it('generates a complete Monthly Commission Report for previous months', async () => {
      const report = await commissionConfigService.getMonthlyCommissionReport('2026-09');

      expect(report.month).toBe('2026-09');
      expect(report.items.length).toBeGreaterThan(0);
      expect(report.totalSalesVolume).toBeGreaterThan(0);
      expect(report.totalCollectionsVolume).toBeGreaterThan(0);
      expect(report.totalCommissionPayable).toBeGreaterThanOrEqual(0);
      expect(report.beneficiariesCount).toBeGreaterThanOrEqual(0);

      // Verify each item has breakdown details
      const firstItem = report.items[0];
      expect(firstItem.userName).toBeDefined();
      expect(firstItem.calculationMethod).toBeDefined();
      expect(firstItem.breakdown).toBeDefined();
      expect(firstItem.breakdown.explanation.length).toBeGreaterThan(10);
    });
  });

  describe('3. CommissionConfigPage UI Flow', () => {
    it('renders configuration UI for Director role and permits scenario adjustments', async () => {
      render(
        <MemoryRouter>
          <CommissionConfigPage />
        </MemoryRouter>
      );

      // Verify Title & Role selector tabs
      expect(
        screen.getByRole('heading', { name: /Commission Configuration & Reports/i })
      ).toBeInTheDocument();
      expect(screen.getAllByText(/Sales Representative/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Area Manager/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Cashier/i).length).toBeGreaterThan(0);

      // Verify Scenario Options appear once configs load
      await waitFor(() => {
        expect(screen.getByText(/Scenario 1: Collection-Based/i)).toBeInTheDocument();
        expect(screen.getByText(/Scenario 2: Tier-Based/i)).toBeInTheDocument();
        expect(screen.getByText(/Scenario 3: Target-Based/i)).toBeInTheDocument();
      });

      // Click to switch to Monthly Reports tab
      const reportsTab = screen.getByRole('button', { name: /Monthly Commission Reports/i });
      fireEvent.click(reportsTab);

      // Wait for table to render
      await waitFor(() => {
        expect(screen.getByText(/Total Commission Payable/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Qualifying Sales/i)).toBeInTheDocument();
      });
    });

    it('shows restricted access notice when accessed by unauthorized roles', async () => {
      currentUserMock = { ...mockSalesRepUser, role: 'SALES_REP' };

      render(
        <MemoryRouter>
          <CommissionConfigPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Restricted Access/i)).toBeInTheDocument();
      expect(screen.queryByText(/Select Active Commission Scenario/i)).not.toBeInTheDocument();
    });
  });
});

