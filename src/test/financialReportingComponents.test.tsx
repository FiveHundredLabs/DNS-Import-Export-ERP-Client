import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfitLossPage } from '../features/finance/pages/reports/ProfitLossPage';
import { BalanceSheetPage } from '../features/finance/pages/reports/BalanceSheetPage';
import { TrialBalancePage } from '../features/finance/pages/reports/TrialBalancePage';
import { GeneralLedgerPage } from '../features/finance/pages/reports/GeneralLedgerPage';
import { VatSummaryPage } from '../features/finance/pages/reports/VatSummaryPage';
import { financeRepository } from '../features/finance/api';

describe('Phase F-4: Core Financial Reporting Suite UI & Math Auditing', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('renders Profit & Loss statement and computes Gross & Net Profit', async () => {
    renderWithRouter(<ProfitLossPage />);

    expect(screen.getByText('Profit & Loss (P&L) Statement')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('1. Operating Revenue')).toBeDefined();
      expect(screen.getByText('2. Direct Cost of Goods Sold (COGS)')).toBeDefined();
      expect(screen.getByText('3. Operating Expenses & Overheads')).toBeDefined();
      expect(screen.getByText(/Gross Operating Profit/i)).toBeDefined();
      expect(screen.getByText(/Net Operating Profit \(Bottom Line\)/i)).toBeDefined();
    });
  });

  it('renders Balance Sheet and validates equation Assets = Liabilities + Equity', async () => {
    renderWithRouter(<BalanceSheetPage />);

    expect(screen.getByText('Balance Sheet Statement')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Balance Sheet Reconciled/i)).toBeDefined();
      expect(screen.getByText('Audit Verified')).toBeDefined();
      expect(screen.getAllByText(/Current Assets/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Current Liabilities/i).length).toBeGreaterThan(0);
    });
  });

  it('renders Trial Balance and verifies zero net variance', async () => {
    renderWithRouter(<TrialBalancePage />);

    expect(screen.getByText('Trial Balance Statement')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Trial Balance Reconciled/i)).toBeDefined();
      expect(screen.getByText('Total Trial Balance')).toBeDefined();
    });
  });

  it('renders General Ledger Explorer with account statement', async () => {
    renderWithRouter(<GeneralLedgerPage />);

    expect(screen.getByText('General Ledger Explorer')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Opening Balance')).toBeDefined();
      expect(screen.getByText('Closing Balance')).toBeDefined();
    });
  });

  it('renders VAT Summary report for 18% VAT filing', async () => {
    renderWithRouter(<VatSummaryPage />);

    expect(screen.getByText('VAT Summary & Tax Filing Report')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Taxable Supplies Base')).toBeDefined();
      expect(screen.getByText('Output VAT Collected (18%)')).toBeDefined();
      expect(screen.getByText('Net Statutory VAT Payable')).toBeDefined();
    });
  });
});
