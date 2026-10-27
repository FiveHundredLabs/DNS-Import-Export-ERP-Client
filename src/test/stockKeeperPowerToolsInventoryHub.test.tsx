import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventoryDashboardPage } from '../features/inventory/InventoryDashboardPage';
import { serialNumberService } from '../services/SerialNumberService';
import { canAccessRoute } from '../rules/permissions';
import { UserRole } from '../types/auth';

const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Storekeeper Inventory Hub — Power Tools Isolation & Realism', () => {
  beforeEach(() => {
    serialNumberService.resetToDefaults();
    mockUseAuth.mockReturnValue({
      role: 'STOCK_KEEPER' as UserRole,
      currentUser: {
        id: 'usr-stock-01',
        name: 'Amal Perera',
        role: 'STOCK_KEEPER' as UserRole,
        email: 'amal@dns.lk',
        phone: '0771234567',
        status: 'ACTIVE',
      },
      canAccessRoute: (path: string) => canAccessRoute('STOCK_KEEPER', path),
      hasPermission: () => true,
      isAuthenticated: true,
    });
  });

  it('renders Warehouse Inbound Inventory Hub with Industrial Power Tools Division badge', async () => {
    render(
      <MemoryRouter>
        <InventoryDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Warehouse Inbound Inventory Hub/i)).toBeInTheDocument();
      expect(screen.getByText(/Industrial Power Tools Division/i)).toBeInTheDocument();
      expect(screen.getByText(/Main Facility: WH-MAIN/i)).toBeInTheDocument();
    });
  });

  it('displays authentic industrial power tools and strictly excludes non-power tools from the ledger', async () => {
    render(
      <MemoryRouter>
        <InventoryDashboardPage />
      </MemoryRouter>
    );

    // Wait for the ledger table to load
    await waitFor(() => {
      expect(screen.getByText(/Inward Stock Registry/i)).toBeInTheDocument();
    });

    // Check what text is present
    await waitFor(() => {
      expect(screen.getAllByText(/Bosch/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Makita/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/DeWalt/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Milwaukee/i).length).toBeGreaterThan(0);
    });

    // Non-power tools MUST NOT be in the Storekeeper Inbound Inventory Hub
    expect(screen.queryByText(/Schneider Acti9 32A Double Pole MCB/i)).toBeNull();
    expect(screen.queryByText(/Kelani 4\.0mm² Single Core Copper Cable/i)).toBeNull();
    expect(screen.queryByText(/Growatt 5000ES 5kW Off-Grid Solar Inverter/i)).toBeNull();
    expect(screen.queryByText(/Philips SmartBright 600x600/i)).toBeNull();
  });

  it('displays damaged power tools in the Quarantine Bay tab', async () => {
    render(
      <MemoryRouter>
        <InventoryDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Quarantine Bay/i })).toBeInTheDocument();
    });

    const quarantineTab = screen.getByRole('button', { name: /Quarantine Bay/i });
    fireEvent.click(quarantineTab);

    await waitFor(() => {
      expect(screen.getByText(/Physical Quarantine Bay Q-01 — Damaged Goods Log/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Bosch/i).length).toBeGreaterThan(0);
    });
  });

  it('displays power tool serial numbers in the Serial Registry tab', async () => {
    render(
      <MemoryRouter>
        <InventoryDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Serial Registry/i })).toBeInTheDocument();
    });

    const serialsTab = screen.getByRole('button', { name: /Serial Registry/i });
    fireEvent.click(serialsTab);

    await waitFor(() => {
      expect(screen.getByText(/Physical Unit Serial Numbers Registry/i)).toBeInTheDocument();
      expect(screen.getByText('SN-BSH-GBH-001')).toBeInTheDocument();
      expect(screen.getByText('SN-MKT-DGA-401')).toBeInTheDocument();
    });
  });
});
