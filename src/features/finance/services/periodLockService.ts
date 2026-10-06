interface PeriodLockConfig {
  enabled: boolean;
  lockDate: string | null;
}

const STORAGE_KEY = 'dns_finance_period_lock';

class PeriodLockService {
  private config: PeriodLockConfig = {
    enabled: false,
    lockDate: null,
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.config = JSON.parse(stored);
        }
      }
    } catch (e) {
      // fallback to memory
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch (e) {
      // fallback to memory
    }
  }

  getConfig(): PeriodLockConfig {
    return { ...this.config };
  }

  setConfig(enabled: boolean, lockDate: string | null): PeriodLockConfig {
    this.config = {
      enabled,
      lockDate: enabled ? lockDate : null,
    };
    this.saveToStorage();
    return { ...this.config };
  }

  /**
   * Validates if a transaction date is allowed under the current period lock.
   * Hard error thrown/returned if transaction date <= lockDate when lock is enabled.
   */
  assertNotLocked(transactionDate: string): void {
    if (!this.config.enabled || !this.config.lockDate) {
      return;
    }

    const txDate = transactionDate.slice(0, 10);
    const lock = this.config.lockDate.slice(0, 10);

    if (txDate <= lock) {
      throw new Error('Transaction date is in a closed financial period.');
    }
  }

  isDateLocked(transactionDate: string): boolean {
    if (!this.config.enabled || !this.config.lockDate) {
      return false;
    }
    const txDate = transactionDate.slice(0, 10);
    const lock = this.config.lockDate.slice(0, 10);
    return txDate <= lock;
  }

  reset(): void {
    this.config = { enabled: false, lockDate: null };
    this.saveToStorage();
  }
}

export const periodLockService = new PeriodLockService();
