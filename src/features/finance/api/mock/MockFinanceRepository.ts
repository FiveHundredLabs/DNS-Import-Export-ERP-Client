import Decimal from 'decimal.js';
import {
  Account,
  Supplier,
  JournalEntry,
  CreateAccountDTO,
  CreateSupplierDTO,
  CreateJournalEntryDTO,
  ProfitLossReport,
  BalanceSheetReport,
  TrialBalanceReport,
  GeneralLedgerAccountReport,
  VatReport,
  DateRangeFilter,
  createJournalEntrySchema,
} from '../types';
import { IFinanceRepository } from '../finance.repository';
import { periodLockService } from '../../services/periodLockService';

// Helper to construct normalized 3-Tier accounts
function createAccountRecord(
  id: string,
  code: string,
  name: string,
  classification: Account['classification'],
  accountType: string,
  accountSubType: string,
  description: string,
  isSystem: boolean,
  currentBalance: number,
  parentId?: string
): Account {
  return {
    id,
    code,
    name,
    classification,
    accountClass: classification,
    accountType,
    accountSubClass: accountType as Account['accountSubClass'],
    accountSubType,
    description,
    isSystem,
    isActive: true,
    parentId,
    currentBalance,
    currency: 'LKR',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

// 11 Non-deletable default system accounts + core initial accounts
export const DEFAULT_SYSTEM_ACCOUNTS: Account[] = [
  // Current Assets
  createAccountRecord('acc-1010', '1010', 'Bank Account', 'ASSET', 'CURRENT_ASSET', 'Cash & Cash Equivalents', 'Primary corporate operating checking account', true, 2500000.0),
  createAccountRecord('acc-1018', '1018', 'Cheques in Hand', 'ASSET', 'CURRENT_ASSET', 'Cash & Cash Equivalents', 'Post-dated and un-cleared cheques in hand awaiting bank clearing', false, 0.0),
  createAccountRecord('acc-1020', '1020', 'Accounts Receivable', 'ASSET', 'CURRENT_ASSET', 'Trade Receivables (A/R Control)', 'Trade receivables from customers and dealers', true, 850000.0),
  createAccountRecord('acc-1025', '1025', 'Input VAT Receivable', 'ASSET', 'CURRENT_ASSET', 'Tax Assets', 'Input Value Added Tax paid on purchases claimable from Inland Revenue Department', false, 0.0),
  createAccountRecord('acc-1030', '1030', 'Inventory', 'ASSET', 'CURRENT_ASSET', 'Merchandise Inventory', 'Valuation of finished goods and stock in warehouses', true, 4200000.0),
  createAccountRecord('acc-1040', '1040', 'Cash in Hand', 'ASSET', 'CURRENT_ASSET', 'Petty Cash Float', 'Showroom petty cash and drawer float', false, 75000.0),
  createAccountRecord('acc-1050', '1050', 'Advance to Suppliers', 'ASSET', 'CURRENT_ASSET', 'Prepayments & Advances', 'Prepayments and advance deposits paid to suppliers prior to billing', false, 0.0),
  createAccountRecord('acc-1100', '1100', 'Merchandise Inventory Asset', 'ASSET', 'CURRENT_ASSET', 'Merchandise Inventory', 'Valuation of merchandise stock in warehouse and returned goods', false, 0.0),
  createAccountRecord('acc-1510', '1510', 'Office Equipment & Vehicles', 'ASSET', 'NON_CURRENT_ASSET', 'Fixed & Capital Assets', 'Fixed assets and capital equipment', false, 1200000.0),

  // Current Liabilities
  createAccountRecord('acc-2010', '2010', 'Accounts Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'Trade Payables (A/P Control)', 'Trade payables to suppliers and vendors', true, 1650000.0),
  createAccountRecord('acc-2020', '2020', 'VAT Payable (18%)', 'LIABILITY', 'CURRENT_LIABILITY', 'Statutory Tax Liabilities', 'Value Added Tax collected on sales payable to Inland Revenue Department', true, 320000.0),
  createAccountRecord('acc-2030', '2030', 'Commission Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'Accrued Operating Liabilities', 'Sales representative and dealer commissions accrued but unpaid', true, 185000.0),

  // Equity
  createAccountRecord('acc-3010', '3010', "Owner's Equity", 'EQUITY', 'EQUITY', 'Share Capital', 'Paid-in shareholder capital and initial owner investment', true, 5000000.0),
  createAccountRecord('acc-3020', '3020', 'Retained Earnings', 'EQUITY', 'EQUITY', 'Opening Balance Equity & Retained Earnings', 'Accumulated prior-year operating profits and reserves', true, 1120000.0),

  // Income
  createAccountRecord('acc-4010', '4010', 'Sales Revenue', 'INCOME', 'REVENUE', 'Operating Trade Revenue', 'Gross wholesale and retail sales revenue before tax', true, 3250000.0),

  // Expense
  createAccountRecord('acc-5010', '5010', 'Cost of Goods Sold (COGS)', 'EXPENSE', 'DIRECT_COST', 'Cost of Sales', 'Direct landed cost of goods sold during operational periods', true, 1950000.0),
  createAccountRecord('acc-6010', '6010', 'Commission Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'Sales & Distribution Expense', 'Commission payouts and incentive fees', true, 185000.0),
  createAccountRecord('acc-6020', '6020', 'Delivery Van Fuel & Maintenance', 'EXPENSE', 'OPERATING_EXPENSE', 'Transport & Logistics Overhead', 'Vehicle fueling, service, and transport logistics', false, 95000.0),
  createAccountRecord('acc-6030', '6030', 'Office Rent & Utilities', 'EXPENSE', 'OPERATING_EXPENSE', 'General & Administrative Overhead', 'Monthly head office lease, electricity, and water', false, 240000.0),
];

export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    code: 'SUP-001',
    name: 'DNS Global Logistics & Electronics Ltd',
    contactPerson: 'Kasun Jayasinghe',
    email: 'kasun.j@dnsglobal.lk',
    phone: '+94 11 234 5678',
    address: '104 Nawam Mawatha, Colombo 02',
    taxNumber: 'VAT-102938475',
    paymentTerms: 'Net 30',
    status: 'ACTIVE',
    balance: 850000.0,
    currency: 'LKR',
    historicalPrices: {
      'prod-001': 2200,
      'prod-002': 5800,
      'prod-003': 18000,
    },
    createdAt: '2026-01-15T08:30:00.000Z',
    updatedAt: '2026-01-15T08:30:00.000Z',
  },
  {
    id: 'sup-2',
    code: 'SUP-002',
    name: 'Apex International Importers',
    contactPerson: 'Shalini Perera',
    email: 'sperera@apextrade.com',
    phone: '+94 11 765 4321',
    address: '45 Galle Road, Mount Lavinia',
    taxNumber: 'VAT-998877665',
    paymentTerms: 'Net 15',
    status: 'ACTIVE',
    balance: 420000.0,
    currency: 'LKR',
    historicalPrices: {
      'prod-003': 18500,
      'prod-004': 14200,
    },
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'sup-3',
    code: 'SUP-003',
    name: 'Lanka Industrial Packaging Co.',
    contactPerson: 'Mahesh Bandara',
    email: 'mahesh@lankapack.lk',
    phone: '+94 33 221 4455',
    address: 'Export Processing Zone, Biyagama',
    taxNumber: 'VAT-445566778',
    paymentTerms: 'Cash on Delivery',
    status: 'ACTIVE',
    balance: 0.0,
    currency: 'LKR',
    historicalPrices: {
      'prod-001': 2150,
      'prod-002': 5700,
    },
    createdAt: '2026-02-15T11:20:00.000Z',
    updatedAt: '2026-02-15T11:20:00.000Z',
  },
  {
    id: 'sup-4',
    code: 'SUP-004',
    name: 'Ceylon Power & Cables PLC',
    contactPerson: 'Roshani Senanayake',
    email: 'roshani@ceylonpower.com',
    phone: '+94 11 443 2211',
    address: '12 Kandy Road, Kelaniya',
    taxNumber: 'VAT-332211004',
    paymentTerms: 'Net 30',
    status: 'ACTIVE',
    balance: 380000.0,
    currency: 'LKR',
    historicalPrices: {
      'prod-003': 18200,
      'prod-004': 14000,
    },
    createdAt: '2026-03-01T09:15:00.000Z',
    updatedAt: '2026-03-01T09:15:00.000Z',
  },
];

export const DEFAULT_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'je-1001',
    entryNumber: 'JE-1001',
    date: '2026-09-01',
    description: 'Initial balance sheet opening entries',
    reference: 'REF-INIT-2026',
    source: 'SYSTEM',
    status: 'POSTED',
    lines: [
      {
        id: 'jel-1',
        accountId: 'acc-1010',
        accountCode: '1010',
        accountName: 'Bank Account',
        debit: 2500000,
        credit: 0,
        description: 'Opening bank reserves',
      },
      {
        id: 'jel-2',
        accountId: 'acc-1030',
        accountCode: '1030',
        accountName: 'Inventory',
        debit: 3620000,
        credit: 0,
        description: 'Opening warehouse inventory valuation',
      },
      {
        id: 'jel-3',
        accountId: 'acc-3010',
        accountCode: '3010',
        accountName: "Owner's Equity",
        debit: 0,
        credit: 5000000,
        description: 'Owner paid-in capital',
      },
      {
        id: 'jel-4',
        accountId: 'acc-3020',
        accountCode: '3020',
        accountName: 'Retained Earnings',
        debit: 0,
        credit: 1120000,
        description: 'Brought forward retained earnings',
      },
    ],
    totalDebit: 6120000,
    totalCredit: 6120000,
    createdBy: 'Director (System Setup)',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'je-1002',
    entryNumber: 'JE-1002',
    date: '2026-09-10',
    description: 'Wholesale product delivery & sales invoice posting',
    reference: 'INV-2026-0042',
    source: 'SALES',
    status: 'POSTED',
    lines: [
      {
        id: 'jel-5',
        accountId: 'acc-1020',
        accountCode: '1020',
        accountName: 'Accounts Receivable',
        debit: 3835000,
        credit: 0,
        description: 'Receivable for Invoice INV-2026-0042 (inc. 18% VAT)',
      },
      {
        id: 'jel-6',
        accountId: 'acc-4010',
        accountCode: '4010',
        accountName: 'Sales Revenue',
        debit: 0,
        credit: 3250000,
        description: 'Net sales revenue',
      },
      {
        id: 'jel-7',
        accountId: 'acc-2020',
        accountCode: '2020',
        accountName: 'VAT Payable (18%)',
        debit: 0,
        credit: 585000,
        description: '18% VAT collected on taxable wholesale sales',
      },
    ],
    totalDebit: 3835000,
    totalCredit: 3835000,
    createdBy: 'System Auto-Posting',
    createdAt: '2026-09-10T14:30:00.000Z',
  },
  {
    id: 'je-1003',
    entryNumber: 'JE-1003',
    date: '2026-09-12',
    description: 'Cost of goods sold recognition for invoice INV-2026-0042',
    reference: 'GRN-REL-0042',
    source: 'GRN',
    status: 'POSTED',
    lines: [
      {
        id: 'jel-8',
        accountId: 'acc-5010',
        accountCode: '5010',
        accountName: 'Cost of Goods Sold (COGS)',
        debit: 1950000,
        credit: 0,
        description: 'COGS on delivered goods',
      },
      {
        id: 'jel-9',
        accountId: 'acc-1030',
        accountCode: '1030',
        accountName: 'Inventory',
        debit: 0,
        credit: 1950000,
        description: 'Inventory reduction from dispatch',
      },
    ],
    totalDebit: 1950000,
    totalCredit: 1950000,
    createdBy: 'System Auto-Posting',
    createdAt: '2026-09-12T15:00:00.000Z',
  },
  {
    id: 'je-1004',
    entryNumber: 'JE-1004',
    date: '2026-09-18',
    description: 'Customer payment collection and bank deposit',
    reference: 'PAY-REC-8841',
    source: 'PAYMENT',
    status: 'POSTED',
    lines: [
      {
        id: 'jel-10',
        accountId: 'acc-1010',
        accountCode: '1010',
        accountName: 'Bank Account',
        debit: 2985000,
        credit: 0,
        description: 'Direct bank transfer from customer',
      },
      {
        id: 'jel-11',
        accountId: 'acc-1020',
        accountCode: '1020',
        accountName: 'Accounts Receivable',
        debit: 0,
        credit: 2985000,
        description: 'Clear customer receivable',
      },
    ],
    totalDebit: 2985000,
    totalCredit: 2985000,
    createdBy: 'Finance Manager (Payment Desk)',
    createdAt: '2026-09-18T11:15:00.000Z',
  },
];

export class MockFinanceRepository implements IFinanceRepository {
  private accounts: Account[] = [];
  private suppliers: Supplier[] = [];
  private journals: JournalEntry[] = [];
  private nextJournalSeq = 1005;

  constructor() {
    this.init();
  }

  private init() {
    this.accounts = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_ACCOUNTS));
    this.suppliers = JSON.parse(JSON.stringify(DEFAULT_SUPPLIERS));
    this.journals = JSON.parse(JSON.stringify(DEFAULT_JOURNAL_ENTRIES));
    this.nextJournalSeq = 1005;
  }

  private async delay(ms = 60): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async resetToDefaults(): Promise<void> {
    this.init();
  }

  // ACCOUNTS
  async getAccounts(filter?: {
    accountClass?: string;
    subClass?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<Account[]> {
    await this.delay();
    return this.accounts.filter((acc) => {
      if (filter?.accountClass && acc.accountClass !== filter.accountClass) return false;
      if (filter?.subClass && acc.accountSubClass !== filter.subClass) return false;
      if (filter?.isActive !== undefined && acc.isActive !== filter.isActive) return false;
      if (filter?.search) {
        const query = filter.search.toLowerCase();
        const matches =
          acc.name.toLowerCase().includes(query) ||
          acc.code.toLowerCase().includes(query) ||
          (acc.description && acc.description.toLowerCase().includes(query));
        if (!matches) return false;
      }
      return true;
    });
  }

  async getAccountById(id: string): Promise<Account | null> {
    await this.delay();
    return this.accounts.find((a) => a.id === id) || null;
  }

  async createAccount(dto: CreateAccountDTO): Promise<Account> {
    await this.delay();
    const existing = this.accounts.find((a) => a.code === dto.code);
    if (existing) {
      throw new Error(`Account with code ${dto.code} already exists`);
    }

    if (dto.parentId) {
      const parent = this.accounts.find((a) => a.id === dto.parentId);
      if (!parent) {
        throw new Error(`Parent account with ID ${dto.parentId} does not exist`);
      }
    }

    const classification = dto.classification || dto.accountClass || 'EXPENSE';
    const accountSubClass = dto.accountSubClass || (dto.accountType as Account['accountSubClass']) || 'OPERATING_EXPENSE';
    const accountType = dto.accountType || accountSubClass;
    const accountSubType = dto.accountSubType || dto.name.trim();

    const newAccount: Account = {
      id: `acc-${Date.now()}`,
      code: dto.code.trim(),
      name: dto.name.trim(),
      classification,
      accountClass: classification,
      accountType,
      accountSubClass,
      accountSubType,
      description: dto.description?.trim(),
      isSystem: false,
      isActive: true,
      parentId: dto.parentId,
      currentBalance: 0.0,
      currency: 'LKR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.accounts.push(newAccount);
    return newAccount;
  }

  async updateAccount(id: string, dto: Partial<CreateAccountDTO> & { isActive?: boolean }): Promise<Account> {
    await this.delay();
    const index = this.accounts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error('Account not found');
    }

    const current = this.accounts[index];
    if (current.isSystem && dto.accountClass && dto.accountClass !== current.accountClass) {
      throw new Error('System account category cannot be reassigned');
    }
    if (current.isSystem && dto.accountSubClass && dto.accountSubClass !== current.accountSubClass) {
      throw new Error('System account sub-category cannot be reassigned');
    }
    if (current.isSystem && dto.isActive === false) {
      throw new Error('System accounts cannot be deactivated');
    }

    if (dto.parentId !== undefined && dto.parentId !== current.parentId) {
      if (dto.parentId === id) {
        throw new Error('An account cannot be set as its own parent');
      }
      if (dto.parentId) {
        const parent = this.accounts.find((a) => a.id === dto.parentId);
        if (!parent) {
          throw new Error(`Parent account with ID ${dto.parentId} does not exist`);
        }
        let currAncestor: Account | undefined = parent;
        while (currAncestor && currAncestor.parentId) {
          if (currAncestor.parentId === id) {
            throw new Error('Circular parent reference detected');
          }
          currAncestor = this.accounts.find((a) => a.id === currAncestor!.parentId);
        }
      }
    }

    const updated: Account = {
      ...current,
      name: dto.name?.trim() ?? current.name,
      accountSubType: dto.accountSubType?.trim() ?? current.accountSubType,
      description: dto.description !== undefined ? dto.description.trim() : current.description,
      parentId: dto.parentId !== undefined ? dto.parentId : current.parentId,
      isActive: dto.isActive !== undefined ? dto.isActive : current.isActive,
      updatedAt: new Date().toISOString(),
    };

    this.accounts[index] = updated;
    return updated;
  }

  async deleteAccount(id: string): Promise<void> {
    await this.delay();
    const account = this.accounts.find((a) => a.id === id);
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.isSystem) {
      throw new Error('Default system accounts are locked and cannot be deleted');
    }

    // Check if account has posted journal lines
    const hasTransactions = this.journals.some((j) =>
      j.lines.some((l) => l.accountId === id)
    );
    if (hasTransactions) {
      throw new Error('Cannot delete account with existing journal transactions. Deactivate it instead.');
    }

    this.accounts = this.accounts.filter((a) => a.id !== id);
  }

  // SUPPLIERS
  async getSuppliers(filter?: { search?: string; status?: 'ACTIVE' | 'INACTIVE' }): Promise<Supplier[]> {
    await this.delay();
    return this.suppliers.filter((sup) => {
      if (filter?.status && sup.status !== filter.status) return false;
      if (filter?.search) {
        const query = filter.search.toLowerCase();
        const matches =
          sup.name.toLowerCase().includes(query) ||
          sup.code.toLowerCase().includes(query) ||
          sup.contactPerson.toLowerCase().includes(query) ||
          sup.email.toLowerCase().includes(query) ||
          sup.phone.includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    await this.delay();
    return this.suppliers.find((s) => s.id === id) || null;
  }

  async createSupplier(dto: CreateSupplierDTO): Promise<Supplier> {
    await this.delay();
    const existing = this.suppliers.find((s) => s.code.toLowerCase() === dto.code.toLowerCase());
    if (existing) {
      throw new Error(`Supplier with code ${dto.code} already exists`);
    }

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      contactPerson: dto.contactPerson.trim(),
      email: dto.email.trim(),
      phone: dto.phone.trim(),
      address: dto.address?.trim(),
      taxNumber: dto.taxNumber?.trim(),
      paymentTerms: dto.paymentTerms.trim(),
      status: 'ACTIVE',
      balance: 0.0,
      currency: 'LKR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.suppliers.push(newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: string, dto: Partial<CreateSupplierDTO>): Promise<Supplier> {
    await this.delay();
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error('Supplier not found');
    }

    const current = this.suppliers[index];
    const updated: Supplier = {
      ...current,
      name: dto.name?.trim() ?? current.name,
      contactPerson: dto.contactPerson?.trim() ?? current.contactPerson,
      email: dto.email?.trim() ?? current.email,
      phone: dto.phone?.trim() ?? current.phone,
      address: dto.address !== undefined ? dto.address.trim() : current.address,
      taxNumber: dto.taxNumber !== undefined ? dto.taxNumber.trim() : current.taxNumber,
      paymentTerms: dto.paymentTerms?.trim() ?? current.paymentTerms,
      updatedAt: new Date().toISOString(),
    };

    this.suppliers[index] = updated;
    return updated;
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.delay();
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error('Supplier not found');
    }
    this.suppliers.splice(index, 1);
  }

  // JOURNAL ENTRIES
  async getJournalEntries(filter?: {
    startDate?: string;
    endDate?: string;
    source?: string;
    accountId?: string;
    search?: string;
  }): Promise<JournalEntry[]> {
    await this.delay();
    return this.journals
      .filter((je) => {
        if (filter?.startDate && je.date < filter.startDate) return false;
        if (filter?.endDate && je.date > filter.endDate) return false;
        if (filter?.source && je.source !== filter.source) return false;
        if (filter?.accountId && !je.lines.some((l) => l.accountId === filter.accountId)) return false;
        if (filter?.search) {
          const query = filter.search.toLowerCase();
          const matches =
            je.entryNumber.toLowerCase().includes(query) ||
            je.description.toLowerCase().includes(query) ||
            (je.reference && je.reference.toLowerCase().includes(query));
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getJournalEntryById(id: string): Promise<JournalEntry | null> {
    await this.delay();
    return this.journals.find((j) => j.id === id) || null;
  }

  async createJournalEntry(dto: CreateJournalEntryDTO): Promise<JournalEntry> {
    await this.delay();
    // Validate period lock
    periodLockService.assertNotLocked(dto.date);

    // Prevent duplicate Opening Balance Wizard posting
    if (dto.reference?.trim().toUpperCase() === 'SETUP-OB-INIT') {
      const existingOb = this.journals.find((j) => j.reference?.trim().toUpperCase() === 'SETUP-OB-INIT');
      if (existingOb) {
        throw new Error('Opening balance setup (SETUP-OB-INIT) has already been posted and is permanently locked against duplication.');
      }
    }

    // Validate schema & invariant
    createJournalEntrySchema.parse(dto);

    // Calculate debits and credits using Decimal
    let debSum = new Decimal(0);
    let credSum = new Decimal(0);
    for (const l of dto.lines) {
      debSum = debSum.plus(new Decimal(l.debit || 0));
      credSum = credSum.plus(new Decimal(l.credit || 0));
    }

    const diff = debSum.minus(credSum).abs();
    if (diff.greaterThan(0.001)) {
      throw new Error(`Double-Entry Invariant Violation: Debits (${debSum.toFixed(2)}) must equal Credits (${credSum.toFixed(2)})`);
    }

    const totalDebit = debSum.toNumber();
    const totalCredit = credSum.toNumber();

    // Validate Sub-Ledger Control Account tagging:
    // Block direct manual posting to 1020 A/R or 2010 A/P unless customer or supplier tagged
    for (const line of dto.lines) {
      const acc = this.accounts.find((a) => a.id === line.accountId);
      if (!acc) throw new Error(`Account ID ${line.accountId} not found`);

      const isManual = !dto.source || dto.source === 'MANUAL';
      const isObInit = dto.reference?.trim().toUpperCase() === 'SETUP-OB-INIT';
      if (acc.code === '1020' && isManual && !isObInit) {
        if (!line.customerId) {
          throw new Error('Direct posting to 1020 Accounts Receivable requires tagging a valid Customer ID on the ledger line.');
        }
      }

      if (acc.code === '2010' && isManual && !isObInit) {
        if (!line.supplierId) {
          throw new Error('Direct posting to 2010 Accounts Payable requires tagging a valid Supplier ID on the ledger line.');
        }
      }
    }

    const entryNumber = `JE-${this.nextJournalSeq++}`;
    const journalLines = dto.lines.map((l, index) => {
      const acc = this.accounts.find((a) => a.id === l.accountId)!;
      return {
        id: `jel-${Date.now()}-${index}`,
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        debit: Number(new Decimal(l.debit || 0).toFixed(2)),
        credit: Number(new Decimal(l.credit || 0).toFixed(2)),
        description: l.description?.trim(),
        customerId: l.customerId,
        customerName: l.customerName,
        supplierId: l.supplierId,
        supplierName: l.supplierName,
      };
    });

    const status = dto.status || 'POSTED';

    const newJournal: JournalEntry = {
      id: `je-${Date.now()}`,
      entryNumber,
      date: dto.date,
      description: dto.description.trim(),
      reference: dto.reference?.trim(),
      source: dto.source || 'MANUAL',
      status,
      lines: journalLines,
      totalDebit,
      totalCredit,
      createdBy: 'Finance Desk User',
      createdAt: new Date().toISOString(),
    };

    // Apply ledger mutations to accounts only if status is POSTED
    if (status === 'POSTED') {
      for (const line of journalLines) {
        const acc = this.accounts.find((a) => a.id === line.accountId);
        if (acc) {
          const lineDeb = new Decimal(line.debit);
          const lineCred = new Decimal(line.credit);
          let bal = new Decimal(acc.currentBalance);
          if (acc.accountClass === 'ASSET' || acc.accountClass === 'EXPENSE') {
            bal = bal.plus(lineDeb).minus(lineCred);
          } else {
            bal = bal.plus(lineCred).minus(lineDeb);
          }
          acc.currentBalance = bal.toNumber();
          acc.updatedAt = new Date().toISOString();
        }
      }
    }

    this.journals.unshift(newJournal);
    return newJournal;
  }

  async approveJournalEntry(id: string, approverName?: string): Promise<JournalEntry> {
    await this.delay();
    const journal = this.journals.find((j) => j.id === id);
    if (!journal) {
      throw new Error(`Journal entry ${id} not found`);
    }

    if (journal.status === 'POSTED') {
      throw new Error(`Journal entry ${journal.entryNumber} is already posted.`);
    }

    if (journal.status === 'VOIDED') {
      throw new Error(`Cannot approve a voided journal entry.`);
    }

    // Period closing control
    periodLockService.assertNotLocked(journal.date);

    // Verify double-entry invariant before approving
    let debSum = new Decimal(0);
    let credSum = new Decimal(0);
    for (const l of journal.lines) {
      debSum = debSum.plus(new Decimal(l.debit || 0));
      credSum = credSum.plus(new Decimal(l.credit || 0));
    }
    const diff = debSum.minus(credSum).abs();
    if (diff.greaterThan(0.001) || debSum.isZero()) {
      throw new Error(`Cannot approve unbalanced journal entry: Debits (${debSum.toFixed(2)}) must equal Credits (${credSum.toFixed(2)})`);
    }

    // Verify sub-ledger control tagging rules before approving
    for (const line of journal.lines) {
      const acc = this.accounts.find((a) => a.id === line.accountId);
      if (!acc) throw new Error(`Account ID ${line.accountId} not found`);

      const isManual = !journal.source || journal.source === 'MANUAL';
      const isObInit = journal.reference?.trim().toUpperCase() === 'SETUP-OB-INIT';
      if (acc.code === '1020' && isManual && !isObInit) {
        if (!line.customerId) {
          throw new Error('Direct posting to 1020 Accounts Receivable requires tagging a valid Customer ID on the ledger line.');
        }
      }

      if (acc.code === '2010' && isManual && !isObInit) {
        if (!line.supplierId) {
          throw new Error('Direct posting to 2010 Accounts Payable requires tagging a valid Supplier ID on the ledger line.');
        }
      }
    }

    // Apply ledger mutations
    for (const line of journal.lines) {
      const acc = this.accounts.find((a) => a.id === line.accountId);
      if (acc) {
        const lineDeb = new Decimal(line.debit);
        const lineCred = new Decimal(line.credit);
        let bal = new Decimal(acc.currentBalance);
        if (acc.accountClass === 'ASSET' || acc.accountClass === 'EXPENSE') {
          bal = bal.plus(lineDeb).minus(lineCred);
        } else {
          bal = bal.plus(lineCred).minus(lineDeb);
        }
        acc.currentBalance = bal.toNumber();
        acc.updatedAt = new Date().toISOString();
      }
    }

    journal.status = 'POSTED';
    journal.approvedBy = approverName || 'Finance Manager';
    journal.approvedAt = new Date().toISOString();
    return journal;
  }

  async voidJournalEntry(id: string, reason?: string): Promise<JournalEntry> {
    await this.delay();
    const journal = this.journals.find((j) => j.id === id);
    if (!journal) {
      throw new Error(`Journal entry ${id} not found`);
    }

    if (journal.status === 'VOIDED') {
      throw new Error(`Journal entry ${journal.entryNumber} is already voided.`);
    }

    // Permanently lock SETUP-OB-INIT against voiding or deletion
    if (journal.reference?.trim().toUpperCase() === 'SETUP-OB-INIT') {
      throw new Error('Opening balance initiation voucher (SETUP-OB-INIT) is permanently locked and cannot be voided or duplicated.');
    }

    // Period closing control: Hard error if transaction date is in closed period
    periodLockService.assertNotLocked(journal.date);

    // Revert account balances only if previously POSTED
    if (journal.status === 'POSTED' || journal.status === 'CLEARED') {
      for (const line of journal.lines) {
        const acc = this.accounts.find((a) => a.id === line.accountId);
        if (acc) {
          const lineDeb = new Decimal(line.debit);
          const lineCred = new Decimal(line.credit);
          let bal = new Decimal(acc.currentBalance);
          if (acc.accountClass === 'ASSET' || acc.accountClass === 'EXPENSE') {
            // Revert: subtract what was debited, add what was credited
            bal = bal.minus(lineDeb).plus(lineCred);
          } else {
            // Revert: subtract what was credited, add what was debited
            bal = bal.minus(lineCred).plus(lineDeb);
          }
          acc.currentBalance = bal.toNumber();
          acc.updatedAt = new Date().toISOString();
        }
      }
    }

    journal.status = 'VOIDED';
    journal.voidedAt = new Date().toISOString();
    journal.voidReason = reason || 'Voided/Reversed by authorized finance manager';
    return journal;
  }

  // REPORTS
  async getProfitLossReport(dateRange?: DateRangeFilter): Promise<ProfitLossReport> {
    await this.delay();
    const startDate = dateRange?.startDate || '2000-01-01';
    const endDate = dateRange?.endDate || '2099-12-31';

    // Calculate totals from journal entries in date range
    const relevantJournals = this.journals.filter((j) => j.date >= startDate && j.date <= endDate);

    const revenueMap = new Map<string, { accountId: string; accountName: string; code: string; amount: number }>();
    const cogsMap = new Map<string, { accountId: string; accountName: string; code: string; amount: number }>();
    const expenseMap = new Map<string, { accountId: string; accountName: string; code: string; amount: number }>();

    for (const acc of this.accounts) {
      if (acc.accountSubClass === 'REVENUE') {
        revenueMap.set(acc.id, { accountId: acc.id, accountName: acc.name, code: acc.code, amount: 0 });
      } else if (acc.accountSubClass === 'DIRECT_COST') {
        cogsMap.set(acc.id, { accountId: acc.id, accountName: acc.name, code: acc.code, amount: 0 });
      } else if (acc.accountSubClass === 'OPERATING_EXPENSE') {
        expenseMap.set(acc.id, { accountId: acc.id, accountName: acc.name, code: acc.code, amount: 0 });
      }
    }

    for (const j of relevantJournals) {
      for (const l of j.lines) {
        if (revenueMap.has(l.accountId)) {
          const item = revenueMap.get(l.accountId)!;
          item.amount = Number((item.amount + l.credit - l.debit).toFixed(2));
        } else if (cogsMap.has(l.accountId)) {
          const item = cogsMap.get(l.accountId)!;
          item.amount = Number((item.amount + l.debit - l.credit).toFixed(2));
        } else if (expenseMap.has(l.accountId)) {
          const item = expenseMap.get(l.accountId)!;
          item.amount = Number((item.amount + l.debit - l.credit).toFixed(2));
        }
      }
    }

    const revenueItems = Array.from(revenueMap.values());
    const cogsItems = Array.from(cogsMap.values());
    const expenseItems = Array.from(expenseMap.values());

    const totalRevenue = Number(revenueItems.reduce((s, i) => s + i.amount, 0).toFixed(2));
    const totalCogs = Number(cogsItems.reduce((s, i) => s + i.amount, 0).toFixed(2));
    const grossProfit = Number((totalRevenue - totalCogs).toFixed(2));
    const totalOperatingExpenses = Number(expenseItems.reduce((s, i) => s + i.amount, 0).toFixed(2));
    const netOperatingProfit = Number((grossProfit - totalOperatingExpenses).toFixed(2));

    return {
      dateRange: { start: startDate, end: endDate },
      revenueItems,
      totalRevenue,
      cogsItems,
      totalCogs,
      grossProfit,
      expenseItems,
      totalOperatingExpenses,
      netOperatingProfit,
    };
  }

  async getBalanceSheetReport(asOfDate?: string): Promise<BalanceSheetReport> {
    await this.delay();
    const dateLimit = asOfDate || new Date().toISOString().slice(0, 10);

    const currentAssets: { accountId: string; accountName: string; code: string; amount: number }[] = [];
    const nonCurrentAssets: { accountId: string; accountName: string; code: string; amount: number }[] = [];
    const currentLiabilities: { accountId: string; accountName: string; code: string; amount: number }[] = [];
    const longTermLiabilities: { accountId: string; accountName: string; code: string; amount: number }[] = [];
    const equityItems: { accountId: string; accountName: string; code: string; amount: number }[] = [];

    // Calculate cumulative balances up to asOfDate
    const accountBalances = new Map<string, number>();
    for (const j of this.journals) {
      if (j.date <= dateLimit) {
        for (const l of j.lines) {
          const current = accountBalances.get(l.accountId) || 0;
          const acc = this.accounts.find((a) => a.id === l.accountId);
          if (acc) {
            if (acc.accountClass === 'ASSET' || acc.accountClass === 'EXPENSE') {
              accountBalances.set(l.accountId, Number((current + l.debit - l.credit).toFixed(2)));
            } else {
              accountBalances.set(l.accountId, Number((current + l.credit - l.debit).toFixed(2)));
            }
          }
        }
      }
    }

    let periodRevenue = 0;
    let periodExpenses = 0;

    for (const acc of this.accounts) {
      const amount = accountBalances.get(acc.id) ?? 0;
      const item = { accountId: acc.id, accountName: acc.name, code: acc.code, amount };

      if (acc.accountSubClass === 'CURRENT_ASSET') currentAssets.push(item);
      else if (acc.accountSubClass === 'NON_CURRENT_ASSET') nonCurrentAssets.push(item);
      else if (acc.accountSubClass === 'CURRENT_LIABILITY') currentLiabilities.push(item);
      else if (acc.accountSubClass === 'NON_CURRENT_LIABILITY') longTermLiabilities.push(item);
      else if (acc.accountSubClass === 'EQUITY') equityItems.push(item);
      else if (acc.accountSubClass === 'REVENUE') periodRevenue += amount;
      else if (acc.accountSubClass === 'DIRECT_COST' || acc.accountSubClass === 'OPERATING_EXPENSE') periodExpenses += amount;
    }

    const currentPeriodNetIncome = Number((periodRevenue - periodExpenses).toFixed(2));
    if (currentPeriodNetIncome !== 0) {
      equityItems.push({
        accountId: 'acc-net-income',
        code: '3030',
        accountName: 'Current Period Net Operating Profit (P&L)',
        amount: currentPeriodNetIncome,
      });
    }

    const totalCurrentAssets = Number(currentAssets.reduce((s, i) => s + i.amount, 0).toFixed(2));
    const totalNonCurrentAssets = Number(nonCurrentAssets.reduce((s, i) => s + i.amount, 0).toFixed(2));
    const totalAssets = Number((totalCurrentAssets + totalNonCurrentAssets).toFixed(2));

    const totalCurrentLiabilities = Number(currentLiabilities.reduce((s, i) => s + i.amount, 0).toFixed(2));
    const totalLongTermLiabilities = Number(longTermLiabilities.reduce((s, i) => s + i.amount, 0).toFixed(2));
    const totalLiabilities = Number((totalCurrentLiabilities + totalLongTermLiabilities).toFixed(2));

    const totalEquity = Number(equityItems.reduce((s, i) => s + i.amount, 0).toFixed(2));
    const totalLiabilitiesAndEquity = Number((totalLiabilities + totalEquity).toFixed(2));

    const discrepancy = Number(Math.abs(totalAssets - totalLiabilitiesAndEquity).toFixed(2));
    const isBalanced = discrepancy === 0;

    return {
      asOfDate: dateLimit,
      currentAssets,
      totalCurrentAssets,
      nonCurrentAssets,
      totalNonCurrentAssets,
      totalAssets,
      currentLiabilities,
      totalCurrentLiabilities,
      longTermLiabilities,
      totalLongTermLiabilities,
      totalLiabilities,
      equityItems,
      retainedEarnings: equityItems.find((e) => e.code === '3020')?.amount || 0,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
      discrepancy,
    };
  }

  async getTrialBalanceReport(asOfDate?: string): Promise<TrialBalanceReport> {
    await this.delay();
    const dateLimit = asOfDate || new Date().toISOString().slice(0, 10);

    const debitSums = new Map<string, number>();
    const creditSums = new Map<string, number>();

    for (const j of this.journals) {
      if (j.date <= dateLimit) {
        for (const l of j.lines) {
          debitSums.set(l.accountId, (debitSums.get(l.accountId) || 0) + l.debit);
          creditSums.set(l.accountId, (creditSums.get(l.accountId) || 0) + l.credit);
        }
      }
    }

    const items = this.accounts.map((acc) => {
      const d = debitSums.get(acc.id) || 0;
      const c = creditSums.get(acc.id) || 0;
      const netDebit = d > c ? Number((d - c).toFixed(2)) : 0;
      const netCredit = c > d ? Number((c - d).toFixed(2)) : 0;

      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        accountClass: acc.accountClass,
        accountSubClass: acc.accountSubClass,
        debit: netDebit,
        credit: netCredit,
      };
    });

    const totalDebit = Number(items.reduce((s, i) => s + i.debit, 0).toFixed(2));
    const totalCredit = Number(items.reduce((s, i) => s + i.credit, 0).toFixed(2));
    const discrepancy = Number(Math.abs(totalDebit - totalCredit).toFixed(2));

    return {
      asOfDate: dateLimit,
      items,
      totalDebit,
      totalCredit,
      isBalanced: discrepancy === 0,
      discrepancy,
    };
  }

  async getGeneralLedgerReport(accountId: string, dateRange?: DateRangeFilter): Promise<GeneralLedgerAccountReport> {
    await this.delay();
    const account = this.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const startDate = dateRange?.startDate || '2000-01-01';
    const endDate = dateRange?.endDate || '2099-12-31';

    // Calculate opening balance prior to startDate
    let openingBalance = 0;
    const isAssetOrExpense = account.accountClass === 'ASSET' || account.accountClass === 'EXPENSE';

    const priorJournals = this.journals.filter((j) => j.date < startDate);
    for (const j of priorJournals) {
      for (const l of j.lines) {
        if (l.accountId === accountId) {
          if (isAssetOrExpense) {
            openingBalance += l.debit - l.credit;
          } else {
            openingBalance += l.credit - l.debit;
          }
        }
      }
    }

    // Transactions inside the date range
    const rangeJournals = this.journals
      .filter((j) => j.date >= startDate && j.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = openingBalance;
    let totalDebits = 0;
    let totalCredits = 0;

    const transactions = [];
    for (const j of rangeJournals) {
      for (const l of j.lines) {
        if (l.accountId === accountId) {
          totalDebits += l.debit;
          totalCredits += l.credit;
          if (isAssetOrExpense) {
            running = Number((running + l.debit - l.credit).toFixed(2));
          } else {
            running = Number((running + l.credit - l.debit).toFixed(2));
          }

          transactions.push({
            journalId: j.id,
            entryNumber: j.entryNumber,
            date: j.date,
            description: l.description || j.description,
            reference: j.reference,
            source: j.source,
            debit: l.debit,
            credit: l.credit,
            runningBalance: running,
          });
        }
      }
    }

    return {
      account,
      dateRange: { start: startDate, end: endDate },
      openingBalance: Number(openingBalance.toFixed(2)),
      transactions,
      closingBalance: running,
      totalDebits: Number(totalDebits.toFixed(2)),
      totalCredits: Number(totalCredits.toFixed(2)),
    };
  }

  async getVatSummaryReport(dateRange?: DateRangeFilter): Promise<VatReport> {
    await this.delay();
    const startDate = dateRange?.startDate || '2000-01-01';
    const endDate = dateRange?.endDate || '2099-12-31';

    const salesJournals = this.journals.filter(
      (j) => j.date >= startDate && j.date <= endDate && (j.source === 'SALES' || j.source === 'MANUAL')
    );

    const transactions = [];
    let vatCollected = 0;
    let taxableSales = 0;

    for (const j of salesJournals) {
      const vatLine = j.lines.find((l) => l.accountCode === '2020'); // VAT Payable (18%)
      const revLine = j.lines.find((l) => l.accountCode === '4010'); // Sales Revenue
      if (vatLine && vatLine.credit > 0) {
        const vAmount = vatLine.credit;
        const sAmount = revLine ? revLine.credit : Number((vAmount / 0.18).toFixed(2));
        vatCollected += vAmount;
        taxableSales += sAmount;

        transactions.push({
          date: j.date,
          invoiceNumber: j.reference || j.entryNumber,
          customerName: j.description,
          taxableAmount: sAmount,
          vatAmount: vAmount,
        });
      }
    }

    // Input VAT paid on purchases (Debited to 1025 Input VAT Receivable)
    let vatPaidOnPurchases = 0;
    const purchaseJournals = this.journals.filter(
      (j) => j.date >= startDate && j.date <= endDate && (j.source === 'GRN' || j.source === 'MANUAL' || j.source === 'SYSTEM')
    );
    for (const j of purchaseJournals) {
      const inputVatLine = j.lines.find((l) => l.accountCode === '1025');
      if (inputVatLine && inputVatLine.debit > 0) {
        vatPaidOnPurchases += inputVatLine.debit;
      }
    }

    const netVatPayable = vatCollected - vatPaidOnPurchases;

    return {
      dateRange: { start: startDate, end: endDate },
      taxableSales: Number(taxableSales.toFixed(2)),
      vatCollected: Number(vatCollected.toFixed(2)),
      vatPaidOnPurchases: Number(vatPaidOnPurchases.toFixed(2)),
      netVatPayable: Number(netVatPayable.toFixed(2)),
      transactions,
    };
  }
}

export const financeRepository = new MockFinanceRepository();
