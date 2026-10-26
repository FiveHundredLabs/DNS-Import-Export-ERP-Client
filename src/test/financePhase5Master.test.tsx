import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { financeRepository } from '../features/finance/api';
import { periodLockService } from '../features/finance/services/periodLockService';
import { yearEndCloseService } from '../features/finance/services/yearEndCloseService';
import { ramisExportService } from '../features/finance/services/ramisExportService';
import { reportPdfService } from '../features/finance/services/reportPdfService';
import { FinancialPeriodLockPage } from '../features/finance/pages/settings/FinancialPeriodLockPage';
import { ProfitLossPage } from '../features/finance/pages/reports/ProfitLossPage';
import { BalanceSheetPage } from '../features/finance/pages/reports/BalanceSheetPage';
import { VatSummaryPage } from '../features/finance/pages/reports/VatSummaryPage';
import { CorporateReportHeader } from '../features/finance/components/CorporateReportHeader';
import { CorporateSignatureBlock } from '../features/finance/components/CorporateSignatureBlock';

describe('Phase 5 Master Test Suite: Period Control, Year-End Close & Reporting', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
    periodLockService.reset();
  });

  // =========================================================================
  // 1. DUAL PERIOD LOCKS (standardLockDate vs adminLockDate)
  // =========================================================================
  describe('1. Dual Period Locks Architecture (/finance/settings/closing)', () => {
    it('enforces separate cut-offs for operational clerks and finance managers', () => {
      // Month-End standard cut-off: 2026-09-30 (blocks clerks)
      // Administrative cut-off: 2026-09-15 (hard lock)
      periodLockService.setDualConfig(true, '2026-09-30', '2026-09-15');

      const config = periodLockService.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.standardLockDate).toBe('2026-09-30');
      expect(config.adminLockDate).toBe('2026-09-15');

      // Test date: 2026-09-20 (in the grace window between 2026-09-15 and 2026-09-30)
      // Operational clerk (or undefined role) MUST be blocked
      expect(() => {
        periodLockService.assertNotLocked('2026-09-20');
      }).toThrow('Transaction date is in a closed financial period.');

      expect(() => {
        periodLockService.assertNotLocked('2026-09-20', 'SALES_REP');
      }).toThrow('Transaction date is in a closed financial period.');

      expect(() => {
        periodLockService.assertNotLocked('2026-09-20', 'CASHIER');
      }).toThrow('Transaction date is in a closed financial period.');

      expect(() => {
        periodLockService.assertNotLocked('2026-09-20', 'STOCK_KEEPER');
      }).toThrow('Transaction date is in a closed financial period.');

      // Finance Manager MUST be allowed during grace window (> adminLockDate 2026-09-15)
      expect(() => {
        periodLockService.assertNotLocked('2026-09-20', 'FINANCE_MANAGER');
      }).not.toThrow();

      expect(() => {
        periodLockService.assertNotLocked('2026-09-20', 'DIRECTOR');
      }).not.toThrow();
    });

    it('strictly blocks Finance Managers on or prior to adminLockDate', () => {
      // Hard admin lock: 2026-09-15
      periodLockService.setDualConfig(true, '2026-09-30', '2026-09-15');

      // Date on or before admin cut-off: 2026-09-10
      expect(() => {
        periodLockService.assertNotLocked('2026-09-10', 'FINANCE_MANAGER');
      }).toThrow('Transaction date is in a closed financial period. (Admin lock enforced)');

      expect(() => {
        periodLockService.assertNotLocked('2026-09-15', 'DIRECTOR');
      }).toThrow('Transaction date is in a closed financial period. (Admin lock enforced)');
    });

    it('permits all transactions when period lock is disabled', () => {
      periodLockService.setConfig(false, '2026-09-30', '2026-09-15');

      expect(() => {
        periodLockService.assertNotLocked('2026-09-01', 'SALES_REP');
      }).not.toThrow();

      expect(() => {
        periodLockService.assertNotLocked('2026-09-01', 'FINANCE_MANAGER');
      }).not.toThrow();
    });

    it('correctly evaluates isDateLocked helper for both roles', () => {
      periodLockService.setDualConfig(true, '2026-09-30', '2026-09-15');

      // 2026-09-25: locked for clerk, open for finance manager
      expect(periodLockService.isDateLocked('2026-09-25')).toBe(true);
      expect(periodLockService.isDateLocked('2026-09-25', 'FINANCE_MANAGER')).toBe(false);

      // 2026-09-10: locked for both
      expect(periodLockService.isDateLocked('2026-09-10')).toBe(true);
      expect(periodLockService.isDateLocked('2026-09-10', 'FINANCE_MANAGER')).toBe(true);

      // 2026-10-05: open for both
      expect(periodLockService.isDateLocked('2026-10-05')).toBe(false);
      expect(periodLockService.isDateLocked('2026-10-05', 'FINANCE_MANAGER')).toBe(false);
    });
  });

  // =========================================================================
  // 2. YEAR-END CLOSE WIZARD (Zero nominal accounts -> 3010 Retained Earnings)
  // =========================================================================
  describe('2. Fiscal Year-End Close Wizard Routine', () => {
    it('previews and zeroes out 4000 Revenue and 5000/6000 Expense accounts into 3010 Retained Earnings', async () => {
      const preview = await yearEndCloseService.previewClose('2026-09-30');

      expect(preview.fiscalYear).toBe(2026);
      expect(preview.fiscalYearEndDate).toBe('2026-09-30');
      expect(preview.totalRevenue).toBe(3250000); // Account 4010 from seed JE-1002
      expect(preview.totalExpenses).toBe(2470000); // 1,950,000 COGS + 520,000 initial Operating Expenses
      expect(preview.netIncome).toBe(780000); // 3,250,000 - 2,470,000 = 780,000 net operating profit
      expect(preview.isProfitable).toBe(true);
      expect(preview.retainedEarningsAccount.code).toBe('3010');

      // Check double-entry closing lines
      expect(preview.isBalanced).toBe(true);
      expect(preview.totalDebit).toBe(3250000);
      expect(preview.totalCredit).toBe(3250000);

      // 4010 must be debited
      const revLine = preview.journalLines.find((l) => l.accountId === 'acc-4010');
      expect(revLine).toBeDefined();
      expect(revLine?.debit).toBe(3250000);
      expect(revLine?.credit).toBe(0);

      // 5010 must be credited
      const expLine = preview.journalLines.find((l) => l.accountId === 'acc-5010');
      expect(expLine).toBeDefined();
      expect(expLine?.credit).toBe(1950000);
      expect(expLine?.debit).toBe(0);

      // 3010 Retained Earnings must be credited by net profit
      const retainedEarningsLine = preview.journalLines.find((l) => l.accountId === 'acc-3010');
      expect(retainedEarningsLine).toBeDefined();
      expect(retainedEarningsLine?.credit).toBe(780000);
      expect(retainedEarningsLine?.debit).toBe(0);
    });

    it('executes the year-end closing routine and commits a balanced system journal entry', async () => {
      const result = await yearEndCloseService.executeClose({
        fiscalYearEndDate: '2026-09-30',
        executedBy: 'Chief Financial Officer',
        lockPeriodAfterClose: true,
      });

      expect(result.journalEntry).toBeDefined();
      expect(result.journalEntry.reference).toBe('YEC-2026');
      expect(result.journalEntry.source).toBe('SYSTEM');
      expect(result.journalEntry.status).toBe('POSTED');
      expect(result.journalEntry.totalDebit).toBe(3250000);
      expect(result.journalEntry.totalCredit).toBe(3250000);

      // Ledger balances verification: Retained Earnings (3010) must now have increased by 780,000
      const accounts = await financeRepository.getAccounts();
      const equityAcc = accounts.find((a) => a.code === '3010');
      // 5,000,000 initial + 780,000 swept = 5,780,000
      expect(equityAcc?.currentBalance).toBe(5780000);

      // Period lock must be activated up to 2026-09-30
      const cfg = periodLockService.getConfig();
      expect(cfg.enabled).toBe(true);
      expect(cfg.standardLockDate).toBe('2026-09-30');
      expect(cfg.adminLockDate).toBe('2026-09-30');
    });

    it('handles net operating loss scenarios by debiting 3010 Retained Earnings', async () => {
      // Create a heavy expense entry making expenses > revenue
      const accounts = await financeRepository.getAccounts();
      const rentAcc = accounts.find((a) => a.code === '6030')!;
      const bankAcc = accounts.find((a) => a.code === '1010')!;

      await financeRepository.createJournalEntry({
        date: '2026-09-25',
        description: 'Large consulting and facility expansion fee',
        reference: 'EXP-HEAVY-01',
        source: 'MANUAL',
        lines: [
          { accountId: rentAcc.id, debit: 4000000, credit: 0, description: 'Facility expansion fee' },
          { accountId: bankAcc.id, debit: 0, credit: 4000000, description: 'Bank transfer' },
        ],
      });

      const preview = await yearEndCloseService.previewClose('2026-09-30');
      expect(preview.netIncome).toBe(-2980000);
      expect(preview.isProfitable).toBe(false);

      // In a net loss, Retained Earnings (3010) must be DEBITED
      const reLine = preview.journalLines.find((l) => l.accountId === 'acc-3010');
      expect(reLine).toBeDefined();
      expect(reLine?.debit).toBe(2980000);
      expect(reLine?.credit).toBe(0);

      // Total closing debits: 3,250,000 (revenue zeroing) + 2,980,000 (retained earnings loss) = 6,230,000
      expect(preview.isBalanced).toBe(true);
      expect(preview.totalDebit).toBe(6230000);
      expect(preview.totalCredit).toBe(6230000);
    });

    it('prevents duplicate Year-End Close execution on an already closed fiscal year', async () => {
      // First execution
      await yearEndCloseService.executeClose({
        fiscalYearEndDate: '2026-09-30',
        executedBy: 'Chief Financial Officer',
      });

      // Second attempt to preview
      const previewAgain = await yearEndCloseService.previewClose('2026-09-30');
      expect(previewAgain.canExecute).toBe(false);
      expect(previewAgain.reason).toContain('Fiscal year 2026 has already been closed');

      // Second attempt to execute must reject
      await expect(
        yearEndCloseService.executeClose({
          fiscalYearEndDate: '2026-09-30',
          executedBy: 'Chief Financial Officer',
        })
      ).rejects.toThrow(/already been closed/);
    });

    it('allows Finance Managers to execute Year-End Close during month-end grace period but rejects if adminLockDate is enforced', async () => {
      // Standard cutoff: 2026-09-30, Admin cutoff: 2026-09-15
      periodLockService.setDualConfig(true, '2026-09-30', '2026-09-15');

      // Closing for 2026-09-30 is within Finance Manager grace window (> adminLockDate 2026-09-15)
      const result = await yearEndCloseService.executeClose({
        fiscalYearEndDate: '2026-09-30',
        executedBy: 'Finance Director',
      });
      expect(result.journalEntry.reference).toBe('YEC-2026');

      // Reset repository and set adminLockDate to 2026-09-30 (hard lock for everyone)
      await financeRepository.resetToDefaults();
      periodLockService.setDualConfig(true, '2026-09-30', '2026-09-30');

      await expect(
        yearEndCloseService.executeClose({
          fiscalYearEndDate: '2026-09-30',
          executedBy: 'Finance Director',
        })
      ).rejects.toThrow(/closed financial period/);
    });
  });

  // =========================================================================
  // 3. REPORTING UPGRADES: Prior Period Variance & Corporate PDF Layout
  // =========================================================================
  describe('3. Financial Reporting Upgrades (Comparative Variance & Corporate PDF Layout)', () => {
    it('renders CorporateReportHeader with company name, registration and tax IDs', () => {
      render(
        <CorporateReportHeader
          title="Statement of Comprehensive Income (Profit & Loss)"
          periodLabel="01 Sep 2026 to 30 Sep 2026"
        />
      );

      expect(screen.getByTestId('corporate-report-header')).toBeDefined();
      expect(screen.getByText('DNS Import & Export (Pvt) Ltd')).toBeDefined();
      expect(screen.getByText(/Company Reg: PV 0029384/)).toBeDefined();
      expect(screen.getByText(/VAT Reg No: VAT-102938475/)).toBeDefined();
      expect(screen.getByText('Statement of Comprehensive Income (Profit & Loss)')).toBeDefined();
    });

    it('renders CorporateSignatureBlock with 3-tier governance and board seal', () => {
      render(<CorporateSignatureBlock date="2026-09-30" />);

      expect(screen.getByTestId('corporate-signature-block')).toBeDefined();
      expect(screen.getByText('1. Prepared By')).toBeDefined();
      expect(screen.getByText('2. Reviewed & Verified By')).toBeDefined();
      expect(screen.getByText('3. Approved By')).toBeDefined();
      expect(screen.getByText('Board Seal')).toBeDefined();
      expect(screen.getAllByText('D. N. Senanayake').length).toBeGreaterThan(0);
    });

    it('triggers native print/PDF export service without crashing', () => {
      const originalPrint = window.print;
      let printCalled = false;
      window.print = () => {
        printCalled = true;
      };

      reportPdfService.triggerPrint('DNS_Financial_Statement_Test');
      expect(printCalled).toBe(true);

      window.print = originalPrint;
    });

    it('renders ProfitLossPage and enables Prior Period Comparison with variance calculations', async () => {
      render(
        <MemoryRouter>
          <ProfitLossPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Profit & Loss (P&L) Statement')).toBeDefined();
      });

      // Toggle Compare with Prior Period checkbox
      const compareCheckbox = screen.getByLabelText(/compare with prior period/i);
      expect(compareCheckbox).toBeDefined();
      fireEvent.click(compareCheckbox);

      // Should display Variance column and prior period inputs
      await waitFor(() => {
        expect(screen.getByText(/variance \(Δ%\)/i)).toBeDefined();
        expect(screen.getByText(/prior period \(lkr\)/i)).toBeDefined();
      });
    });

    it('renders BalanceSheetPage and enables Prior Period Comparison', async () => {
      render(
        <MemoryRouter>
          <BalanceSheetPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Balance Sheet Statement')).toBeDefined();
      });

      const compareCheckbox = screen.getByLabelText(/compare with prior period/i);
      expect(compareCheckbox).toBeDefined();
      fireEvent.click(compareCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/prior date:/i)).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 4. RAMIS STATUTORY EXPORT (Schedule 01 Sales & Schedule 02 Purchases)
  // =========================================================================
  describe('4. RAMIS Statutory Export Engine (IRD Sri Lanka Compliance)', () => {
    it('generates valid RAMIS Schedule 01 (Sales) CSV export with Customer TIN and SVAT', () => {
      const mockSales = [
        {
          date: '2026-09-10',
          invoiceNumber: 'INV-2026-0042',
          customerName: 'Metro Hardware Lanka Ltd',
          customerTin: '102938475-7000',
          customerSvat: 'SVAT-00123',
          taxableAmount: 3250000.0,
          vatAmount: 585000.0,
          isSvat: false,
          svatAmount: 0,
        },
        {
          date: '2026-09-22',
          invoiceNumber: 'INV-2026-0048',
          customerName: 'Lanka Export Manufacturing Corp',
          customerTin: '209384751-8000',
          customerSvat: 'SVAT-00456',
          taxableAmount: 1500000.0,
          vatAmount: 270000.0,
          isSvat: true,
          svatAmount: 270000.0,
        },
      ];

      const csv = ramisExportService.generateSchedule01Csv(mockSales);

      expect(csv).toContain('# RAMIS STATUTORY VAT SCHEDULE 01 - SALES & OUTPUT SUPPLIES');
      expect(csv).toContain('DNS Import & Export (Pvt) Ltd');
      expect(csv).toContain('SeqNo,InvoiceDate,InvoiceNumber,CustomerName,CustomerTIN,CustomerSVAT,IsSVAT,TaxableAmountLKR,VATRate,VATAmountLKR,SVATAmountLKR,TotalInvoiceAmountLKR');
      expect(csv).toContain('INV-2026-0042');
      expect(csv).toContain('"Metro Hardware Lanka Ltd"');
      expect(csv).toContain('102938475-7000');
      expect(csv).toContain('SVAT-00123');
      expect(csv).toContain('3250000.00');
      expect(csv).toContain('585000.00');
      expect(csv).toContain('YES'); // isSvat flag
      expect(csv).toContain('270000.00'); // svat amount
      expect(csv).toContain('TOTALS');
    });

    it('generates well-formed RAMIS Schedule 01 XML export', () => {
      const mockSales = [
        {
          date: '2026-09-10',
          invoiceNumber: 'INV-2026-0042',
          customerName: 'Metro Hardware Lanka Ltd',
          customerTin: '102938475-7000',
          customerSvat: 'SVAT-00123',
          taxableAmount: 3250000.0,
          vatAmount: 585000.0,
          isSvat: false,
          svatAmount: 0,
        },
      ];

      const xml = ramisExportService.generateSchedule01Xml(mockSales);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<RAMISDeclaration type="VAT" schedule="01">');
      expect(xml).toContain('<DeclarantName>DNS Import &amp; Export (Pvt) Ltd</DeclarantName>');
      expect(xml).toContain('<InvoiceNumber>INV-2026-0042</InvoiceNumber>');
      expect(xml).toContain('<CustomerTIN>102938475-7000</CustomerTIN>');
      expect(xml).toContain('<CustomerSVAT>SVAT-00123</CustomerSVAT>');
      expect(xml).toContain('<TaxableAmount>3250000.00</TaxableAmount>');
      expect(xml).toContain('<VATAmount>585000.00</VATAmount>');
      expect(xml).toContain('<TotalTaxableSupplies>3250000.00</TotalTaxableSupplies>');
      expect(xml).toContain('</RAMISDeclaration>');
    });

    it('safely escapes special XML characters (&, <, >, ", \') in RAMIS Schedule 01 XML export', () => {
      const mockSales = [
        {
          date: '2026-09-10',
          invoiceNumber: 'INV-2026-0042',
          customerName: 'Metro & Sons <Holdings> "Lanka" & Co',
          customerTin: '102938475-7000',
          customerSvat: 'SVAT-00123',
          taxableAmount: 100000.0,
          vatAmount: 18000.0,
        },
      ];

      const xml = ramisExportService.generateSchedule01Xml(mockSales);
      expect(xml).toContain('<CustomerName>Metro &amp; Sons &lt;Holdings&gt; &quot;Lanka&quot; &amp; Co</CustomerName>');
      expect(xml).not.toContain('<Holdings>');
    });

    it('generates valid RAMIS Schedule 02 (Purchases) CSV export with Supplier TIN and SVAT', () => {
      const mockPurchases = [
        {
          date: '2026-09-05',
          billNumber: 'BILL-2026-089',
          supplierName: 'DNS Global Logistics & Electronics Ltd',
          supplierTin: 'VAT-102938475',
          supplierSvat: 'SVAT-00441',
          taxableAmount: 1200000.0,
          vatAmount: 216000.0,
          isSvat: false,
          svatAmount: 0,
        },
        {
          date: '2026-09-15',
          billNumber: 'BILL-2026-094',
          supplierName: 'Siemens Industrial Automation Lanka',
          supplierTin: 'VAT-991188223',
          supplierSvat: 'SVAT-00772',
          taxableAmount: 650000.0,
          vatAmount: 117000.0,
          isSvat: true,
          svatAmount: 117000.0,
        },
      ];

      const csv = ramisExportService.generateSchedule02Csv(mockPurchases);

      expect(csv).toContain('# RAMIS STATUTORY VAT SCHEDULE 02 - PURCHASES & INPUT SUPPLIES');
      expect(csv).toContain('BILL-2026-089');
      expect(csv).toContain('"DNS Global Logistics & Electronics Ltd"');
      expect(csv).toContain('VAT-102938475');
      expect(csv).toContain('SVAT-00441');
      expect(csv).toContain('1200000.00');
      expect(csv).toContain('216000.00');
      expect(csv).toContain('YES'); // second row is SVAT
      expect(csv).toContain('117000.00');
    });

    it('generates well-formed RAMIS Schedule 02 XML export', () => {
      const mockPurchases = [
        {
          date: '2026-09-05',
          billNumber: 'BILL-2026-089',
          supplierName: 'DNS Global Logistics & Electronics Ltd',
          supplierTin: 'VAT-102938475',
          supplierSvat: 'SVAT-00441',
          taxableAmount: 1200000.0,
          vatAmount: 216000.0,
          isSvat: false,
          svatAmount: 0,
        },
      ];

      const xml = ramisExportService.generateSchedule02Xml(mockPurchases);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<RAMISDeclaration type="VAT" schedule="02">');
      expect(xml).toContain('<BillReferenceNumber>BILL-2026-089</BillReferenceNumber>');
      expect(xml).toContain('<SupplierTIN>VAT-102938475</SupplierTIN>');
      expect(xml).toContain('<TaxablePurchases>1200000.00</TaxablePurchases>');
      expect(xml).toContain('<InputVATClaimed>216000.00</InputVATClaimed>');
      expect(xml).toContain('</RAMISDeclaration>');
    });

    it('renders VatSummaryPage with RAMIS Statutory Filing toolbar and Schedule tabs', async () => {
      render(
        <MemoryRouter>
          <VatSummaryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('RAMIS Statutory Filing Suite')).toBeDefined();
        expect(screen.getByText(/Schedule 01: Taxable Sales/)).toBeDefined();
        expect(screen.getByText(/Schedule 02: Taxable Purchases/)).toBeDefined();
      });

      // Switch to Schedule 02 tab
      const sch2Tab = screen.getByRole('button', { name: /schedule 02: taxable purchases/i });
      fireEvent.click(sch2Tab);

      await waitFor(() => {
        expect(
          screen.getByText(/RAMIS Schedule 02: Taxable Purchases & Input VAT Credit Bills/i)
        ).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 5. PERIOD CLOSING & SETTINGS UI WORKFLOW (/finance/settings/closing)
  // =========================================================================
  describe('5. Financial Period Lock Page Full Integration', () => {
    it('renders dual lock inputs, audit simulator, and year-end close wizard', async () => {
      render(
        <MemoryRouter>
          <FinancialPeriodLockPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Financial Lock Date Dashboard')).toBeDefined();
      expect(screen.getByText('Period Closing Controls')).toBeDefined();
      expect(screen.getAllByText(/Standard Lock Date/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Admin Lock Date/).length).toBeGreaterThan(0);
      expect(screen.getByText('Fiscal Year-End Close Wizard')).toBeDefined();

      // Trigger simulation test
      const simButton = screen.getByRole('button', { name: /verify date policy/i });
      fireEvent.click(simButton);

      await waitFor(() => {
        expect(screen.getByText(/within an open financial period|closed financial period/i)).toBeDefined();
      });

      // Trigger Year-End Close preview
      const previewButton = screen.getByRole('button', { name: /preview year-end close/i });
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('Proposed Closing Journal Entry (Double-Entry Invariant: Balanced)')).toBeDefined();
        expect(screen.getByRole('button', { name: /execute & commit year-end close/i })).toBeDefined();
      });
    });
  });
});
