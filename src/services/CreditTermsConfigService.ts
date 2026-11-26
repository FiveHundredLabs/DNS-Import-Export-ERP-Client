import { CustomerCreditTermsConfig, DEFAULT_CREDIT_TERMS_CONFIG } from '../types/creditTerms';
import { User } from '../types/auth';
import { creditTermsApi } from '../api/credit-terms/credit-terms.api';

const STORAGE_KEY = 'dns_customer_credit_terms_config';

class CreditTermsConfigService {
  private config: CustomerCreditTermsConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  public async fetchFromBackend(): Promise<CustomerCreditTermsConfig> {
    try {
      const backendConfig = await creditTermsApi.getConfig();
      if (backendConfig) {
        this.config = {
          ...this.config,
          defaultCreditDays: backendConfig.defaultCreditDays ?? this.config.defaultCreditDays,
          defaultCreditLimit: backendConfig.defaultCreditLimit ?? this.config.defaultCreditLimit,
          updatedAt: backendConfig.updatedAt || this.config.updatedAt,
          updatedBy: backendConfig.updatedBy?.fullName || this.config.updatedBy,
        };
        this.persistConfig();
      }
    } catch {
      // Backend not yet reachable or user not logged in
    }
    return { ...this.config };
  }

  private loadConfig(): CustomerCreditTermsConfig {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...DEFAULT_CREDIT_TERMS_CONFIG,
            ...parsed,
          };
        }
      } catch (err) {
        console.warn('Failed to load credit terms configuration from localStorage:', err);
      }
    }
    return { ...DEFAULT_CREDIT_TERMS_CONFIG };
  }

  private persistConfig(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch (err) {
        console.warn('Failed to persist credit terms configuration to localStorage:', err);
      }
    }
  }

  public getCreditTermsConfig(): CustomerCreditTermsConfig {
    return { ...this.config };
  }

  public async updateCreditTermsConfigAsync(
    updates: Partial<CustomerCreditTermsConfig>,
    user?: User | null
  ): Promise<CustomerCreditTermsConfig> {
    // 1. Persist to real backend
    try {
      await creditTermsApi.updateConfig({
        defaultCreditDays: updates.defaultCreditDays,
        defaultCreditLimit: updates.defaultCreditLimit,
      });
    } catch (err) {
      console.warn('Backend update failed, persisting locally:', err);
    }

    // 2. Update local state
    return this.updateCreditTermsConfig(updates, user);
  }

  public updateCreditTermsConfig(
    updates: Partial<CustomerCreditTermsConfig>,
    user?: User | null
  ): CustomerCreditTermsConfig {
    this.config = {
      ...this.config,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || 'Administrator',
      updatedByRole: user?.role || 'DIRECTOR',
    };
    this.persistConfig();
    return { ...this.config };
  }

  public resetToDefaults(user?: User | null): CustomerCreditTermsConfig {
    this.config = {
      ...DEFAULT_CREDIT_TERMS_CONFIG,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || 'Administrator',
      updatedByRole: user?.role || 'DIRECTOR',
    };
    this.persistConfig();
    return { ...this.config };
  }
}

export const creditTermsConfigService = new CreditTermsConfigService();
