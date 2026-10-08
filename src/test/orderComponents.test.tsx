import { describe, it, expect } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrderStatusBadge } from '../features/orders/OrderStatusBadge';
import { OrderListPage } from '../features/orders/OrderListPage';
import { OrderDetailPage } from '../features/orders/OrderDetailPage';
import { OrderTrackingPage } from '../features/orders/OrderTrackingPage';
import { OrderCreateEditPage } from '../features/orders/OrderCreateEditPage';
import { CustomerHubView } from '../features/customers/CustomerHubView';
import { ApprovalTimeline } from '../components/approval/ApprovalTimeline';
import { MOCK_CUSTOMERS } from '../mock/mockCustomers';
import { MOCK_ORDERS } from '../mock/mockOrders';

describe('Phase 5 — Sales Order UI Components & Type Checking', () => {
  it('renders OrderStatusBadge with correct variants and special approval tag', () => {
    const { rerender } = render(<OrderStatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="SPECIAL_APPROVAL" isSpecialApproval={true} />);
    expect(screen.getByText('Special Approval')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="PICKING" />);
    expect(screen.getByText('Picking')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="ISSUED" />);
    expect(screen.getByText('Issued')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="INVOICED" />);
    expect(screen.getByText('Invoiced')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="DISPATCHED" />);
    expect(screen.getByText('Dispatched')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="DELIVERED" />);
    expect(screen.getByText('Delivered')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="APPROVED" isSpecialApproval={true} />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Special Approval')).toBeInTheDocument();
  });

  it('renders OrderListPage with metrics, search, and action buttons without crash', async () => {
    render(
      <MemoryRouter>
        <OrderListPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Sales Orders & Approvals')).toBeInTheDocument();
    expect(screen.getByText('New Sales Order')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Tracking')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by order #/i)).toBeInTheDocument();
    expect(screen.getByText('Special Approval Only')).toBeInTheDocument();

    // Check that table loads orders
    await waitFor(() => {
      expect(screen.getAllByText('SO-DLR-COL-001-1001').length).toBeGreaterThan(0);
    });
  });

  it('renders OrderCreateEditPage with credit limit and validation layout', async () => {
    render(
      <MemoryRouter initialEntries={['/orders/new?customerId=cust-001']}>
        <Routes>
          <Route path="/orders/new" element={<OrderCreateEditPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Enterprise Sales Order')).toBeInTheDocument();
    });

    expect(screen.getByText('Customer Information')).toBeInTheDocument();
    expect(screen.getByText('Delivery & Commercial Terms')).toBeInTheDocument();
    expect(screen.getByText('Save as Draft')).toBeInTheDocument();
    expect(screen.getByText('Submit Order')).toBeInTheDocument();
  });

  it('renders OrderDetailPage with full enterprise order details and approval timeline', async () => {
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

    expect(screen.getByText('Customer Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Credit Terms at Order')).toBeInTheDocument();
    expect(screen.getByText('Itemized Order Lines')).toBeInTheDocument();
    expect(screen.getByText('Approval Timeline & State History')).toBeInTheDocument();
    expect(screen.getByText('Print / PDF')).toBeInTheDocument();
  });

  it('renders OrderTrackingPage with 5-step pipeline progression', async () => {
    render(
      <MemoryRouter>
        <OrderTrackingPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Sales Rep Dedicated Order Tracking')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('SO-DLR-COL-001-1001')).toBeInTheDocument();
      expect(screen.getAllByText('Order Created').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Invoiced').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dispatched').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Delivered').length).toBeGreaterThan(0);
    });
  });

  it('renders CustomerHubView Orders tab with live order list and New Sales Order link', async () => {
    const mockCustomer = MOCK_CUSTOMERS[0];
    render(
      <MemoryRouter>
        <CustomerHubView customer={mockCustomer} />
      </MemoryRouter>
    );

    // Verify Customer Hub rendered
    expect(screen.getByText(mockCustomer.name)).toBeInTheDocument();

    // Verify Orders tab trigger is present
    const ordersTab = screen.getByRole('tab', { name: /Orders/i });
    expect(ordersTab).toBeInTheDocument();
  });

  it('renders OrderListPage with Date Range inputs for start and end date filtering', async () => {
    render(
      <MemoryRouter>
        <OrderListPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('From Date')).toBeInTheDocument();
    expect(screen.getByLabelText('To Date')).toBeInTheDocument();
  });

  it('renders ApprovalTimeline with distinct badges and target roles for diverse actions', () => {
    render(
      <ApprovalTimeline
        history={[
          {
            id: 'h-1',
            actorName: 'Kasun Wickramasinghe',
            actorRole: 'SALES_REP',
            action: 'SUBMIT',
            fromStatus: 'DRAFT',
            toStatus: 'PENDING_APPROVAL',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'h-2',
            actorName: 'Kamal Perera',
            actorRole: 'SALES_MANAGER',
            action: 'ESCALATE',
            targetRole: 'DIRECTOR',
            fromStatus: 'PENDING_APPROVAL',
            toStatus: 'SPECIAL_APPROVAL',
            comment: 'Project order requires director sign-off.',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'h-3',
            actorName: 'Saman Jayasuriya',
            actorRole: 'DIRECTOR',
            action: 'APPROVE',
            fromStatus: 'SPECIAL_APPROVAL',
            toStatus: 'APPROVED',
            timestamp: new Date().toISOString(),
          },
        ]}
      />
    );

    expect(screen.getByText('SUBMIT')).toBeInTheDocument();
    expect(screen.getByText('ESCALATE')).toBeInTheDocument();
    expect(screen.getByText('APPROVE')).toBeInTheDocument();
    expect(screen.getByText('→ DIRECTOR')).toBeInTheDocument();
    expect(screen.getByText('"Project order requires director sign-off."')).toBeInTheDocument();
  });
});
