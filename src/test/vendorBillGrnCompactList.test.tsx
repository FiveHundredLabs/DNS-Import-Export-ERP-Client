import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VendorBillCostingPage } from '../features/finance/pages/ap/VendorBillCostingPage';
import { apService } from '../features/finance/services/apService';
import { financeRepository } from '../features/finance/api';

describe('Vendor Bill Processing: Warehouse Goods Receipt Card (Compact UI & Serials)', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
    apService.reset();
  });

  it('1. Renders compact GRN card with essential product info and summary stats', () => {
    render(
      <MemoryRouter>
        <VendorBillCostingPage />
      </MemoryRouter>
    );

    // Header & Warehouse details
    expect(screen.getByText(/Warehouse Goods Receipt \(Read-Only\)/i)).toBeDefined();
    expect(screen.getAllByText(/Schneider Electric Lanka \(Pvt\) Ltd/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GRN-2025-001/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/WH-MAIN/i)).toBeDefined();

    // Summary strip
    expect(screen.getAllByText(/Product Lines/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Received Units/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Damaged Units/i).length).toBeGreaterThan(0);

    // Essential product details are visible
    expect(screen.getAllByText('Schneider Acti9 32A Double Pole MCB').length).toBeGreaterThan(0);
    expect(screen.getByText('SKU: DNS-MCB-32A-2P')).toBeDefined();
    expect(screen.getByText('450 units')).toBeDefined();
  });

  it('2. Expands individual product details to show product-level barcode', async () => {
    render(
      <MemoryRouter>
        <VendorBillCostingPage />
      </MemoryRouter>
    );

    // Barcode details shouldn't be expanded initially
    expect(screen.queryByText(/Product-level barcode \(one barcode per product type/i)).toBeNull();

    // Find and click the "Show Barcode & Details" button for the first item
    const toggleButtons = screen.getAllByRole('button', { name: /show barcode & details/i });
    expect(toggleButtons.length).toBeGreaterThan(0);
    fireEvent.click(toggleButtons[0]);

    // Now product barcode and details are displayed
    await waitFor(() => {
      expect(screen.getByText('8901020304011')).toBeDefined();
      expect(screen.getByText(/Product-level barcode \(one barcode per product type/i)).toBeDefined();
      expect(screen.getAllByText(/Category/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Expected Inbound/i)).toBeDefined();
    });

    // Clicking again collapses the details
    const hideBtn = screen.getByRole('button', { name: /hide barcode & details/i });
    fireEvent.click(hideBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Product-level barcode \(one barcode per product type/i)).toBeNull();
    });
  });

  it('3. Displays View Serial Numbers button only for products with serial numbers and opens modal', async () => {
    render(
      <MemoryRouter>
        <VendorBillCostingPage />
      </MemoryRouter>
    );

    // prod-001 has 10 unit serial numbers registered
    const viewSerialBtns = screen.getAllByRole('button', { name: /view serial numbers \(10\)/i });
    expect(viewSerialBtns.length).toBeGreaterThan(0);

    // Click to open Serial Numbers modal
    fireEvent.click(viewSerialBtns[0]);

    // Modal dialog opens
    await waitFor(() => {
      expect(screen.getByText('Product Serial Numbers')).toBeDefined();
      expect(screen.getByText('10 Serials')).toBeDefined();
      expect(screen.getByText('SN-RHD-2025-001')).toBeDefined();
      expect(screen.getByText('SN-RHD-2025-010')).toBeDefined();
    });

    // Test search filter inside serials modal
    const searchInput = screen.getByPlaceholderText(/search serial numbers/i);
    fireEvent.change(searchInput, { target: { value: '005' } });

    await waitFor(() => {
      expect(screen.getByText('SN-RHD-2025-005')).toBeDefined();
      expect(screen.queryByText('SN-RHD-2025-001')).toBeNull();
    });

    // Close modal via bottom Close button
    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Product Serial Numbers')).toBeNull();
    });
  });

  it('4. Handles non-serialized products gracefully without showing View Serial Numbers button', async () => {
    render(
      <MemoryRouter>
        <VendorBillCostingPage />
      </MemoryRouter>
    );

    // Open GRN dropdown via combobox trigger
    const grnTrigger = screen.getAllByRole('combobox')[0];
    expect(grnTrigger).toBeDefined();
    fireEvent.click(grnTrigger);

    // Search for Kelani inside Select dropdown
    const selectSearchInput = screen.getByPlaceholderText(/search options/i);
    fireEvent.change(selectSearchInput, { target: { value: 'Kelani' } });

    // Select GRN-2025-002 (Kelani Cables) from dropdown options
    const kelaniOption = screen.getByText(/Kelani Cables PLC/i);
    fireEvent.click(kelaniOption);

    await waitFor(() => {
      expect(screen.getAllByText(/Kelani Cables PLC/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Kelani 4\.0mm.*Single Core Copper Cable/i).length).toBeGreaterThan(0);
      // Should show 'No unit serials' text and NOT render a clickable View Serial Numbers button
      expect(screen.getByText('No unit serials')).toBeDefined();
      expect(screen.queryByRole('button', { name: /view serial numbers/i })).toBeNull();
    });
  });

  it('5. Handles 50+ product GRN with collapsed summary and Expand / View All Products toggle', async () => {
    render(
      <MemoryRouter>
        <VendorBillCostingPage />
      </MemoryRouter>
    );

    // Open GRN dropdown via combobox trigger
    const grnTrigger = screen.getAllByRole('combobox')[0];
    expect(grnTrigger).toBeDefined();
    fireEvent.click(grnTrigger);

    // Search for 050 inside Select dropdown
    const selectSearchInput = screen.getByPlaceholderText(/search options/i);
    fireEvent.change(selectSearchInput, { target: { value: '050' } });

    // Select the 50-line GRN-2025-050 from dropdown options
    const bulkGrnOption = screen.getByText(/GRN-2025-050/i);
    fireEvent.click(bulkGrnOption);

    await waitFor(() => {
      // Collapsed state shows limited count of 3 out of 50
      expect(screen.getByText(/showing 3 of 50 products/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /expand \/ view all products \(50\)/i })).toBeDefined();
    });

    // Expand all products
    const expandAllBtn = screen.getByRole('button', { name: /expand \/ view all products \(50\)/i });
    fireEvent.click(expandAllBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /collapse products summary/i })).toBeDefined();
    });

    // Filter products using search bar
    const productSearchInput = screen.getByPlaceholderText(/search 50 products/i);
    fireEvent.change(productSearchInput, { target: { value: '63A' } });

    await waitFor(() => {
      // Should filter down matching items
      expect(screen.getAllByText(/63A/i).length).toBeGreaterThan(0);
    });

    // Collapse back to summary
    fireEvent.change(productSearchInput, { target: { value: '' } });
    const collapseBtn = screen.getByRole('button', { name: /collapse products summary/i });
    fireEvent.click(collapseBtn);

    await waitFor(() => {
      expect(screen.getByText(/showing 3 of 50 products/i)).toBeDefined();
    });
  });
});
