import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PerformanceDashboardPage } from '../features/performance/PerformanceDashboardPage';
import { RepPersonalPerformanceView } from '../features/performance/RepPersonalPerformanceView';
import { ManagerTerritoryView } from '../features/performance/ManagerTerritoryView';
import { SchemeProgressTracker } from '../features/performance/SchemeProgressTracker';
import { commissionService } from '../services/CommissionService';
import { salesManagerDashboardService } from '../services/SalesManagerDashboardService';
import { commissionConfigService } from '../services/CommissionConfigService';
import { User } from '../types/auth';
import { RoleCommissionConfig } from '../types/commissionConfig';
import { canAccessRoute } from '../rules/permissions';

const mockSalesRepUser: User = {
  id: 'usr-106',
  name: 'Kasun Wickramasinghe',
  email: 'rep.colombo@dnserp.com',
  role: 'SALES_REP',
  areaId: 'area-01',
  phone: '0776789012',
  isActive: true,
};

const mockAreaManagerUser: User = {
  id: 'usr-105',
  name: 'Nimal Bandara',
  email: 'area.western@dnserp.com',
  role: 'AREA_MANAGER',
  areaId: 'area-01',
  phone: '0775678901',
  isActive: true,
};

let currentUserMock: User = mockSalesRepUser;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentUserMock,
    role: currentUserMock.role,
    user: currentUserMock,
    canAccessRoute: () => true,
  }),
}));

describe('Role-Aware Performance & Incentives UI Module', () => {
  beforeEach(async () => {
    currentUserMock = mockSalesRepUser;
    await commissionConfigService.resetToDefaults();
  });

  describe('1. Backend Service Integrations', () => {
    it('fetches isolated rep performance data with qualifying invoices and cleared collections', async () => {
      const repData = await commissionService.getRepPerformance('usr-106', '2026-10');
      expect(repData).toBeDefined();
      expect(repData.salesRepId).toBe('usr-106');
      expect(repData.salesRepName).toBe('Kasun Wickramasinghe');
      expect(repData.actualSales).toBeGreaterThan(0);
      expect(repData.clearedCollections).toBeGreaterThan(0);
      expect(repData.qualifyingInvoices.length).toBeGreaterThan(0);
      expect(repData.clearedCollectionsList.length).toBeGreaterThan(0);
      expect(repData.breakdown).toBeDefined();
      expect(repData.roleConfig.role).toBe('SALES_REP');
    });

    it('fetches territory aggregates, manager surplus incentive, and subordinate reps for Area Manager', async () => {
      const areaData = await salesManagerDashboardService.getAreaPerformance('area-01', '2026-10');
      expect(areaData).toBeDefined();
      expect(areaData.areaId).toBe('area-01');
      expect(areaData.territorySales).toBeGreaterThan(0);
      expect(areaData.territoryTarget).toBeGreaterThan(0);
      expect(areaData.subordinateReps.length).toBeGreaterThan(0);
      expect(areaData.managerBreakdown).toBeDefined();
      expect(typeof areaData.managerCommission).toBe('number');
    });
  });

  describe('2. Sales Rep Security & Strict Data Isolation UI', () => {
    it('renders personal performance view for logged-in SALES_REP without peer rankings', async () => {
      currentUserMock = mockSalesRepUser;

      render(
        <MemoryRouter initialEntries={['/my-performance']}>
          <Routes>
            <Route path="/my-performance" element={<PerformanceDashboardPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify header and badge
      expect(screen.getByText(/Performance & Incentives Desk/i)).toBeInTheDocument();
      expect(screen.getByText(/Sales Representative Desk/i)).toBeInTheDocument();

      // Wait for data load
      await waitFor(() => {
        expect(screen.getByText(/Personal Sales & Cash Incentive Statement/i)).toBeInTheDocument();
      });

      // Strict data isolation: rep sees their own name
      expect(screen.getByText(/Kasun Wickramasinghe/i)).toBeInTheDocument();
      expect(screen.getByText(/Isolated Representative Ledger/i)).toBeInTheDocument();

      // 3 KPI Cards must be rendered
      expect(screen.getByText(/1\. Sales Generated/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Collected Cash/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Earned Cash Incentive/i)).toBeInTheDocument();

      // Ensure NO leaderboard, rankings, or peer table is present in rep view
      expect(screen.queryByText(/Sales Representative Performance & Incentive Leaderboard/i)).toBeNull();
      expect(screen.queryByText(/Attention Needed/i)).toBeNull();

      // Unified Sales & Cash Collection Ledger is present
      expect(screen.getByText(/Sales & Cash Collection Ledger/i)).toBeInTheDocument();
      expect(screen.getByText('Invoice #')).toBeInTheDocument();
      expect(screen.getByText('Dealer Account')).toBeInTheDocument();
      expect(screen.getByText('Sale Amount')).toBeInTheDocument();
      expect(screen.getAllByText('Collected Cash').length).toBeGreaterThan(0);
    });

    it('filters sales and cash collection ledger by dealer or invoice', async () => {
      currentUserMock = mockSalesRepUser;

      render(
        <MemoryRouter>
          <RepPersonalPerformanceView repId="usr-106" month="2026-10" />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Sales & Cash Collection Ledger/i)).toBeInTheDocument();
      });

      // Find an invoice row in the table
      const invoiceCells = screen.getAllByRole('cell');
      expect(invoiceCells.length).toBeGreaterThan(0);

      // Search input is present and filter works
      const searchInput = screen.getByPlaceholderText(/Search invoice or dealer/i);
      expect(searchInput).toBeInTheDocument();

      // Search for a non-existent dealer and verify table empties
      fireEvent.change(searchInput, { target: { value: 'NonExistentDealer12345' } });

      await waitFor(() => {
        expect(screen.getByText(/No records found matching your filter/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Area Manager Territory View & Audit Drawer', () => {
    it('renders Manager Incentive Overview and Subordinate Leaderboard strictly for assigned territory without target column or gimmick badges', async () => {
      currentUserMock = mockAreaManagerUser;

      render(
        <MemoryRouter initialEntries={['/my-performance']}>
          <Routes>
            <Route path="/my-performance" element={<PerformanceDashboardPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/Area Territory Manager Desk/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Territory Overview/i)).toBeInTheDocument();
      });

      // Manager's own performance elements
      expect(screen.getByText(/Team Sales Generated/i)).toBeInTheDocument();
      expect(screen.getByText(/Team Cash Realized/i)).toBeInTheDocument();
      expect(screen.getByText(/Collection Realization/i)).toBeInTheDocument();
      expect(screen.getByText(/Manager Incentive Payout/i)).toBeInTheDocument();
      expect(screen.getByText(/Territory Scoped/i)).toBeInTheDocument();

      // Subordinate Leaderboard Table
      expect(screen.getByText(/Sales Representative Performance & Incentive Leaderboard/i)).toBeInTheDocument();
      expect(screen.getAllByText(/View Ledger/i).length).toBeGreaterThan(0);

      // Verify no target column and no gimmick badges like "Attention Needed"
      expect(screen.queryByText('Target Quota')).toBeNull();
      expect(screen.queryByText(/Attention Needed/i)).toBeNull();
      expect(screen.queryByText(/Super Achiever/i)).toBeNull();
    });

    it('opens slide-over audit drawer when [View Ledger] is clicked on a subordinate sales rep', async () => {
      currentUserMock = mockAreaManagerUser;

      render(
        <MemoryRouter>
          <ManagerTerritoryView areaId="area-01" month="2026-10" />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Sales Representative Performance & Incentive Leaderboard/i)).toBeInTheDocument();
      });

      // Click the first [View Ledger] button
      const viewButtons = screen.getAllByRole('button', { name: /View Ledger/i });
      fireEvent.click(viewButtons[0]);

      // Verify the slide-over drawer opened
      await waitFor(() => {
        expect(screen.getByText(/Representative Ledger:/i)).toBeInTheDocument();
        expect(screen.getByText(/Close Audit Drawer/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. Strict Role Navigation & Access Boundaries', () => {
    it('restricts /my-performance navigation and access exclusively to SALES_REP and AREA_MANAGER', () => {
      // Allowed roles
      expect(canAccessRoute('SALES_REP', '/my-performance')).toBe(true);
      expect(canAccessRoute('AREA_MANAGER', '/my-performance')).toBe(true);

      // Disallowed roles (MUST NOT see this navigation)
      expect(canAccessRoute('DIRECTOR', '/my-performance')).toBe(false);
      expect(canAccessRoute('SALES_MANAGER', '/my-performance')).toBe(false);
      expect(canAccessRoute('MANAGER', '/my-performance')).toBe(false);
      expect(canAccessRoute('STOCK_KEEPER', '/my-performance')).toBe(false);
      expect(canAccessRoute('STOCK_MANAGER', '/my-performance')).toBe(false);
      expect(canAccessRoute('CASHIER', '/my-performance')).toBe(false);
      expect(canAccessRoute('SHOWROOM_MANAGER', '/my-performance')).toBe(false);
      expect(canAccessRoute('FINANCE_MANAGER', '/my-performance')).toBe(false);
    });

    it('renders Access Restricted notice when an unauthorized user attempts to view /my-performance', () => {
      currentUserMock = {
        id: 'usr-dir-01',
        name: 'Director Jane',
        email: 'director@dnserp.com',
        role: 'DIRECTOR',
        phone: '0771234567',
        isActive: true,
      };

      render(
        <MemoryRouter initialEntries={['/my-performance']}>
          <Routes>
            <Route path="/my-performance" element={<PerformanceDashboardPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(
        screen.getByText(/This module is reserved exclusively for Sales Representatives and Area Managers/i)
      ).toBeInTheDocument();
    });
  });

  describe('4. SchemeProgressTracker Across All 3 Incentive Scenarios', () => {
    it('renders TIER_BASED scheme with milestone nodes and motivational helper text', () => {
      const tierConfig: RoleCommissionConfig = {
        role: 'SALES_REP',
        activeScenario: 'TIER_BASED',
        collectionConfig: { commissionPercentage: 2.5 },
        tierConfig: {
          tiers: [
            { id: 't1', minSalesAmount: 10000, commissionReward: 2000, tierLabel: 'Tier 1: Above 10k' },
            { id: 't2', minSalesAmount: 20000, commissionReward: 4000, tierLabel: 'Tier 2: Above 20k' },
            { id: 't3', minSalesAmount: 50000, commissionReward: 10000, tierLabel: 'Tier 3: Above 50k' },
          ],
        },
        targetConfig: { targetSalesAmount: 50000, commissionPercentage: 5.0, applyOnSurplusOnly: true },
        updatedAt: '',
        updatedBy: '',
      };

      render(
        <SchemeProgressTracker
          actualSales={25000}
          clearedCollections={20000}
          targetAmount={50000}
          roleConfig={tierConfig}
          breakdown={{
            scenarioUsed: 'TIER_BASED',
            scenarioLabel: 'Tier-Based Commission',
            totalSales: 25000,
            totalCollections: 20000,
            qualifyingBaseAmount: 25000,
            rateOrTierApplied: 'Tier 2: Above 20k',
            commissionEarned: 4000,
            explanation: 'Sales of 25,000 qualified for Tier 2.',
          }}
        />
      );

      expect(screen.getByText(/Tier-Based Sales Milestone/i)).toBeInTheDocument();
      expect(screen.getByText(/Tier 1: Above 10k/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Tier 2: Above 20k/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Tier 3: Above 50k/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/You have unlocked/i)).toBeInTheDocument();
    });

    it('renders TARGET_BASED scheme with target baseline and surplus zone callout', () => {
      const targetConfig: RoleCommissionConfig = {
        role: 'AREA_MANAGER',
        activeScenario: 'TARGET_BASED',
        collectionConfig: { commissionPercentage: 1.5 },
        tierConfig: { tiers: [] },
        targetConfig: { targetSalesAmount: 1000000, commissionPercentage: 3.0, applyOnSurplusOnly: true },
        updatedAt: '',
        updatedBy: '',
      };

      render(
        <SchemeProgressTracker
          actualSales={1450000}
          clearedCollections={1200000}
          targetAmount={1000000}
          roleConfig={targetConfig}
          breakdown={{
            scenarioUsed: 'TARGET_BASED',
            scenarioLabel: 'Target-Based Commission',
            totalSales: 1450000,
            totalCollections: 1200000,
            qualifyingBaseAmount: 1450000,
            rateOrTierApplied: '3.0% on Surplus > 1,000,000',
            commissionEarned: 13500,
            explanation: 'Sales exceeded target by 450,000.',
          }}
        />
      );

      expect(screen.getByText(/Target Threshold & Surplus Incentive/i)).toBeInTheDocument();
      expect(screen.getByText(/Target Exceeded!/i)).toBeInTheDocument();
      expect(screen.getByText(/Target Baseline:/i)).toBeInTheDocument();
    });

    it('renders COLLECTION_BASED scheme with cleared collections and payout formula', () => {
      const collectionConfig: RoleCommissionConfig = {
        role: 'SHOWROOM_MANAGER',
        activeScenario: 'COLLECTION_BASED',
        collectionConfig: { commissionPercentage: 2.5 },
        tierConfig: { tiers: [] },
        targetConfig: { targetSalesAmount: 0, commissionPercentage: 0, applyOnSurplusOnly: true },
        updatedAt: '',
        updatedBy: '',
      };

      render(
        <SchemeProgressTracker
          actualSales={400000}
          clearedCollections={380000}
          targetAmount={0}
          roleConfig={collectionConfig}
          breakdown={{
            scenarioUsed: 'COLLECTION_BASED',
            scenarioLabel: 'Collection-Based Commission',
            totalSales: 400000,
            totalCollections: 380000,
            qualifyingBaseAmount: 380000,
            rateOrTierApplied: '2.5% of Collections',
            commissionEarned: 9500,
            explanation: 'Collections multiplied by 2.5%.',
          }}
        />
      );

      expect(screen.getByText(/Collection-Linked Commission/i)).toBeInTheDocument();
      expect(screen.getByText(/Monthly Cleared Collections/i)).toBeInTheDocument();
      expect(screen.getByText(/2.5% Direct Payout/i)).toBeInTheDocument();
    });
  });
});
