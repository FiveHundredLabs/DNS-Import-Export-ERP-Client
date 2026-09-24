import { UserRole } from '../types/auth';
import { CustomerApprovalStage } from '../types/customer';

/**
 * Determines whether a customer commercial setup requires Manager or Director approval.
 */
export function determineCustomerApprovalRoute(
  creditDays: number,
  creditLimit: number
): {
  targetRole: 'MANAGER' | 'DIRECTOR';
  isExceptional: boolean;
  reason: string;
} {
  const isHighCreditDays = creditDays > 30;
  const isHighCreditLimit = creditLimit > 1000000;

  if (isHighCreditDays || isHighCreditLimit) {
    const reasons: string[] = [];
    if (isHighCreditDays) reasons.push(`Credit days (${creditDays}) exceed standard 30-day limit`);
    if (isHighCreditLimit) reasons.push(`Credit limit (LKR ${creditLimit.toLocaleString()}) exceeds LKR 1,000,000 threshold`);

    return {
      targetRole: 'DIRECTOR',
      isExceptional: true,
      reason: `Director Approval required: ${reasons.join(' and ')}.`,
    };
  }

  return {
    targetRole: 'MANAGER',
    isExceptional: false,
    reason: 'Standard commercial terms. Manager approval sufficient.',
  };
}

/**
 * Validates whether a user with a given role can approve an action at a particular stage.
 */
export function canApproveCustomerStage(
  role: UserRole,
  stage: CustomerApprovalStage
): boolean {
  if (role === 'DIRECTOR') return true;

  switch (stage) {
    case 'PENDING_SALES_REVIEW':
      return role === 'SALES_MANAGER';
    case 'PENDING_MANAGER_APPROVAL':
      return role === 'MANAGER' || role === 'DIRECTOR';
    case 'PENDING_DIRECTOR_APPROVAL':
      return role === 'DIRECTOR';
    default:
      return false;
  }
}

/**
 * Evaluates whether a proposed product selling price requires Director approval.
 */
export function determinePriceApprovalRoute(
  costPrice: number,
  currentPrice: number,
  proposedPrice: number
): {
  requiresDirectorApproval: boolean;
  marginPercentage: number;
  reason: string;
} {
  if (proposedPrice <= 0) {
    return {
      requiresDirectorApproval: true,
      marginPercentage: 0,
      reason: 'Proposed selling price must be greater than zero. Director authorization required.',
    };
  }

  const marginPercentage = ((proposedPrice - costPrice) / proposedPrice) * 100;
  const priceReductionPercentage = currentPrice > 0 ? ((currentPrice - proposedPrice) / currentPrice) * 100 : 0;

  if (marginPercentage < 15) {
    return {
      requiresDirectorApproval: true,
      marginPercentage: Number(marginPercentage.toFixed(1)),
      reason: `Proposed margin (${marginPercentage.toFixed(1)}%) is below the minimum required 15%. Director approval mandated.`,
    };
  }

  if (priceReductionPercentage > 10) {
    return {
      requiresDirectorApproval: true,
      marginPercentage: Number(marginPercentage.toFixed(1)),
      reason: `Proposed price reduction (${priceReductionPercentage.toFixed(1)}%) exceeds 10% tolerance. Director approval mandated.`,
    };
  }

  return {
    requiresDirectorApproval: false,
    marginPercentage: Number(marginPercentage.toFixed(1)),
    reason: `Proposed margin is healthy (${marginPercentage.toFixed(1)}%). Manager approval sufficient.`,
  };
}
