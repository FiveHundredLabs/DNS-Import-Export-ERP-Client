import { describe, it, expect, beforeEach } from 'vitest';
import { financeRepository } from '../features/finance/api';

describe('Phase F-0: Finance Domain Model, Mock Store & Invariants', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  describe('11 Non-Deletable Default System Accounts', () => {
    it('should initialize with all 11 default system accounts present and marked as locked', async () => {
      const accounts = await financeRepository.getAccounts();
      const systemAccounts = accounts.filter((a) => a.isSystem);

      expect(systemAccounts.length).toBe(11);

      const codes = systemAccounts.map((a) => a.code);
      // Current Assets
      expect(codes).toContain('1010'); // Bank Account
      expect(codes).toContain('1020'); // Accounts Receivable
      expect(codes).toContain('1030'); // Inventory

      // Current Liabilities
      expect(codes).toContain('2010'); // Accounts Payable
      expect(codes).toContain('2020'); // VAT Payable (18%)
      expect(codes).toContain('2030'); // Commission Payable

      // Equity
      expect(codes).toContain('3010'); // Owner's Equity
      expect(codes).toContain('3020'); // Retained Earnings

      // Income
      expect(codes).toContain('4010'); // Sales Revenue

      // Expense
      expect(codes).toContain('5010'); // Cost of Goods Sold (COGS)
      expect(codes).toContain('6010'); // Commission Expense
    });

    it('should reject deletion for any of the 11 locked system accounts', async () => {
      const accounts = await financeRepository.getAccounts();
      const bankAccount = accounts.find((a) => a.code === '1010');
      expect(bankAccount).toBeDefined();

      await expect(financeRepository.deleteAccount(bankAccount!.id)).rejects.toThrow(
        'Default system accounts are locked and cannot be deleted'
      );
    });

    it('should reject category reassignment on locked system accounts', async () => {
      const accounts = await financeRepository.getAccounts();
      const salesAccount = accounts.find((a) => a.code === '4010');
      expect(salesAccount).toBeDefined();

      await expect(
        financeRepository.updateAccount(salesAccount!.id, {
          accountClass: 'EXPENSE',
        })
      ).rejects.toThrow('System account category cannot be reassigned');
    });
  });

  describe('Custom Accounts Lifecycle', () => {
    it('should allow creating a custom sub-account', async () => {
      const created = await financeRepository.createAccount({
        code: '6040',
        name: 'Office Stationery',
        accountClass: 'EXPENSE',
        accountSubClass: 'OPERATING_EXPENSE',
        description: 'Office paper, toner and stationery',
      });

      expect(created.id).toBeDefined();
      expect(created.isSystem).toBe(false);
      expect(created.code).toBe('6040');

      const found = await financeRepository.getAccountById(created.id);
      expect(found?.name).toBe('Office Stationery');
    });

    it('should prevent creating duplicate account codes', async () => {
      await expect(
        financeRepository.createAccount({
          code: '1010', // Already exists
          name: 'Second Bank Account',
          accountClass: 'ASSET',
          accountSubClass: 'CURRENT_ASSET',
        })
      ).rejects.toThrow('Account with code 1010 already exists');
    });

    it('should allow deleting an unreferenced custom account', async () => {
      const created = await financeRepository.createAccount({
        code: '6099',
        name: 'Temporary Expense Test',
        accountClass: 'EXPENSE',
        accountSubClass: 'OPERATING_EXPENSE',
      });

      await financeRepository.deleteAccount(created.id);
      const found = await financeRepository.getAccountById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('The Double-Entry Invariant (Σ Debits = Σ Credits)', () => {
    it('should reject unbalanced journal entries', async () => {
      const accounts = await financeRepository.getAccounts();
      const bankAcc = accounts.find((a) => a.code === '1010')!;
      const expenseAcc = accounts.find((a) => a.code === '6020')!;

      await expect(
        financeRepository.createJournalEntry({
          date: '2026-09-25',
          description: 'Fuel payment test',
          lines: [
            { accountId: expenseAcc.id, debit: 15000, credit: 0 },
            { accountId: bankAcc.id, debit: 0, credit: 10000 }, // Imbalance of 5000
          ],
        })
      ).rejects.toThrow();
    });

    it('should post balanced journal entries and correctly update account balances', async () => {
      const accountsBefore = await financeRepository.getAccounts();
      const bankBefore = accountsBefore.find((a) => a.code === '1010')!.currentBalance;
      const fuelBefore = accountsBefore.find((a) => a.code === '6020')!.currentBalance;

      const bankAcc = accountsBefore.find((a) => a.code === '1010')!;
      const fuelAcc = accountsBefore.find((a) => a.code === '6020')!;

      const posted = await financeRepository.createJournalEntry({
        date: '2026-09-25',
        description: 'Van diesel refill',
        reference: 'RCPT-9988',
        lines: [
          { accountId: fuelAcc.id, debit: 15000, credit: 0, description: 'Fuel expense' },
          { accountId: bankAcc.id, debit: 0, credit: 15000, description: 'Paid via debit card' },
        ],
      });

      expect(posted.entryNumber).toMatch(/^JE-\d+/);
      expect(posted.totalDebit).toBe(15000);
      expect(posted.totalCredit).toBe(15000);

      const accountsAfter = await financeRepository.getAccounts();
      const bankAfter = accountsAfter.find((a) => a.code === '1010')!.currentBalance;
      const fuelAfter = accountsAfter.find((a) => a.code === '6020')!.currentBalance;

      expect(bankAfter).toBe(bankBefore - 15000);
      expect(fuelAfter).toBe(fuelBefore + 15000);
    });
  });

  describe('Suppliers Management', () => {
    it('should list pre-seeded suppliers and allow creating a new supplier', async () => {
      const initialSuppliers = await financeRepository.getSuppliers();
      expect(initialSuppliers.length).toBeGreaterThanOrEqual(4);

      const newSup = await financeRepository.createSupplier({
        code: 'SUP-005',
        name: 'Global Tech Components Ltd',
        contactPerson: 'Arjuna Weerasinghe',
        email: 'arjuna@globaltech.lk',
        phone: '+94 11 998 8776',
        taxNumber: 'VAT-554433221',
        paymentTerms: 'Net 30',
      });

      expect(newSup.id).toBeDefined();
      expect(newSup.code).toBe('SUP-005');

      const found = await financeRepository.getSupplierById(newSup.id);
      expect(found?.name).toBe('Global Tech Components Ltd');
    });
  });
});
