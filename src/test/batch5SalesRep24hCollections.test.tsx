import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesRepDashboard } from '../features/dashboard/SalesRepDashboard';
import { customerService } from '../services/CustomerService';
import { invoiceService } from '../services/InvoiceService';
import { filterCustomersByPaymentStatus } from '../rules/customerPaymentRules';
import { Customer } from '../types/customer';
import { Invoice } from '../types/invoice';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCurrentUser = {
  id: 'usr-rep-001',
  name: 'Sunil Jayawardena',
  role: 'SALES_REP',
  email: 'sunil@dnserp.lk',
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
    role: 'SALES_REP',
    canAccessRoute: () => true,
    hasPermission: () => true,
  }),
}));

describe('Batch 5: Sales Rep Next-24-Hours Collections Due View (BR-07 / Feature 8 / SR-04)', () => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const mockCustomers: Customer[] = [
    {
      id: 'cust-assigned-1',
      name: 'Colombo Central Electricals',
      code: 'DLR-COL-001',
      type: 'DEALER',
      assignedRepId: 'usr-rep-001', // Assigned to this rep
      contactPerson: 'Mr. Nimal Perera',
      phone: '+94 77 123 4567',
      address: 'Colombo 01',
      creditLimit: 2000000,
      outstandingBalance: 350000,
      commercialTerms: {
        creditLimit: 2000000,
        creditDays: 30,
        maxDiscountPercentage: 15,
        defaultDiscountPercentage: 0,
      },
      financials: {
        totalOutstanding: 350000,
        overdue: 150000,
        availableCredit: 1650000,
      },
    } as any,
    {
      id: 'cust-assigned-2',
      name: 'Kandy Lighting World',
      code: 'DLR-KAN-002',
      type: 'DEALER',
      assignedRepId: 'usr-rep-001', // Assigned to this rep
      contactPerson: 'Mr. Bandara',
      phone: '+94 81 222 3333',
      address: 'Kandy Road',
      creditLimit: 1500000,
      outstandingBalance: 120000,
      commercialTerms: {
        creditLimit: 1500000,
        creditDays: 30,
        maxDiscountPercentage: 15,
        defaultDiscountPercentage: 0,
      },
      financials: {
        totalOutstanding: 120000,
        overdue: 0,
        availableCredit: 1380000,
      },
    } as any,
    {
      id: 'cust-unassigned',
      name: 'Galle Marine Supplies',
      code: 'DLR-GAL-003',
      type: 'DEALER',
      assignedRepId: 'usr-rep-999', // ASSIGNED TO ANOTHER REP
      contactPerson: 'Mr. Silva',
      phone: '+94 91 555 6666',
      address: 'Galle Fort',
      creditLimit: 1000000,
      outstandingBalance: 500000,
      commercialTerms: {
        creditLimit: 1000000,
        creditDays: 30,
        maxDiscountPercentage: 15,
        defaultDiscountPercentage: 0,
      },
      financials: {
        totalOutstanding: 500000,
        overdue: 500000,
        availableCredit: 500000,
      },
    } as any,
  ];

  const mockInvoices: Invoice[] = [
    {
      id: 'inv-due-today',
      invoiceNumber: 'INV-2026-TODAY',
      customerId: 'cust-assigned-1',
      issueDate: '2026-09-01',
      dueDate: today,
      totalAmount: 200000,
      balanceAmount: 200000,
      status: 'ISSUED',
      items: [],
    } as any,
    {
      id: 'inv-due-tomorrow',
      invoiceNumber: 'INV-2026-TOMORROW',
      customerId: 'cust-assigned-2',
      issueDate: '2026-09-01',
      dueDate: tomorrow,
      totalAmount: 120000,
      balanceAmount: 120000,
      status: 'ISSUED',
      items: [],
    } as any,
    {
      id: 'inv-overdue',
      invoiceNumber: 'INV-2026-OVERDUE',
      customerId: 'cust-assigned-1',
      issueDate: '2026-08-01',
      dueDate: yesterday,
      totalAmount: 150000,
      balanceAmount: 150000,
      status: 'OVERDUE',
      items: [],
    } as any,
    {
      id: 'inv-future',
      invoiceNumber: 'INV-2026-FUTURE',
      customerId: 'cust-assigned-1',
      issueDate: '2026-09-01',
      dueDate: nextMonth,
      totalAmount: 80000,
      balanceAmount: 80000,
      status: 'ISSUED',
      items: [],
    } as any,
    {
      id: 'inv-unassigned-due',
      invoiceNumber: 'INV-2026-UNASSIGNED',
      customerId: 'cust-unassigned', // Other rep's customer
      issueDate: '2026-09-01',
      dueDate: today,
      totalAmount: 500000,
      balanceAmount: 500000,
      status: 'ISSUED',
      items: [],
    } as any,
    {
      id: 'inv-paid-today',
      invoiceNumber: 'INV-2026-PAID',
      customerId: 'cust-assigned-1',
      issueDate: '2026-09-01',
      dueDate: today,
      totalAmount: 90000,
      balanceAmount: 0, // Fully paid
      status: 'PAID',
      items: [],
    } as any,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(customerService, 'listCustomers').mockResolvedValue({
      data: mockCustomers,
      total: mockCustomers.length,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    } as any);
    vi.spyOn(invoiceService, 'getInvoices').mockResolvedValue({
      data: mockInvoices,
      total: mockInvoices.length,
      page: 1,
      pageSize: 200,
      totalPages: 1,
    } as any);
  });

  it('filters and renders priority next-24-hours collections due queue for assigned rep', async () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    // Section title
    expect(await screen.findByText('Next 7 Days Collections Due')).toBeInTheDocument();

    // Invoices in queue: overdue, due today, due tomorrow
    expect(await screen.findByText('INV-2026-TODAY')).toBeInTheDocument();
    expect(await screen.findByText('INV-2026-TOMORROW')).toBeInTheDocument();
    expect(await screen.findByText('INV-2026-OVERDUE')).toBeInTheDocument();

    // Badges
    expect(screen.getByText('DUE TODAY')).toBeInTheDocument();
    expect(screen.getByText('DUE TOMORROW')).toBeInTheDocument();
    expect(screen.getAllByText(/OVERDUE/).length).toBeGreaterThan(0);

    // Future invoice (due in 30 days) must NOT appear in the priority 24h queue
    expect(screen.queryByText('INV-2026-FUTURE')).not.toBeInTheDocument();

    // Fully paid invoice must NOT appear
    expect(screen.queryByText('INV-2026-PAID')).not.toBeInTheDocument();
  });

  it('strictly excludes unassigned customer accounts from the rep queue', async () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    await screen.findByText('Next 7 Days Collections Due');

    // Unassigned customer invoice must be excluded
    expect(screen.queryByText('INV-2026-UNASSIGNED')).not.toBeInTheDocument();
    expect(screen.queryByText('Galle Marine Supplies')).not.toBeInTheDocument();
  });

  it('1-click Collect button initiates navigation with customerId and invoiceId target', async () => {
    render(
      <MemoryRouter>
        <SalesRepDashboard />
      </MemoryRouter>
    );

    const titleEl = await screen.findByText('Next 7 Days Collections Due');
    const priorityContainer = titleEl.closest('.lg\\:col-span-2');
    expect(priorityContainer).toBeTruthy();

    // Find Collect button inside the priority queue card
    const collectButtons = within(priorityContainer as HTMLElement).getAllByRole('button', { name: /collect/i });
    expect(collectButtons.length).toBeGreaterThan(0);

    // Click the collect button
    fireEvent.click(collectButtons[0]);

    // Expect navigation to /payments/collect/cust-assigned-1?invoiceId=...
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/\/payments\/collect\/cust-assigned-\d+\?invoiceId=inv-/)
    );
  });

  it('filterCustomersByPaymentStatus with DUE_NEXT_24H matches customers with 24h debt', () => {
    const matched = filterCustomersByPaymentStatus(
      mockCustomers,
      mockInvoices,
      'DUE_NEXT_24H'
    );

    const matchedIds = matched.map((c) => c.id);
    expect(matchedIds).toContain('cust-assigned-1');
    expect(matchedIds).toContain('cust-assigned-2');
  });
});
