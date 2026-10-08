import { Customer, CustomerLoyaltyLevel } from '../types/customer';
import { Product } from '../types/product';
import { UserRole } from '../types/auth';

export type DiscountStatus = 'ALLOWED' | 'REQUIRES_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface CustomerProductDiscountParams {
  product?: Partial<Product> | null;
  customer?: Partial<Customer> | null;
  requestedDiscountPercentage: number;
  existingApprovalStatus?: 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  userRole?: UserRole;
}

export interface DiscountEvaluationResult {
  status: DiscountStatus;
  requiresApproval: boolean;
  allowedDiscountPercentage: number;
  maxPermittedDiscountPercentage: number;
  availableDiscountLevels: number[];
  configuredProductLevels: number[];
  customerLoyaltyLevel: CustomerLoyaltyLevel;
  reason: string;
  warningMessage: string | null;
}

/**
 * Normalizes customer loyalty level to 'NEW' | 'PREMIUM' | 'PLATINUM'.
 * Falls back to loyaltyTier mapping if loyaltyLevel is not directly set.
 */
export function normalizeCustomerLoyaltyLevel(
  customer?: Partial<Customer> | null
): CustomerLoyaltyLevel {
  if (!customer) return 'NEW';

  if (customer.loyaltyLevel) {
    const upper = String(customer.loyaltyLevel).toUpperCase();
    if (upper === 'PLATINUM' || upper === 'PREMIUM' || upper === 'NEW') {
      return upper as CustomerLoyaltyLevel;
    }
  }

  // Fallback mapping from legacy loyaltyTier if present
  if (customer.loyaltyTier) {
    const tier = String(customer.loyaltyTier).toUpperCase();
    if (tier === 'PLATINUM') return 'PLATINUM';
    if (tier === 'GOLD' || tier === 'SILVER') return 'PREMIUM';
    if (tier === 'BRONZE') return 'NEW';
  }

  return 'NEW';
}

/**
 * Extracts and sorts product-level discount levels (up to 3 levels, ordered lowest to highest).
 * Each product can have 0, 1, 2, or 3 discount levels.
 */
export function getProductDiscountLevels(
  product?: Partial<Product> | null
): number[] {
  if (!product) return [];

  const rawLevels =
    product.discountLevels !== undefined
      ? product.discountLevels
      : product.pricing?.discountLevels !== undefined
      ? product.pricing.discountLevels
      : undefined;

  if (!rawLevels || !Array.isArray(rawLevels)) {
    return [];
  }

  // Filter valid numbers >= 0, unique, sorted lowest to highest, capped at 3 levels
  const valid = rawLevels
    .filter((v): v is number => typeof v === 'number' && !isNaN(v) && v >= 0 && v <= 100)
    .map((v) => Number(v.toFixed(2)));

  const unique = Array.from(new Set(valid));
  unique.sort((a, b) => a - b);
  return unique.slice(0, 3);
}

/**
 * Determines which discount levels are available to the customer based on:
 * - Product discount levels (0 to 3 levels)
 * - Customer loyalty level (New, Premium, Platinum)
 *
 * Matrix:
 * - New Customer: Lowest available discount level only
 * - Premium Customer: Lowest + second available discount level
 * - Platinum Customer: All available discount levels
 * - 0 discount levels: No discounts available directly
 */
export function getAllowedDiscountLevels(
  product?: Partial<Product> | null,
  customer?: Partial<Customer> | null
): number[] {
  const levels = getProductDiscountLevels(product);
  if (levels.length === 0) {
    return [];
  }

  const loyalty = normalizeCustomerLoyaltyLevel(customer);

  switch (loyalty) {
    case 'NEW':
      // Lowest available discount level only
      return levels.slice(0, 1);
    case 'PREMIUM':
      // Lowest + second available discount level
      return levels.slice(0, 2);
    case 'PLATINUM':
      // All available discount levels
      return levels.slice(0, 3);
    default:
      return levels.slice(0, 1);
  }
}

/**
 * Returns the maximum discount percentage the customer is permitted to receive
 * directly for this product without management approval.
 */
export function getMaxAllowedDiscount(
  product?: Partial<Product> | null,
  customer?: Partial<Customer> | null
): number {
  const allowed = getAllowedDiscountLevels(product, customer);
  if (allowed.length === 0) return 0;
  return Math.max(...allowed);
}

/**
 * Central evaluation engine for product discount levels and customer loyalty.
 * Enforces all 15 user requirements consistently across Quotations, Orders, and Invoices.
 */
export function evaluateCustomerProductDiscount(
  params: CustomerProductDiscountParams
): DiscountEvaluationResult {
  const {
    product,
    customer,
    requestedDiscountPercentage = 0,
    existingApprovalStatus = 'NOT_REQUIRED',
  } = params;

  const loyalty = normalizeCustomerLoyaltyLevel(customer);
  const configuredLevels = getProductDiscountLevels(product);
  const availableLevels = getAllowedDiscountLevels(product, customer);
  const maxAllowed = getMaxAllowedDiscount(product, customer);
  const requested = Number((Math.max(0, requestedDiscountPercentage)).toFixed(2));

  // 1. If discount was already approved by Management, preserve approved status
  if (existingApprovalStatus === 'APPROVED') {
    return {
      status: 'APPROVED',
      requiresApproval: false,
      allowedDiscountPercentage: requested,
      maxPermittedDiscountPercentage: maxAllowed,
      availableDiscountLevels: availableLevels,
      configuredProductLevels: configuredLevels,
      customerLoyaltyLevel: loyalty,
      reason: '15% Discount — Approved',
      warningMessage: null,
    };
  }

  // 2. Zero discount is always permitted directly without approval
  if (requested === 0) {
    return {
      status: 'ALLOWED',
      requiresApproval: false,
      allowedDiscountPercentage: 0,
      maxPermittedDiscountPercentage: maxAllowed,
      availableDiscountLevels: availableLevels,
      configuredProductLevels: configuredLevels,
      customerLoyaltyLevel: loyalty,
      reason: 'Standard 0% discount allowed.',
      warningMessage: null,
    };
  }

  // 3. Product Without Any Discount Level:
  // "If a product has no configured discount level, users must NOT be able to apply a discount directly."
  if (configuredLevels.length === 0) {
    return {
      status: 'REQUIRES_APPROVAL',
      requiresApproval: true,
      allowedDiscountPercentage: 0,
      maxPermittedDiscountPercentage: 0,
      availableDiscountLevels: [],
      configuredProductLevels: [],
      customerLoyaltyLevel: loyalty,
      reason:
        'No discount is available for this product. Management approval is required to apply a discount.',
      warningMessage:
        'No discount is available for this product. Management approval is required to apply a discount.',
    };
  }

  // 4. Check if requested discount is within the customer's permitted discount levels
  if (requested <= maxAllowed) {
    return {
      status: 'ALLOWED',
      requiresApproval: false,
      allowedDiscountPercentage: requested,
      maxPermittedDiscountPercentage: maxAllowed,
      availableDiscountLevels: availableLevels,
      configuredProductLevels: configuredLevels,
      customerLoyaltyLevel: loyalty,
      reason: `Discount ${requested}% is within customer's permitted level (${maxAllowed}%).`,
      warningMessage: null,
    };
  }

  // 5. Discount Above Customer's Allowed Level:
  // "⚠️ This discount exceeds the customer's allowed discount level. Management approval is required."
  const warning = `⚠️ This discount exceeds the customer's allowed discount level. Management approval is required.`;
  const detailedReason = `⚠️ ${requested}% exceeds the customer's permitted discount level of ${maxAllowed}%. This discount requires Management Approval.`;

  return {
    status: 'REQUIRES_APPROVAL',
    requiresApproval: true,
    allowedDiscountPercentage: maxAllowed,
    maxPermittedDiscountPercentage: maxAllowed,
    availableDiscountLevels: availableLevels,
    configuredProductLevels: configuredLevels,
    customerLoyaltyLevel: loyalty,
    reason: detailedReason,
    warningMessage: warning,
  };
}

// ============================================================================
// Legacy compatibility interface and evaluateDiscount adapter
// ============================================================================

export interface DiscountEvaluationParams {
  requestedDiscountPercentage: number;
  repMaxDiscountPercentage?: number; // Rep's personal authority limit (e.g. 5%)
  customerMaxDiscountPercentage: number; // Customer's configured limit (e.g. 10%)
  productMaxDiscountPercentage: number; // Product's configured limit (e.g. 15%)
  isPromotional?: boolean;
  promotionalDiscountPercentage?: number;
  product?: Partial<Product> | null;
  customer?: Partial<Customer> | null;
  existingApprovalStatus?: 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

export interface DiscountValidationResult {
  isValid: boolean;
  requiresSpecialApproval: boolean;
  allowedDiscountPercentage: number;
  reason?: string;
  status?: DiscountStatus;
  warningMessage?: string | null;
}

/**
 * Evaluates whether a requested discount percentage is valid and whether it requires special approval.
 * Combines role-based limits with the new Product Discount Levels & Customer Loyalty system.
 */
export function evaluateDiscount(
  params: DiscountEvaluationParams
): DiscountValidationResult {
  const repLimit = params.repMaxDiscountPercentage ?? 5; // Default rep limit
  const customerLimit = params.customerMaxDiscountPercentage;
  const productLimit = params.productMaxDiscountPercentage;

  if (params.requestedDiscountPercentage < 0) {
    return {
      isValid: false,
      requiresSpecialApproval: false,
      allowedDiscountPercentage: 0,
      reason: 'Discount percentage cannot be negative.',
      status: 'REQUIRES_APPROVAL',
    };
  }

  if (params.requestedDiscountPercentage > 100) {
    return {
      isValid: false,
      requiresSpecialApproval: false,
      allowedDiscountPercentage: 0,
      reason: 'Discount percentage cannot exceed 100%.',
      status: 'REQUIRES_APPROVAL',
    };
  }

  // If item was already approved by management
  if (params.existingApprovalStatus === 'APPROVED') {
    return {
      isValid: true,
      requiresSpecialApproval: false,
      allowedDiscountPercentage: params.requestedDiscountPercentage,
      reason: 'Discount Approved by Management',
      status: 'APPROVED',
    };
  }

  // If item is promotional, promotional rate can be applied directly without special escalation
  if (
    params.isPromotional &&
    params.promotionalDiscountPercentage &&
    params.promotionalDiscountPercentage > 0
  ) {
    if (params.requestedDiscountPercentage <= params.promotionalDiscountPercentage) {
      return {
        isValid: true,
        requiresSpecialApproval: false,
        allowedDiscountPercentage: params.promotionalDiscountPercentage,
        status: 'ALLOWED',
      };
    }
  }

  // Check if product has explicit discountLevels configured
  const hasConfiguredProductLevels =
    params.product &&
    (params.product.discountLevels !== undefined ||
      params.product.pricing?.discountLevels !== undefined);

  if (hasConfiguredProductLevels || params.customer?.loyaltyLevel) {
    const loyaltyEval = evaluateCustomerProductDiscount({
      product: params.product,
      customer: params.customer,
      requestedDiscountPercentage: params.requestedDiscountPercentage,
      existingApprovalStatus: params.existingApprovalStatus,
    });

    if (loyaltyEval.requiresApproval) {
      return {
        isValid: true,
        requiresSpecialApproval: true,
        allowedDiscountPercentage: loyaltyEval.allowedDiscountPercentage,
        reason: loyaltyEval.reason,
        status: loyaltyEval.status,
        warningMessage: loyaltyEval.warningMessage,
      };
    }

    // Within loyalty allowed, but check rep authority limit (5%)
    if (params.requestedDiscountPercentage > repLimit) {
      return {
        isValid: true,
        requiresSpecialApproval: true,
        allowedDiscountPercentage: loyaltyEval.allowedDiscountPercentage,
        reason: `Requested discount (${params.requestedDiscountPercentage}%) exceeds sales rep authority limit (${repLimit}%). Requires Management Approval.`,
        status: 'REQUIRES_APPROVAL',
      };
    }

    return {
      isValid: true,
      requiresSpecialApproval: false,
      allowedDiscountPercentage: loyaltyEval.allowedDiscountPercentage,
      status: 'ALLOWED',
    };
  }

  // Standard legacy fallback check
  const standardPermittedLimit = Math.min(repLimit, customerLimit, productLimit);

  if (params.requestedDiscountPercentage <= standardPermittedLimit) {
    return {
      isValid: true,
      requiresSpecialApproval: false,
      allowedDiscountPercentage: standardPermittedLimit,
      status: 'ALLOWED',
    };
  }

  if (params.requestedDiscountPercentage <= productLimit) {
    return {
      isValid: true,
      requiresSpecialApproval: true,
      allowedDiscountPercentage: productLimit,
      reason: `Requested discount (${params.requestedDiscountPercentage}%) exceeds standard limit (${standardPermittedLimit}%). Requires Special Approval.`,
      status: 'REQUIRES_APPROVAL',
    };
  }

  return {
    isValid: true,
    requiresSpecialApproval: true,
    allowedDiscountPercentage: productLimit,
    reason: `Requested discount (${params.requestedDiscountPercentage}%) exceeds product maximum threshold (${productLimit}%). Requires Director Approval.`,
    status: 'REQUIRES_APPROVAL',
  };
}

/**
 * Calculates line totals: Unit Price -> Discount -> Tax -> Final Total.
 * Guaranteed consistent calculation order across Quotations, Orders, and Invoices.
 */
export function calculateLineTotal(
  unitPrice: number,
  quantity: number,
  discountPercentage: number,
  taxRatePercentage: number = 0
): {
  subtotal: number;
  discountAmount: number;
  netAmount: number;
  netAfterDiscount: number;
  taxAmount: number;
  total: number;
  lineTotal: number;
} {
  const safeQty = Math.max(0, quantity);
  const safePrice = Math.max(0, unitPrice);
  const safeDiscountRate = Math.min(100, Math.max(0, discountPercentage));
  const safeTaxRate = Math.max(0, taxRatePercentage);

  const subtotal = Number((safePrice * safeQty).toFixed(2));
  const discountAmount = Number(((subtotal * safeDiscountRate) / 100).toFixed(2));
  const netAmount = Number((subtotal - discountAmount).toFixed(2));
  const taxAmount = Number(((netAmount * safeTaxRate) / 100).toFixed(2));
  const total = Number((netAmount + taxAmount).toFixed(2));

  return {
    subtotal,
    discountAmount,
    netAmount,
    netAfterDiscount: netAmount,
    taxAmount,
    total,
    lineTotal: total,
  };
}
