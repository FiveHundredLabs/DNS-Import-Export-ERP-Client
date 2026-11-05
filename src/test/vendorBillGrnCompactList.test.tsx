import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VendorBillCostingPage } from '../features/finance/pages/ap/VendorBillCostingPage';
import { apService } from '../features/finance/services/apService';
import { financeRepository } from '../features/finance/api';

describe('Vendor Bill Processing: 2-Step Guided Workflow Without Barcode Clutter', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
    apService.reset();
  });

  it('1. Renders persistent context header with GRN metadata and vendor invoice inputs', () => {
    render(
      <MemoryRouter>
        <VendorBillCostingPage />
      </MemoryRouter>
    );

    // Header & Warehouse details
    expect(screen.getAllByText(/Schneider Electric Lanka \(Pvt\) Ltd/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GRN-2025-001/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/WH-MAIN/i)).toBeDefined();

    // 2-Step guided workflow switcher
    expect(screen.getByText(/Step 1: Invoice & Landed Costing/i)).toBeDefined();
    expect(screen.getByText(/Step 2: Selling Price & Margin Setup/i)).toBeDefined();

    // Essential product details are visible with clean names
    expect(screen.getAllByText('Schneider Acti9 32A Double Pole MCB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('450 units').length).toBeGreaterThan(0);
  });

  it('2. Keeps product list focused on clean Product Names without technical barcode clutter', () => {
    render(
      <MemoryRouter>
        <VendorBillCostingPage />
      </MemoryRouter>
    );

    // Products show clean full names
    expect(screen.getAllByText('Schneider Acti9 32A Double Pole MCB').length).toBeGreaterThan(0);

    // Barcode elements are completely absent
    expect(screen.queryByText(/Product Barcode:/i)).toBeNull();
    expect(screen.queryByText(/8901020304011/i)).toBeNull();
    expect(screen.queryByText(/barcode/i)).toBeNull();
  });

  it('3. Provides direct access to Step 2 Selling Prices in the 2-step navigation pill bar', async () => {
    render(
      <MemoryRouter>
        <VendorBillCostingPage />
      </MemoryRouter>
    );

    // Direct access to Step 2
    const step2Tab = screen.getByRole('button', { name: /Step 2: Selling Price & Margin Setup/i });
    expect(step2Tab).toBeDefined();
    fireEvent.click(step2Tab);

    await waitFor(() => {
      expect(screen.getByText(/Commercial Price & Margin Assignment/i)).toBeDefined();
      expect(screen.getAllByText(/Margin/i).length).toBeGreaterThan(0);
    });
  });
});
