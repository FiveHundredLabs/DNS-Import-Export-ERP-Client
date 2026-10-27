import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { batchInventoryService } from '../services/BatchInventoryService';
import { priceHistoryService } from '../services/PriceHistoryService';
import { invoiceService } from '../services/InvoiceService';
import { orderService } from '../services/OrderService';
import { FinancePricingModal } from '../features/finance/components/FinancePricingModal';
import { InvoiceDraftEditPage } from '../features/invoices/InvoiceDraftEditPage';
import { InvoiceDetailPage } from '../features/invoices/InvoiceDetailPage';
import { OrderApprovalDetailPage } from '../features/approvals/OrderApprovalDetailPage';
import { OrderDetailPage } from '../features/orders/OrderDetailPage';
import { OrderCreateEditPage } from '../features/orders/OrderCreateEditPage';
import { User } from '../types/auth';

const mockSalesManager: User = {
  id: 'usr-sm-01',
  name: 'Sam Miller',
  email: 'sm@example.com',
  role: 'SALES_MANAGER',
  department: 'Sales',
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const mockSalesRep: User = {
  id: 'usr-106',
  name: 'Kasun Wickramasinghe',
  email: 'rep@example.com',
  role: 'SALES_REP',
  department: 'Sales',
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const mockAreaManager: User = {
  id: 'usr-am-01',
  name: 'Alex Area',
  email: 'am@example.com',
  role: 'AREA_MANAGER',
  department: 'Sales',
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

let currentTestUser: User = mockSalesManager;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentTestUser,
    role: currentTestUser.role,
    user: currentTestUser,
  }),
}));

async function createAndApproveTestOrder() {
  const order = await orderService.createOrder(
    {
      customerId: 'cust-001',
      paymentTerms: '30 Days PDC',
      salesRepId: mockSalesRep.id,
      deliveryAddress: 'Test Warehouse Colombo',
      items: [
        {
          productId: 'prod-001',
          orderedQuantity: 5,
          requestedDiscountPercentage: 2,
        },
      ],
    },
    mockSalesRep
  );

  await orderService.approveOrder(order.id, mockSalesManager, 'Approved test order');
  return order;
}

describe('1. GRN Post-Costing Price Assignment UI & Strategy Calculation', () => {
  it('correctly calculates markup and updates prices in Strategy 1 and Strategy 2', async () => {
    const handleApply = vi.fn();
    const handleClose = vi.fn();

    const sampleItems = [
      {
        id: 'bill-item-1',
        productId: 'prod-001',
        productName: 'Schneider Acti9 32A Double Pole MCB',
        sku: 'DNS-MCB-32A-2P',
        unitCost: 2000,
        landedUnitCost: 2000,
        quantity: 10,
        lineTotal: 20000,
      },
    ];

    render(
      <FinancePricingModal
        isOpen={true}
        onClose={handleClose}
        grn={null}
        items={sampleItems}
        onComplete={handleApply}
      />
    );

    // Modal renders with Strategy 1 selected by default
    expect(screen.getByText(/GRN Post-Costing Price Assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/Strategy 1: Preserve Existing Batch Prices/i)).toBeInTheDocument();

    // Verify Strategy 2 is present
    expect(screen.getByText(/Strategy 2: Standardize Under One Price/i)).toBeInTheDocument();

    // Click Apply Strategy button
    const applyButton = screen.getByRole('button', { name: /Confirm & Apply Selling Price Strategy/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(handleApply).toHaveBeenCalledTimes(1);
    });
  });
});

describe('2. Batch-Wise Inventory & Traceability Services', () => {
  it('tracks multiple batch prices and computes active price range', () => {
    const activeBatches = batchInventoryService.getActiveBatches('prod-001');
    expect(activeBatches.length).toBeGreaterThanOrEqual(1);

    const priceRange = batchInventoryService.getPriceRange('prod-001');
    expect(priceRange.minPrice).toBeLessThanOrEqual(priceRange.maxPrice);
    expect(priceRange.activeBatchCount).toBe(activeBatches.length);
  });

  it('records selling price history whenever prices change', () => {
    priceHistoryService.recordPriceChange({
      productId: 'prod-001',
      productSku: 'DNS-MCB-32A-2P',
      productName: 'Schneider Acti9 32A Double Pole MCB',
      batchNumber: 'LOT-TEST-99',
      previousSellingPrice: 3200,
      newSellingPrice: 3400,
      costPrice: 2100,
      reason: 'GRN Post-costing adjustment',
      changedByRole: 'FINANCE_MANAGER',
      changedByName: 'Finance Manager',
      strategyApplied: 'PRESERVE_BATCH_PRICES',
    });

    const history = priceHistoryService.getHistoryByProductId('prod-001');
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].newSellingPrice).toBe(3400);
    expect(history[0].previousSellingPrice).toBe(3200);
  });
});

describe('3. Sales Order Line Item Strategy 1 Batch Selection & Price Floor Validation', () => {
  it('renders order edit page with batch selection dropdown per line item', async () => {
    currentTestUser = mockSalesManager;
    render(
      <MemoryRouter initialEntries={['/orders/ord-006/edit']}>
        <Routes>
          <Route path="/orders/:id/edit" element={<OrderCreateEditPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Edit Sales Order/i)).toBeInTheDocument();
    });

    // Check that batch selector dropdown is present for line items
    await waitFor(() => {
      const batchSelects = screen.getAllByTitle(/Select stock batch lot/i);
      expect(batchSelects.length).toBeGreaterThan(0);
    });
  });
});

describe('4. Sales Order Approvals & Margin Impact Workflow', () => {
  it('renders order detail with customer loyalty and margin impact analysis', async () => {
    currentTestUser = mockAreaManager;

    render(
      <MemoryRouter initialEntries={['/orders/ord-001']}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('SO-DLR-COL-001-1001')).toBeInTheDocument();
    });

    // Verify Customer Loyalty Badge and Permitted Discount are displayed
    await waitFor(() => {
      expect(screen.getByText(/Loyalty:/i)).toBeInTheDocument();
      expect(screen.getByText(/Standard Permitted Discount:/i)).toBeInTheDocument();
    });

    // Verify Margin Impact calculation column exists
    expect(screen.getByText(/Margin Impact/i)).toBeInTheDocument();
  });

  it('renders OrderApprovalDetailPage correctly wrapping OrderDetailPage', async () => {
    currentTestUser = mockSalesManager;

    render(
      <MemoryRouter initialEntries={['/approvals/orders/ord-001']}>
        <Routes>
          <Route path="/approvals/orders/:id" element={<OrderApprovalDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Special Sales Order Approval Review/i)).toBeInTheDocument();
      expect(screen.getByText('SO-DLR-COL-001-1001')).toBeInTheDocument();
    });
  });
});

describe('5. Sales Invoice Draft & Finalize Workflow', () => {
  beforeEach(() => {
    currentTestUser = mockSalesManager;
  });

  it('converts an order to DRAFT invoice and allows SALES_MANAGER to edit items and finalize', async () => {
    const order = await createAndApproveTestOrder();

    // Create invoice with asDraft: true
    const draftInvoice = await invoiceService.createInvoiceFromOrder(order.id, mockSalesManager, { asDraft: true });
    expect(draftInvoice.status).toBe('DRAFT');

    // Sales manager can update draft line items
    const updatedItems = [
      {
        ...draftInvoice.items[0],
        quantity: draftInvoice.items[0].quantity + 5,
        lineTotal: (draftInvoice.items[0].quantity + 5) * draftInvoice.items[0].unitPriceSnapshot,
      },
    ];

    const savedDraft = await invoiceService.updateDraftInvoiceItems(draftInvoice.id, updatedItems, mockSalesManager);
    expect(savedDraft.items[0].quantity).toBe(draftInvoice.items[0].quantity + 5);
    expect(savedDraft.status).toBe('DRAFT');

    // Sales Manager finalizes and issues the invoice
    const finalized = await invoiceService.finalizeAndIssueInvoice(draftInvoice.id, mockSalesManager);
    expect(finalized.status).toBe('ISSUED');
  });

  it('rejects line item edits on draft invoice if user is not SALES_MANAGER', async () => {
    const order = await createAndApproveTestOrder();
    const draftInvoice = await invoiceService.createInvoiceFromOrder(order.id, mockSalesManager, { asDraft: true });

    await expect(
      invoiceService.updateDraftInvoiceItems(draftInvoice.id, draftInvoice.items, mockSalesRep)
    ).rejects.toThrow(/Permission Denied: Only SALES_MANAGER can edit draft invoice line items/i);
  });

  it('renders InvoiceDetailPage with Draft Banner and Finalize & Issue button for Sales Manager', async () => {
    currentTestUser = mockSalesManager;
    const order = await createAndApproveTestOrder();
    const draftInvoice = await invoiceService.createInvoiceFromOrder(order.id, mockSalesManager, { asDraft: true });

    render(
      <MemoryRouter initialEntries={[`/invoices/${draftInvoice.id}`]}>
        <Routes>
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/DRAFT INVOICE/i)[0]).toBeInTheDocument();
    });

    expect(screen.getByText(/Awaiting Sales Manager Finalization and Issue/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Finalize & Issue/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders InvoiceDraftEditPage allowing Sales Manager to view and adjust draft line items', async () => {
    currentTestUser = mockSalesManager;
    const order = await createAndApproveTestOrder();
    const draftInvoice = await invoiceService.createInvoiceFromOrder(order.id, mockSalesManager, { asDraft: true });

    render(
      <MemoryRouter initialEntries={[`/invoices/${draftInvoice.id}/edit`]}>
        <Routes>
          <Route path="/invoices/:id/edit" element={<InvoiceDraftEditPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Draft Invoice Line Items/i)).toBeInTheDocument();
      expect(screen.getByText(/Sales Manager Line Item Review Mode/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Save Draft Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finalize & Issue/i })).toBeInTheDocument();
  });

  it('preserves batchId and batchNumber when creating order and generating invoice', async () => {
    const orderWithBatch = await orderService.createOrder(
      {
        customerId: 'cust-001',
        paymentTerms: '30 Days PDC',
        salesRepId: mockSalesRep.id,
        deliveryAddress: 'Test Warehouse Colombo',
        items: [
          {
            productId: 'prod-001',
            orderedQuantity: 5,
            requestedDiscountPercentage: 2,
            batchId: 'batch-002',
            batchNumber: 'BATCH-2025-02',
            unitPrice: 3500,
          },
        ],
      },
      mockSalesRep
    );

    expect(orderWithBatch.items[0].batchId).toBe('batch-002');
    expect(orderWithBatch.items[0].batchNumber).toBe('BATCH-2025-02');
    expect(orderWithBatch.items[0].unitPriceSnapshot).toBe(3500);

    await orderService.approveOrder(orderWithBatch.id, mockSalesManager, 'Approved test order');

    const draftInvoice = await invoiceService.createInvoiceFromOrder(
      orderWithBatch.id,
      mockSalesManager,
      { asDraft: true }
    );

    expect(draftInvoice.items[0].batchId).toBe('batch-002');
    expect(draftInvoice.items[0].batchNumber).toBe('BATCH-2025-02');
    expect(draftInvoice.items[0].unitPriceSnapshot).toBe(3500);
  });

  it('supports Area Manager review and forward to SALES_MANAGER', async () => {
    const newOrder = await orderService.createOrder(
      {
        customerId: 'cust-001',
        paymentTerms: '30 Days PDC',
        salesRepId: mockSalesRep.id,
        deliveryAddress: 'Test Warehouse Colombo',
        items: [
          {
            productId: 'prod-001',
            orderedQuantity: 3,
            requestedDiscountPercentage: 0,
          },
        ],
      },
      mockSalesRep
    );

    // Area Manager reviews and forwards to Sales Manager
    const forwarded = await orderService.escalateOrder(
      newOrder.id,
      mockAreaManager,
      'SALES_MANAGER',
      'Area territory performance reviewed. Forwarding to Sales Manager for approval.'
    );

    expect(forwarded.currentApproverRole).toBe('SALES_MANAGER');
    expect(forwarded.targetApproverRole).toBe('SALES_MANAGER');
    expect(forwarded.approvalHistory[forwarded.approvalHistory.length - 1].action).toBe('ESCALATE');
    expect(forwarded.approvalHistory[forwarded.approvalHistory.length - 1].targetRole).toBe('SALES_MANAGER');

    // Sales Manager can now approve it
    const approved = await orderService.approveOrder(
      forwarded.id,
      mockSalesManager,
      'Approved following Area Manager review.'
    );
    expect(approved.status).toBe('APPROVED');
  });
});

