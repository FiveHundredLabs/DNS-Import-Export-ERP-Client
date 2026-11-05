import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StockBalancePage } from '../features/inventory/StockBalancePage';
import { InventoryDashboardPage } from '../features/inventory/InventoryDashboardPage';
import { ProductDetailPage } from '../features/products/ProductDetailPage';
import { StockManagerApprovalHub } from '../features/inventory/components/StockManagerApprovalHub';
import { UserRole } from '../types/auth';

const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Removal of Warehouse & Location for Stock Keeper and Stock Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. StockBalancePage Location Isolation', () => {
    it('does NOT render Location filter or Location table column for STOCK_KEEPER', async () => {
      mockUseAuth.mockReturnValue({
        role: 'STOCK_KEEPER' as UserRole,
        user: { id: 'usr-sk-01', name: 'Amal Keeper', role: 'STOCK_KEEPER' },
        currentUser: { id: 'usr-sk-01', name: 'Amal Keeper', role: 'STOCK_KEEPER' },
        canAccessRoute: () => true,
        hasPermission: () => true,
      });

      render(
        <MemoryRouter>
          <StockBalancePage />
        </MemoryRouter>
      );

      // Verify page rendered
      expect(screen.getByText('Low Stock Only')).toBeInTheDocument();

      // Verify Location filter dropdown trigger is NOT rendered
      expect(screen.queryByText('All Locations')).toBeNull();
      expect(screen.queryByPlaceholderText('Location')).toBeNull();

      // Wait for table to render
      await waitFor(() => {
        expect(screen.getByText('SKU')).toBeInTheDocument();
      });

      // Verify TableHead "Location" is NOT in the document
      const locationHeaders = screen.queryAllByRole('columnheader', { name: /^Location$/i });
      expect(locationHeaders.length).toBe(0);
    });

    it('does NOT render Location filter or Location table column for STOCK_MANAGER', async () => {
      mockUseAuth.mockReturnValue({
        role: 'STOCK_MANAGER' as UserRole,
        user: { id: 'usr-sm-01', name: 'Bandara Lead', role: 'STOCK_MANAGER' },
        currentUser: { id: 'usr-sm-01', name: 'Bandara Lead', role: 'STOCK_MANAGER' },
        canAccessRoute: () => true,
        hasPermission: () => true,
      });

      render(
        <MemoryRouter>
          <StockBalancePage />
        </MemoryRouter>
      );

      expect(screen.queryByText('All Locations')).toBeNull();
      const locationHeaders = screen.queryAllByRole('columnheader', { name: /^Location$/i });
      expect(locationHeaders.length).toBe(0);
    });

    it('DOES render Location filter and Location column for DIRECTOR', async () => {
      mockUseAuth.mockReturnValue({
        role: 'DIRECTOR' as UserRole,
        user: { id: 'usr-dir-01', name: 'Devin Director', role: 'DIRECTOR' },
        currentUser: { id: 'usr-dir-01', name: 'Devin Director', role: 'DIRECTOR' },
        canAccessRoute: () => true,
        hasPermission: () => true,
      });

      render(
        <MemoryRouter>
          <StockBalancePage />
        </MemoryRouter>
      );

      expect(screen.getByText('All Locations')).toBeInTheDocument();

      await waitFor(() => {
        const locationHeaders = screen.getAllByRole('columnheader', { name: /^Location$/i });
        expect(locationHeaders.length).toBeGreaterThan(0);
      });
    });
  });

  describe('2. InventoryDashboardPage Location Isolation', () => {
    it('does NOT render Quarantine Location column or Bin Location column for STOCK_KEEPER', async () => {
      mockUseAuth.mockReturnValue({
        role: 'STOCK_KEEPER' as UserRole,
        user: { id: 'usr-sk-01', name: 'Amal Keeper', role: 'STOCK_KEEPER' },
        currentUser: { id: 'usr-sk-01', name: 'Amal Keeper', role: 'STOCK_KEEPER' },
        canAccessRoute: () => true,
        hasPermission: () => true,
      });

      render(
        <MemoryRouter>
          <InventoryDashboardPage />
        </MemoryRouter>
      );

      // Open Quarantine Bay tab
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Quarantine Bay/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Quarantine Bay/i }));

      await waitFor(() => {
        expect(screen.queryByText('Quarantine Location')).toBeNull();
      });

      // Open Serial Registry tab
      fireEvent.click(screen.getByRole('button', { name: /Serial Registry/i }));
      await waitFor(() => {
        expect(screen.queryByText('Bin Location')).toBeNull();
      });
    });
  });

  describe('3. ProductDetailPage Location Isolation', () => {
    it('does NOT render Location Stock tab or Warehouse Locations card for STOCK_MANAGER', async () => {
      mockUseAuth.mockReturnValue({
        role: 'STOCK_MANAGER' as UserRole,
        user: { id: 'usr-sm-01', name: 'Bandara Lead', role: 'STOCK_MANAGER' },
        currentUser: { id: 'usr-sm-01', name: 'Bandara Lead', role: 'STOCK_MANAGER' },
        canAccessRoute: () => true,
        hasPermission: () => true,
      });

      render(
        <MemoryRouter initialEntries={['/products/prod-001']}>
          <Routes>
            <Route path="/products/:id" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      expect(screen.queryByText('Location Stock')).toBeNull();
      expect(screen.queryByText('Warehouse Locations')).toBeNull();
    });
  });

  describe('4. StockManagerApprovalHub Header & Column Isolation', () => {
    it('renders without Warehouse in header badge or table column', async () => {
      mockUseAuth.mockReturnValue({
        role: 'STOCK_MANAGER' as UserRole,
        user: { id: 'usr-sm-01', name: 'Bandara Lead', role: 'STOCK_MANAGER' },
        currentUser: { id: 'usr-sm-01', name: 'Bandara Lead', role: 'STOCK_MANAGER' },
        canAccessRoute: () => true,
        hasPermission: () => true,
      });

      render(
        <MemoryRouter>
          <StockManagerApprovalHub />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Stock Approvals & Verification Hub • Stock Manager')).toBeInTheDocument();
        expect(screen.queryByText('Warehouse Approval Engine • Stock Manager')).toBeNull();
      });
    });
  });
});
