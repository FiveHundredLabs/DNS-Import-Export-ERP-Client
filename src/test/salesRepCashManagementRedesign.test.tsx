import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaymentListPage } from '../features/payments/PaymentListPage';
import { User } from '../types/auth';

const mockSalesManager: User = {
  id: 'usr-103',
  name: 'Kamal Perera',
  email: 'sales.manager@dnserp.com',
  role: 'SALES_MANAGER',
  phone: '+94 77 345 6789',
  isActive: true,
};

const mockDirector: User = {
  id: 'usr-101',
  name: 'Saman Jayasuriya',
  email: 'director@dnserp.com',
  role: 'DIRECTOR',
  phone: '+94 77 123 4567',
  isActive: true,
};

let currentTestUser = mockSalesManager;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentTestUser,
    role: currentTestUser.role,
    user: currentTestUser,
  }),
}));

describe('Redesigned Cash in Hand & Collections Management UI', () => {
  beforeEach(() => {
    currentTestUser = mockSalesManager;
  });

  it('renders executive management dashboard with 5 KPI summary cards for Sales Manager', async () => {
    render(
      <MemoryRouter initialEntries={['/payments']}>
        <PaymentListPage />
      </MemoryRouter>
    );

    // Title and management badge
    expect(screen.getByText('Cash in Hand & Collections Management')).toBeInTheDocument();
    expect(screen.getByText('Executive Management Center')).toBeInTheDocument();

    // 5 Executive KPI cards
    await waitFor(() => {
      expect(screen.getByText('Field Cash in Hand')).toBeInTheDocument();
      expect(screen.getByText('Reps Holding Cash')).toBeInTheDocument();
      expect(screen.getByText('Pending Finance Handover')).toBeInTheDocument();
      expect(screen.getByText('24h Policy Overdue')).toBeInTheDocument();
      expect(screen.getByText('Cleared & Banked')).toBeInTheDocument();
    });

    // Executive tab navigation
    expect(screen.getByText(/Sales Reps Cash Float/i)).toBeInTheDocument();
    expect(screen.getByText('Invoice Collections Ledger')).toBeInTheDocument();
    expect(screen.getByTestId('tab-cash-handovers')).toBeInTheDocument();
    expect(screen.getByTestId('tab-receipts-ledger')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-customer-accounts')).not.toBeInTheDocument();

    // Record Payment and Hand Over Cash are hidden for Manager/Director
    expect(screen.queryByTestId('btn-record-payment')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-hand-over-cash')).not.toBeInTheDocument();
  });

  it('displays multiple sales representatives with live cash in hand balances and compliance statuses', async () => {
    render(
      <MemoryRouter initialEntries={['/payments']}>
        <PaymentListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Sales Representatives rendered
      expect(screen.getByText('Kasun Wickramasinghe')).toBeInTheDocument();
      expect(screen.getByText('Nuwan Pradeep')).toBeInTheDocument();
      expect(screen.getByText('Dinesh Rathnayake')).toBeInTheDocument();
      expect(screen.getByText('Chaminda Silva')).toBeInTheDocument();
    });

    // Overdue >24h alert
    expect(screen.getAllByText(/Overdue >24h/i).length).toBeGreaterThan(0);
  });

  it('allows management to inspect a Sales Rep to see cash in hand and target invoice details', async () => {
    render(
      <MemoryRouter initialEntries={['/payments']}>
        <PaymentListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kasun Wickramasinghe')).toBeInTheDocument();
    });

    // Click "Inspect Cash & Invoices" on Kasun Wickramasinghe
    const inspectButtons = screen.getAllByRole('button', { name: /Inspect Cash & Invoices/i });
    expect(inspectButtons.length).toBeGreaterThan(0);
    fireEvent.click(inspectButtons[0]);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText('Cash in Hand & Invoices Breakdown (1)')).toBeInTheDocument();
      expect(screen.getByText('Previous Cash Handovers (2)')).toBeInTheDocument();
      expect(screen.getAllByText(/Target Invoices Collected Against/i).length).toBeGreaterThan(0);
    });

    // Verify invoice-level allocation columns in the drilldown
    expect(screen.getAllByText('Invoice #').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Collected on Receipt').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Remaining Balance').length).toBeGreaterThan(0);
    expect(screen.getByText('INV-2025-0101')).toBeInTheDocument();
  });

  it('allows viewing previous cash handovers made by the Sales Rep with dates, amounts, and finance approval status', async () => {
    render(
      <MemoryRouter initialEntries={['/payments']}>
        <PaymentListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kasun Wickramasinghe')).toBeInTheDocument();
    });

    // Click "Handover History" on the rep
    const handoverButtons = screen.getAllByRole('button', { name: /Handover History/i });
    expect(handoverButtons.length).toBeGreaterThan(0);
    fireEvent.click(handoverButtons[0]);

    // Opens modal on previous handovers tab
    await waitFor(() => {
      expect(screen.getByText(/Handover Batches Ledger/i)).toBeInTheDocument();
      expect(screen.getByText('HND-2026-0001')).toBeInTheDocument();
    });

    // Recipient finance officer shown
    expect(screen.getAllByText('Nimal Perera').length).toBeGreaterThan(0);
  });

  it('supports Invoice Collections Ledger tab to view payment details across specific invoices', async () => {
    render(
      <MemoryRouter initialEntries={['/payments']}>
        <PaymentListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Invoice Collections Ledger')).toBeInTheDocument();
    });

    // Click Invoice Collections Ledger tab
    fireEvent.click(screen.getByText('Invoice Collections Ledger'));

    await waitFor(() => {
      expect(screen.getByText(/Invoice Collections & Cash Accountability Ledger/i)).toBeInTheDocument();
      expect(screen.getAllByText('INV-2025-0101').length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText(/Search by Invoice #, Customer, Receipt #, or Rep.../i)).toBeInTheDocument();
    });
  });

  it('renders director management view correctly', async () => {
    currentTestUser = mockDirector;
    render(
      <MemoryRouter initialEntries={['/payments']}>
        <PaymentListPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Cash in Hand & Collections Management')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Field Cash in Hand')).toBeInTheDocument();
      expect(screen.getByText('Kasun Wickramasinghe')).toBeInTheDocument();
    });
  });
});
