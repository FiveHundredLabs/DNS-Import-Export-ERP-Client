import { describe, it, expect } from 'vitest';
import { evaluateCredit } from '../rules/creditRules';

describe('Credit Rules Engine', () => {
  it('passes when credit days and balance are well within limits', () => {
    const result = evaluateCredit({
      requestedCreditDays: 30,
      allowedCreditDays: 30,
      orderTotalAmount: 100000,
      customerCreditLimit: 1000000,
      customerTotalOutstanding: 200000,
    });

    expect(result.isWithinTerms).toBe(true);
    expect(result.creditDaysBreached).toBe(false);
    expect(result.creditLimitBreached).toBe(false);
    expect(result.requiresSpecialApproval).toBe(false);
  });

  it('detects credit days breach and triggers special approval', () => {
    const result = evaluateCredit({
      requestedCreditDays: 45,
      allowedCreditDays: 30,
      orderTotalAmount: 50000,
      customerCreditLimit: 1000000,
      customerTotalOutstanding: 100000,
    });

    expect(result.isWithinTerms).toBe(false);
    expect(result.creditDaysBreached).toBe(true);
    expect(result.requiresSpecialApproval).toBe(true);
    expect(result.recommendedApprover).toBe('DIRECTOR'); // > 30 days routes to Director
  });

  it('detects credit limit breach and routes to Manager if within 500k excess and standard days', () => {
    const result = evaluateCredit({
      requestedCreditDays: 21,
      allowedCreditDays: 30,
      orderTotalAmount: 200000,
      customerCreditLimit: 500000,
      customerTotalOutstanding: 400000, // 400k + 200k = 600k (100k excess)
    });

    expect(result.creditLimitBreached).toBe(true);
    expect(result.requiresSpecialApproval).toBe(true);
    expect(result.recommendedApprover).toBe('MANAGER');
  });

  it('keeps Manager routing when credit days are unbreached even if > 30 days when credit limit excess is <= 500k', () => {
    const result = evaluateCredit({
      requestedCreditDays: 45,
      allowedCreditDays: 45,
      orderTotalAmount: 100000,
      customerCreditLimit: 500000,
      customerTotalOutstanding: 450000, // 550k total, 50k excess
    });

    expect(result.creditDaysBreached).toBe(false);
    expect(result.creditLimitBreached).toBe(true);
    expect(result.requiresSpecialApproval).toBe(true);
    expect(result.recommendedApprover).toBe('MANAGER');
  });
});
