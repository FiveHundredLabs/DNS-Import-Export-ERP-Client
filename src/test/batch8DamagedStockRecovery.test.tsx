import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { inventoryService } from '../services/InventoryService';
import { DamagedStockPage } from '../features/inventory/DamagedStockPage';
import { User } from '../types/auth';

const mockStockKeeperUser: User = {
  id: 'usr-sk-01',
  name: 'Nimal Bandara',
  email: 'nimal@dnserp.lk',
  role: 'STOCK_KEEPER',
  assignedTerritories: [],
  status: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockSalesRepUser: User = {
  id: 'usr-rep-01',
  name: 'Kasun Wickramasinghe',
  email: 'kasun@dnserp.lk',
  role: 'SALES_REP',
  assignedTerritories: [],
  status: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

let currentUserState: User = mockStockKeeperUser;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentUserState,
    role: currentUserState.role,
    isAuthenticated: true,
  }),
}));

describe('Batch 8: Damaged-Stock Traceable Recovery (BR-10, ST-02)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    currentUserState = mockStockKeeperUser;

    // Ensure mock product has damaged balance
    const balance = await inventoryService.getAllStockBalances();
    const target = balance.find((b) => b.productId === 'prod-001');
    if (target) {
      target.damagedQuantity = 10;
      target.availableQuantity = 25;
    }
  });

  it('allows Stock Keeper (ST-02) to restore recovered stock back to available inventory', async () => {
    const balancesBefore = await inventoryService.getAllStockBalances();
    const beforeTarget = balancesBefore.find((b) => b.productId === 'prod-001');
    const prevDamaged = beforeTarget?.damagedQuantity || 10;
    const prevAvailable = beforeTarget?.availableQuantity || 25;

    const movement = await inventoryService.executeDamageReversal(
      'prod-001',
      beforeTarget?.locationId || 'WH-MAIN-LOC-1',
      3,
      mockStockKeeperUser,
      mockStockKeeperUser.name,
      'Internal coil mechanism re-soldered and bench-tested passed QA'
    );

    expect(movement).toBeDefined();
    expect(movement.movementType).toBe('DAMAGE_REVERSAL');
    expect(movement.quantity).toBe(3);
    expect(movement.performedById).toBe('usr-sk-01');
    expect(movement.reason).toContain('bench-tested passed QA');

    const balancesAfter = await inventoryService.getAllStockBalances();
    const afterTarget = balancesAfter.find((b) => b.productId === 'prod-001');
    expect(afterTarget?.damagedQuantity).toBe(prevDamaged - 3);
    expect(afterTarget?.availableQuantity).toBe(prevAvailable + 3);
  });

  it('rejects recovery attempt by unauthorized role like SALES_REP (ST-02 boundary)', async () => {
    const balances = await inventoryService.getAllStockBalances();
    const target = balances.find((b) => b.productId === 'prod-001');

    await expect(
      inventoryService.executeDamageReversal(
        'prod-001',
        target?.locationId || 'WH-MAIN-LOC-1',
        2,
        mockSalesRepUser,
        mockSalesRepUser.name
      )
    ).rejects.toThrow(/Only Stock Keepers or Warehouse Managers are authorized to restore recovered damaged stock/i);
  });

  it('rejects recovery exceeding quarantined damaged quantity', async () => {
    const balances = await inventoryService.getAllStockBalances();
    const target = balances.find((b) => b.productId === 'prod-001');

    await expect(
      inventoryService.executeDamageReversal(
        'prod-001',
        target?.locationId || 'WH-MAIN-LOC-1',
        9999,
        mockStockKeeperUser
      )
    ).rejects.toThrow(/Not enough damaged quantity in quarantine/i);
  });

  it('renders Damaged Stock page with metrics, tabs, and recovery actions', async () => {
    render(
      <BrowserRouter>
        <DamagedStockPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Damaged Product & RMA Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Damaged Units/i)).toBeInTheDocument();
    expect(screen.getByText(/Damaged Valuation/i)).toBeInTheDocument();
    expect(screen.getByText(/Stock Balances/i)).toBeInTheDocument();
  });
});
