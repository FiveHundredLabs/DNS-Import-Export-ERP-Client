import { PaymentAllocation } from '../types/payment';
import { UserRole } from '../types/auth';

export interface PaymentAllocationValidationResult {
  valid: boolean;
  error?: string;
  totalAllocated: number;
}

/**
 * Validates invoice allocations against payment amount and individual invoice balances.
 * Rule:
 * 1. Allocations cannot exceed payment total.
 * 2. Allocated amount per invoice cannot exceed invoice balance.
 * 3. Individual allocation amounts must be positive numbers.
 */
export function validatePaymentAllocation(
  paymentAmount: number,
  allocations: PaymentAllocation[],
  invoiceBalances: Record<string, number>
): PaymentAllocationValidationResult {
  if (paymentAmount <= 0) {
    return {
      valid: false,
      error: 'Payment amount must be greater than zero.',
      totalAllocated: 0,
    };
  }

  if (!allocations || allocations.length === 0) {
    return {
      valid: true,
      totalAllocated: 0,
    };
  }

  let totalAllocated = 0;
  const allocatedPerInvoice: Record<string, number> = {};

  for (const alloc of allocations) {
    if (alloc.allocatedAmount <= 0) {
      return {
        valid: false,
        error: `Allocated amount for invoice ${alloc.invoiceNumber || alloc.invoiceId} must be greater than zero.`,
        totalAllocated,
      };
    }

    const currentTotalForInvoice = (allocatedPerInvoice[alloc.invoiceId] || 0) + alloc.allocatedAmount;
    allocatedPerInvoice[alloc.invoiceId] = currentTotalForInvoice;

    const availableBalance = invoiceBalances[alloc.invoiceId];
    if (availableBalance !== undefined && currentTotalForInvoice > availableBalance + 0.001) {
      return {
        valid: false,
        error: `Allocated amount (LKR ${currentTotalForInvoice.toLocaleString()}) exceeds outstanding balance (LKR ${availableBalance.toLocaleString()}) for invoice ${alloc.invoiceNumber || alloc.invoiceId}.`,
        totalAllocated,
      };
    }

    totalAllocated += alloc.allocatedAmount;
  }

  if (totalAllocated > paymentAmount + 0.001) {
    return {
      valid: false,
      error: `Total allocated amount (LKR ${totalAllocated.toLocaleString()}) exceeds collected payment amount (LKR ${paymentAmount.toLocaleString()}).`,
      totalAllocated,
    };
  }

  return {
    valid: true,
    totalAllocated,
  };
}

/**
 * Validates cheque details according to banking clearance regulations.
 * Rule: Cheque date cannot be older than 90 days (stale cheque).
 */
export function validateChequeDetails(
  details: {
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
  },
  referenceDate: Date = new Date()
): { valid: boolean; error?: string } {
  if (!details.chequeNumber || details.chequeNumber.trim() === '') {
    return { valid: false, error: 'Cheque number is required.' };
  }
  if (!details.bankName || details.bankName.trim() === '') {
    return { valid: false, error: 'Drawee bank name is required.' };
  }
  if (!details.chequeDate) {
    return { valid: false, error: 'Cheque date is required.' };
  }

  const [year, month, day] = details.chequeDate.split('-').map(Number);
  const chqDate = new Date(year, month - 1, day, 0, 0, 0);

  if (isNaN(chqDate.getTime())) {
    return { valid: false, error: 'Invalid cheque date format.' };
  }

  const diffMs = referenceDate.getTime() - chqDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 90) {
    return {
      valid: false,
      error: `Cheque date is older than 90 days (${diffDays} days old). Stale cheques cannot be accepted.`,
    };
  }

  return { valid: true };
}

/**
 * Verifies whether a user has authority to collect payment for a given customer.
 * Sales Reps can only collect for customers in their assigned territory/portfolio.
 */
export function canUserCollectPayment(
  user: { id: string; role: UserRole; areaId?: string },
  customer: { assignedRepId: string; areaId?: string }
): { allowed: boolean; reason?: string } {
  if (user.role === 'SALES_REP') {
    if (customer.assignedRepId && customer.assignedRepId !== user.id) {
      return {
        allowed: false,
        reason: 'Sales Representatives may only collect payments for customers assigned to their portfolio.',
      };
    }
  }

  if (user.role === 'AREA_MANAGER' && user.areaId && customer.areaId) {
    if (user.areaId !== customer.areaId) {
      return {
        allowed: false,
        reason: 'Area Managers may only collect payments for customers within their designated area.',
      };
    }
  }

  return { allowed: true };
}
