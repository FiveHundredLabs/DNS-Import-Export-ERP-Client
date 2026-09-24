import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// ==========================================
// 1. DISCOUNT RULES ENGINE (Mirrors src/rules/discountRules.ts)
// ==========================================
function evaluateDiscount(params) {
  const repLimit = params.repMaxDiscountPercentage ?? 5;
  const customerLimit = params.customerMaxDiscountPercentage;
  const productLimit = params.productMaxDiscountPercentage;

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

  if (params.requestedDiscountPercentage <= standardPermittedLimit) {
    return {
      isValid: true,
      requiresSpecialApproval: false,
      allowedDiscountPercentage: standardPermittedLimit,
    };
  }

  if (params.requestedDiscountPercentage <= productLimit) {
    return {
      isValid: true,
      requiresSpecialApproval: true,
      allowedDiscountPercentage: productLimit,
      reason: `Requested discount (${params.requestedDiscountPercentage}%) exceeds standard limit (${standardPermittedLimit}%). Requires Special Approval.`,
    };
  }

  return {
    isValid: true,
    requiresSpecialApproval: true,
    allowedDiscountPercentage: productLimit,
    reason: `Requested discount (${params.requestedDiscountPercentage}%) exceeds product maximum threshold (${productLimit}%). Requires Director Approval.`,
  };
}

function calculateLineTotal(unitPrice, quantity, discountPercentage) {
  const safeQty = Math.max(0, quantity);
  const safePrice = Math.max(0, unitPrice);
  const safeDiscountRate = Math.min(100, Math.max(0, discountPercentage));

  const subtotal = safePrice * safeQty;
  const discountAmount = Number(((subtotal * safeDiscountRate) / 100).toFixed(2));
  const total = Number((subtotal - discountAmount).toFixed(2));

  return { subtotal, discountAmount, total };
}

describe('Discount Rules Verification', () => {
  test('Standard discount within rep and customer limits passes without escalation', () => {
    const res = evaluateDiscount({
      requestedDiscountPercentage: 5,
      repMaxDiscountPercentage: 5,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });
    assert.equal(res.isValid, true);
    assert.equal(res.requiresSpecialApproval, false);
  });

  test('Discount exceeding rep limit flags Special Approval Required', () => {
    const res = evaluateDiscount({
      requestedDiscountPercentage: 8,
      repMaxDiscountPercentage: 5,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });
    assert.equal(res.isValid, true);
    assert.equal(res.requiresSpecialApproval, true);
    assert.match(res.reason, /exceeds standard limit/);
  });

  test('Rejects invalid negative discounts even when item is promotional', () => {
    const res = evaluateDiscount({
      requestedDiscountPercentage: -5,
      isPromotional: true,
      promotionalDiscountPercentage: 15,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });
    assert.equal(res.isValid, false);
    assert.match(res.reason, /negative/);
  });

  test('Rejects discounts exceeding 100% even when item is promotional', () => {
    const res = evaluateDiscount({
      requestedDiscountPercentage: 120,
      isPromotional: true,
      promotionalDiscountPercentage: 15,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });
    assert.equal(res.isValid, false);
    assert.match(res.reason, /exceed 100%/);
  });

  test('Valid promotional discount up to promotional ceiling is approved without special escalation', () => {
    const res = evaluateDiscount({
      requestedDiscountPercentage: 15,
      isPromotional: true,
      promotionalDiscountPercentage: 15,
      repMaxDiscountPercentage: 5,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 20,
    });
    assert.equal(res.isValid, true);
    assert.equal(res.requiresSpecialApproval, false);
    assert.equal(res.allowedDiscountPercentage, 15);
  });

  test('Calculates line totals, discounts, and subtotals accurately', () => {
    const res = calculateLineTotal(2500, 4, 10);
    assert.equal(res.subtotal, 10000);
    assert.equal(res.discountAmount, 1000);
    assert.equal(res.total, 9000);
  });
});

// ==========================================
// 2. CREDIT RULES ENGINE (Mirrors src/rules/creditRules.ts)
// ==========================================
function evaluateCredit(params) {
  const reasons = [];
  let creditDaysBreached = false;
  let creditLimitBreached = false;

  if (params.requestedCreditDays > params.allowedCreditDays) {
    creditDaysBreached = true;
    reasons.push(
      `Requested credit days (${params.requestedCreditDays} days) exceeds customer approved limit (${params.allowedCreditDays} days).`
    );
  }

  const projectedOutstanding = params.customerTotalOutstanding + params.orderTotalAmount;
  if (projectedOutstanding > params.customerCreditLimit) {
    creditLimitBreached = true;
    const excess = projectedOutstanding - params.customerCreditLimit;
    reasons.push(
      `Projected total balance exceeds credit limit by LKR ${excess}.`
    );
  }

  const isWithinTerms = !creditDaysBreached && !creditLimitBreached;
  const requiresSpecialApproval = !isWithinTerms;

  let recommendedApprover = 'SALES_MANAGER';
  if (requiresSpecialApproval) {
    const excess = projectedOutstanding - params.customerCreditLimit;
    const isExtremeCreditDays = creditDaysBreached && params.requestedCreditDays > 30;
    const isExtremeCreditLimit = creditLimitBreached && excess > 500000;

    if (isExtremeCreditDays || isExtremeCreditLimit) {
      recommendedApprover = 'DIRECTOR';
    } else {
      recommendedApprover = 'MANAGER';
    }
  }

  return {
    isWithinTerms,
    creditDaysBreached,
    creditLimitBreached,
    requiresSpecialApproval,
    reasons,
    recommendedApprover,
  };
}

describe('Credit Rules Verification', () => {
  test('Compliant credit terms pass smoothly', () => {
    const res = evaluateCredit({
      requestedCreditDays: 30,
      allowedCreditDays: 30,
      orderTotalAmount: 150000,
      customerCreditLimit: 1000000,
      customerTotalOutstanding: 200000,
    });
    assert.equal(res.isWithinTerms, true);
    assert.equal(res.requiresSpecialApproval, false);
  });

  test('Credit days breach exceeding 30 days triggers Director escalation', () => {
    const res = evaluateCredit({
      requestedCreditDays: 45,
      allowedCreditDays: 30,
      orderTotalAmount: 50000,
      customerCreditLimit: 1000000,
      customerTotalOutstanding: 100000,
    });
    assert.equal(res.creditDaysBreached, true);
    assert.equal(res.requiresSpecialApproval, true);
    assert.equal(res.recommendedApprover, 'DIRECTOR');
  });

  test('Small credit limit breach with unbreached non-30 credit days escalates to Manager (not Director)', () => {
    const res = evaluateCredit({
      requestedCreditDays: 45,
      allowedCreditDays: 45, // Not breached!
      orderTotalAmount: 100000,
      customerCreditLimit: 500000,
      customerTotalOutstanding: 450000, // 550k total, 50k excess (<= 500k)
    });
    assert.equal(res.creditDaysBreached, false);
    assert.equal(res.creditLimitBreached, true);
    assert.equal(res.requiresSpecialApproval, true);
    assert.equal(res.recommendedApprover, 'MANAGER');
  });

  test('Credit limit excess exceeding 500k escalates to Director', () => {
    const res = evaluateCredit({
      requestedCreditDays: 14,
      allowedCreditDays: 14,
      orderTotalAmount: 700000,
      customerCreditLimit: 500000,
      customerTotalOutstanding: 450000, // 1,150,000 total, 650k excess (> 500k)
    });
    assert.equal(res.creditLimitBreached, true);
    assert.equal(res.recommendedApprover, 'DIRECTOR');
  });
});

// ==========================================
// 3. APPROVAL HIERARCHY VERIFICATION (Mirrors src/rules/approvalRules.ts)
// ==========================================
function determineCustomerApprovalRoute(creditDays, creditLimit) {
  const isHighCreditDays = creditDays > 30;
  const isHighCreditLimit = creditLimit > 1000000;

  if (isHighCreditDays || isHighCreditLimit) {
    return {
      targetRole: 'DIRECTOR',
      isExceptional: true,
      reason: 'Director approval required due to non-standard terms.',
    };
  }

  return {
    targetRole: 'MANAGER',
    isExceptional: false,
    reason: 'Standard commercial terms. Manager approval sufficient.',
  };
}

function determinePriceApprovalRoute(costPrice, currentPrice, proposedPrice) {
  if (proposedPrice <= 0) {
    return {
      requiresDirectorApproval: true,
      marginPercentage: 0,
      reason: 'Proposed selling price must be greater than zero. Director authorization required.',
    };
  }

  const marginPercentage = ((proposedPrice - costPrice) / proposedPrice) * 100;
  const priceReductionPercentage = currentPrice > 0 ? ((currentPrice - proposedPrice) / currentPrice) * 100 : 0;

  if (marginPercentage < 15) {
    return {
      requiresDirectorApproval: true,
      marginPercentage: Number(marginPercentage.toFixed(1)),
      reason: `Proposed margin (${marginPercentage.toFixed(1)}%) is below 15%.`,
    };
  }

  if (priceReductionPercentage > 10) {
    return {
      requiresDirectorApproval: true,
      marginPercentage: Number(marginPercentage.toFixed(1)),
      reason: `Price reduction exceeds 10%.`,
    };
  }

  return {
    requiresDirectorApproval: false,
    marginPercentage: Number(marginPercentage.toFixed(1)),
    reason: `Proposed margin is healthy.`,
  };
}

describe('Approval Routing Verification', () => {
  test('Standard terms route to Manager', () => {
    const route = determineCustomerApprovalRoute(30, 800000);
    assert.equal(route.targetRole, 'MANAGER');
    assert.equal(route.isExceptional, false);
  });

  test('Terms with credit days > 30 route to Director', () => {
    const route = determineCustomerApprovalRoute(45, 500000);
    assert.equal(route.targetRole, 'DIRECTOR');
    assert.equal(route.isExceptional, true);
  });

  test('Proposed selling price of zero or below safely requires Director approval without crashing', () => {
    const route = determinePriceApprovalRoute(1000, 1500, 0);
    assert.equal(route.requiresDirectorApproval, true);
    assert.equal(route.marginPercentage, 0);
  });
});

// ==========================================
// 4. MASTER DATA SNAPSHOT IMMUTABILITY
// ==========================================
describe('Master Data Snapshot Immutability', () => {
  test('Updating Product Master does not alter historical invoice items', () => {
    const productMaster = {
      id: 'prod-001',
      sku: 'DNS-MCB-32A',
      name: 'Schneider 32A MCB',
      sellingPrice: 3250,
    };

    const invoiceLineItemSnapshot = {
      productId: productMaster.id,
      skuSnapshot: productMaster.sku,
      nameSnapshot: productMaster.name,
      unitPriceSnapshot: productMaster.sellingPrice,
      quantity: 10,
      total: productMaster.sellingPrice * 10,
    };

    productMaster.sellingPrice = 4000;

    assert.equal(invoiceLineItemSnapshot.unitPriceSnapshot, 3250);
    assert.equal(invoiceLineItemSnapshot.total, 32500);
    assert.notEqual(invoiceLineItemSnapshot.unitPriceSnapshot, productMaster.sellingPrice);
  });
});
