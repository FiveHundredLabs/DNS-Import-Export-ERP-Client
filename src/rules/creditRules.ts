export interface CreditEvaluationParams {
  requestedCreditDays: number;
  allowedCreditDays: number;
  orderTotalAmount: number;
  customerCreditLimit: number;
  customerTotalOutstanding: number;
}

export interface CreditEvaluationResult {
  isWithinTerms: boolean;
  creditDaysBreached: boolean;
  creditLimitBreached: boolean;
  requiresSpecialApproval: boolean;
  reasons: string[];
  recommendedApprover: 'SALES_MANAGER' | 'MANAGER' | 'DIRECTOR';
}

/**
 * Evaluates whether credit terms and limit conditions are breached.
 */
export function evaluateCredit(
  params: CreditEvaluationParams
): CreditEvaluationResult {
  const reasons: string[] = [];
  let creditDaysBreached = false;
  let creditLimitBreached = false;

  // 1. Check Credit Days
  if (params.requestedCreditDays > params.allowedCreditDays) {
    creditDaysBreached = true;
    reasons.push(
      `Requested credit days (${params.requestedCreditDays} days) exceeds customer approved limit (${params.allowedCreditDays} days).`
    );
  }

  // 2. Check Credit Limit
  const projectedOutstanding =
    params.customerTotalOutstanding + params.orderTotalAmount;
  if (projectedOutstanding > params.customerCreditLimit) {
    creditLimitBreached = true;
    const excess = projectedOutstanding - params.customerCreditLimit;
    reasons.push(
      `Projected total balance (LKR ${projectedOutstanding.toLocaleString()}) exceeds credit limit (LKR ${params.customerCreditLimit.toLocaleString()}) by LKR ${excess.toLocaleString()}.`
    );
  }

  const isWithinTerms = !creditDaysBreached && !creditLimitBreached;
  const requiresSpecialApproval = !isWithinTerms;

  // Determine escalation tier
  let recommendedApprover: 'SALES_MANAGER' | 'MANAGER' | 'DIRECTOR' =
    'SALES_MANAGER';

  if (requiresSpecialApproval) {
    // Only escalate to DIRECTOR if credit days breach exceeds standard 30-day ceiling
    // or if the credit limit excess is extreme (> 500,000 LKR).
    // Otherwise, Manager approval is sufficient.
    const excess = projectedOutstanding - params.customerCreditLimit;
    const isExtremeCreditDays = creditDaysBreached && params.requestedCreditDays > 30;
    const isExtremeCreditLimit = creditLimitBreached && excess > 500000;

    if (isExtremeCreditDays || isExtremeCreditLimit) {
      recommendedApprover = 'DIRECTOR';
    } else {
      recommendedApprover = 'MANAGER';
    }
  }

  return {
    isWithinTerms,
    creditDaysBreached,
    creditLimitBreached,
    requiresSpecialApproval,
    reasons,
    recommendedApprover,
  };
}
