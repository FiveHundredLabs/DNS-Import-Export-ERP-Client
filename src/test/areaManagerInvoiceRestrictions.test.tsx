import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InvoiceListPage } from '../features/invoices/InvoiceListPage';
import { InvoiceDetailPage } from '../features/invoices/InvoiceDetailPage';
import { User } from '../types/auth';

const mockAreaManager: User = {
  id: 'usr-105',
  name: 'Nimal Bandara',
  role: 'AREA_MANAGER',
  email: 'nimal@dnserp.com',
  areaId: 'area-01',
  department: 'Sales',
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

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

let currentTestUser: User = mockAreaManager;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentTestUser,
    role: currentTestUser.role,
    user: currentTestUser,
  }),
}));

describe('Area Manager Invoice Restrictions (/invoices)', () => {
  beforeEach(() => {
    currentTestUser = mockAreaManager;
  });

  it('strictly hides the Create Invoice button for AREA_MANAGER role', async () => {
    currentTestUser = mockAreaManager;
    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <Routes>
          <Route path="/invoices" element={<InvoiceListPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Refresh button should be present
    expect(await screen.findByRole('button', { name: /Refresh/i })).toBeInTheDocument();

    // Create Invoice button must NOT be present
    expect(screen.queryByRole('button', { name: /Create Invoice/i })).not.toBeInTheDocument();
  });

  it('strictly hides Drafts filter tab and any draft invoices for AREA_MANAGER role', async () => {
    currentTestUser = mockAreaManager;
    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <Routes>
          <Route path="/invoices" element={<InvoiceListPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for invoices to load
    await waitFor(() => {
      expect(screen.getByText(/All Invoices/i)).toBeInTheDocument();
    });

    // Drafts tab should NOT be present in filter tabs
    expect(screen.queryByRole('button', { name: /Drafts/i })).not.toBeInTheDocument();

    // Draft invoice numbers must NOT be present
    expect(screen.queryByText('INV-2026-DRAFT-001')).not.toBeInTheDocument();
    expect(screen.queryByText('INV-2026-DRAFT-002')).not.toBeInTheDocument();
    expect(screen.queryByText('INV-2026-DRAFT-003')).not.toBeInTheDocument();

    // Edit Draft button should NOT be present
    expect(screen.queryByRole('button', { name: /Edit Draft/i })).not.toBeInTheDocument();
  });

  it('restricts AREA_MANAGER from viewing a draft invoice directly at /invoices/:id', async () => {
    currentTestUser = mockAreaManager;
    render(
      <MemoryRouter initialEntries={['/invoices/inv-draft-001']}>
        <Routes>
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Access Restricted/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Area Managers are not authorized to view draft invoices/i)
    ).toBeInTheDocument();
  });

  it('keeps Create Invoice button and Drafts tab intact for other roles (e.g. SALES_MANAGER)', async () => {
    currentTestUser = mockSalesManager;
    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <Routes>
          <Route path="/invoices" element={<InvoiceListPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Sales manager CAN see Create Invoice
    expect(await screen.findByRole('button', { name: /Create Invoice/i })).toBeInTheDocument();

    // Sales manager CAN see Drafts tab
    expect(await screen.findByRole('button', { name: /Drafts/i })).toBeInTheDocument();
  });
});
