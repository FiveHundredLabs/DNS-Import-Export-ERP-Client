import { describe, it, expect } from 'vitest';
import {
  determineCustomerApprovalRoute,
  determinePriceApprovalRoute,
  canApproveCustomerStage,
} from '../rules/approvalRules';

describe('Approval Hierarchy Rules', () => {
  it('routes standard customer terms (<= 30 days, <= 1M) to Manager', () => {
    const route = determineCustomerApprovalRoute(30, 800000);
    expect(route.targetRole).toBe('MANAGER');
    expect(route.isExceptional).toBe(false);
  });

  it('routes exceptional customer terms (> 30 days) to Director', () => {
    const route = determineCustomerApprovalRoute(45, 800000);
    expect(route.targetRole).toBe('DIRECTOR');
    expect(route.isExceptional).toBe(true);
    expect(route.reason).toContain('Credit days');
  });

  it('routes high credit limit (> 1,000,000) to Director', () => {
    const route = determineCustomerApprovalRoute(30, 2500000);
    expect(route.targetRole).toBe('DIRECTOR');
    expect(route.isExceptional).toBe(true);
  });

  it('mandates Director approval if proposed price margin is below 15%', () => {
    // Cost 1000, proposed 1100 -> Margin = (100 / 1100) * 100 = 9.09% < 15%
    const route = determinePriceApprovalRoute(1000, 1200, 1100);
    expect(route.requiresDirectorApproval).toBe(true);
    expect(route.marginPercentage).toBeLessThan(15);
  });

  it('permits Director to approve any customer stage', () => {
    expect(canApproveCustomerStage('DIRECTOR', 'PENDING_SALES_REVIEW')).toBe(true);
    expect(canApproveCustomerStage('DIRECTOR', 'PENDING_MANAGER_APPROVAL')).toBe(true);
    expect(canApproveCustomerStage('DIRECTOR', 'PENDING_DIRECTOR_APPROVAL')).toBe(true);
  });

  it('restricts Sales Rep from approving customer stages', () => {
    expect(canApproveCustomerStage('SALES_REP', 'PENDING_MANAGER_APPROVAL')).toBe(false);
  });
});
