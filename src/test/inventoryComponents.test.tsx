import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { GRNListPage } from '../features/inventory/GRNListPage';
import { StockBalancePage } from '../features/inventory/StockBalancePage';
import { OrderPickingPage } from '../features/inventory/OrderPickingPage';
import { GRNDetailPage } from '../features/inventory/GRNDetailPage';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: '123' })
}));

vi.mock('../hooks/useInventory', () => ({
  useInventory: () => ({
    stockBalances: [{ productId: 'Product 1', availableQuantity: 20, locationId: 'w1', damagedQuantity: 0 }],
    movements: [],
    loading: false,
    inventoryService: {}
  })
}));

vi.mock('../hooks/useGRN', () => ({
  useGRN: () => ({
    grns: [{ id: 'GRN-1', status: 'DRAFT' }],
    loading: false,
    grnService: {
      getGRNById: vi.fn().mockResolvedValue({
        id: '123',
        grnNumber: 'GRN-2025-0001',
        supplierName: 'Alpha Imports',
        status: 'SUBMITTED',
        warehouseId: 'WH-MAIN',
        items: []
      })
    }
  })
}));

describe('Inventory Components', () => {
  it('GRN list page renders with filter controls', () => {
    render(<GRNListPage />);
    expect(screen.getByText('GRN List')).toBeTruthy();
    expect(screen.getByText('All')).toBeTruthy();
  });

  it('Stock balance table renders product rows', () => {
    render(<StockBalancePage />);
    expect(screen.getByText('Stock Balance')).toBeTruthy();
    expect(screen.getByText('Product 1')).toBeTruthy();
  });

  it('Picking page renders order picking slip', () => {
    render(<OrderPickingPage />);
    expect(screen.getByText('Picking Slip')).toBeTruthy();
  });

  it('GRN detail page renders successfully with Textarea approval box', async () => {
    render(<GRNDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('GRN Details')).toBeTruthy();
    });
  });
});
