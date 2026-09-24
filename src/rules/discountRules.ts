export interface DiscountEvaluationParams {
  requestedDiscountPercentage: number;
  repMaxDiscountPercentage?: number; // Rep's personal authority limit (e.g. 5%)
  customerMaxDiscountPercentage: number; // Customer's configured limit (e.g. 10%)
  productMaxDiscountPercentage: number; // Product's configured limit (e.g. 15%)
  isPromotional?: boolean;
  promotionalDiscountPercentage?: number;
}

export interface DiscountValidationResult {
  isValid: boolean;
  requiresSpecialApproval: boolean;
  allowedDiscountPercentage: number;
  reason?: string;
}

/**
 * Evaluates whether a requested discount percentage is valid and whether it requires special approval.
 */
export function evaluateDiscount(
  params: DiscountEvaluationParams
): DiscountValidationResult {
  const repLimit = params.repMaxDiscountPercentage ?? 5; // Default rep limit
  const customerLimit = params.customerMaxDiscountPercentage;
  const productLimit = params.productMaxDiscountPercentage;

  // Base allowable limit without special escalation is the minimum of rep limit and customer limit
  const standardPermittedLimit = Math.min(repLimit, customerLimit, productLimit);

  if (params.requestedDiscountPercentage < 0) {
    return {
      isValid: false,
      requiresSpecialApproval: false,
      allowedDiscountPercentage: standardPermittedLimit,
      reason: 'Discount percentage cannot be negative.',
    };
  }

  if (params.requestedDiscountPercentage > 100) {
    return {
      isValid: false,
      requiresSpecialApproval: false,
      allowedDiscountPercentage: standardPermittedLimit,
      reason: 'Discount percentage cannot exceed 100%.',
    };
  }

  // If item is promotional, promotional rate can be applied directly without special escalation
  if (params.isPromotional && params.promotionalDiscountPercentage && params.promotionalDiscountPercentage > 0) {
    if (params.requestedDiscountPercentage <= params.promotionalDiscountPercentage) {
      return {
        isValid: true,
        requiresSpecialApproval: false,
        allowedDiscountPercentage: params.promotionalDiscountPercentage,
      };
    }
  }

  // If requested discount is within standard rep & customer permissions
  if (params.requestedDiscountPercentage <= standardPermittedLimit) {
    return {
      isValid: true,
      requiresSpecialApproval: false,
      allowedDiscountPercentage: standardPermittedLimit,
    };
  }

  // If requested discount exceeds rep or customer limit, but is within absolute product ceiling
  if (params.requestedDiscountPercentage <= productLimit) {
    return {
      isValid: true,
      requiresSpecialApproval: true,
      allowedDiscountPercentage: productLimit,
      reason: `Requested discount (${params.requestedDiscountPercentage}%) exceeds standard limit (${standardPermittedLimit}%). Requires Special Approval.`,
    };
  }

  // Requested discount exceeds product ceiling entirely
  return {
    isValid: true,
    requiresSpecialApproval: true,
    allowedDiscountPercentage: productLimit,
    reason: `Requested discount (${params.requestedDiscountPercentage}%) exceeds product maximum threshold (${productLimit}%). Requires Director Approval.`,
  };
}

/**
 * Calculates net line item total
 */
export function calculateLineTotal(
  unitPrice: number,
  quantity: number,
  discountPercentage: number
): {
  subtotal: number;
  discountAmount: number;
  total: number;
} {
  const safeQty = Math.max(0, quantity);
  const safePrice = Math.max(0, unitPrice);
  const safeDiscountRate = Math.min(100, Math.max(0, discountPercentage));

  const subtotal = safePrice * safeQty;
  const discountAmount = Number(((subtotal * safeDiscountRate) / 100).toFixed(2));
  const total = Number((subtotal - discountAmount).toFixed(2));

  return { subtotal, discountAmount, total };
}
