import { describe, it, expect, vi } from 'vitest';
import { reportPdfService, DEFAULT_COMPANY_INFO } from '../features/finance/services/reportPdfService';
import {
  ProfitLossReport,
  BalanceSheetReport,
  TrialBalanceReport,
  GeneralLedgerAccountReport,
  VatReport,
} from '../features/finance/api/types';

describe('Professional Financial Report PDF Generation Service', () => {
  it('formats currency numbers accurately according to accounting conventions', () => {
    expect(reportPdfService.formatCurrency(1250000)).toBe('LKR 1,250,000.00');
    expect(reportPdfService.formatCurrency(-45000.5)).toBe('(LKR 45,000.50)');
    expect(reportPdfService.formatCurrency(0)).toBe('LKR 0.00');
  });

  it('generates corporate header with official company registration and compliance watermark', () => {
    const headerHtml = reportPdfService.generateHeaderHtml(
      'Statement of Financial Position (Balance Sheet)',
      'Statutory statement of assets, liabilities, and owners equity.',
      'As of: 2026-10-31'
    );

    expect(headerHtml).toContain(DEFAULT_COMPANY_INFO.legalName);
    expect(headerHtml).toContain(DEFAULT_COMPANY_INFO.companyReg);
    expect(headerHtml).toContain(DEFAULT_COMPANY_INFO.vatRegNo);
    expect(headerHtml).toContain('AUDITED STATUTORY RECORD');
    expect(headerHtml).toContain('Statement of Financial Position (Balance Sheet)');
    expect(headerHtml).toContain('As of: 2026-10-31');
  });

  it('generates 3-tier corporate governance and certification signature block with board seal', () => {
    const sigHtml = reportPdfService.generateSignatureBlockHtml({
      date: '2026-10-31',
    });

    expect(sigHtml).toContain('1. Prepared By');
    expect(sigHtml).toContain('K. M. Jayawardena, ACMA');
    expect(sigHtml).toContain('2. Reviewed &amp; Verified By');
    expect(sigHtml).toContain('H. P. Samarasekara, ACA');
    expect(sigHtml).toContain('3. Approved By');
    expect(sigHtml).toContain('D. N. Senanayake');
    expect(sigHtml).toContain('Board Seal');
    expect(sigHtml).toContain('SEAL');
  });

  it('generates professional HTML document for Profit & Loss Statement', () => {
    const mockReport: ProfitLossReport = {
      dateRange: { start: '2026-01-01', end: '2026-10-31' },
      revenueItems: [
        { accountId: 'acc-4010', code: '4010', accountName: 'Trading Sales Revenue', amount: 5000000 },
      ],
      totalRevenue: 5000000,
      cogsItems: [
        { accountId: 'acc-5010', code: '5010', accountName: 'Cost of Goods Sold - Landed', amount: 3200000 },
      ],
      totalCogs: 3200000,
      grossProfit: 1800000,
      expenseItems: [
        { accountId: 'acc-6010', code: '6010', accountName: 'Office & Admin Rent', amount: 450000 },
      ],
      totalOperatingExpenses: 450000,
      netOperatingProfit: 1350000,
    };

    const html = reportPdfService.generateProfitLossHtml(mockReport);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Statement of Comprehensive Income (Profit & Loss)');
    expect(html).toContain('Trading Sales Revenue');
    expect(html).toContain('5,000,000.00');
    expect(html).toContain('3,200,000.00');
    expect(html).toContain('1,800,000.00');
    expect(html).toContain('1,350,000.00');
    expect(html).toContain('Net Operating Profit (Bottom Line)');
    expect(html).toContain('K. M. Jayawardena');
    expect(html).toContain('D. N. Senanayake');
  });

  it('generates professional HTML document for Balance Sheet', () => {
    const mockReport: BalanceSheetReport = {
      asOfDate: '2026-10-31',
      currentAssets: [
        { accountId: 'acc-1010', code: '1010', accountName: 'Commercial Bank Operating Account', amount: 4500000 },
      ],
      totalCurrentAssets: 4500000,
      nonCurrentAssets: [
        { accountId: 'acc-1510', code: '1510', accountName: 'Warehouse Equipment', amount: 2000000 },
      ],
      totalNonCurrentAssets: 2000000,
      totalAssets: 6500000,
      currentLiabilities: [
        { accountId: 'acc-2010', code: '2010', accountName: 'Accounts Payable - Trade', amount: 1500000 },
      ],
      totalCurrentLiabilities: 1500000,
      longTermLiabilities: [],
      totalLongTermLiabilities: 0,
      totalLiabilities: 1500000,
      equityItems: [
        { accountId: 'acc-3010', code: '3010', accountName: 'Stated Ordinary Capital', amount: 3500000 },
      ],
      retainedEarnings: 1500000,
      totalEquity: 5000000,
      totalLiabilitiesAndEquity: 6500000,
      isBalanced: true,
      discrepancy: 0,
    };

    const html = reportPdfService.generateBalanceSheetHtml(mockReport);

    expect(html).toContain('Statement of Financial Position (Balance Sheet)');
    expect(html).toContain('Total Assets (A)');
    expect(html).toContain('6,500,000.00');
    expect(html).toContain('Total Liabilities &amp; Equity (L + E)');
    expect(html).toContain('Balanced (Δ 0.00)');
  });

  it('generates professional HTML document for Trial Balance', () => {
    const mockReport: TrialBalanceReport = {
      asOfDate: '2026-10-31',
      items: [
        {
          accountId: 'acc-1010',
          code: '1010',
          name: 'Commercial Bank Account',
          accountClass: 'ASSET',
          accountSubClass: 'CURRENT_ASSET',
          debit: 5000000,
          credit: 0,
        },
        {
          accountId: 'acc-3010',
          code: '3010',
          name: 'Stated Capital',
          accountClass: 'EQUITY',
          accountSubClass: 'EQUITY',
          debit: 0,
          credit: 5000000,
        },
      ],
      totalDebit: 5000000,
      totalCredit: 5000000,
      isBalanced: true,
      discrepancy: 0,
    };

    const html = reportPdfService.generateTrialBalanceHtml(mockReport);

    expect(html).toContain('Trial Balance Statement');
    expect(html).toContain('Total Trial Balance');
    expect(html).toContain('Commercial Bank Account');
    expect(html).toContain('Stated Capital');
    expect(html).toContain('Equilibrium Verification');
  });

  it('generates professional HTML document for General Ledger Statement', () => {
    const mockReport: GeneralLedgerAccountReport = {
      account: {
        id: 'acc-1010',
        code: '1010',
        name: 'Operating Bank Account',
        classification: 'ASSET',
        accountClass: 'ASSET',
        accountType: 'Current Asset',
        accountSubClass: 'CURRENT_ASSET',
        accountSubType: 'Bank & Cash',
        isSystem: true,
        isActive: true,
        currentBalance: 1250000,
        currency: 'LKR',
        createdAt: '2026-01-01',
        updatedAt: '2026-10-31',
      },
      dateRange: { start: '2026-01-01', end: '2026-10-31' },
      openingBalance: 1000000,
      transactions: [
        {
          journalId: 'j-1',
          entryNumber: 'JE-2026-001',
          date: '2026-02-15',
          description: 'Customer Collection - Alpha Trade',
          source: 'AR_RECEIPT',
          debit: 500000,
          credit: 0,
          runningBalance: 1500000,
        },
      ],
      closingBalance: 1500000,
      totalDebits: 500000,
      totalCredits: 0,
    };

    const html = reportPdfService.generateGeneralLedgerHtml(mockReport);

    expect(html).toContain('General Ledger Statement: 1010 - Operating Bank Account');
    expect(html).toContain('JE-2026-001');
    expect(html).toContain('Customer Collection - Alpha Trade');
    expect(html).toContain('Opening balance brought forward');
  });

  it('generates professional HTML document for VAT Summary Report', () => {
    const mockReport: VatReport = {
      dateRange: { start: '2026-01-01', end: '2026-10-31' },
      taxableSales: 10000000,
      vatCollected: 1800000,
      vatPaidOnPurchases: 900000,
      netVatPayable: 900000,
      transactions: [
        {
          date: '2026-03-10',
          invoiceNumber: 'INV-2026-0042',
          customerName: 'Lanka Industrial Supplies',
          customerTin: '102938475',
          taxableAmount: 1000000,
          vatAmount: 180000,
        },
      ],
    };

    const html = reportPdfService.generateVatReportHtml(mockReport);

    expect(html).toContain('Statutory VAT Return & RAMIS Tax Filing Statement');
    expect(html).toContain('Lanka Industrial Supplies');
    expect(html).toContain('INV-2026-0042');
    expect(html).toContain('102938475');
    expect(html).toContain('180,000.00');
    expect(html).toContain('Net IRD Tax Payable');
  });

  it('triggers printReportHtml safely using isolated window write or fallback download', () => {
    const mockWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      onload: null,
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWindow as unknown as Window);

    reportPdfService.printReportHtml('<div>Test Financial Report</div>', 'Test_Title');

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(mockWindow.document.write).toHaveBeenCalledWith('<div>Test Financial Report</div>');
    expect(mockWindow.document.close).toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
