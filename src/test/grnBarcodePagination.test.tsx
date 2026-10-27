import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { GRNDetailPage } from '../features/inventory/GRNDetailPage';
import { UnitBarcodeModal } from '../components/inventory/UnitBarcodeModal';
import { GRNItem } from '../types/inventory';
import { authService } from '../services/AuthService';
import { MOCK_USERS } from '../mock/mockUsers';

describe('GRN Unit Barcode Pagination', () => {
  it('GRNDetailPage: expands line item and paginates unit barcodes for large intake lines (e.g. 450 units in GRN-2025-001)', async () => {
    // Authenticate as Stock Keeper
    const stockKeeper = MOCK_USERS.find((u) => u.role === 'STOCK_KEEPER') || MOCK_USERS[0];
    authService.loginAs(stockKeeper.id);

    render(
      <MemoryRouter initialEntries={['/inventory/grn/GRN-2025-001']}>
        <Routes>
          <Route path="/inventory/grn/:id" element={<GRNDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for GRN data to load
    await waitFor(() => {
      expect(screen.getByText(/GRN Number: GRN-2025-001/i)).toBeInTheDocument();
      expect(screen.getByText(/Schneider Acti9 32A Double Pole MCB/i)).toBeInTheDocument();
    });

    // Expand the first item (450 units) by clicking its chevron
    const expandButtons = screen.getAllByTitle(/Expand barcodes/i);
    expect(expandButtons.length).toBeGreaterThan(0);
    fireEvent.click(expandButtons[0]);

    // The inline registry table should be visible and paginated (10 per page default)
    await waitFor(() => {
      expect(screen.getByText(/Unit Barcode Registry/i)).toBeInTheDocument();
      expect(screen.getByText(/Showing/i)).toBeInTheDocument();
      expect(screen.getAllByText(/450/i).length).toBeGreaterThan(0);
    });

    // Verify first page shows Unit 1/450 and Unit 10/450
    expect(screen.getByText(/Unit 1\/450/i)).toBeInTheDocument();
    expect(screen.getByText(/Unit 10\/450/i)).toBeInTheDocument();
    // Unit 11/450 should NOT be on page 1
    expect(screen.queryByText(/Unit 11\/450/i)).toBeNull();

    // Click Next page
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    // Now page 2 should show Unit 11/450
    await waitFor(() => {
      expect(screen.getByText(/Unit 11\/450/i)).toBeInTheDocument();
    });
  });

  it('UnitBarcodeModal: paginates barcode stickers and allows switching page size', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    // 30 units across one product
    const records = Array.from({ length: 30 }, (_, i) => ({
      unitIndex: i + 1,
      unitBarcode: `DNS-ITEM-001-${String(i + 1).padStart(3, '0')}`,
      status: 'PENDING_LABEL' as const,
    }));

    const testItems: GRNItem[] = [
      {
        productId: 'prod-001',
        productNameSnapshot: 'Test Product 30 Units',
        skuSnapshot: 'DNS-TEST-30',
        expectedQuantity: 30,
        receivedQuantity: 30,
        damagedQuantity: 0,
        unitCostSnapshot: 100,
        lineValue: 3000,
        unitRecords: records,
        unitBarcodes: records.map((r) => r.unitBarcode),
      },
    ];

    render(
      <UnitBarcodeModal
        isOpen={true}
        onClose={onClose}
        items={testItems}
        grnNumber="GRN-2025-001"
        supplierName="Supplier Test"
        warehouseId="WH-MAIN"
        onConfirmLabeled={onConfirm}
      />
    );

    // Default page size is 12: should show Unit 1/30 up to Unit 12/30
    expect(screen.getByText('Unit 1/30')).toBeInTheDocument();
    expect(screen.getByText('Unit 12/30')).toBeInTheDocument();
    // Unit 13/30 should NOT be on page 1
    expect(screen.queryByText('Unit 13/30')).toBeNull();

    // Verify pagination summary text
    expect(screen.getByText(/Showing 1–12 of 30 stickers/i)).toBeInTheDocument();

    // Go to next page
    const nextButtons = screen.getAllByRole('button', { name: /Next/i });
    fireEvent.click(nextButtons[0]);

    // Now Unit 13/30 should be in the document
    expect(screen.getByText('Unit 13/30')).toBeInTheDocument();
    expect(screen.getByText('Unit 24/30')).toBeInTheDocument();
    expect(screen.queryByText('Unit 1/30')).toBeNull();
  });
});
