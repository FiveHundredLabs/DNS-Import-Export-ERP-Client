import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GRNDetailPage } from '../features/inventory/GRNDetailPage';
import { GRNUnitStickersPage } from '../features/inventory/GRNUnitStickersPage';
import { MockGRNRepository } from '../repositories/mock/MockGRNRepository';
import { GRN } from '../types/inventory';
import { grnRepository } from '../services/GRNService';

describe('GRN Dedicated Unit Stickers Page Workflow', () => {
  beforeEach(() => {
    MockGRNRepository.getInstance().reset();
  });

  const setupTestGRN = async (id: string, qty: number = 450): Promise<GRN> => {
    const grn: GRN = {
      id,
      grnNumber: id,
      supplierId: 'sup-001',
      supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
      purchaseOrderId: 'PO-2025-001',
      purchaseOrderNumber: 'PO-2025-001',
      warehouseId: 'WH-MAIN',
      status: 'SUBMITTED',
      totalValue: 1125000,
      receivedById: 'usr-keeper-01',
      receivedByName: 'Amal Perera',
      items: [
        {
          productId: 'prod-mcb-001',
          productNameSnapshot: 'Schneider Acti9 32A Double Pole MCB',
          skuSnapshot: 'DNS-MCB-32A-2P',
          expectedQuantity: qty,
          receivedQuantity: qty,
          damagedQuantity: 0,
          unitCostSnapshot: 2500,
          lineValue: qty * 2500,
          unitBarcodes: [],
          unitRecords: [],
          serialNumbers: [],
        },
      ],
    };
    await grnRepository.save(grn);
    return grn;
  };

  it('clicking Unit Stickers button in GRNDetailPage navigates to dedicated stickers page', async () => {
    const grn = await setupTestGRN('GRN-STICKERS-001', 450);

    render(
      <MemoryRouter initialEntries={[`/inventory/grn/${grn.id}`]}>
        <Routes>
          <Route path="/inventory/grn/:id" element={<GRNDetailPage />} />
          <Route path="/inventory/grn/:id/stickers" element={<GRNUnitStickersPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for GRN detail to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /unit stickers/i })).toBeInTheDocument();
    });

    // Locate the Unit Stickers button
    const stickersBtn = screen.getByRole('button', { name: /unit stickers/i });
    expect(stickersBtn).toBeInTheDocument();

    // Click Unit Stickers button
    fireEvent.click(stickersBtn);

    // Should now be on the dedicated stickers page
    await waitFor(() => {
      // 1. Only a Back button at the top
      const backBtn = screen.getByRole('button', { name: /^back$/i });
      expect(backBtn).toBeInTheDocument();

      // 2. Below it: Product Name and Quantity
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Schneider Acti9 32A Double Pole MCB');
      expect(screen.getByText(/Quantity:/i)).toBeInTheDocument();
      expect(screen.getByText(/450 Units/i)).toBeInTheDocument();
    });
  });

  it('dedicated stickers page renders clean layout with Product Name, Quantity, and vertically scrollable unit stickers', async () => {
    const grn = await setupTestGRN('GRN-STICKERS-002', 450);

    render(
      <MemoryRouter initialEntries={[`/inventory/grn/${grn.id}/stickers`]}>
        <Routes>
          <Route path="/inventory/grn/:id/stickers" element={<GRNUnitStickersPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for stickers page to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Schneider Acti9 32A Double Pole MCB');
    });

    // Top: Only a Back button
    const backBtn = screen.getByRole('button', { name: /^back$/i });
    expect(backBtn).toBeInTheDocument();

    // Header information
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Schneider Acti9 32A Double Pole MCB');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DNS-MCB-32A-2P');
    expect(screen.getByText(/Quantity:/i)).toBeInTheDocument();
    expect(screen.getByText(/450 Units/i)).toBeInTheDocument();

    // Verify first unit sticker is visible with Code-128 SVG barcode and unit details
    expect(screen.getByText(/Unit #1\/450/i)).toBeInTheDocument();
    expect(screen.getAllByText('DNS Import & Export (Pvt) Ltd').length).toBeGreaterThan(0);

    // Search filter works smoothly across the 450 barcodes
    const searchInput = screen.getByPlaceholderText(/Search across 450 barcodes/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '450' } });

    // After filtering for '450', unit #450 should be rendered
    await waitFor(() => {
      expect(screen.getByText(/Unit #450\/450/i)).toBeInTheDocument();
    });
  });

  it('supports high quantities (e.g. 2,277 units) with smooth scrolling and batch controls', async () => {
    const grn = await setupTestGRN('GRN-STICKERS-LARGE', 2277);

    render(
      <MemoryRouter initialEntries={[`/inventory/grn/${grn.id}/stickers`]}>
        <Routes>
          <Route path="/inventory/grn/:id/stickers" element={<GRNUnitStickersPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Schneider Acti9 32A Double Pole MCB');
    });

    // Verify 2,277 quantity displayed cleanly
    expect(screen.getByText(/2,277 Units/i)).toBeInTheDocument();

    // Verify initial batch (100 stickers) displayed
    expect(screen.getByText(/Showing 100 of 2277 stickers/i)).toBeInTheDocument();

    // Click "Load Next Stickers"
    const loadMoreBtn = screen.getByRole('button', { name: /load next 100 stickers/i });
    expect(loadMoreBtn).toBeInTheDocument();
    fireEvent.click(loadMoreBtn);

    // Verify 200 stickers now rendered
    expect(screen.getByText(/Showing 200 of 2277 stickers/i)).toBeInTheDocument();
  });

  it('multi-product GRN (2,277 total consignment units) defaults to all products and displays 2,277 units', async () => {
    const grn: GRN = {
      id: 'GRN-MULTI-2277',
      grnNumber: 'GRN-MULTI-2277',
      supplierId: 'sup-001',
      supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
      purchaseOrderId: 'PO-2025-001',
      purchaseOrderNumber: 'PO-2025-001',
      warehouseId: 'WH-MAIN',
      status: 'SUBMITTED',
      totalValue: 5000000,
      receivedById: 'usr-keeper-01',
      receivedByName: 'Amal Perera',
      items: [
        {
          productId: 'prod-001',
          productNameSnapshot: 'Schneider Acti9 32A Double Pole MCB',
          skuSnapshot: 'DNS-MCB-32A-2P',
          expectedQuantity: 450,
          receivedQuantity: 450,
          damagedQuantity: 0,
          unitCostSnapshot: 2200,
          lineValue: 990000,
          unitBarcodes: [],
          unitRecords: [],
          serialNumbers: [],
        },
        {
          productId: 'prod-002',
          productNameSnapshot: 'Schneider Acti9 63A Triple Pole MCB',
          skuSnapshot: 'DNS-MCB-63A-3P',
          expectedQuantity: 180,
          receivedQuantity: 180,
          damagedQuantity: 0,
          unitCostSnapshot: 5800,
          lineValue: 1044000,
          unitBarcodes: [],
          unitRecords: [],
          serialNumbers: [],
        },
        {
          productId: 'prod-003',
          productNameSnapshot: 'Schneider General Electrical Lines',
          skuSnapshot: 'DNS-GEN-ELEC',
          expectedQuantity: 1647,
          receivedQuantity: 1647,
          damagedQuantity: 0,
          unitCostSnapshot: 1000,
          lineValue: 1647000,
          unitBarcodes: [],
          unitRecords: [],
          serialNumbers: [],
        },
      ],
    };
    await grnRepository.save(grn);

    render(
      <MemoryRouter initialEntries={[`/inventory/grn/${grn.id}/stickers`]}>
        <Routes>
          <Route path="/inventory/grn/:id/stickers" element={<GRNUnitStickersPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 1. Top: Only a Back button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument();
    });

    // 2. Below it: Consignment Product Name and total Quantity (2,277 Units)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Schneider Electric Lanka \(Pvt\) Ltd - All Received Products/i);
    expect(screen.getByText(/2,277 Units/i)).toBeInTheDocument();

    // 3. Filter tabs allow filtering to individual product (e.g. 450 units)
    const mcbFilterBtn = screen.getByRole('button', { name: /Schneider Acti9 32A Double Pole MCB/i });
    expect(mcbFilterBtn).toBeInTheDocument();
    fireEvent.click(mcbFilterBtn);

    // After filtering to Schneider Acti9 32A, title and quantity update to that product
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Schneider Acti9 32A Double Pole MCB');
      expect(screen.getByText(/450 Units/i)).toBeInTheDocument();
    });
  });
});
