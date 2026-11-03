import { Invoice } from '../types/invoice';
import { PaymentAllocation } from '../types/payment';
import { UserRole } from '../types/auth';

export interface PaymentAllocationValidationResult {
  valid: boolean;
  error?: string;
  totalAllocated: number;
}

/**
 * Automatically allocates a payment amount against outstanding invoices using FIFO (oldest first).
 * Invoices are ordered by issueDate ascending (oldest first), falling back to createdAt, dueDate, or invoiceNumber.
 * Only invoices with outstanding balance (> 0) and not CANCELLED or DRAFT are considered.
 *
 * Rules:
 * - Fully settles oldest invoices first.
 * - Remaining amount after settling older invoices is allocated to the next oldest invoice.
 * - If payment covers all invoices, all are fully settled.
 */
function parseTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const time = new Date(dateStr).getTime();
  return isNaN(time) ? 0 : time;
}

export function autoAllocatePayment(
  paymentAmount: number,
  invoices: Invoice[]
): PaymentAllocation[] {
  if (paymentAmount <= 0 || !invoices || invoices.length === 0) {
    return [];
  }

  // Filter out cancelled, draft, paid, or fully collected invoices
  const outstandingInvoices = invoices.filter((inv) => {
    if (
      inv.status === 'CANCELLED' ||
      inv.status === 'DRAFT' ||
      inv.status === 'PAID' ||
      inv.status === 'COLLECTED'
    ) {
      return false;
    }
    if (inv.balanceAmount <= 0) {
      return false;
    }
    const uncollectedBalance = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
    return uncollectedBalance > 0;
  });

  // Sort by oldest first:
  // Primary: issueDate ascending
  // Secondary: createdAt ascending
  // Tertiary: dueDate ascending
  // Quaternary: invoiceNumber ascending
  const sortedInvoices = [...outstandingInvoices].sort((a, b) => {
    const issueA = parseTimestamp(a.issueDate);
    const issueB = parseTimestamp(b.issueDate);
    if (issueA !== issueB) return issueA - issueB;

    const createdA = parseTimestamp(a.createdAt);
    const createdB = parseTimestamp(b.createdAt);
    if (createdA !== createdB) return createdA - createdB;

    const dueA = parseTimestamp(a.dueDate);
    const dueB = parseTimestamp(b.dueDate);
    if (dueA !== dueB) return dueA - dueB;

    return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
  });

  const allocations: PaymentAllocation[] = [];
  let remaining = paymentAmount;

  for (const inv of sortedInvoices) {
    if (remaining <= 0) break;

    // Remaining uncollected balance on this invoice (deducting any pending collection)
    const uncollectedBalance = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
    if (uncollectedBalance <= 0) continue;

    const allocAmount = Math.min(uncollectedBalance, remaining);
    if (allocAmount > 0) {
      allocations.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        allocatedAmount: allocAmount,
      });
      remaining -= allocAmount;
    }
  }

  return allocations;
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

export interface Handover24hStatus {
  isCash: boolean;
  handoverStatus: 'PENDING_HANDOVER' | 'HANDED_OVER' | 'APPROVED' | 'REJECTED';
  isDue: boolean;
  isOverdue: boolean;
  hoursElapsed: number;
  hoursRemaining: number;
  deadline: string; // ISO date string of collectedAt + 24h
  badgeLabel: string;
  badgeVariant: 'destructive' | 'warning' | 'default' | 'success' | 'outline';
  handedOverToUserName?: string;
  handedOverAt?: string;
}

/**
 * Evaluates the 24-hour cash handover deadline compliance for a collected payment.
 * Rule: All cash collected by sales representatives must be handed over to Finance within 24 hours.
 */
export function evaluate24hHandoverStatus(
  payment: {
    collectedAt?: string;
    createdAt?: string;
    paymentMethod: string;
    status: string;
    handoverStatus?: string;
    handedOverToUserName?: string;
    handedOverAt?: string;
  },
  referenceDate: Date = new Date()
): Handover24hStatus {
  const isCash = payment.paymentMethod === 'CASH';
  const handoverStatus = (payment.handoverStatus ||
    (payment.status === 'APPROVED'
      ? 'APPROVED'
      : payment.status === 'REJECTED'
      ? 'REJECTED'
      : 'PENDING_HANDOVER')) as 'PENDING_HANDOVER' | 'HANDED_OVER' | 'APPROVED' | 'REJECTED';

  const collectedTimeStr = payment.collectedAt || payment.createdAt || new Date().toISOString();
  const collectedTime = new Date(collectedTimeStr).getTime();
  const deadlineTime = collectedTime + 24 * 60 * 60 * 1000;
  const deadline = new Date(deadlineTime).toISOString();

  const refTime = referenceDate.getTime();
  const diffMs = deadlineTime - refTime;
  const hoursRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  const hoursElapsed = Math.max(0, Math.round((refTime - collectedTime) / (1000 * 60 * 60)));

  if (!isCash) {
    return {
      isCash: false,
      handoverStatus,
      isDue: false,
      isOverdue: false,
      hoursElapsed,
      hoursRemaining: 0,
      deadline,
      badgeLabel: payment.paymentMethod === 'CHEQUE' ? 'Cheque Collection' : 'Bank Transfer',
      badgeVariant: 'outline',
      handedOverToUserName: payment.handedOverToUserName,
      handedOverAt: payment.handedOverAt,
    };
  }

  // If approved by finance
  if (handoverStatus === 'APPROVED' || payment.status === 'APPROVED') {
    return {
      isCash: true,
      handoverStatus: 'APPROVED',
      isDue: false,
      isOverdue: false,
      hoursElapsed,
      hoursRemaining: 0,
      deadline,
      badgeLabel: 'Approved by Finance',
      badgeVariant: 'success',
      handedOverToUserName: payment.handedOverToUserName,
      handedOverAt: payment.handedOverAt,
    };
  }

  // If rejected
  if (handoverStatus === 'REJECTED' || payment.status === 'REJECTED') {
    return {
      isCash: true,
      handoverStatus: 'REJECTED',
      isDue: false,
      isOverdue: false,
      hoursElapsed,
      hoursRemaining: 0,
      deadline,
      badgeLabel: 'Rejected by Finance',
      badgeVariant: 'destructive',
      handedOverToUserName: payment.handedOverToUserName,
      handedOverAt: payment.handedOverAt,
    };
  }

  // If handed over to a finance officer
  if (handoverStatus === 'HANDED_OVER') {
    const recipient = payment.handedOverToUserName ? `to ${payment.handedOverToUserName}` : 'to Finance';
    return {
      isCash: true,
      handoverStatus: 'HANDED_OVER',
      isDue: false,
      isOverdue: false,
      hoursElapsed,
      hoursRemaining: 0,
      deadline,
      badgeLabel: `Handed Over (${recipient})`,
      badgeVariant: 'default',
      handedOverToUserName: payment.handedOverToUserName,
      handedOverAt: payment.handedOverAt,
    };
  }

  // Pending Handover: evaluate against the 24-hour limit
  const isOverdue = diffMs < 0;
  const overdueHours = isOverdue ? Math.max(1, Math.round(Math.abs(diffMs) / (1000 * 60 * 60))) : 0;

  return {
    isCash: true,
    handoverStatus: 'PENDING_HANDOVER',
    isDue: true,
    isOverdue,
    hoursElapsed,
    hoursRemaining,
    deadline,
    badgeLabel: isOverdue
      ? `OVERDUE (>24h Handover - ${overdueHours}h late)`
      : hoursRemaining <= 1
      ? 'Handover Due (<1h left)'
      : `Handover Due (${hoursRemaining}h left)`,
    badgeVariant: isOverdue || hoursRemaining <= 2 ? 'destructive' : 'warning',
    handedOverToUserName: payment.handedOverToUserName,
    handedOverAt: payment.handedOverAt,
  };
}
