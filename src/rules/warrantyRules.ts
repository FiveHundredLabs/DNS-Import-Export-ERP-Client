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

/**
 * Classifies a physical product unit's warranty note collection status.
 * Distinguishes between:
 * 1. Received & Verified by head office
 * 2. Received (Pending Sales Manager review)
 * 3. Confirmed sold to end-customer, but warranty note is missing from head office
 * 4. In distributor inventory / unaccounted (not yet sold to end-customer)
 */
export function classifyUnitWarrantyStatus(record: {
  notesReceived: boolean;
  warrantyNoteStatus?: string;
  dealerSoldDate?: string;
}): {
  status: 'RECEIVED_VERIFIED' | 'RECEIVED_PENDING' | 'MISSING_CONFIRMED' | 'IN_DISTRIBUTOR_STOCK';
  label: string;
} {
  if (record.warrantyNoteStatus === 'VERIFIED' || record.notesReceived) {
    return { status: 'RECEIVED_VERIFIED', label: 'Received & Verified' };
  }
  if (record.warrantyNoteStatus === 'PENDING_REVIEW') {
    return { status: 'RECEIVED_PENDING', label: 'Received (Pending Review)' };
  }
  if (record.dealerSoldDate) {
    return { status: 'MISSING_CONFIRMED', label: 'Missing Note (Sold to Customer)' };
  }
  return { status: 'IN_DISTRIBUTOR_STOCK', label: 'In Distributor Stock (Unaccounted)' };
}

export interface RemainingWarrantyInfo {
  remainingMonths: number;
  remainingDays: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  displayText: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_REGISTERED';
}

/**
 * Calculates remaining warranty duration and visual status.
 * Compares warrantyExpiryDate against reference date (defaults to today).
 */
export function calculateRemainingWarranty(
  expiryDate?: string,
  todayStr: string = new Date().toISOString().split('T')[0]
): RemainingWarrantyInfo {
  if (!expiryDate) {
    return {
      remainingMonths: 0,
      remainingDays: 0,
      isExpired: false,
      isExpiringSoon: false,
      displayText: 'Not Registered',
      status: 'NOT_REGISTERED',
    };
  }

  const exp = expiryDate.split('T')[0];
  const today = todayStr.split('T')[0];

  const expDate = new Date(exp + 'T00:00:00Z');
  const currDate = new Date(today + 'T00:00:00Z');

  const diffMs = expDate.getTime() - currDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      remainingMonths: 0,
      remainingDays: diffDays,
      isExpired: true,
      isExpiringSoon: false,
      displayText: 'Warranty Expired',
      status: 'EXPIRED',
    };
  }

  const expYear = expDate.getUTCFullYear();
  const expMonth = expDate.getUTCMonth();
  const currYear = currDate.getUTCFullYear();
  const currMonth = currDate.getUTCMonth();

  let diffMonths = (expYear - currYear) * 12 + (expMonth - currMonth);
  if (expDate.getUTCDate() < currDate.getUTCDate()) {
    diffMonths -= 1;
  }
  diffMonths = Math.max(0, diffMonths);

  const isExpiringSoon = diffDays <= 30;
  const status = isExpiringSoon ? 'EXPIRING_SOON' : 'ACTIVE';
  const displayText =
    diffMonths > 0
      ? `${diffMonths} Month${diffMonths > 1 ? 's' : ''}`
      : `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;

  return {
    remainingMonths: diffMonths,
    remainingDays: diffDays,
    isExpired: false,
    isExpiringSoon,
    displayText,
    status,
  };
}
/**
 * Area Managers and Sales Representatives must not have permission to register warranties or create warranty claims.
 * They should only be able to view registered warranties on a customer-wise basis, and only for customers assigned to them.
 */
export function canRegisterWarranty(role?: string): boolean {
  if (!role) return false;
  return role !== 'SALES_REP' && role !== 'AREA_MANAGER';
}

export function canCreateWarrantyClaim(role?: string): boolean {
  if (!role) return false;
  return role !== 'SALES_REP' && role !== 'AREA_MANAGER';
}
