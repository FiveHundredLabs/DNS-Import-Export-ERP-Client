import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesRepDashboard } from '../features/dashboard/SalesRepDashboard';
import { authService } from '../services/AuthService';
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

    expect(screen.getByText(/Field Representative Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Good Day, Kasun/i)).toBeInTheDocument();
    expect(screen.getByText(/Colombo Central Territory/i)).toBeInTheDocument();
    expect(screen.getByText('Customer Hub')).toBeInTheDocument();
    expect(screen.getByText('New Order')).toBeInTheDocument();
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

  it('renders existing Section 23 warranty note follow-up alert', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Warranty Note Follow-Up Required/i)).toBeInTheDocument();
    expect(screen.getByText(/22 Pending Notes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Muthurajawela Engineering/i).length).toBeGreaterThan(0);
  });

  it('renders Pending Payments & Route Receivables as mobile app cards', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Pending Payments & Route Receivables/i)).toBeInTheDocument();
    expect(screen.getAllByText('Lanka Electrical Superstore').length).toBeGreaterThan(0);
    expect(screen.getByText('DLR-COL-001')).toBeInTheDocument();
    expect(screen.getByText('Overdue by 12 Days')).toBeInTheDocument();

    const collectButtons = screen.getAllByRole('button', { name: /Collect Payment/i });
    expect(collectButtons.length).toBeGreaterThan(0);
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

  it('allows switching views with the mobile navigation bar switcher', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    // Switch to Receivables view
    const receivablesBtn = screen.getByRole('button', { name: /Receivables \(3\)/i });
    fireEvent.click(receivablesBtn);

    expect(screen.getByText(/Pending Payments & Route Receivables/i)).toBeInTheDocument();

    // Switch to Live Orders view
    const ordersBtn = screen.getByRole('button', { name: /Live Orders \(2\)/i });
    fireEvent.click(ordersBtn);

    expect(screen.getByText(/Recent Order Status Tracking/i)).toBeInTheDocument();

    // Switch back to All Overview
    const allBtn = screen.getByRole('button', { name: /All Overview/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('Monthly Sales')).toBeInTheDocument();
    expect(screen.getByText(/Pending Payments & Route Receivables/i)).toBeInTheDocument();
  });

  it('allows mobile filter chips to filter receivables by overdue status', () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    // Switch to receivables view
    const receivablesBtn = screen.getByRole('button', { name: /Receivables \(3\)/i });
    fireEvent.click(receivablesBtn);

    // Click Overdue chip
    const overdueChip = screen.getByRole('button', { name: /Overdue \(1\)/i });
    fireEvent.click(overdueChip);

    expect(screen.getByText('Lanka Electrical Superstore')).toBeInTheDocument();
    expect(screen.queryByText('Kelani Valley Lighting Mart')).not.toBeInTheDocument();

    // Click All chip
    const allChip = screen.getByRole('button', { name: /All \(3\)/i });
    fireEvent.click(allChip);

    expect(screen.getByText('Lanka Electrical Superstore')).toBeInTheDocument();
    expect(screen.getByText('Kelani Valley Lighting Mart')).toBeInTheDocument();
  });
});
