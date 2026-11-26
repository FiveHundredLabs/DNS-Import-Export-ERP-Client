import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { CustomerDetailPage } from '../features/customers/CustomerDetailPage';
import { ProductDetailPage } from '../features/products/ProductDetailPage';
import { MyApprovalsPage } from '../features/approvals/MyApprovalsPage';
import { customersApi } from '../api/customers/customers.api';
import { productsApi } from '../api/products/products.api';
import { productService } from '../services/ProductService';
import { approvalsApi } from '../api/approvals/approvals.api';
import * as authHook from '../hooks/useAuth';

function renderWithQuery(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Audit Fixes A, B (Partial), and C Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'usr-dir',
        name: 'Director User',
        role: 'DIRECTOR',
        email: 'director@dns.lk',
      },
      role: 'DIRECTOR',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn().mockReturnValue(true),
      canAccessRoute: vi.fn().mockReturnValue(true),
    } as any);
  });

  it('CustomerDetailPage displays 403 Forbidden instead of Customer Not Found on 403 error', async () => {
    const axios403 = new AxiosError(
      'Forbidden',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 403,
        statusText: 'Forbidden',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { message: 'Territory access restricted for this customer' },
      },
    );
    vi.spyOn(customersApi, 'getCustomerById').mockRejectedValueOnce(axios403);

    renderWithQuery(
      <Routes>
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
      </Routes>,
      ['/customers/cust-403'],
    );

    await waitFor(() => {
      expect(screen.getByText(/Access Restricted \(403 Forbidden\)/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Customer record not found/i)).not.toBeInTheDocument();
  });

  it('ProductDetailPage renders real Batch Inventory and Price History from backend API', async () => {
    vi.spyOn(productService, 'getProduct').mockResolvedValueOnce({
      id: 'prod-1',
      sku: 'SKU-001',
      name: 'Test Cable 2.5mm',
      categoryId: 'cat-1',
      uomCode: 'ROLL',
      barcode: '8901234567890',
      pricing: { costPrice: 1000, sellingPrice: 1500, minimumSellingPrice: 1300 },
      discountLevels: [5, 10, 15],
      warrantyPeriodMonths: 12,
      status: 'ACTIVE',
      stockOnHand: 50,
      damagedStock: 0,
      requiresSerialNumber: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    } as any);

    vi.spyOn(productsApi, 'getBatchPricing').mockResolvedValueOnce({
      productId: 'prod-1',
      productName: 'Test Cable 2.5mm',
      sku: 'SKU-001',
      barcode: '8901234567890',
      batches: [
        {
          id: 'batch-1',
          batchNumber: 'B-2026-001',
          grnId: 'grn-1',
          grnNumber: 'GRN-001',
          grnDate: '2026-11-01T00:00:00Z',
          grnStatus: 'PRICED',
          supplierName: 'Kelani Cables',
          unitCost: 1000,
          sellingPrice: 1500,
          minFloorPricePercentage: 10,
          initialQuantity: 50,
          availableQuantity: 42,
          status: 'ACTIVE',
          receivedDate: '2026-11-01T00:00:00Z',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
      ],
      priceHistory: [
        {
          id: 'hist-1',
          batchNumber: 'B-2026-001',
          oldPrice: 1400,
          newPrice: 1500,
          strategy: 'PRESERVE_BATCH',
          changeReason: 'Market adjustment',
          changedBy: 'Director User',
          changedAt: '2026-11-10T10:00:00Z',
        },
      ],
      summary: {
        totalBatches: 1,
        activeBatches: 1,
        holdBatches: 0,
        depletedBatches: 0,
        totalAvailableQty: 42,
        latestCostPrice: 1000,
        latestSellingPrice: 1500,
        eligibleForPriceUpdate: 1,
      },
    });

    renderWithQuery(
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>,
      ['/products/prod-1'],
    );

    await waitFor(() => {
      expect(screen.getByText(/Stock Batches \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Price History \(1\)/i)).toBeInTheDocument();
    });
  });

  it('MyApprovalsPage does NOT re-fetch counts when changing entity filter', async () => {
    const countsSpy = vi.spyOn(approvalsApi, 'getMyApprovalCounts').mockResolvedValue({
      total: 2,
      byModule: { CUSTOMER: 1, PURCHASE_ORDER: 1, GRN: 0 },
    });
    const pendingSpy = vi.spyOn(approvalsApi, 'getMyPendingApprovals').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 15 },
    });

    renderWithQuery(
      <Routes>
        <Route path="/approvals/my-approvals" element={<MyApprovalsPage />} />
      </Routes>,
      ['/approvals/my-approvals'],
    );

    await waitFor(() => {
      expect(countsSpy).toHaveBeenCalledTimes(1);
      expect(pendingSpy).toHaveBeenCalledTimes(1);
    });

    const poTab = screen.getByRole('button', { name: /PURCHASE ORDER/i });
    fireEvent.click(poTab);

    await waitFor(() => {
      expect(pendingSpy).toHaveBeenCalledTimes(2);
    });
    expect(countsSpy).toHaveBeenCalledTimes(1);
  });
});
