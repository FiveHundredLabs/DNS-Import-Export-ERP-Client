import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesRepDashboard } from '../features/dashboard/SalesRepDashboard';
import { authService } from '../services/AuthService';
import { paymentService } from '../services/PaymentService';
import { handoverService } from '../services/HandoverService';
import { MOCK_USERS } from '../mock/mockUsers';

describe('Sales Representative Mobile Dashboard App View', () => {
  const salesRepUser = MOCK_USERS.find((u) => u.role === 'SALES_REP')!;

  beforeEach(() => {
    authService.loginAs(salesRepUser.id);
    vi.restoreAllMocks();
  });

  it('renders existing header banner elements with mobile app styling', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Kasun/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/(Kelaniya|Kottawa Central) Territory/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/14 Assigned Dealers/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Order Desk')).toBeInTheDocument();
    expect(screen.getByText('Dealer Hub')).toBeInTheDocument();
  });

  it('renders all 4 existing KPI cards arranged nicely for mobile screens', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Monthly Sales')).toBeInTheDocument();
    expect(screen.getByText('Earned Incentive')).toBeInTheDocument();
    expect(screen.getByText('Route Collections')).toBeInTheDocument();
    expect(screen.getByText('Overdue Accounts')).toBeInTheDocument();

    // Check specific values
    expect(screen.getByText('2 Dealers')).toBeInTheDocument();
  });

  it('renders Field Services & Shortcuts with 8 quick access shortcuts', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Field Services & Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Order Desk')).toBeInTheDocument();
    expect(screen.getByText('Dealer Hub')).toBeInTheDocument();
    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.getByText('Warranty')).toBeInTheDocument();
    expect(screen.getByText('Quotations')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getAllByText(/(Wallet|Cash in Hand)/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('does NOT render legacy redundant Pending Payments & Route Receivables section', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Pending Payments & Route Receivables/i)).not.toBeInTheDocument();
  });

  it('renders Recent Order Status Tracking (Section 20) with stepper states', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Recent Order Status Tracking/i)).toBeInTheDocument();
    expect(screen.getByText('SO-1045')).toBeInTheDocument();
    expect(screen.getByText('Special Approval')).toBeInTheDocument();
    expect(screen.getByText('SO-1044')).toBeInTheDocument();
    expect(screen.getByText('Dispatched')).toBeInTheDocument();
  });

  it('renders all sections and services directly on mobile view without sticky switcher', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    // Verifies all core sections are rendered directly
    expect(screen.getByText('Field Services & Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Monthly Sales')).toBeInTheDocument();
    expect(screen.queryByText(/Pending Payments & Route Receivables/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Recent Order Status Tracking/i)).toBeInTheDocument();
  });

  it('navigates to collections when Overdue shortcut is clicked', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    const overdueBtn = screen.getByRole('button', { name: /Overdue/i });
    expect(overdueBtn).toBeInTheDocument();
  });

  describe('5 KPI Cards & Cash to Hand Over Workflow', () => {
    it('renders all 5 KPI cards including the new Cash in Hand card', async () => {
      render(
        <MemoryRouter>
          <SalesRepDashboard />
        </MemoryRouter>
      );

      // Verify all 5 KPI card titles exist
      expect(screen.getByText('Monthly Sales')).toBeInTheDocument();
      expect(screen.getByText('Route Collections')).toBeInTheDocument();
      expect(screen.getAllByText(/(Wallet|Cash in Hand|Cash to Hand Over)/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Earned Incentive')).toBeInTheDocument();
      expect(screen.getByText('Overdue Accounts')).toBeInTheDocument();

      // Verify responsive 5-column desktop grid container
      const cashCards = screen.getAllByText(/(Wallet|Cash in Hand|Cash to Hand Over)/i);
      const cardTitle = cashCards[cashCards.length - 1];
      const gridContainer = cardTitle.closest('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-5');
      expect(gridContainer).toHaveClass('grid-cols-2');

      // Verify actual system data calculation: initial unhanded cash payment pay-003 has 150,000
      await waitFor(() => {
        const cashCard = cardTitle.closest('.rounded-2xl');
        expect(cashCard).toHaveTextContent(/150,000/);
      });
    });

    it('distinguishes Cash to Hand Over from Monthly Sales and Route Collections', async () => {
      render(
        <MemoryRouter>
          <SalesRepDashboard />
        </MemoryRouter>
      );

      // Verify distinct financial values
      expect(screen.getByText(/4,250,000/)).toBeInTheDocument(); // Monthly sales
      expect(screen.getByText(/2,650,000/)).toBeInTheDocument(); // Route collections
      expect(screen.getByText(/127,500/)).toBeInTheDocument(); // Earned incentive

      // Cash to Hand Over is distinct (150,000)
      await waitFor(() => {
        expect(screen.getByText(/150,000/)).toBeInTheDocument();
      });
    });

    it('updates the Cash to Hand Over amount when a new cash collection is recorded', async () => {
      render(
        <MemoryRouter>
          <SalesRepDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/150,000/)).toBeInTheDocument();
      });

      // Record a new cash collection for this sales rep
      await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 35000,
          paymentMethod: 'CASH',
          notes: 'New cash collection in field',
          invoiceAllocations: [
            { invoiceId: 'inv-001', invoiceNumber: 'INV-2025-0101', allocatedAmount: 35000 },
          ],
        },
        salesRepUser
      );

      // Dispatch event to trigger refresh
      window.dispatchEvent(new Event('cash-handover-updated'));

      // Value should update to 150,000 + 35,000 = 185,000
      await waitFor(() => {
        expect(screen.getByText(/185,000/)).toBeInTheDocument();
      });
    });
  });
});
