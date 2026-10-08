import { WarrantySaleType } from '../types/warranty';

/**
 * Calculates the exact warranty expiry date given a start date and period in months.
 * Safely handles month-end rollover (e.g. Jan 31 + 1 month -> Feb 28/29).
 * Returns ISO date format YYYY-MM-DD.
 */
export function calculateWarrantyExpiry(startDate: string, periodMonths: number): string {
  if (!startDate) {
    throw new Error('Warranty start date is required');
  }

  // Parse YYYY-MM-DD safely without timezone distortion
  const parts = startDate.split('T')[0].split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid start date format: ${startDate}`);
  }

  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) {
    throw new Error(`Invalid start date: ${startDate}`);
  }

  if (typeof periodMonths !== 'number' || isNaN(periodMonths) || periodMonths < 0) {
    throw new Error('Warranty period must be a non-negative number');
  }

  // Target year and month
  const totalMonths = monthIndex + periodMonths;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12;

  // Find max days in target month
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);

  const finalDate = new Date(Date.UTC(targetYear, targetMonthIndex, clampedDay));
  return finalDate.toISOString().split('T')[0];
}

/**
 * Validates whether a complaint date falls within the active warranty window.
 * Returns true if complaintDate <= expiryDate and (if provided) complaintDate >= startDate.
 */
export function isWarrantyValid(
  expiryDate: string,
  complaintDate: string,
  startDate?: string
): boolean {
  if (!expiryDate || !complaintDate) return false;
  const exp = expiryDate.split('T')[0];
  const comp = complaintDate.split('T')[0];
  if (startDate) {
    const start = startDate.split('T')[0];
    if (comp < start) return false;
  }
  return comp <= exp;
}

/**
 * Computes pending warranty notes count for a shop/dealer.
 * Pending = Math.max(0, unitsSold - notesReceived).
 */
export function calculatePendingWarrantyNotes(unitsSold: number, notesReceived: number): number {
  const sold = Math.max(0, unitsSold || 0);
  const received = Math.max(0, notesReceived || 0);
  return Math.max(0, sold - received);
}

/**
 * Determines warranty start date based on sale channel:
 * - Showroom: Begins on showroom invoice date.
 * - Dealer: Begins on registered dealer sold date (or defaults to delivery/sale date if card not yet received).
 */
export function determineWarrantyStartDate(
  saleType: WarrantySaleType,
  saleDate: string,
  dealerSoldDate?: string
): string {
  if (saleType === 'SHOWROOM') {
    return saleDate.split('T')[0];
  }
  return (dealerSoldDate || saleDate).split('T')[0];
}

/**
 * Validates whether a warranty claim can be processed.
 * Since the company sells to distributors rather than direct end-customers,
 * any warranty claim for distributor products (DEALER) MUST be validated against
 * a verified warranty note received from the distributor and reviewed by the Sales Manager.
 */
export function canProcessWarrantyClaim(
  saleType: WarrantySaleType,
  notesReceived: boolean,
  noteStatus?: string
): { allowed: boolean; reason?: string } {
  if (saleType === 'DEALER') {
    if (!notesReceived || noteStatus !== 'VERIFIED') {
      return {
        allowed: false,
        reason:
          'Warranty claim cannot be processed: Distributor sales require a valid warranty note reviewed and verified by the Sales Manager.',
      };
    }
  }
  return { allowed: true };
}

