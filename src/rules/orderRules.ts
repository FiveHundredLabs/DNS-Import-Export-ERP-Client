import { OrderStatus, SalesOrderItem } from '../types/order';
import { Customer } from '../types/customer';
import { Product } from '../types/product';
import { UserRole } from '../types/auth';
import { evaluateCredit } from './creditRules';
import { evaluateDiscount } from './discountRules';

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['SUBMITTED', 'PENDING_APPROVAL', 'SPECIAL_APPROVAL', 'CANCELLED'],
  SUBMITTED: ['PENDING_APPROVAL', 'SPECIAL_APPROVAL', 'APPROVED', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'SPECIAL_APPROVAL', 'CANCELLED'],
  SPECIAL_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PICKING', 'CANCELLED'],
  PICKING: ['PARTIALLY_ISSUED', 'ISSUED', 'CANCELLED'],
  PARTIALLY_ISSUED: ['ISSUED', 'INVOICED'],
  ISSUED: ['INVOICED'],
  INVOICED: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

/**
 * Checks whether transitioning from currentStatus to nextStatus is valid according to
 * the strict sales order state machine.
 */
export function isValidOrderTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Orders can only be cancelled before fulfillment issuing / invoicing begins.
 */
export function canCancelOrder(status: OrderStatus): boolean {
  const cancellableStatuses: OrderStatus[] = [
    'DRAFT',
    'SUBMITTED',
    'PENDING_APPROVAL',
    'SPECIAL_APPROVAL',
    'APPROVED',
    'PICKING',
  ];
  return cancellableStatuses.includes(status);
}

export interface OrderEvaluationInput {
  customer: Customer;
  items: Array<{
    productId: string;
    productNameSnapshot?: string;
    unitPriceSnapshot: number;
    orderedQuantity: number;
    discountPercentage: number;
    product?: Product;
  }>;
  requestedCreditDays: number;
  userRole?: UserRole;
}

export interface OrderEvaluationResult {
  isSpecialApproval: boolean;
  specialApprovalReasons: string[];
  targetApproverRole: 'SALES_MANAGER' | 'MANAGER' | 'DIRECTOR';
  creditDaysBreached: boolean;
  creditLimitBreached: boolean;
  discountBreached: boolean;
  projectedOutstanding: number;
  availableCredit: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

/**
 * Evaluates whether an order constitutes a Standard Order or a Special Order
 * in accordance with Sections 17 & 18.
 *
 * Standard Order criteria:
 * - discount <= rep limit (5%) on all items
 * - AND requested credit days <= customer credit days
 * - AND total customer outstanding + order total <= customer credit limit.
 * Routes to SALES_MANAGER (PENDING_APPROVAL).
 *
 * Special Order criteria:
 * - discount > rep limit (5%) OR requested credit days > customer credit days OR credit limit breached.
 * - Routes to SALES_MANAGER, MANAGER, or DIRECTOR based on severity.
 */
export function evaluateOrderApproval(
  input: OrderEvaluationInput
): OrderEvaluationResult {
  const { customer, items, requestedCreditDays, userRole = 'SALES_REP' } = input;
  const reasons: string[] = [];

  const repMaxDiscount = userRole === 'SALES_REP' ? 5 : 15;

  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;
  let discountBreached = false;
  let hasDirectorDiscount = false;
  let hasManagerDiscount = false;

  // 1. Evaluate Line Items & Discounts
  for (const item of items) {
    const safeQty = Math.max(0, item.orderedQuantity);
    const lineSubtotal = Number((item.unitPriceSnapshot * safeQty).toFixed(2));
    const lineDiscount = Number(((lineSubtotal * item.discountPercentage) / 100).toFixed(2));
    const netLine = lineSubtotal - lineDiscount;
    const taxRate = item.product?.pricing?.taxRatePercentage ?? 18;
    const lineTax = Number(((netLine * taxRate) / 100).toFixed(2));

    subtotal += lineSubtotal;
    discountAmount += lineDiscount;
    taxAmount += lineTax;

    const customerMaxDisc = customer.commercialTerms?.maxDiscountPercentage ?? 12;
    const productMaxDisc = item.product?.pricing?.maxDiscountPercentage ?? 15;

    // Check against standard discount evaluation
    const discEval = evaluateDiscount({
      requestedDiscountPercentage: item.discountPercentage,
      repMaxDiscountPercentage: repMaxDiscount,
      customerMaxDiscountPercentage: customerMaxDisc,
      productMaxDiscountPercentage: productMaxDisc,
      isPromotional: item.product?.isPromotional,
      promotionalDiscountPercentage: item.product?.pricing?.promotionalDiscountPercentage,
    });

    if (item.discountPercentage > repMaxDiscount) {
      discountBreached = true;
      reasons.push(
        `Item "${item.productNameSnapshot || item.productId}" discount (${item.discountPercentage}%) exceeds sales rep authority limit (${repMaxDiscount}%).`
      );

      if (item.discountPercentage > productMaxDisc || item.discountPercentage > 15) {
        hasDirectorDiscount = true;
      } else if (item.discountPercentage > customerMaxDisc) {
        hasManagerDiscount = true;
      }
    }
  }

  subtotal = Number(subtotal.toFixed(2));
  discountAmount = Number(discountAmount.toFixed(2));
  taxAmount = Number(taxAmount.toFixed(2));
  const totalAmount = Number((subtotal - discountAmount + taxAmount).toFixed(2));

  // 2. Evaluate Credit Limits & Days
  const customerCreditLimit = customer.commercialTerms?.creditLimit ?? 0;
  const customerCreditDays = customer.commercialTerms?.creditDays ?? 30;
  const customerTotalOutstanding = customer.financials?.totalOutstanding ?? 0;
  const availableCredit = Number((customerCreditLimit - customerTotalOutstanding).toFixed(2));

  const creditEval = evaluateCredit({
    requestedCreditDays,
    allowedCreditDays: customerCreditDays,
    orderTotalAmount: totalAmount,
    customerCreditLimit,
    customerTotalOutstanding,
  });

  if (creditEval.creditDaysBreached) {
    reasons.push(
      `Requested credit days (${requestedCreditDays} days) exceeds customer approved limit (${customerCreditDays} days).`
    );
  }

  const projectedOutstanding = customerTotalOutstanding + totalAmount;
  if (creditEval.creditLimitBreached) {
    const excess = projectedOutstanding - customerCreditLimit;
    reasons.push(
      `Projected total balance (LKR ${projectedOutstanding.toLocaleString()}) exceeds credit limit (LKR ${customerCreditLimit.toLocaleString()}) by LKR ${excess.toLocaleString()}.`
    );
  }

  const isSpecialApproval =
    discountBreached || creditEval.creditDaysBreached || creditEval.creditLimitBreached;

  // 3. Determine Approver Role Tier
  let targetApproverRole: 'SALES_MANAGER' | 'MANAGER' | 'DIRECTOR' = 'SALES_MANAGER';

  if (isSpecialApproval) {
    // Extreme cases require DIRECTOR:
    // - Extreme credit days breach (> 30 days requested)
    // - Extreme credit limit excess (> 500,000 LKR)
    // - Extreme discount (exceeds product max discount or 15%)
    const isExtremeCreditLimit =
      creditEval.creditLimitBreached && projectedOutstanding - customerCreditLimit > 500000;
    const isExtremeCreditDays =
      creditEval.creditDaysBreached && requestedCreditDays > 30;

    if (hasDirectorDiscount || isExtremeCreditLimit || isExtremeCreditDays) {
      targetApproverRole = 'DIRECTOR';
    } else if (
      creditEval.creditLimitBreached ||
      creditEval.creditDaysBreached ||
      hasManagerDiscount
    ) {
      targetApproverRole = 'MANAGER';
    } else {
      // Rep discount limit breached but within customer ceiling
      targetApproverRole = 'SALES_MANAGER';
    }
  }

  return {
    isSpecialApproval,
    specialApprovalReasons: reasons,
    targetApproverRole,
    creditDaysBreached: creditEval.creditDaysBreached,
    creditLimitBreached: creditEval.creditLimitBreached,
    discountBreached,
    projectedOutstanding: Number(projectedOutstanding.toFixed(2)),
    availableCredit,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
  };
}

/**
 * Checks whether an actor with userRole can directly approve an order given its targetApproverRole
 * and whether it is a special scenario.
 */
export function canApproveOrder(
  userRole: UserRole,
  targetApproverRole: 'SALES_MANAGER' | 'MANAGER' | 'DIRECTOR',
  isSpecialApproval: boolean
): boolean {
  if (userRole === 'DIRECTOR') return true;

  if (userRole === 'MANAGER') {
    return targetApproverRole === 'MANAGER' || targetApproverRole === 'SALES_MANAGER';
  }

  if (userRole === 'SALES_MANAGER') {
    // Sales Manager can approve standard orders or special orders within Sales Manager authority
    return !isSpecialApproval || targetApproverRole === 'SALES_MANAGER';
  }

  return false;
}

/**
 * Checks whether an actor can escalate an order to a higher tier.
 */
export function canEscalateOrder(userRole: UserRole): boolean {
  return userRole === 'SALES_MANAGER' || userRole === 'MANAGER';
}

/**
 * Returns permissible escalation target roles for a given actor role.
 */
export function getAllowedEscalationTargets(
  userRole: UserRole
): ('MANAGER' | 'DIRECTOR')[] {
  if (userRole === 'SALES_MANAGER') {
    return ['MANAGER', 'DIRECTOR'];
  }
  if (userRole === 'MANAGER') {
    return ['DIRECTOR'];
  }
  return [];
}
