import { useState, useEffect, useCallback } from 'react';
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
} from '../api/types';
import { financeRepository } from '../api';
import { toast } from 'sonner';

export function useFinanceLedger() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await financeRepository.getAccounts();
      setAccounts(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch accounts';
      setError(msg);
      toast.error(msg);
      return [];
    }
  }, []);

  const fetchSuppliers = useCallback(async (query?: string) => {
    try {
      const data = await financeRepository.getSuppliers({ search: query });
      setSuppliers(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch suppliers';
      setError(msg);
      toast.error(msg);
      return [];
    }
  }, []);

  const fetchJournals = useCallback(async () => {
    try {
      const data = await financeRepository.getJournalEntries();
      setJournals(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch journals';
      setError(msg);
      toast.error(msg);
      return [];
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchAccounts(), fetchSuppliers(), fetchJournals()]);
    } finally {
      setLoading(false);
    }
  }, [fetchAccounts, fetchSuppliers, fetchJournals]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Account actions
  const createAccount = async (dto: CreateAccountDTO): Promise<Account> => {
    try {
      const created = await financeRepository.createAccount(dto);
      await fetchAccounts();
      toast.success(`Account ${created.code} - ${created.name} created successfully`);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account';
      toast.error(msg);
      throw err;
    }
  };

  const updateAccount = async (id: string, dto: Partial<CreateAccountDTO> & { isActive?: boolean }): Promise<Account> => {
    try {
      const updated = await financeRepository.updateAccount(id, dto);
      await fetchAccounts();
      toast.success(`Account ${updated.code} updated`);
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update account';
      toast.error(msg);
      throw err;
    }
  };

  const deleteAccount = async (id: string): Promise<void> => {
    try {
      await financeRepository.deleteAccount(id);
      await fetchAccounts();
      toast.success('Account deleted successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      toast.error(msg);
      throw err;
    }
  };

  // Supplier actions
  const createSupplier = async (dto: CreateSupplierDTO): Promise<Supplier> => {
    try {
      const created = await financeRepository.createSupplier(dto);
      await fetchSuppliers();
      toast.success(`Supplier ${created.name} registered`);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create supplier';
      toast.error(msg);
      throw err;
    }
  };

  const updateSupplier = async (id: string, dto: Partial<CreateSupplierDTO>): Promise<Supplier> => {
    try {
      const updated = await financeRepository.updateSupplier(id, dto);
      await fetchSuppliers();
      toast.success(`Supplier ${updated.name} updated`);
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update supplier';
      toast.error(msg);
      throw err;
    }
  };

  const deleteSupplier = async (id: string): Promise<void> => {
    try {
      await financeRepository.deleteSupplier(id);
      await fetchSuppliers();
      toast.success('Supplier removed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove supplier';
      toast.error(msg);
      throw err;
    }
  };

  // Journal entry actions
  const postJournalEntry = async (dto: CreateJournalEntryDTO): Promise<JournalEntry> => {
    try {
      const entry = await financeRepository.createJournalEntry(dto);
      await Promise.all([fetchJournals(), fetchAccounts()]);
      toast.success(`Journal entry ${entry.entryNumber} posted successfully!`);
      return entry;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post journal entry';
      toast.error(msg);
      throw err;
    }
  };

  const voidJournalEntry = async (id: string, reason?: string): Promise<JournalEntry> => {
    try {
      const entry = await financeRepository.voidJournalEntry(id, reason);
      await Promise.all([fetchJournals(), fetchAccounts()]);
      toast.success(`Journal entry ${entry.entryNumber} voided and reversed successfully.`);
      return entry;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to void journal entry';
      toast.error(msg);
      throw err;
    }
  };

  // Reports
  const getProfitLoss = async (dateRange?: DateRangeFilter): Promise<ProfitLossReport> => {
    return financeRepository.getProfitLossReport(dateRange);
  };

  const getBalanceSheet = async (asOfDate?: string): Promise<BalanceSheetReport> => {
    return financeRepository.getBalanceSheetReport(asOfDate);
  };

  const getTrialBalance = async (asOfDate?: string): Promise<TrialBalanceReport> => {
    return financeRepository.getTrialBalanceReport(asOfDate);
  };

  const getGeneralLedger = async (
    accountId: string,
    dateRange?: DateRangeFilter
  ): Promise<GeneralLedgerAccountReport> => {
    return financeRepository.getGeneralLedgerReport(accountId, dateRange);
  };

  const getVatSummary = async (dateRange?: DateRangeFilter): Promise<VatReport> => {
    return financeRepository.getVatSummaryReport(dateRange);
  };

  return {
    accounts,
    suppliers,
    journals,
    loading,
    error,
    refreshAll,
    fetchAccounts,
    fetchSuppliers,
    fetchJournals,
    createAccount,
    updateAccount,
    deleteAccount,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    postJournalEntry,
    voidJournalEntry,
    getProfitLoss,
    getBalanceSheet,
    getTrialBalance,
    getGeneralLedger,
    getVatSummary,
  };
}
