import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '../features/reports/ReportsPage';
import { authService } from '../services/AuthService';
import * as exportUtils from '../utils/exportUtils';

describe('Phase 11 — Enterprise Analytics & Reporting UI Components', () => {
  beforeEach(() => {
    // Reset to DIRECTOR by default
    authService.switchRole('DIRECTOR');
  });

  it('renders ReportsPage with executive KPIs and tab navigation', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    // Page title and description
    expect(screen.getByText('Enterprise Analytics & Reporting')).toBeInTheDocument();
    expect(screen.getByText(/Single Source of Truth/i)).toBeInTheDocument();

    // Verify Tab headers
    expect(screen.getByText('Executive Overview')).toBeInTheDocument();
    expect(screen.getByText('Sales Analytics')).toBeInTheDocument();
    expect(screen.getByText('Inventory Analytics')).toBeInTheDocument();
    expect(screen.getByText('Finance & Collections')).toBeInTheDocument();
    expect(screen.getByText('Area Performance')).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Gross Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Collections')).toBeInTheDocument();
      expect(screen.getByText('Receivables')).toBeInTheDocument();
    });
  });

  it('navigates seamlessly between tabs', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Gross Revenue')).toBeInTheDocument();
    });

    // 1. Switch to Sales Analytics
    fireEvent.click(screen.getByText('Sales Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Sales Performance by Representative')).toBeInTheDocument();
      expect(screen.getByText('Sales by Product Category')).toBeInTheDocument();
    });

    // 2. Switch to Inventory Analytics
    fireEvent.click(screen.getByText('Inventory Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Total Stock Valuation')).toBeInTheDocument();
      expect(screen.getByText('Stock Positioning & Location Balance Ledger')).toBeInTheDocument();
      expect(screen.getByText(/Low Stock Warnings/i)).toBeInTheDocument();
    });

    // 3. Switch to Finance & Collections
    fireEvent.click(screen.getByText('Finance & Collections'));
    await waitFor(() => {
      expect(screen.getByText('Total Trade Receivables')).toBeInTheDocument();
      expect(screen.getByText('Collections by Settlement Instrument')).toBeInTheDocument();
    });

    // 4. Switch to Area Performance
    fireEvent.click(screen.getByText('Area Performance'));
    await waitFor(() => {
      expect(screen.getByText(/Territory Target/i)).toBeInTheDocument();
      expect(screen.getByText(/Sales Rep Territory Performance/i)).toBeInTheDocument();
    });
  });

  it('triggers print when clicking Print button', async () => {
    const printSpy = vi.spyOn(exportUtils, 'triggerPrintReport');

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    // Wait for KPI data to load
    await waitFor(() => {
      expect(screen.getByText('Gross Revenue')).toBeInTheDocument();
    });

    const printBtn = screen.getByText('Print');
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('applies date range filter correctly', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Start Date')).toBeInTheDocument();
    });

    const startDateInputs = screen.getAllByDisplayValue('');
    const startDateInput = startDateInputs[0];
    fireEvent.change(startDateInput, { target: { value: '2025-01-01' } });

    await waitFor(() => {
      expect(screen.getByText('Reset Filters')).toBeInTheDocument();
    });

    // Reset filters
    fireEvent.click(screen.getByText('Reset Filters'));
  });

  it('enforces territory locking for AREA_MANAGER role', async () => {
    authService.switchRole('AREA_MANAGER');

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Territory: Western Province Central/i)).toBeInTheDocument();
    });

    // Area dropdown should be disabled
    const areaSelect = screen.getByTestId('area-filter-select');
    expect(areaSelect).toBeDisabled();
  });

  it('hides Area Performance tab and locks portfolio for SALES_REP role', async () => {
    authService.switchRole('SALES_REP');

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Portfolio: Kasun Wickramasinghe/i)).toBeInTheDocument();
    });

    // Area Performance tab must NOT be visible for Sales Rep
    expect(screen.queryByText('Area Performance')).toBeNull();
  });
});
