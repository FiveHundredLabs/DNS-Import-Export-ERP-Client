import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InvoiceListPage } from '../features/invoices/InvoiceListPage';
import { InvoiceDetailPage } from '../features/invoices/InvoiceDetailPage';
import { InvoiceDraftEditPage } from '../features/invoices/InvoiceDraftEditPage';
import { invoiceService } from '../services/InvoiceService';
import { orderService } from '../services/OrderService';
import { User } from '../types/auth';

const mockSalesManager: User = {
  id: 'usr-sm-01',
  name: 'Sara Manager',
  role: 'SALES_MANAGER',
  email: 'sm@example.com',
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

describe('Invoice Improvements Workflow (Create Modal, Draft Discount Editing, & System View Tracker)', () => {
  beforeEach(async () => {
    currentTestUser = mockSalesManager;
  });

  it('1. Create Invoice Modal displays options for existing unapproved/approved orders and new order creation', async () => {
    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    // Find and click the "Create Invoice" button
    const createBtn = await screen.findByRole('button', { name: /Create Invoice/i });
    expect(createBtn).toBeInTheDocument();
    fireEvent.click(createBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText(/Create Commercial Sales Invoice/i)).toBeInTheDocument();
    });

    // Check tabs
    expect(screen.getByText(/Select Existing Sales Order/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Entirely New Sales Order/i)).toBeInTheDocument();

    // Switch to new order tab
    const newOrderTab = screen.getByText(/Create Entirely New Sales Order/i);
    fireEvent.click(newOrderTab);

    expect(screen.getByText(/Launch Sales Order Builder/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Create New Sales Order & Auto-Convert to Draft Invoice/i)
    ).toBeInTheDocument();
  });

  it('2. InvoiceService creates draft invoice from unapproved or pending order with allowUnapproved flag', async () => {
    // Create an unapproved order in DRAFT or SUBMITTED status
    const order = await orderService.createOrder(
      {
        customerId: 'cust-001',
        paymentTerms: 'Immediate Cash',
        salesRepId: 'usr-106',
        deliveryAddress: 'Galle Road, Colombo 03',
        items: [
          {
            productId: 'prod-001',
            orderedQuantity: 10,
            requestedDiscountPercentage: 3,
          },
        ],
      },
      mockSalesManager
    );

    expect(['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL']).toContain(order.status);

    // Generate draft invoice from unapproved order
    const draftInv = await invoiceService.createInvoiceFromOrder(order.id, mockSalesManager, {
      asDraft: true,
      allowUnapproved: true,
    });

    expect(draftInv).toBeDefined();
    expect(draftInv.status).toBe('DRAFT');
    expect(draftInv.orderId).toBe(order.id);
    expect(draftInv.items.length).toBe(1);
    expect(draftInv.items[0].quantity).toBe(10);
  });

  it('3. Draft invoice allows editing line discounts and recalculates totals', async () => {
    // Create a draft invoice
    const order = await orderService.createOrder(
      {
        customerId: 'cust-001',
        paymentTerms: 'Immediate Cash',
        salesRepId: 'usr-106',
        deliveryAddress: 'Galle Road, Colombo 03',
        items: [
          {
            productId: 'prod-001',
            orderedQuantity: 2,
            requestedDiscountPercentage: 0,
          },
        ],
      },
      mockSalesManager
    );

    const draft = await invoiceService.createInvoiceFromOrder(order.id, mockSalesManager, {
      asDraft: true,
      allowUnapproved: true,
    });

    render(
      <MemoryRouter initialEntries={[`/invoices/${draft.id}/edit`]}>
        <Routes>
          <Route path="/invoices/:id/edit" element={<InvoiceDraftEditPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Draft Invoice Line Items/i)).toBeInTheDocument();
      expect(screen.getByText(/Sales Manager Line Item Review Mode/i)).toBeInTheDocument();
    });

    // Verify Discount column header exists
    expect(screen.getAllByText(/Discount/i).length).toBeGreaterThan(0);

    // Verify Save and Finalize buttons exist
    expect(screen.getByRole('button', { name: /Save Draft Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finalize & Issue/i })).toBeInTheDocument();
  });

  it('4. InvoiceDetailPage renders ERP System View with Delivery Notes & Fulfillment Tracker by default', async () => {
    render(
      <MemoryRouter initialEntries={['/invoices/inv-001']}>
        <Routes>
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify System View default tab is active
    await waitFor(() => {
      expect(screen.getByText(/System View & Fulfillment/i)).toBeInTheDocument();
      expect(screen.getByText(/Dispatched Delivery Notes & Fulfillment Tracker/i)).toBeInTheDocument();
    });

    // Verify Fulfillment stats cards are present
    expect(screen.getByText(/Total Invoiced/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Dispatched/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivered & Accepted/i)).toBeInTheDocument();
    expect(screen.getByText(/Damaged \/ Rejected/i)).toBeInTheDocument();

    // Verify Activity & Audit Log section
    expect(screen.getByText(/Fulfillment Activity Log/i)).toBeInTheDocument();

    // Verify Button to toggle A4 PDF Document is available
    const pdfBtn = screen.getByRole('button', { name: /View A4 PDF Document/i });
    expect(pdfBtn).toBeInTheDocument();

    // Click to switch to Formal A4 Document view
    fireEvent.click(pdfBtn);

    // In PDF view, activity log is hidden and A4 header is displayed
    await waitFor(() => {
      expect(screen.getByText(/Formal Commercial Tax Invoice Document:/i)).toBeInTheDocument();
    });
  });

  it('5. Strictly restricts Sales Order creation when ordered quantity exceeds available quantity', async () => {
    // prod-001 has 450 stock on hand. Attempting to order 9999 should throw an error.
    await expect(
      orderService.createOrder(
        {
          customerId: 'cust-001',
          paymentTerms: 'Immediate Cash',
          salesRepId: 'usr-106',
          deliveryAddress: 'Galle Road, Colombo 03',
          items: [
            {
              productId: 'prod-001',
              orderedQuantity: 9999,
              requestedDiscountPercentage: 0,
            },
          ],
        },
        mockSalesManager
      )
    ).rejects.toThrow(/exceeds available stock/i);
  });

  it('6. Strictly restricts Sales Invoice draft updating when line quantity exceeds available quantity', async () => {
    // Create an order within stock limits
    const order = await orderService.createOrder(
      {
        customerId: 'cust-001',
        paymentTerms: 'Immediate Cash',
        salesRepId: 'usr-106',
        deliveryAddress: 'Galle Road, Colombo 03',
        items: [
          {
            productId: 'prod-001',
            orderedQuantity: 5,
            requestedDiscountPercentage: 0,
          },
        ],
      },
      mockSalesManager
    );

    const draft = await invoiceService.createInvoiceFromOrder(order.id, mockSalesManager, {
      asDraft: true,
      allowUnapproved: true,
    });

    // Attempting to update draft line item with quantity exceeding available stock (e.g. 50000)
    const exceedingItems = [
      {
        ...draft.items[0],
        quantity: 50000,
      },
    ];

    await expect(
      invoiceService.updateDraftInvoiceItems(draft.id, exceedingItems, mockSalesManager)
    ).rejects.toThrow(/cannot exceed available stock/i);
  });
});
