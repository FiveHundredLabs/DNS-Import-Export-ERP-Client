import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChartOfAccountsPage } from '../features/finance/pages/ChartOfAccountsPage';
import { SuppliersPage } from '../features/finance/pages/SuppliersPage';
import { financeRepository } from '../features/finance/api';

describe('Phase F-1: Chart of Accounts & Supplier Management UI', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  it('renders the Chart of Accounts with hierarchical categories and padlock badges', async () => {
    render(<ChartOfAccountsPage />);

    // Check header
    expect(screen.getByText('Chart of Accounts')).toBeDefined();

    // Check category groups
    await waitFor(() => {
      expect(screen.getByText('Current Assets')).toBeDefined();
      expect(screen.getByText('Current Liabilities')).toBeDefined();
      expect(screen.getByText("Owner's Equity & Reserves")).toBeDefined();
      expect(screen.getByText('Operating Revenue (Sales)')).toBeDefined();
    });

    // Check locked default accounts have padlock indicators
    await waitFor(() => {
      expect(screen.getByText('Bank Account')).toBeDefined();
      expect(screen.getByText('1010')).toBeDefined();
      const systemBadges = screen.getAllByText('System Locked');
      expect(systemBadges.length).toBeGreaterThanOrEqual(10);
    });
  });

  it('renders Supplier Management and lists vendors', async () => {
    render(<SuppliersPage />);

    expect(screen.getByText('Supplier Management')).toBeDefined();
    expect(screen.getByText('Register Supplier')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('DNS Global Logistics & Electronics Ltd')).toBeDefined();
      expect(screen.getByText('Apex International Importers')).toBeDefined();
    });
  });
});
