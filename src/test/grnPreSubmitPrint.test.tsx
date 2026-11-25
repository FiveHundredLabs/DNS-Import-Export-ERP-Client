import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GRNCreateEditPage } from '../features/inventory/GRNCreateEditPage';
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
          orderedQty: 10,
          receivedQty: 0,
          remainingQty: 10,
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
            qty: 10,
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

describe('GRN Pre-Submission Print & Enterprise Layout', () => {
  it('allows stock keeper to preview and print official GRN before submitting for approval', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GRNCreateEditPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial load: Step 1 (Receiving Details & Inbound Source)
    expect(screen.getByText(/Step 1: Receiving Details & Inbound Source/i)).toBeInTheDocument();

    // Select an existing PO via quick select button
    const poButtons = screen.getAllByRole('button', { name: /PO-202/i });
    expect(poButtons.length).toBeGreaterThan(0);
    fireEvent.click(poButtons[0]);

    // Click Next Step to Step 2
    const nextBtn = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn);

    // Now in Step 2, items are preloaded or can be reviewed
    // Check that "Print GRN" button is accessible in navigation bar once items exist
    await waitFor(() => {
      const printBtn = screen.getByRole('button', { name: /^Print GRN$/i });
      expect(printBtn).toBeInTheDocument();
      
      // Click Print GRN to open preview before submitting
      fireEvent.click(printBtn);
    });

    // The enterprise standard A4 print preview dialog should open
    await waitFor(() => {
      expect(screen.getByText('Official Goods Received Note — Print Preview')).toBeInTheDocument();
      expect(screen.getByText('DNS Import & Export (Pvt) Ltd')).toBeInTheDocument();
      expect(screen.getByText(/Received & Counted By/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified & Approved By/i)).toBeInTheDocument();
    });

    // Verify Print (A4) action button is present inside the preview modal
    const printA4Btn = screen.getByRole('button', { name: /Print \(A4\)/i });
    expect(printA4Btn).toBeInTheDocument();
  });
});
