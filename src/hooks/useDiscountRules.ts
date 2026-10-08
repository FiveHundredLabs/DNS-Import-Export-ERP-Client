import { useMemo, useCallback } from 'react';
import { Customer, CustomerLoyaltyLevel } from '../types/customer';
import { Product } from '../types/product';
import { discountRuleService } from '../services/DiscountRuleService';
import {
  getProductDiscountLevels,
  getAllowedDiscountLevels,
  getMaxAllowedDiscount,
  evaluateCustomerProductDiscount,
  normalizeCustomerLoyaltyLevel,
  DiscountEvaluationResult,
} from '../rules/discountRules';

export function useDiscountRules() {
  const getLevels = useCallback((product?: Partial<Product> | null): number[] => {
    return getProductDiscountLevels(product);
  }, []);

  const getAllowedLevels = useCallback(
    (product?: Partial<Product> | null, customer?: Partial<Customer> | null): number[] => {
      return getAllowedDiscountLevels(product, customer);
    },
    []
  );

  const getMaxAllowed = useCallback(
    (product?: Partial<Product> | null, customer?: Partial<Customer> | null): number => {
      return getMaxAllowedDiscount(product, customer);
    },
    []
  );

  const getCustomerLoyalty = useCallback(
    (customer?: Partial<Customer> | null): CustomerLoyaltyLevel => {
      return normalizeCustomerLoyaltyLevel(customer);
    },
    []
  );

  const evaluateDiscount = useCallback(
    (params: {
      product?: Partial<Product> | null;
      customer?: Partial<Customer> | null;
      requestedDiscountPercentage: number;
      existingApprovalStatus?: 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    }): DiscountEvaluationResult => {
      return evaluateCustomerProductDiscount(params);
    },
    []
  );

  return {
    getProductDiscountLevels: getLevels,
    getAllowedDiscountLevels: getAllowedLevels,
    getMaxAllowedDiscount: getMaxAllowed,
    getCustomerLoyalty,
    evaluateDiscount,
    discountRuleService,
  };
}
