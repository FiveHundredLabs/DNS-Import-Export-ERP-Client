import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GRNService } from '../services/GRNService';
import { PrintableGRN } from '../features/inventory/PrintableGRN';
import { GRNDetailPage } from '../features/inventory/GRNDetailPage';
import { PurchasingGRNDetailPage } from '../features/purchasing/PurchasingGRNDetailPage';
import { GRN } from '../types/inventory';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'usr-stock-01', name: 'Nimal Perera', role: 'STOCK_KEEPER' },
    currentUser: { id: 'usr-stock-01', name: 'Nimal Perera', role: 'STOCK_KEEPER' },
    role: 'STOCK_KEEPER',
    hasPermission: () => true,
  }),
}));

const mockGRNRecord: GRN = {
  id: 'GRN-2026-TEST01',
  grnNumber: 'GRN-2026-TEST01',
  sourceType: 'PO',
  purchaseOrderId: 'PO-2026-001',
  purchaseOrderNumber: 'PO-2026-001',
  supplierId: 'sup-01',
  supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
  warehouseId: 'WH-MAIN',
  status: 'APPROVED',
  totalValue: 75000,
  receivedById: 'Nimal Perera',
  approvedById: 'Sunil Weerasinghe',
  items: [
    {
      productId: 'prod-01',
      productNameSnapshot: 'Schneider Acti9 32A MCB',
      skuSnapshot: 'DNS-MCB-32A-2P',
      expectedQuantity: 20,
      receivedQuantity: 20,
      damagedQuantity: 0,
      unitCostSnapshot: 3750,
      lineValue: 75000,
      uom: 'PCS',
    },
  ],
};

const mockGRNRepo: any = {
  getById: vi.fn(async (id: string) => mockGRNRecord),
  save: vi.fn(async (grn: GRN) => grn),
  getAll: vi.fn(async () => [mockGRNRecord]),
};

const mockInvRepo: any = {
  getBalance: vi.fn(async () => null),
  saveBalance: vi.fn(async () => {}),
  addMovement: vi.fn(async () => {}),
};

const mockGrnServiceInstance = {
  getGRNById: vi.fn(async (id: string) => mockGRNRecord),
  submitGRN: vi.fn(async (grn: any) => grn),
  createGRN: vi.fn(async (grn: any) => grn),
  approveGRN: vi.fn(async () => {}),
  rejectGRN: vi.fn(async () => {}),
};

vi.mock('../hooks/useGRN', () => ({
  useGRN: () => ({
    grnService: mockGrnServiceInstance,
  }),
}));

describe('Batch 1 — BR-01 & BR-02 GRN PO Enforcement and Official Printing', () => {
  it('enforces BR-01: rejects GRN creation when no Purchase Order is linked', async () => {
    const service = new GRNService(mockGRNRepo, mockInvRepo);

    const unlinkedGRN: any = {
      id: 'GRN-INVALID',
      grnNumber: 'GRN-INVALID',
      items: [
        {
          productId: 'prod-01',
          receivedQuantity: 10,
          damagedQuantity: 0,
        },
      ],
    };

    await expect(service.createGRN(unlinkedGRN)).rejects.toThrow(
      /BR-01 Violation: GRN must originate from an approved Purchase Order/
    );

    await expect(service.submitGRN(unlinkedGRN)).rejects.toThrow(
      /BR-01 Violation: GRN must originate from an approved Purchase Order/
    );
  });

  it('allows GRN creation and submission when an approved Purchase Order is linked', async () => {
    const service = new GRNService(mockGRNRepo, mockInvRepo);

    const linkedGRN: any = {
      id: 'GRN-VALID-01',
      grnNumber: 'GRN-VALID-01',
      purchaseOrderId: 'PO-2026-001',
      purchaseOrderNumber: 'PO-2026-001',
      items: [
        {
          productId: 'prod-01',
          receivedQuantity: 10,
          damagedQuantity: 0,
        },
      ],
    };

    const created = await service.createGRN(linkedGRN);
    expect(created.status).toBe('DRAFT');

    await service.submitGRN(linkedGRN);
    expect(linkedGRN.status).toBe('SUBMITTED');
  });

  it('renders PrintableGRN component with certified document metadata and line items (BR-02)', () => {
    render(
      <PrintableGRN
        grn={mockGRNRecord}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('Official Goods Received Note — Print Preview')).toBeTruthy();
    expect(screen.getByText('DNS Import & Export (Pvt) Ltd')).toBeTruthy();
    expect(screen.getByText('GRN-2026-TEST01')).toBeTruthy();
    expect(screen.getByText('PO-2026-001')).toBeTruthy();
    expect(screen.getByText('Schneider Electric Lanka (Pvt) Ltd')).toBeTruthy();
    expect(screen.getByText('Schneider Acti9 32A MCB')).toBeTruthy();
    expect(screen.getByText('Received & Counted By')).toBeTruthy();
    expect(screen.getByText('Verified & Approved By')).toBeTruthy();
    expect(screen.getByText('Accounts Payable Entry')).toBeTruthy();
  });

  it('renders Print GRN (A4) action button in GRNDetailPage', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory/grn/GRN-2026-TEST01']}>
        <Routes>
          <Route path="/inventory/grn/:id" element={<GRNDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const printButton = await screen.findByRole('button', { name: /Print GRN \(A4\)/i });
    expect(printButton).toBeTruthy();
  });

  it('renders Print GRN (A4) action button in PurchasingGRNDetailPage', async () => {
    render(
      <MemoryRouter initialEntries={['/purchasing/grn/GRN-2026-TEST01']}>
        <Routes>
          <Route path="/purchasing/grn/:id" element={<PurchasingGRNDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const printButton = await screen.findByRole('button', { name: /Print GRN \(A4\)/i });
    expect(printButton).toBeTruthy();
  });
});
