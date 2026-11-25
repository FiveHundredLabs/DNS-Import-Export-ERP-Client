import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GRNCreateEditPage } from '../features/inventory/GRNCreateEditPage';
import { grnsApi } from '../api/grns/grns.api';
import { User } from '../types/auth';

const mockStockKeeper: User = {
  id: 'usr-107',
  name: 'Gamini Silva',
  email: 'warehouse@dnserp.com',
  role: 'STOCK_KEEPER',
  phone: '+94 77 789 0123',
  isActive: true,
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: mockStockKeeper,
    role: 'STOCK_KEEPER',
    user: mockStockKeeper,
  }),
}));

vi.mock('../api/purchase-orders/purchase-orders.api', () => ({
  purchaseOrdersApi: {
    remainingItems: vi.fn(async () => ({
      id: 'po-2025-001',
      poNumber: 'PO-2025-001',
      supplierId: 'sup-001',
      supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
      items: [
        {
          id: 'poi-1',
          poId: 'po-2025-001',
          productId: 'prod-001',
          productName: 'Schneider Acti9 32A Double Pole MCB',
          sku: 'DNS-MCB-32A-2P',
          orderedQty: 5,
          receivedQty: 0,
          remainingQty: 5,
          unitPrice: 2500,
          unitOfMeasure: 'PCS',
          hasSerialNumber: false,
        },
      ],
    })),
  },
}));

vi.mock('../hooks/usePurchaseOrders', () => ({
  purchaseOrderQueryKeys: { all: ['purchase-orders'] },
  usePurchaseOrders: () => ({
    purchaseOrders: [
      {
        id: 'po-2025-001',
        poNumber: 'PO-2025-001',
        supplierId: 'sup-001',
        supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
        status: 'APPROVED',
        items: [
          {
            id: 'poi-1',
            productId: 'prod-001',
            productName: 'Schneider Acti9 32A Double Pole MCB',
            productSku: 'DNS-MCB-32A-2P',
            qty: 5,
            receivedQty: 0,
            unitPrice: 2500,
          },
        ],
      },
    ],
    loading: false,
    refetch: vi.fn(),
  }),
}));

describe('GRN Intake API Payload & Submission Confirmation Workflow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('Step 3 intakeUnits call sends ONLY whitelisted properties without poId or supplierId', async () => {
    const intakeUnitsSpy = vi.spyOn(grnsApi, 'intakeUnits').mockResolvedValue({
      id: 'grn-existing-001',
      grnNumber: 'GRN-2026-0001',
      status: 'DRAFT',
      supplierId: 'sup-001',
      supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
      receivedDate: '2026-11-24',
      receivedById: 'usr-107',
      grnProducts: [
        {
          id: 'gp-1',
          grnId: 'grn-existing-001',
          productId: 'prod-001',
          productName: 'Schneider Acti9 32A Double Pole MCB',
          sku: 'DNS-MCB-32A-2P',
          receivedQuantity: 5,
          damagedQuantity: 0,
          acceptedQuantity: 5,
          cableSpecs: {
            units: [
              { id: 'u-1', barcode: '1000012506DNSMCB0001', isDamaged: false },
            ],
          },
        },
      ],
    });

    const createSpy = vi.spyOn(grnsApi, 'create').mockResolvedValue({
      id: 'grn-existing-001',
      grnNumber: 'GRN-2026-0001',
      status: 'DRAFT',
      supplierId: 'sup-001',
      supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
      receivedDate: '2026-11-24',
      receivedById: 'usr-107',
      grnProducts: [
        {
          id: 'gp-1',
          grnId: 'grn-existing-001',
          productId: 'prod-001',
          productName: 'Schneider Acti9 32A Double Pole MCB',
          sku: 'DNS-MCB-32A-2P',
          receivedQuantity: 5,
          damagedQuantity: 0,
          acceptedQuantity: 5,
          cableSpecs: {
            units: [
              { id: 'u-1', barcode: '1000012506DNSMCB0001', isDamaged: false },
            ],
          },
        },
      ],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GRNCreateEditPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 1. Select PO in Step 1
    const poButtons = screen.getAllByRole('button', { name: /PO-202/i });
    fireEvent.click(poButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/Schneider Electric Lanka/i).length).toBeGreaterThan(0);
    });

    // 2. Move to Step 2
    const nextBtn = screen.getByRole('button', { name: /Next Step.*Products/i });
    fireEvent.click(nextBtn);

    // 3. Move to Step 3
    await waitFor(() => {
      const continueToSerialsBtn = screen.getByRole('button', { name: /Next Step.*Serials/i });
      expect(continueToSerialsBtn).toBeInTheDocument();
      fireEvent.click(continueToSerialsBtn);
    });

    // 4. In Step 3, click "Generate Barcodes & Proceed"
    await waitFor(() => {
      const generateBtn = screen.getByRole('button', { name: /Next Step.*Generate Barcodes/i });
      expect(generateBtn).toBeInTheDocument();
      fireEvent.click(generateBtn);
    });

    // Initial creation includes poId & supplierId
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      const createPayload = createSpy.mock.calls[0][0];
      expect(createPayload).toHaveProperty('poId', 'po-2025-001');
      expect(createPayload).toHaveProperty('products');
    });

    // Move back to Step 3 and click proceed again to trigger intakeUnits
    await waitFor(() => {
      const backBtn = screen.getByRole('button', { name: /^Back$/i });
      fireEvent.click(backBtn);
    });

    await waitFor(() => {
      const generateBtn = screen.getByRole('button', { name: /Next Step.*Generate Barcodes/i });
      fireEvent.click(generateBtn);
    });

    // Now intakeUnits is called because activeGrnId is set!
    await waitFor(() => {
      expect(intakeUnitsSpy).toHaveBeenCalledTimes(1);
      const [calledId, calledPayload] = intakeUnitsSpy.mock.calls[0];
      expect(calledId).toBe('grn-existing-001');

      // CRITICAL: poId and supplierId must NOT be present in intakeUnits payload
      expect(calledPayload).not.toHaveProperty('poId');
      expect(calledPayload).not.toHaveProperty('supplierId');
      expect(calledPayload).toHaveProperty('products');
      expect(Array.isArray(calledPayload.products)).toBe(true);
    });
  });

  it('enforces confirmation before enabling Submit for Manager Approval on Step 5', async () => {
    vi.spyOn(grnsApi, 'create').mockResolvedValue({
      id: 'grn-new-001',
      grnNumber: 'GRN-2026-0002',
      status: 'DRAFT',
      supplierId: 'sup-001',
      supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
      receivedDate: '2026-11-24',
      receivedById: 'usr-107',
      grnProducts: [
        {
          id: 'gp-1',
          grnId: 'grn-new-001',
          productId: 'prod-001',
          productName: 'Schneider Acti9 32A Double Pole MCB',
          sku: 'DNS-MCB-32A-2P',
          receivedQuantity: 5,
          damagedQuantity: 0,
          acceptedQuantity: 5,
          cableSpecs: {
            units: [
              { id: 'u-1', barcode: '1000012506DNSMCB0001', isDamaged: false },
            ],
          },
        },
      ],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GRNCreateEditPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Step 1: Select PO
    const poButtons = screen.getAllByRole('button', { name: /PO-202/i });
    fireEvent.click(poButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/Schneider Electric Lanka/i).length).toBeGreaterThan(0);
    });

    // On Steps 1-4, "Submit for Manager Approval" is NOT shown
    expect(screen.queryByRole('button', { name: /Submit for Manager Approval/i })).not.toBeInTheDocument();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next Step.*Products/i }));

    // Step 2 -> Step 3
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /Next Step.*Serials/i }));
    });

    // Step 3 -> Step 4
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /Next Step.*Generate Barcodes/i }));
    });

    // Step 4 -> Step 5
    await waitFor(() => {
      const step4Next = screen.getByRole('button', { name: /Next Step.*Final Review/i });
      fireEvent.click(step4Next);
    });

    // In Step 5: "Submit for Manager Approval" is visible but DISABLED
    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /Submit for Manager Approval/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });

    // Check the confirmation checkbox
    const confirmCheckbox = screen.getByRole('checkbox');
    expect(confirmCheckbox).not.toBeChecked();
    fireEvent.click(confirmCheckbox);
    expect(confirmCheckbox).toBeChecked();

    // Now the Submit button is ENABLED
    const submitBtn = screen.getByRole('button', { name: /Submit for Manager Approval/i });
    expect(submitBtn).toBeEnabled();

    // Clicking Submit opens the ConfirmDialog
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Submit GRN for Stock Manager Approval/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Yes, Submit for Approval/i })).toBeInTheDocument();
    });
  });
});
