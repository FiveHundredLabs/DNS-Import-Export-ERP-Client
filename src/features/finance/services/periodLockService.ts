export interface PeriodLockConfig {
  enabled: boolean;
  lockDate: string | null; // Backwards-compatible alias to standardLockDate
  standardLockDate: string | null; // Blocks sales/warehouse/AP clerks at month-end
  adminLockDate: string | null; // Allows Finance Managers extra days to post adjusting entries before fully locking the period
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
            lockDate: parsed.lockDate || parsed.standardLockDate || null,
            standardLockDate: parsed.standardLockDate || parsed.lockDate || null,
            adminLockDate: parsed.adminLockDate || parsed.lockDate || null,
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
   * Supports standard month-end cut-off and finance manager administrative cut-off.
   */
  setConfig(
    enabled: boolean,
    standardLockDate: string | null,
    adminLockDate?: string | null
  ): PeriodLockConfig {
    const std = enabled ? standardLockDate : null;
    const adm = enabled
      ? adminLockDate !== undefined
        ? adminLockDate
        : standardLockDate
      : null;

    this.config = {
      enabled,
      lockDate: std,
      standardLockDate: std,
      adminLockDate: adm,
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

  isFinanceManagerRole(role?: string): boolean {
    if (!role) return false;
    return FINANCE_MANAGER_ROLES.has(role.toUpperCase());
  }

  /**
   * Validates if a transaction date is allowed under the dual period lock.
   * - standardLockDate: blocks sales/warehouse/AP clerks at month-end.
   * - adminLockDate: allows Finance Managers extra days to post adjusting entries before fully locking the period.
   * Throws Error if transaction is within a locked period for the given role.
   */
  assertNotLocked(transactionDate: string, role?: string): void {
    if (!this.config.enabled) {
      return;
    }

    const txDate = transactionDate.slice(0, 10);
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

  isDateLocked(transactionDate: string, role?: string): boolean {
    try {
      this.assertNotLocked(transactionDate, role);
      return false;
    } catch {
      return true;
    }
  }

  reset(): void {
    this.config = {
      enabled: false,
      lockDate: null,
      standardLockDate: null,
      adminLockDate: null,
    };
    this.saveToStorage();
  }
}

export const periodLockService = new PeriodLockService();
