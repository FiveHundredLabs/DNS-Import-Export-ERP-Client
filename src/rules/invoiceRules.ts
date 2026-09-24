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
 * Calculates current invoice status based on financial amounts and due date.
 * Business rules:
 * - paidAmount >= totalAmount -> PAID
 * - paidAmount < totalAmount && isPastDueDate -> OVERDUE
 * - paidAmount > 0 && paidAmount < totalAmount -> PARTIALLY_PAID
 * - otherwise ISSUED
 */
export function calculateInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate: string,
  referenceDate?: Date
): InvoiceStatus {
  if (paidAmount >= totalAmount) {
    return 'PAID';
  }

  const pastDue = isPastDueDate(dueDate, referenceDate);
  if (paidAmount < totalAmount && pastDue) {
    return 'OVERDUE';
  }

  if (paidAmount > 0 && paidAmount < totalAmount) {
    return 'PARTIALLY_PAID';
  }

  return 'ISSUED';
}
