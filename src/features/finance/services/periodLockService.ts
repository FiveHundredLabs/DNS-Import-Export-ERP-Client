export interface PeriodLockConfig {
  enabled: boolean;
  lockDate: string | null; // Backwards-compatible alias to standardLockDate
  standardLockDate: string | null; // Blocks sales/warehouse/AP clerks at month-end / monthly closing
  adminLockDate: string | null; // Allows Finance Managers extra days to post adjusting entries before fully locking the period
  monthlyClosingDate?: string | null; // Monthly period closing date (e.g. '2026-10-31')
  financialYearLockEnabled?: boolean; // Whether financial year locking is active
  financialYearLockDate?: string | null; // Hard fiscal year cut-off date (e.g. '2025-12-31')
  lockedFiscalYears?: number[]; // Explicitly locked fiscal years e.g. [2024, 2025]
}

const STORAGE_KEY = 'dns_finance_period_lock';

const FINANCE_MANAGER_ROLES = new Set([
  'FINANCE_MANAGER',
  'DIRECTOR',
  'ADMIN',
  'MANAGER',
  'FINANCIAL_CONTROLLER',
  'AUDITOR',
]);

export class PeriodLockService {
  private config: PeriodLockConfig = {
    enabled: false,
    lockDate: null,
    standardLockDate: null,
    adminLockDate: null,
    monthlyClosingDate: null,
    financialYearLockEnabled: false,
    financialYearLockDate: null,
    lockedFiscalYears: [],
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.config = {
            enabled: !!parsed.enabled,
            lockDate: parsed.lockDate || parsed.standardLockDate || parsed.monthlyClosingDate || null,
            standardLockDate: parsed.standardLockDate || parsed.monthlyClosingDate || parsed.lockDate || null,
            adminLockDate: parsed.adminLockDate || parsed.lockDate || null,
            monthlyClosingDate: parsed.monthlyClosingDate || parsed.standardLockDate || parsed.lockDate || null,
            financialYearLockEnabled: !!parsed.financialYearLockEnabled,
            financialYearLockDate: parsed.financialYearLockDate || null,
            lockedFiscalYears: Array.isArray(parsed.lockedFiscalYears) ? parsed.lockedFiscalYears : [],
          };
        }
      }
    } catch {
      // fallback to memory
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch {
      // fallback to memory
    }
  }

  getConfig(): PeriodLockConfig {
    return { ...this.config };
  }

  /**
   * Sets the period lock configuration.
   * Supports standard month-end cut-off, finance manager administrative cut-off,
   * and optional financial year locks.
   */
  setConfig(
    enabled: boolean,
    standardLockDate: string | null,
    adminLockDate?: string | null,
    financialYearLockDate?: string | null,
    lockedFiscalYears?: number[]
  ): PeriodLockConfig {
    const std = enabled ? standardLockDate : null;
    const adm = enabled
      ? adminLockDate !== undefined
        ? adminLockDate
        : standardLockDate
      : null;

    this.config = {
      ...this.config,
      enabled,
      lockDate: std,
      standardLockDate: std,
      adminLockDate: adm,
      monthlyClosingDate: std,
      financialYearLockDate:
        financialYearLockDate !== undefined
          ? financialYearLockDate
          : this.config.financialYearLockDate,
      lockedFiscalYears:
        lockedFiscalYears !== undefined
          ? lockedFiscalYears
          : this.config.lockedFiscalYears || [],
    };
    this.saveToStorage();
    return { ...this.config };
  }

  /**
   * Dedicated dual lock configuration method.
   */
  setDualConfig(
    enabled: boolean,
    standardLockDate: string | null,
    adminLockDate: string | null
  ): PeriodLockConfig {
    return this.setConfig(enabled, standardLockDate, adminLockDate);
  }

  /**
   * Monthly period closing configuration helper.
   * Locks all past transactions on or before closingDate.
   */
  setMonthlyClosing(
    enabled: boolean,
    closingDate: string | null,
    adminCutOffDate?: string | null
  ): PeriodLockConfig {
    return this.setConfig(enabled, closingDate, adminCutOffDate);
  }

  /**
   * Configures Financial Year Locking.
   */
  setFinancialYearLock(
    enabled: boolean,
    lockDate?: string | null,
    lockedYears?: number[]
  ): PeriodLockConfig {
    this.config.financialYearLockEnabled = enabled;
    if (lockDate !== undefined) this.config.financialYearLockDate = lockDate;
    if (lockedYears !== undefined) this.config.lockedFiscalYears = lockedYears;
    this.saveToStorage();
    return { ...this.config };
  }

  /**
   * Locks an entire fiscal year (e.g. 2025).
   */
  lockFiscalYear(fiscalYear: number, fiscalYearEndDate?: string): PeriodLockConfig {
    const years = new Set(this.config.lockedFiscalYears || []);
    years.add(fiscalYear);
    this.config.financialYearLockEnabled = true;
    this.config.lockedFiscalYears = Array.from(years).sort();
    if (fiscalYearEndDate) {
      if (!this.config.financialYearLockDate || fiscalYearEndDate > this.config.financialYearLockDate) {
        this.config.financialYearLockDate = fiscalYearEndDate;
      }
    }
    this.saveToStorage();
    return { ...this.config };
  }

  /**
   * Unlocks an explicitly locked fiscal year.
   */
  unlockFiscalYear(fiscalYear: number): PeriodLockConfig {
    this.config.lockedFiscalYears = (this.config.lockedFiscalYears || []).filter((y) => y !== fiscalYear);
    if (this.config.lockedFiscalYears.length === 0) {
      this.config.financialYearLockEnabled = false;
    }
    this.saveToStorage();
    return { ...this.config };
  }

  /**
   * Checks if a fiscal year or transaction date is in a locked financial year.
   */
  isFiscalYearLocked(fiscalYearOrDate: number | string): boolean {
    if (typeof fiscalYearOrDate === 'number') {
      return (this.config.lockedFiscalYears || []).includes(fiscalYearOrDate);
    }
    const str = String(fiscalYearOrDate).slice(0, 10);
    const year = parseInt(str.slice(0, 4), 10);
    if ((this.config.lockedFiscalYears || []).includes(year)) {
      return true;
    }
    if (this.config.financialYearLockEnabled && this.config.financialYearLockDate) {
      return str <= this.config.financialYearLockDate.slice(0, 10);
    }
    return false;
  }

  isFinanceManagerRole(role?: string): boolean {
    if (!role) return false;
    return FINANCE_MANAGER_ROLES.has(role.toUpperCase());
  }

  /**
   * Checks if a date is locked without throwing.
   */
  isDateLocked(transactionDate: string, role?: string): boolean {
    try {
      this.assertNotLocked(transactionDate, role);
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Validates if a transaction date is allowed under the dual period lock and financial year lock.
   * - standardLockDate: blocks sales/warehouse/AP clerks at month-end.
   * - adminLockDate: allows Finance Managers extra days to post adjusting entries before fully locking the period.
   * - financialYearLock: locks entire closed financial years.
   * Throws Error if transaction is within a locked period for the given role.
   */
  assertNotLocked(transactionDate: string, role?: string): void {
    const txDate = transactionDate.slice(0, 10);
    const txYear = parseInt(txDate.slice(0, 4), 10);

    // 1. Check Fiscal Year Lock first
    if (this.config.financialYearLockEnabled) {
      if (this.config.lockedFiscalYears && this.config.lockedFiscalYears.includes(txYear)) {
        throw new Error(`Transaction date is in a locked financial year (FY ${txYear}). Editing, voiding, or posting is prohibited.`);
      }
      if (this.config.financialYearLockDate) {
        const fyCutoff = this.config.financialYearLockDate.slice(0, 10);
        if (txDate <= fyCutoff) {
          throw new Error('Transaction date is in a locked financial year. Modification and posting are prohibited.');
        }
      }
    } else if (this.config.lockedFiscalYears && this.config.lockedFiscalYears.includes(txYear)) {
      throw new Error(`Transaction date is in a locked financial year (FY ${txYear}). Editing, voiding, or posting is prohibited.`);
    }

    if (!this.config.enabled) {
      return;
    }

    const isManager = this.isFinanceManagerRole(role);

    if (isManager) {
      // Finance Manager: only blocked if transaction date <= adminLockDate (fully locked)
      if (this.config.adminLockDate) {
        const adminLock = this.config.adminLockDate.slice(0, 10);
        if (txDate <= adminLock) {
          throw new Error('Transaction date is in a closed financial period. (Admin lock enforced)');
        }
      }
    } else {
      // Standard clerk / operator / default:
      // Blocked if transaction date <= standardLockDate
      const stdLock = this.config.standardLockDate?.slice(0, 10) || this.config.lockDate?.slice(0, 10);
      if (stdLock && txDate <= stdLock) {
        throw new Error('Transaction date is in a closed financial period.');
      }
      // Also blocked if transaction date <= adminLockDate
      if (this.config.adminLockDate) {
        const adminLock = this.config.adminLockDate.slice(0, 10);
        if (txDate <= adminLock) {
          throw new Error('Transaction date is in a closed financial period.');
        }
      }
    }
  }

  /**
   * Asserts that a past transaction can be edited or voided.
   * Throws an error if the transaction date falls within a closed monthly period or locked fiscal year.
   */
  assertCanEditOrVoid(transactionDate: string, role?: string): void {
    const txDate = transactionDate.slice(0, 10);
    const txYear = parseInt(txDate.slice(0, 4), 10);

    if (this.isFiscalYearLocked(txYear) || this.isFiscalYearLocked(txDate)) {
      throw new Error(
        `Transaction date (${txDate}) belongs to a locked financial year. Past transactions cannot be edited or voided.`
      );
    }

    if (!this.config.enabled) {
      return;
    }

    const isManager = this.isFinanceManagerRole(role);
    const stdLock = this.config.standardLockDate?.slice(0, 10) || this.config.lockDate?.slice(0, 10);
    const adminLock = this.config.adminLockDate?.slice(0, 10);

    if (isManager) {
      if (adminLock && txDate <= adminLock) {
        throw new Error(
          `Transaction date (${txDate}) is in a closed financial period. Cannot edit or void past transactions on or before the closing date (${adminLock}).`
        );
      }
    } else {
      if (stdLock && txDate <= stdLock) {
        throw new Error(
          `Transaction date (${txDate}) is in a closed monthly period. Cannot edit or void past transactions on or before the closing date (${stdLock}).`
        );
      }
      if (adminLock && txDate <= adminLock) {
        throw new Error(
          `Transaction date (${txDate}) is in a closed financial period. Cannot edit or void past transactions on or before the closing date (${adminLock}).`
        );
      }
    }
  }

  /**
   * Returns whether a transaction date can be edited or voided.
   */
  canEditOrVoid(transactionDate: string, role?: string): { allowed: boolean; reason?: string } {
    try {
      this.assertCanEditOrVoid(transactionDate, role);
      return { allowed: true };
    } catch (err: unknown) {
      return {
        allowed: false,
        reason: err instanceof Error ? err.message : 'Cannot edit or void transaction in a closed period.',
      };
    }
  }

  reset(): void {
    this.config = {
      enabled: false,
      lockDate: null,
      standardLockDate: null,
      adminLockDate: null,
      monthlyClosingDate: null,
      financialYearLockEnabled: false,
      financialYearLockDate: null,
      lockedFiscalYears: [],
    };
    this.saveToStorage();
  }
}

export const periodLockService = new PeriodLockService();
