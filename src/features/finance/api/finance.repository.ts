import {
  Account,
  AccountClass,
  AccountSubClass,
  CreateAccountDTO,
  Supplier,
  CreateSupplierDTO,
  JournalEntry,
  CreateJournalEntryDTO,
  JournalSource,
  DateRangeFilter,
  ProfitLossReport,
  BalanceSheetReport,
  TrialBalanceReport,
  GeneralLedgerAccountReport,
  VatReport,
} from './types';

export interface IFinanceRepository {
  // Accounts
  getAccounts(filter?: {
    accountClass?: AccountClass;
    subClass?: AccountSubClass;
    isActive?: boolean;
    search?: string;
  }): Promise<Account[]>;
  getAccountById(id: string): Promise<Account | null>;
  createAccount(dto: CreateAccountDTO): Promise<Account>;
  updateAccount(id: string, dto: Partial<CreateAccountDTO>): Promise<Account>;
  deleteAccount(id: string): Promise<void>;

  // Suppliers
  getSuppliers(filter?: { search?: string; status?: 'ACTIVE' | 'INACTIVE' }): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | null>;
  createSupplier(dto: CreateSupplierDTO): Promise<Supplier>;
  updateSupplier(id: string, dto: Partial<CreateSupplierDTO>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;

  // Journal Entries
  getJournalEntries(filter?: {
    startDate?: string;
    endDate?: string;
    source?: JournalSource;
    accountId?: string;
    search?: string;
  }): Promise<JournalEntry[]>;
  getJournalEntryById(id: string): Promise<JournalEntry | null>;
  createJournalEntry(dto: CreateJournalEntryDTO): Promise<JournalEntry>;

  // Reports
  getProfitLossReport(dateRange?: DateRangeFilter): Promise<ProfitLossReport>;
  getBalanceSheetReport(asOfDate?: string): Promise<BalanceSheetReport>;
  getTrialBalanceReport(asOfDate?: string): Promise<TrialBalanceReport>;
  getGeneralLedgerReport(accountId: string, dateRange?: DateRangeFilter): Promise<GeneralLedgerAccountReport>;
  getVatSummaryReport(dateRange?: DateRangeFilter): Promise<VatReport>;

  // Helpers / Reset for testing
  resetToDefaults(): Promise<void>;
}
