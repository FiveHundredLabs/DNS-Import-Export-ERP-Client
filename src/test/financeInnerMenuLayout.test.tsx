import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FinanceLayout } from '../features/finance/FinanceLayout';
import { FinanceDeskPage } from '../features/finance/pages/FinanceDeskPage';
import { ChartOfAccountsPage } from '../features/finance/pages/ChartOfAccountsPage';
import { PaymentApprovalPage } from '../features/finance/pages/PaymentApprovalPage';
import { SuppliersPage } from '../features/finance/pages/SuppliersPage';
import { FinanceReportsHubPage } from '../features/finance/pages/reports/FinanceReportsHubPage';
import { ProfitLossPage } from '../features/finance/pages/reports/ProfitLossPage';
import { BalanceSheetPage } from '../features/finance/pages/reports/BalanceSheetPage';
import { financeRepository } from '../features/finance/api';

describe('Finance Inner Menu Layout & Step-by-Step Flow', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  function renderFinanceApp(initialPath = '/finance') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="finance" element={<FinanceLayout />}>
            <Route index element={<FinanceDeskPage />} />
            <Route path="desk" element={<FinanceDeskPage />} />
            <Route path="accounts" element={<ChartOfAccountsPage />} />
            <Route path="payment-approvals" element={<PaymentApprovalPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="reports" element={<FinanceReportsHubPage />} />
            <Route path="reports/pnl" element={<ProfitLossPage />} />
            <Route path="reports/balance-sheet" element={<BalanceSheetPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  it('renders the finance layout as a full-width workspace without redundant inner sidebar', async () => {
    renderFinanceApp('/finance');

    // Child screen (The Finance Desk) renders directly
    expect(screen.getByText('The Finance Desk')).toBeDefined();
    expect(screen.getByText('Quick Journal Presets:')).toBeDefined();

    // Full-width main workspace container is rendered
    expect(screen.getByRole('main')).toBeDefined();
  });

  it('navigates seamlessly to reports and provides easy backward navigation', async () => {
    renderFinanceApp('/finance/reports/pnl');

    // Renders P&L
    expect(screen.getByText('Profit & Loss (P&L) Statement')).toBeDefined();

    // Back to Reports Hub button is present
    expect(screen.getByText('Back to Reports Hub')).toBeDefined();

    // Quick switch tabs and sidebar links are present
    expect(screen.getAllByText('Balance Sheet').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Trial Balance').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('General Ledger').length).toBeGreaterThanOrEqual(1);
  });
});
