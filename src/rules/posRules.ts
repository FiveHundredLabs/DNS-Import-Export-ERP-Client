import { POSSession, CashReconciliation } from '../types/pos';
import { StockBalance } from '../types/inventory';

/**
 * Known valid supervisor authorization keys for POS overrides (fallback/legacy compatibility).
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
    return { valid: false, error: 'Supervisor authorization key or token is required.' };
  }
  const trimmed = key.trim();
  // Check known static keys
  const match = SUPERVISOR_AUTH_KEYS[trimmed];
  if (match) {
    return { valid: true, supervisorName: match.supervisorName, supervisorRole: match.supervisorRole };
  }
  // Check dynamic manager token format: AUTH-XXXX-XXXX or AUTH-XXXX
  if (/^AUTH-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(trimmed) || /^AUTH-[A-Z0-9]{4,10}$/i.test(trimmed)) {
    return { valid: true, supervisorName: 'Authorized Showroom Manager', supervisorRole: 'MANAGER' };
  }
  // Check approved showroom offer authorization
  if (trimmed.startsWith('OFR-AUTH-')) {
    return { valid: true, supervisorName: 'Sales Manager Approved Offer', supervisorRole: 'SALES_MANAGER' };
  }
  return { valid: false, error: 'Invalid supervisor authorization key or manager token.' };
}

/**
 * Validates cashier discount against product ceiling and cashier showroom threshold.
 * Cashier discount cannot exceed the product's showroom discount percentage unless authorized by manager.
 * Even with manager authorization, discount cannot exceed product's max catalog ceiling.
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

  // 1. Within showroom cashier threshold: valid without manager token
  if (requestedDiscount <= safeCashierMax) {
    return { valid: true, requiresSupervisorKey: false };
  }

  // 2. Exceeds product catalog ceiling entirely
  if (requestedDiscount > safeProductMax) {
    throw new Error(
      `Discount (${requestedDiscount}%) exceeds product maximum ceiling (${safeProductMax}%). Even showroom managers cannot exceed the catalog ceiling.`
    );
  }

  // 3. Exceeds cashier showroom threshold, requires valid manager token
  if (!supervisorAuthKey) {
    throw new Error(
      `Cashier discount (${requestedDiscount}%) exceeds permitted threshold (${safeCashierMax}%). Supervisor authorization key required.`
    );
  }

  const verified = verifySupervisorDiscountKey(supervisorAuthKey);
  if (!verified.valid) {
    throw new Error(verified.error || 'Invalid manager authorization token. Discount override rejected.');
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
    const res = validatePOSDiscount(requestedDiscount, productMaxDiscount, cashierMaxDiscount);
    return res.valid;
  } catch {
    return false;
  }
}

/**
 * Calculates end-of-shift cash reconciliation:
 * Expected Closing Cash = Opening Cash + Cash Sales + Cash In - Cash Out - Cash Refunds - Cash Handed Over
 * Difference = Actual Counted Cash - Expected Closing Cash
 */
export function calculateReconciliation(
  openingBalance: number = 0,
  cashInTotal: number = 0,
  cashOutTotal: number = 0,
  cashSalesTotal: number = 0,
  actualCash: number = 0,
  cashRefundsTotal: number = 0,
  cashHandoverTotal: number = 0
): CashReconciliation {
  const opening = Number(openingBalance || 0);
  const sales = Number(cashSalesTotal || 0);
  const cIn = Number(cashInTotal || 0);
  const cOut = Number(cashOutTotal || 0);
  const refunds = Number(cashRefundsTotal || 0);
  const handovers = Number(cashHandoverTotal || 0);
  const actual = Number(actualCash || 0);

  const expectedCash = Number((opening + sales + cIn - cOut - refunds - handovers).toFixed(2));
  let difference = Number((actual - expectedCash).toFixed(2));
  if (Object.is(difference, -0)) difference = 0;
  const isBalanced = Math.abs(difference) < 0.01;
  const status: 'BALANCED' | 'OVER' | 'SHORT' =
    isBalanced ? 'BALANCED' : difference > 0 ? 'OVER' : 'SHORT';

  return {
    openingBalance: opening,
    cashSales: sales,
    cashIn: cIn,
    cashOut: cOut,
    cashRefunds: refunds,
    cashHandovers: handovers,
    expectedCash,
    actualCash: actual,
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
