import { InvoiceStatus } from '../types/invoice';

/**
 * Checks whether a given due date string is past due relative to the reference date.
 */
export function isPastDueDate(dueDate: string, referenceDate: Date = new Date()): boolean {
  if (!dueDate) return false;
  // Parse YYYY-MM-DD to date at end of day in local time
  const [year, month, day] = dueDate.split('-').map(Number);
  const due = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (isNaN(due.getTime())) return false;
  return referenceDate.getTime() > due.getTime();
}

/**
 * Calculates current invoice status based on financial amounts, collection state, and due date.
 *
 * Supported payment statuses:
 * - Collected: The sales representative has collected the money from the customer.
 * - Partially Collected: The sales representative has collected only part of the invoice amount.
 * - Paid: The collected money has been handed over to Head Office, verified, and officially recorded in the system as received revenue.
 * - Partially Paid: Only part of the collected amount has been handed over to Head Office and verified.
 *
 * Collected and Paid are distinct stages: money is officially recognized as revenue
 * only after Head Office verifies and approves the payment.
 */
export function calculateInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate: string,
  referenceDate?: Date,
  collectedAmount?: number
): InvoiceStatus {
  // 1. Officially received and verified revenue by Head Office
  if (paidAmount >= totalAmount && totalAmount > 0) {
    return 'PAID';
  }
  if (totalAmount === 0 && paidAmount === 0) {
    return 'PAID';
  }

  // 2. Collection stage: sales rep collected money from customer, pending Head Office verification
  const pendingCollection = collectedAmount || 0;
  if (pendingCollection > 0) {
    if (paidAmount + pendingCollection >= totalAmount - 0.001) {
      return 'COLLECTED';
    }
    return 'PARTIALLY_COLLECTED';
  }

  // 3. Partially verified by Head Office (Partially Paid) or Overdue
  const pastDue = isPastDueDate(dueDate, referenceDate);
  if (paidAmount > 0 && paidAmount < totalAmount) {
    if (pastDue) {
      return 'OVERDUE';
    }
    return 'PARTIALLY_PAID';
  }

  if (paidAmount < totalAmount && pastDue) {
    return 'OVERDUE';
  }

  return 'ISSUED';
}
