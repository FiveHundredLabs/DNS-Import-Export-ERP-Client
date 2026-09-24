import { POSSession, CashReconciliation } from '../types/pos';
import { StockBalance } from '../types/inventory';

/**
 * Validates cashier discount against product ceiling and cashier authority threshold (default 5%).
 * Cashier discount cannot exceed the lower of the product ceiling and the cashier limit.
 */
export function validatePOSDiscount(
  requestedDiscount: number,
  productMaxDiscount: number = 15,
  cashierMaxDiscount: number = 5
): boolean {
  if (isNaN(requestedDiscount) || requestedDiscount < 0) {
    throw new Error('Discount percentage cannot be negative.');
  }
  const safeProductMax = isNaN(productMaxDiscount) ? cashierMaxDiscount : productMaxDiscount;
  const safeCashierMax = isNaN(cashierMaxDiscount) ? 5 : cashierMaxDiscount;
  const permittedLimit = Math.min(safeProductMax, safeCashierMax);
  if (requestedDiscount > permittedLimit) {
    throw new Error(
      `Cashier discount (${requestedDiscount}%) exceeds permitted threshold (${permittedLimit}%). Maximum cashier discount is ${safeCashierMax}%, product max is ${safeProductMax}%.`
    );
  }
  return true;
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
