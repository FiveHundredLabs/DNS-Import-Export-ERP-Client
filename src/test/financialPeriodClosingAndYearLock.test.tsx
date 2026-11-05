import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { periodLockService } from '../features/finance/services/periodLockService';
import { FinancialPeriodLockPage } from '../features/finance/pages/settings/FinancialPeriodLockPage';
import { financeRepository } from '../features/finance/api';

describe('Financial Period Closing & Financial Year Locking (/finance/settings/closing)', () => {
  beforeEach(() => {
    periodLockService.reset();
  });

  describe('1. Monthly Period Closing Configuration & Edit/Void Prevention', () => {
    it('configures monthly closing date and prevents editing and voiding of past transactions on or before that date', () => {
      // Configure monthly closing date to 2026-10-31
      periodLockService.setMonthlyClosing(true, '2026-10-31', '2026-10-15');

      const config = periodLockService.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.standardLockDate).toBe('2026-10-31');
      expect(config.adminLockDate).toBe('2026-10-15');

      // Date on or before standard closing date (2026-10-20) for standard clerks:
      // Cannot post, cannot edit, cannot void
      expect(periodLockService.isDateLocked('2026-10-20')).toBe(true);
      expect(() => {
        periodLockService.assertCanEditOrVoid('2026-10-20', 'CLERK');
      }).toThrow(/Cannot edit or void past transactions on or before the closing date/i);

      // Date on or before admin hard cut-off (2026-10-10) for Finance Managers:
      // Blocked from editing or voiding
      expect(periodLockService.isDateLocked('2026-10-10', 'FINANCE_MANAGER')).toBe(true);
      expect(() => {
        periodLockService.assertCanEditOrVoid('2026-10-10', 'FINANCE_MANAGER');
      }).toThrow(/closed financial period/i);

      // Transaction date after closing date (2026-11-05):
      // Open period - Allowed to post, edit, void
      expect(periodLockService.isDateLocked('2026-11-05')).toBe(false);
      expect(() => {
        periodLockService.assertCanEditOrVoid('2026-11-05', 'CLERK');
      }).not.toThrow();
      expect(() => {
        periodLockService.assertCanEditOrVoid('2026-11-05', 'FINANCE_MANAGER');
      }).not.toThrow();
    });

    it('canEditOrVoid helper returns structured status and reason', () => {
      periodLockService.setMonthlyClosing(true, '2026-09-30', '2026-09-30');

      const pastResult = periodLockService.canEditOrVoid('2026-09-15');
      expect(pastResult.allowed).toBe(false);
      expect(pastResult.reason).toContain('Cannot edit or void');

      const futureResult = periodLockService.canEditOrVoid('2026-10-01');
      expect(futureResult.allowed).toBe(true);
      expect(futureResult.reason).toBeUndefined();
    });
  });

  describe('2. Financial Year Locking Architecture', () => {
    it('locks an entire fiscal year and freezes all past transactions in that year', () => {
      // Explicitly lock Fiscal Year 2025
      periodLockService.lockFiscalYear(2025, '2025-12-31');

      const config = periodLockService.getConfig();
      expect(config.financialYearLockEnabled).toBe(true);
      expect(config.lockedFiscalYears).toContain(2025);
      expect(periodLockService.isFiscalYearLocked(2025)).toBe(true);
      expect(periodLockService.isFiscalYearLocked('2025-06-15')).toBe(true);

      // Any transaction in 2025 is strictly blocked against posting, editing, or voiding
      expect(() => {
        periodLockService.assertNotLocked('2025-03-20', 'FINANCE_MANAGER');
      }).toThrow(/locked financial year/i);

      expect(() => {
        periodLockService.assertCanEditOrVoid('2025-03-20', 'FINANCE_MANAGER');
      }).toThrow(/locked financial year/i);

      // FY 2026 remains open
      expect(periodLockService.isFiscalYearLocked(2026)).toBe(false);
    });

    it('allows unlocking a fiscal year when authorized', () => {
      periodLockService.lockFiscalYear(2024);
      expect(periodLockService.isFiscalYearLocked(2024)).toBe(true);

      periodLockService.unlockFiscalYear(2024);
      expect(periodLockService.isFiscalYearLocked(2024)).toBe(false);
    });
  });

  describe('3. Financial Period Lock Page UI Integration', () => {
    it('renders monthly closing quick presets, restrictions notice, and financial year lock register', async () => {
      render(
        <MemoryRouter>
          <FinancialPeriodLockPage />
        </MemoryRouter>
      );

      // Verify page title and badges
      expect(screen.getByText('Financial Lock Date Dashboard')).toBeDefined();
      expect(screen.getByText('Period Closing Controls')).toBeDefined();

      // Verify Monthly Period Closing features
      expect(screen.getByText('Monthly Period Closing Quick Presets:')).toBeDefined();
      expect(screen.getByRole('button', { name: /end of last month/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /set month cut-off/i })).toBeDefined();
      expect(screen.getByText(/Past Transactions Editing & Voiding Restrictions/i)).toBeDefined();

      // Verify Financial Year Locking Card & Register
      expect(screen.getByText('Financial Year Locking & Audit Sealing')).toBeDefined();
      expect(screen.getByText('Fiscal Year Lock Register')).toBeDefined();
      expect(screen.getByText(/FY 2024/i)).toBeDefined();
      expect(screen.getByText(/FY 2025/i)).toBeDefined();
      expect(screen.getByText(/FY 2026/i)).toBeDefined();

      // Test simulation with Edit or Void action verification
      const verifyButton = screen.getByRole('button', { name: /verify date policy/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/within an open financial period|closed financial period/i)).toBeDefined();
      });

      // Year-End Close wizard preview & execution remains functional
      const previewButton = screen.getByRole('button', { name: /preview year-end close/i });
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('Proposed Closing Journal Entry (Double-Entry Invariant: Balanced)')).toBeDefined();
      });
    });
  });
});
