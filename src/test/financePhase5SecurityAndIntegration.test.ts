import { describe, it, expect, beforeEach } from 'vitest';
import { canAccessRoute } from '../rules/permissions';
import { financeRepository } from '../features/finance/api';

describe('Phase F-5: System Hardening, RBAC & API Contract Validation', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  describe('Role-Based Access Control (RBAC)', () => {
    const financeRoutes = [
      '/finance',
      '/finance/accounts',
      '/finance/suppliers',
      '/finance/payment-approvals',
      '/finance/commissions',
      '/finance/desk',
      '/finance/reports/pnl',
      '/finance/reports/balance-sheet',
      '/finance/reports/trial-balance',
      '/finance/reports/general-ledger',
      '/finance/reports/vat',
    ];

    it('allows DIRECTOR, MANAGER, and FINANCE_MANAGER full access to all finance routes', () => {
      for (const route of financeRoutes) {
        expect(canAccessRoute('DIRECTOR', route)).toBe(true);
        expect(canAccessRoute('MANAGER', route)).toBe(true);
        expect(canAccessRoute('FINANCE_MANAGER', route)).toBe(true);
      }
    });

    it('strictly forbids SALES_REP, CASHIER, and STOCK_KEEPER from accessing finance routes', () => {
      for (const route of financeRoutes) {
        expect(canAccessRoute('SALES_REP', route)).toBe(false);
        expect(canAccessRoute('CASHIER', route)).toBe(false);
        expect(canAccessRoute('STOCK_KEEPER', route)).toBe(false);
        expect(canAccessRoute('AREA_MANAGER', route)).toBe(false);
      }
    });
  });

  describe('NestJS API Contract Audit', () => {
    it('GET /api/v1/finance/accounts: returns array of typed accounts with 11 locked system accounts', async () => {
      const accounts = await financeRepository.getAccounts();
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThanOrEqual(11);
      const bank = accounts.find((a) => a.code === '1010');
      expect(bank).toBeDefined();
      expect(bank?.isSystem).toBe(true);
      expect(bank?.accountClass).toBe('ASSET');
      expect(bank?.accountSubClass).toBe('CURRENT_ASSET');
    });

    it('POST /api/v1/finance/accounts: creates and returns valid account entity', async () => {
      const newAcc = await financeRepository.createAccount({
        code: '6080',
        name: 'Audit Legal & Professional Fees',
        accountClass: 'EXPENSE',
        accountSubClass: 'OPERATING_EXPENSE',
        description: 'Statutory audit fees',
      });
      expect(newAcc.id).toBeDefined();
      expect(newAcc.code).toBe('6080');
      expect(newAcc.isSystem).toBe(false);
    });

    it('GET /api/v1/finance/suppliers: returns array of registered trade vendors', async () => {
      const suppliers = await financeRepository.getSuppliers();
      expect(Array.isArray(suppliers)).toBe(true);
      expect(suppliers.length).toBeGreaterThanOrEqual(4);
    });

    it('POST /api/v1/finance/suppliers: creates and returns valid supplier entity', async () => {
      const newSup = await financeRepository.createSupplier({
        code: 'SUP-777',
        name: 'Siemens Industrial Automation Lanka',
        contactPerson: 'Kanishka Silva',
        email: 'kanishka@siemens.lk',
        phone: '+94 11 888 7766',
        taxNumber: 'VAT-991188223',
        paymentTerms: 'Net 30',
      });
      expect(newSup.id).toBeDefined();
      expect(newSup.code).toBe('SUP-777');
    });

    it('POST /api/v1/finance/journals: commits balanced journal entry and updates balances', async () => {
      const accounts = await financeRepository.getAccounts();
      const bankAcc = accounts.find((a) => a.code === '1010')!;
      const rentAcc = accounts.find((a) => a.code === '6030')!;

      const posted = await financeRepository.createJournalEntry({
        date: '2026-09-25',
        description: 'Monthly head office rental settlement',
        reference: 'LEASE-SEP-26',
        source: 'MANUAL',
        lines: [
          { accountId: rentAcc.id, debit: 240000, credit: 0, description: 'Office lease rent' },
          { accountId: bankAcc.id, debit: 0, credit: 240000, description: 'Bank transfer payment' },
        ],
      });

      expect(posted.id).toBeDefined();
      expect(posted.entryNumber).toMatch(/^JE-\d+/);
      expect(posted.totalDebit).toBe(240000);
      expect(posted.totalCredit).toBe(240000);
      expect(posted.status).toBe('POSTED');
    });

    it('GET /api/v1/finance/reports/:reportType: returns valid reports conforming to schema', async () => {
      const pnl = await financeRepository.getProfitLossReport();
      expect(pnl.grossProfit).toBe(pnl.totalRevenue - pnl.totalCogs);
      expect(pnl.netOperatingProfit).toBe(pnl.grossProfit - pnl.totalOperatingExpenses);

      const bs = await financeRepository.getBalanceSheetReport();
      expect(bs.isBalanced).toBe(true);
      expect(bs.totalAssets).toBe(bs.totalLiabilitiesAndEquity);

      const tb = await financeRepository.getTrialBalanceReport();
      expect(tb.isBalanced).toBe(true);
      expect(tb.totalDebit).toBe(tb.totalCredit);

      const vat = await financeRepository.getVatSummaryReport();
      expect(vat.vatCollected).toBeGreaterThanOrEqual(0);
    });
  });
});
