import { POSSession, CashReconciliation } from '../types/pos';
import { StockBalance } from '../types/inventory';

/**
 * Known valid supervisor authorization keys for POS overrides (BR-03).
 */
export const SUPERVISOR_AUTH_KEYS: Record<
  string,
  { supervisorName: string; supervisorRole: string }
> = {
  'SUPER-2026': { supervisorName: 'Showroom Supervisor Bandara', supervisorRole: 'SALES_MANAGER' },
  'MGR-8899': { supervisorName: 'Branch Manager Silva', supervisorRole: 'MANAGER' },
  'DIR-0011': { supervisorName: 'Executive Director Perera', supervisorRole: 'DIRECTOR' },
  'STOCK-SUP-77': { supervisorName: 'Stock Manager Fernando', supervisorRole: 'STOCK_MANAGER' },
};

export function verifySupervisorDiscountKey(key?: string): {
  valid: boolean;
  supervisorName?: string;
  supervisorRole?: string;
  error?: string;
} {
  if (!key || !key.trim()) {
    return { valid: false, error: 'Supervisor authorization key is required.' };
  }
  const match = SUPERVISOR_AUTH_KEYS[key.trim()];
  if (!match) {
    return { valid: false, error: 'Invalid supervisor authorization key.' };
  }
  return { valid: true, supervisorName: match.supervisorName, supervisorRole: match.supervisorRole };
}

/**
 * Validates cashier discount against product ceiling and cashier authority threshold (default 5%).
 * Cashier discount cannot exceed the lower of the product ceiling and the cashier limit unless authorized by supervisor (BR-03).
 */
export function validatePOSDiscount(
  requestedDiscount: number,
  productMaxDiscount: number = 15,
  cashierMaxDiscount: number = 5,
  supervisorAuthKey?: string
): { valid: boolean; requiresSupervisorKey: boolean; supervisorName?: string } {
  if (isNaN(requestedDiscount) || requestedDiscount < 0) {
    throw new Error('Discount percentage cannot be negative.');
  }
  const safeProductMax = isNaN(productMaxDiscount) ? cashierMaxDiscount : productMaxDiscount;
  const safeCashierMax = isNaN(cashierMaxDiscount) ? 5 : cashierMaxDiscount;

  // 1. Within cashier threshold: valid without supervisor key
  if (requestedDiscount <= safeCashierMax) {
    return { valid: true, requiresSupervisorKey: false };
  }

  // 2. Exceeds product ceiling entirely
  if (requestedDiscount > safeProductMax) {
    throw new Error(
      `Discount (${requestedDiscount}%) exceeds product maximum ceiling (${safeProductMax}%). Even supervisors cannot exceed the catalog ceiling.`
    );
  }

  // 3. Exceeds cashier threshold (5%), requires valid supervisor key
  if (!supervisorAuthKey) {
    throw new Error(
      `Cashier discount (${requestedDiscount}%) exceeds permitted threshold (${safeCashierMax}%). Supervisor authorization key required.`
    );
  }

  const verified = verifySupervisorDiscountKey(supervisorAuthKey);
  if (!verified.valid) {
    throw new Error(verified.error || 'Invalid supervisor authorization key. Discount override rejected.');
  }

  return {
    valid: true,
    requiresSupervisorKey: true,
    supervisorName: verified.supervisorName,
  };
}

/**
 * Non-throwing variant for UI form validations.
 */
export function isPOSDiscountValid(
  requestedDiscount: number,
  productMaxDiscount: number = 15,
  cashierMaxDiscount: number = 5
): boolean {
  try {
    return validatePOSDiscount(requestedDiscount, productMaxDiscount, cashierMaxDiscount);
  } catch {
    return false;
  }
}

/**
 * Calculates end-of-shift cash reconciliation:
 * expectedCash = openingBalance + cashInTotal - cashOutTotal + cashSalesTotal
 * difference = actualCash - expectedCash
 */
export function calculateReconciliation(
  openingBalance: number,
  cashInTotal: number,
  cashOutTotal: number,
  cashSalesTotal: number,
  actualCash: number
): CashReconciliation {
  const expectedCash = Number((openingBalance + cashInTotal - cashOutTotal + cashSalesTotal).toFixed(2));
  let difference = Number((actualCash - expectedCash).toFixed(2));
  if (Object.is(difference, -0)) difference = 0;
  const isBalanced = difference === 0;
  const status: 'BALANCED' | 'OVER' | 'SHORT' =
    difference === 0 ? 'BALANCED' : difference > 0 ? 'OVER' : 'SHORT';

  return {
    expectedCash,
    difference,
    isBalanced,
    status,
  };
}

/**
 * Validates that cashier has an active, OPEN session. Transactions are blocked if closed or missing.
 */
export function validateCashierSession(session: POSSession | null | undefined): boolean {
  if (!session) {
    throw new Error('No active open POS session found. Please open a shift session before conducting transactions.');
  }
  if (session.status !== 'OPEN') {
    throw new Error(`POS session ${session.sessionNumber} is CLOSED. Transactions are only permitted in an OPEN session.`);
  }
  return true;
}

/**
 * Validates that requested quantity does not exceed available stock in Showroom location.
 */
export function validateShowroomStock(
  productId: string,
  requestedQty: number,
  showroomBalance?: StockBalance | null
): boolean {
  if (requestedQty <= 0) {
    throw new Error('Requested quantity must be greater than zero.');
  }
  const available = showroomBalance ? showroomBalance.availableQuantity - (showroomBalance.reservedQuantity || 0) : 0;
  if (available < requestedQty) {
    throw new Error(
      `Cannot sell more than available quantity in Showroom location. Product: ${productId}, Available: ${available}, Requested: ${requestedQty}`
    );
  }
  return true;
}
