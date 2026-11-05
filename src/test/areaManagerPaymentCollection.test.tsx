import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CustomerPaymentsTab } from '../features/payments/CustomerPaymentsTab';
import { authService } from '../services/AuthService';
import { MOCK_USERS } from '../mock/mockUsers';

describe('Customer Collections & Area Manager Scoping (/payments/collect)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    authService.loginAs('usr-101');
  });

  it('by default selects the Area Manager territory and scopes customers and KPIs strictly to that area', async () => {
    // Switch to Area Manager (Nimal Bandara, area-01: Kelaniya)
    authService.loginAs('usr-105'); // Nimal Bandara, AREA_MANAGER, areaId: 'area-01'

    render(
      <BrowserRouter>
        <CustomerPaymentsTab />
      </BrowserRouter>
    );

    // Wait for async data loading to complete
    await waitFor(() => {
      expect(screen.getByText('Kelaniya Territory Command Desk')).toBeInTheDocument();
    });

    // 1. Verify Area Scoped badge is displayed
    expect(screen.getByText(/Area Scoped: Kelaniya/i)).toBeInTheDocument();

    // 2. Verify Territory Command Desk title is shown for Kelaniya
    expect(screen.getByText('Kelaniya Territory Command Desk')).toBeInTheDocument();
    expect(screen.getByText('Managed Territory')).toBeInTheDocument();

    // 3. Verify there is NO "Clear Area Focus" button for Area Manager
    expect(screen.queryByText('Clear Area Focus')).not.toBeInTheDocument();

    // 4. Verify Area selector is locked/disabled for Area Manager
    expect(screen.getByText(/Kelaniya \(Colombo North \/ Gampaha\) — Assigned Territory/i)).toBeInTheDocument();

    // 5. Verify KPI subtitle reflects Kelaniya territory portfolio rather than "Across all territories"
    expect(screen.getByText(/Kelaniya Territory Portfolio/i)).toBeInTheDocument();
    expect(screen.queryByText(/Across all territories/i)).not.toBeInTheDocument();

    // 6. Verify multi-area overview cards (Maharagama, Malabe, Kottawa) are NOT rendered for Area Manager
    expect(screen.queryByText('Area-Wise Collection Performance')).not.toBeInTheDocument();
    expect(screen.queryByText('Maharagama')).not.toBeInTheDocument();
    expect(screen.queryByText('Malabe')).not.toBeInTheDocument();
    expect(screen.queryByText('Kottawa')).not.toBeInTheDocument();

    // 7. Verify only Kelaniya customers are rendered
    await waitFor(() => {
      expect(screen.getByText('Lanka Electrical & Hardware Superstore')).toBeInTheDocument();
    });
    expect(screen.queryByText('Muthurajawela Engineering Enterprises')).not.toBeInTheDocument(); // Maharagama
    expect(screen.queryByText('DNS Kotte Brand Showroom & Experience Center')).not.toBeInTheDocument(); // Malabe
  });

  it('renders clean industry-level UI without dark blue gradient classes', async () => {
    authService.loginAs('usr-105');

    const { container } = render(
      <BrowserRouter>
        <CustomerPaymentsTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kelaniya Territory Command Desk')).toBeInTheDocument();
    });

    // Verify dark blue gradient is gone
    const gradientElements = container.querySelectorAll('.from-slate-900, .to-indigo-950, .from-indigo-950');
    expect(gradientElements.length).toBe(0);
  });

  it('allows Director to view all territories and switch between areas', async () => {
    // Switch to Director (Saman Jayasuriya)
    authService.loginAs('usr-101');

    render(
      <BrowserRouter>
        <CustomerPaymentsTab />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Area-Wise Collection Performance')).toBeInTheDocument();
    });

    // 1. Director sees multi-area performance overview
    expect(screen.getByText('Area-Wise Collection Performance')).toBeInTheDocument();
    expect(screen.getByText('Across all territories')).toBeInTheDocument();

    // 2. Director sees all area cards
    expect(screen.getAllByText('Kelaniya').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Maharagama').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Malabe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kottawa').length).toBeGreaterThan(0);
  });
});
