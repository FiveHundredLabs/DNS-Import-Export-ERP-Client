import { z } from 'zod';

export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export type AccountSubClass =
  | 'CURRENT_ASSET'
  | 'NON_CURRENT_ASSET'
  | 'CURRENT_LIABILITY'
  | 'NON_CURRENT_LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'DIRECT_COST'
  | 'OPERATING_EXPENSE';

export interface Account {
  id: string;
  code: string;
  name: string;
  classification: AccountClass; // Tier 1: Classification
  accountClass: AccountClass; // Backwards-compatible alias
  accountType: string; // Tier 2: Account Type (e.g. Current Asset, Operating Expense)
  accountSubClass: AccountSubClass; // Backwards-compatible alias
  accountSubType: string; // Tier 3: Sub-Type (e.g. Bank & Cash, Accounts Receivable)
  description?: string;
  isSystem: boolean; // 11 non-deletable default system accounts
  isActive: boolean;
  parentId?: string; // For hierarchical accounts / custom sub-accounts
  currentBalance: number; // Balance in cents or Decimal
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  taxNumber?: string;
  paymentTerms: string; // e.g., 'Net 30', 'Net 15', 'Immediate', 'Cash on Delivery'
  status: 'ACTIVE' | 'INACTIVE';
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  customerId?: string; // Sub-ledger tagging for 1020 A/R
  customerName?: string;
  supplierId?: string; // Sub-ledger tagging for 2010 A/P
  supplierName?: string;
}

export type JournalSource = 'MANUAL' | 'PAYMENT' | 'GRN' | 'SALES' | 'COMMISSION' | 'SYSTEM';

export type JournalEntryStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'POSTED' | 'VOIDED' | 'CLEARED';

export interface JournalEntry {
  id: string;
  entryNumber: string; // e.g. 'JE-1001'
  date: string;
  description: string;
  reference?: string;
  source: JournalSource;
  status: JournalEntryStatus;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
}

export interface CreateAccountDTO {
  code: string;
  name: string;
  classification?: AccountClass;
  accountClass?: AccountClass;
  accountType?: string;
  accountSubClass?: AccountSubClass;
  accountSubType?: string;
  description?: string;
  parentId?: string;
}

export interface CreateSupplierDTO {
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  taxNumber?: string;
  paymentTerms: string;
}

export interface CreateJournalLineDTO {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface CreateJournalEntryDTO {
  date: string;
  description: string;
  reference?: string;
  source?: JournalSource;
  status?: JournalEntryStatus;
  lines: CreateJournalLineDTO[];
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  preset?: 'TODAY' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';
}

export interface ProfitLossReport {
  dateRange: { start: string; end: string };
  revenueItems: { accountId: string; accountName: string; code: string; amount: number }[];
  totalRevenue: number;
  cogsItems: { accountId: string; accountName: string; code: string; amount: number }[];
  totalCogs: number;
  grossProfit: number;
  expenseItems: { accountId: string; accountName: string; code: string; amount: number }[];
  totalOperatingExpenses: number;
  netOperatingProfit: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  currentAssets: { accountId: string; accountName: string; code: string; amount: number }[];
  totalCurrentAssets: number;
  nonCurrentAssets: { accountId: string; accountName: string; code: string; amount: number }[];
  totalNonCurrentAssets: number;
  totalAssets: number;

  currentLiabilities: { accountId: string; accountName: string; code: string; amount: number }[];
  totalCurrentLiabilities: number;
  longTermLiabilities: { accountId: string; accountName: string; code: string; amount: number }[];
  totalLongTermLiabilities: number;
  totalLiabilities: number;

  equityItems: { accountId: string; accountName: string; code: string; amount: number }[];
  retainedEarnings: number;
  totalEquity: number;

  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  discrepancy: number;
}

export interface TrialBalanceItem {
  accountId: string;
  code: string;
  name: string;
  accountClass: AccountClass;
  accountSubClass: AccountSubClass;
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  discrepancy: number;
}

export interface GeneralLedgerTransaction {
  journalId: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  source: JournalSource;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedgerAccountReport {
  account: Account;
  dateRange: { start: string; end: string };
  openingBalance: number;
  transactions: GeneralLedgerTransaction[];
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
}

export interface VatReport {
  dateRange: { start: string; end: string };
  taxableSales: number;
  vatCollected: number; // 18%
  vatPaidOnPurchases: number;
  netVatPayable: number;
  transactions: {
    date: string;
    invoiceNumber: string;
    customerName: string;
    taxableAmount: number;
    vatAmount: number;
  }[];
}

// Zod Validation Schemas
export const createAccountSchema = z.object({
  code: z.string().min(2, 'Account code must be at least 2 characters'),
  name: z.string().min(2, 'Account name must be at least 2 characters'),
  accountClass: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']).optional(),
  classification: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']).optional(),
  accountSubClass: z.enum([
    'CURRENT_ASSET',
    'NON_CURRENT_ASSET',
    'CURRENT_LIABILITY',
    'NON_CURRENT_LIABILITY',
    'EQUITY',
    'REVENUE',
    'DIRECT_COST',
    'OPERATING_EXPENSE',
  ]).optional(),
  accountType: z.string().optional(),
  accountSubType: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  currency: z.string().optional(),
  openingBalance: z.number().optional(),
});

export const createSupplierSchema = z.object({
  code: z.string().min(2, 'Supplier code must be at least 2 characters'),
  name: z.string().min(2, 'Supplier name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Valid phone number is required'),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  paymentTerms: z.string().min(1, 'Payment terms are required'),
});

export const journalLineSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  debit: z.number().min(0, 'Debit must be non-negative'),
  credit: z.number().min(0, 'Credit must be non-negative'),
  description: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
}).refine((line) => (line.debit > 0 && line.credit === 0) || (line.credit > 0 && line.debit === 0), {
  message: 'Each line must have either a debit or a credit amount, but not both or zero',
});

export const createJournalEntrySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  reference: z.string().optional(),
  source: z.enum(['MANUAL', 'PAYMENT', 'GRN', 'SALES', 'COMMISSION', 'SYSTEM']).default('MANUAL'),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'POSTED', 'VOIDED', 'CLEARED']).optional(),
  lines: z.array(journalLineSchema).min(2, 'A journal entry must contain at least 2 lines'),
}).refine((data) => {
  const totalDebit = Math.round(data.lines.reduce((sum, l) => sum + (l.debit || 0), 0) * 100);
  const totalCredit = Math.round(data.lines.reduce((sum, l) => sum + (l.credit || 0), 0) * 100);
  return totalDebit === totalCredit && totalDebit > 0;
}, {
  message: 'The Double-Entry Invariant violated: Total debits must equal total credits to the cent',
});
