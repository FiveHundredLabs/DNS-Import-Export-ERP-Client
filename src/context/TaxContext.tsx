import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { taxService, DEFAULT_TAX_CONFIG } from '../services/TaxService';
import { GlobalTaxConfig, TaxCalculationResult } from '../types/tax';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/AuthService';

interface TaxContextValue {
  taxConfig: GlobalTaxConfig;
  taxEnabled: boolean;
  taxRate: number;
  taxName: string;
  setTaxConfig: (updates: Partial<GlobalTaxConfig>) => { success: boolean; config?: GlobalTaxConfig; error?: string };
  canConfigureTax: boolean;
  calculateTotals: (subtotal: number, discountAmount?: number, overrideRate?: number) => TaxCalculationResult;
  calculateLineTax: (netAmount: number, overrideRate?: number) => { taxRate: number; taxAmount: number; lineTotal: number };
  resetDefaults: () => void;
}

const TaxContext = createContext<TaxContextValue | undefined>(undefined);

export function TaxProvider({ children }: { children: React.ReactNode }) {
  const [taxConfig, setTaxConfigState] = useState<GlobalTaxConfig>(() => taxService.getTaxConfig());
  const { currentUser, role } = useAuth();

  useEffect(() => {
    // Sync initially
    setTaxConfigState(taxService.getTaxConfig());

    // Listen to changes from singleton service
    const unsubscribe = taxService.subscribe((updated) => {
      setTaxConfigState(updated);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const effectiveRole = role || currentUser?.role || authService.getCurrentUser()?.role;
  const canConfigureTax = effectiveRole === 'DIRECTOR';

  const setTaxConfig = useCallback(
    (updates: Partial<GlobalTaxConfig>) => {
      const activeRole = role || currentUser?.role || authService.getCurrentUser()?.role;
      const activeName = currentUser?.name || authService.getCurrentUser()?.name;
      const result = taxService.setTaxConfig(updates, activeRole, activeName);
      if (result.success && result.config) {
        setTaxConfigState(result.config);
      }
      return result;
    },
    [role, currentUser]
  );

  const calculateTotals = useCallback(
    (subtotal: number, discountAmount: number = 0, overrideRate?: number) => {
      return taxService.calculateDocumentTotals(subtotal, discountAmount, overrideRate);
    },
    []
  );

  const calculateLineTax = useCallback(
    (netAmount: number, overrideRate?: number) => {
      return taxService.calculateLineTax(netAmount, overrideRate);
    },
    []
  );

  const resetDefaults = useCallback(() => {
    const activeRole = role || currentUser?.role || authService.getCurrentUser()?.role;
    taxService.resetToDefaults(activeRole);
  }, [role, currentUser]);

  const value: TaxContextValue = {
    taxConfig,
    taxEnabled: taxConfig.taxEnabled,
    taxRate: taxConfig.taxRate,
    taxName: taxConfig.taxName,
    setTaxConfig,
    canConfigureTax,
    calculateTotals,
    calculateLineTax,
    resetDefaults,
  };

  return <TaxContext.Provider value={value}>{children}</TaxContext.Provider>;
}

export function useTaxContext() {
  const context = useContext(TaxContext);
  if (!context) {
    // Safe fallback if used outside Provider (e.g. during HMR or unit testing)
    const user = authService.getCurrentUser();
    const canConfig = user?.role === 'DIRECTOR';
    return {
      taxConfig: taxService.getTaxConfig(),
      taxEnabled: taxService.getTaxConfig().taxEnabled,
      taxRate: taxService.getTaxConfig().taxRate,
      taxName: taxService.getTaxConfig().taxName,
      setTaxConfig: (updates: Partial<GlobalTaxConfig>) => taxService.setTaxConfig(updates, user?.role, user?.name),
      canConfigureTax: canConfig,
      calculateTotals: (subtotal: number, discountAmount?: number, overrideRate?: number) =>
        taxService.calculateDocumentTotals(subtotal, discountAmount, overrideRate),
      calculateLineTax: (netAmount: number, overrideRate?: number) =>
        taxService.calculateLineTax(netAmount, overrideRate),
      resetDefaults: () => taxService.resetToDefaults(user?.role),
    };
  }
  return context;
}
