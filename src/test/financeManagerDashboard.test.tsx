import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FinanceManagerDashboard } from '../features/dashboard/FinanceManagerDashboard';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'USR-FM-01',
      name: 'Chandupa FM',
      role: 'FINANCE_MANAGER',
      email: 'fm@dns.lk',
    },
    logout: vi.fn(),
  }),
}));

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('FinanceManagerDashboard', () => {
  it('renders the Finance Command Hub without throwing runtime errors', async () => {
    render(
      <MemoryRouter>
        <FinanceManagerDashboard />
      </MemoryRouter>
    );

    // Verify main header
    expect(screen.getByText('Finance Command Dashboard')).toBeInTheDocument();

    // Verify KPIs
    await waitFor(() => {
      expect(screen.getByText('Bank Operating Liquidity')).toBeInTheDocument();
      expect(screen.getByText('Accounts Receivable (1020)')).toBeInTheDocument();
      expect(screen.getByText('Accounts Payable (2010)')).toBeInTheDocument();
      expect(screen.getByText('Net Operating Profit')).toBeInTheDocument();
    });

    // Verify day-to-day operations launchers
    expect(screen.getByText('Daily Financial Operations & Workspaces')).toBeInTheDocument();
    expect(screen.getByText('Universal Journal (Finance Desk)')).toBeInTheDocument();
    expect(screen.getByText('Manual Journal Voucher')).toBeInTheDocument();
    expect(screen.getByText('Vendor Bill Costing (AP)')).toBeInTheDocument();
    expect(screen.getByText('Batch Supplier Payments')).toBeInTheDocument();
    expect(screen.getByText('Receipt Approval Queue (AR)')).toBeInTheDocument();
    expect(screen.getByText('AR Collection Allocation')).toBeInTheDocument();
    expect(screen.getByText('Bank Reconciliation Workspace')).toBeInTheDocument();
    expect(screen.getByText('Period Closing Lock')).toBeInTheDocument();
    expect(screen.getByText('Chart of Accounts (COA)')).toBeInTheDocument();
  });
});
