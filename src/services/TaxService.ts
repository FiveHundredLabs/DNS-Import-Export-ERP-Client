import { GlobalTaxConfig, TaxCalculationResult } from '../types/tax';

export const DEFAULT_TAX_CONFIG: GlobalTaxConfig = {
  taxEnabled: true,
  taxRate: 18,
  taxName: 'VAT',
  description: 'Sri Lanka Statutory Standard Value-Added Tax (RAMIS IRD 18%)',
};

export const GLOBAL_TAX_CONFIG_STORAGE_KEY = 'dns_erp_global_tax_config';
export const TAX_CONFIG_CHANGE_EVENT = 'dns_erp_tax_config_changed';

type TaxListener = (config: GlobalTaxConfig) => void;

export class TaxService {
  private currentConfig: GlobalTaxConfig;
  private listeners: Set<TaxListener> = new Set();

  constructor() {
    this.currentConfig = this.loadSavedConfig();
    this.initSync();
  }

  /**
   * Loads persisted global tax config from localStorage or returns default.
   */
  private loadSavedConfig(): GlobalTaxConfig {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return { ...DEFAULT_TAX_CONFIG };
      }
      const raw = localStorage.getItem(GLOBAL_TAX_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          const taxEnabled = typeof parsed.taxEnabled === 'boolean' ? parsed.taxEnabled : DEFAULT_TAX_CONFIG.taxEnabled;
          const parsedRate = Number(parsed.taxRate);
          const taxRate = !isNaN(parsedRate) && parsedRate >= 0 && parsedRate <= 100 ? parsedRate : DEFAULT_TAX_CONFIG.taxRate;
          const taxName = typeof parsed.taxName === 'string' && parsed.taxName.trim() ? parsed.taxName.trim() : DEFAULT_TAX_CONFIG.taxName;

          return {
            taxEnabled,
            taxRate,
            taxName,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
            updatedBy: parsed.updatedBy,
            updatedByName: parsed.updatedByName,
            description: parsed.description || DEFAULT_TAX_CONFIG.description,
          };
        }
      }
    } catch (err) {
      console.warn('Failed to load global tax configuration from storage, falling back to defaults:', err);
    }
    return { ...DEFAULT_TAX_CONFIG };
  }

  private initSync(): void {
    if (typeof window === 'undefined') return;

    // Cross-tab and window storage synchronizer
    window.addEventListener('storage', (event) => {
      if (event.key === GLOBAL_TAX_CONFIG_STORAGE_KEY) {
        this.currentConfig = this.loadSavedConfig();
        this.notifyListeners();
      }
    });

    // In-process CustomEvent listener
    window.addEventListener(TAX_CONFIG_CHANGE_EVENT, () => {
      this.currentConfig = this.loadSavedConfig();
      this.notifyListeners();
    });
  }

  private notifyListeners(): void {
    const configSnapshot = { ...this.currentConfig };
    this.listeners.forEach((listener) => {
      try {
        listener(configSnapshot);
      } catch (err) {
        console.error('Error in tax configuration subscriber:', err);
      }
    });
  }

  /**
   * Retrieves the current active global tax configuration.
   */
  public getTaxConfig(): GlobalTaxConfig {
    return { ...this.currentConfig };
  }

  /**
   * Configures global tax settings. Only users with the DIRECTOR role are authorized.
   */
  public setTaxConfig(
    updates: Partial<GlobalTaxConfig>,
    actorRole?: string,
    actorName?: string
  ): { success: boolean; config?: GlobalTaxConfig; error?: string } {
    // 1. Role validation: DIRECTOR only
    if (actorRole && actorRole !== 'DIRECTOR') {
      return {
        success: false,
        error: 'Permission Denied: Only authenticated users with the DIRECTOR role can modify global tax settings.',
      };
    }

    // 2. Validate taxRate if provided
    let newRate = this.currentConfig.taxRate;
    if (updates.taxRate !== undefined) {
      const parsedRate = Number(updates.taxRate);
      if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
        return {
          success: false,
          error: 'Invalid Tax Percentage: Rate must be a valid number between 0% and 100%.',
        };
      }
      newRate = parsedRate;
    }

    const newEnabled = updates.taxEnabled !== undefined ? Boolean(updates.taxEnabled) : this.currentConfig.taxEnabled;
    const newName = updates.taxName !== undefined && updates.taxName.trim() ? updates.taxName.trim() : this.currentConfig.taxName;

    const updatedConfig: GlobalTaxConfig = {
      ...this.currentConfig,
      ...updates,
      taxEnabled: newEnabled,
      taxRate: newRate,
      taxName: newName,
      updatedAt: new Date().toISOString(),
      updatedBy: actorRole,
      updatedByName: actorName || 'Director Authority',
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(GLOBAL_TAX_CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig));
        window.dispatchEvent(new CustomEvent(TAX_CONFIG_CHANGE_EVENT, { detail: updatedConfig }));
      }
      this.currentConfig = updatedConfig;
      this.notifyListeners();

      return {
        success: true,
        config: { ...this.currentConfig },
      };
    } catch (err) {
      console.error('Failed to save global tax configuration:', err);
      return {
        success: false,
        error: 'Storage failure: Unable to persist global tax configuration.',
      };
    }
  }

  /**
   * Helper to calculate line-level tax for a given net line amount.
   * If overrideRate is explicitly passed, it uses that rate.
   * Otherwise, if tax is globally enabled, it uses current global taxRate; else 0.
   */
  public calculateLineTax(
    netAmount: number,
    overrideRate?: number
  ): { taxRate: number; taxAmount: number; lineTotal: number } {
    const effectiveRate =
      overrideRate !== undefined
        ? overrideRate
        : this.currentConfig.taxEnabled
        ? this.currentConfig.taxRate
        : 0;

    const roundedNet = Math.round(netAmount * 100) / 100;
    const taxAmount = effectiveRate > 0 ? Math.round(roundedNet * (effectiveRate / 100) * 100) / 100 : 0;
    const lineTotal = Math.round((roundedNet + taxAmount) * 100) / 100;

    return {
      taxRate: effectiveRate,
      taxAmount,
      lineTotal,
    };
  }

  /**
   * Helper to calculate aggregate document totals (subtotal, discount, tax, grand total).
   */
  public calculateDocumentTotals(
    subtotal: number,
    discountAmount: number = 0,
    overrideRate?: number
  ): TaxCalculationResult {
    const safeSubtotal = Math.max(0, Math.round(subtotal * 100) / 100);
    const safeDiscount = Math.max(0, Math.min(safeSubtotal, Math.round(discountAmount * 100) / 100));
    const netAmount = Math.round((safeSubtotal - safeDiscount) * 100) / 100;

    const effectiveRate =
      overrideRate !== undefined
        ? overrideRate
        : this.currentConfig.taxEnabled
        ? this.currentConfig.taxRate
        : 0;

    const isTaxActive = effectiveRate > 0;
    const taxAmount = isTaxActive ? Math.round(netAmount * (effectiveRate / 100) * 100) / 100 : 0;
    const grandTotal = Math.round((netAmount + taxAmount) * 100) / 100;

    return {
      subtotal: safeSubtotal,
      discountAmount: safeDiscount,
      netAmount,
      taxRate: effectiveRate,
      taxAmount,
      grandTotal,
      taxEnabled: this.currentConfig.taxEnabled,
    };
  }

  /**
   * Subscribe to global tax configuration changes.
   */
  public subscribe(listener: TaxListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Resets tax configuration to statutory defaults (18% enabled).
   */
  public resetToDefaults(actorRole?: string): void {
    if (actorRole && actorRole !== 'DIRECTOR') {
      throw new Error('Only DIRECTOR can reset tax configuration.');
    }
    this.currentConfig = { ...DEFAULT_TAX_CONFIG };
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(GLOBAL_TAX_CONFIG_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(TAX_CONFIG_CHANGE_EVENT, { detail: this.currentConfig }));
    }
    this.notifyListeners();
  }
}

export const taxService = new TaxService();
