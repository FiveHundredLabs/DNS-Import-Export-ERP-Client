import { describe, it, expect } from 'vitest';
import { evaluateDiscount, calculateLineTotal } from '../rules/discountRules';

describe('Discount Rules Engine', () => {
  it('allows standard discount within rep and customer limits', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: 5,
      repMaxDiscountPercentage: 5,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });

    expect(result.isValid).toBe(true);
    expect(result.requiresSpecialApproval).toBe(false);
  });

  it('flags special approval when requested discount exceeds rep limit but is within product limit', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: 8,
      repMaxDiscountPercentage: 5,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });

    expect(result.isValid).toBe(true);
    expect(result.requiresSpecialApproval).toBe(true);
    expect(result.reason).toContain('exceeds standard limit');
  });

  it('rejects negative discount percentages', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: -2,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('negative');
  });

  it('allows promotional discounts up to promotional rate without escalation', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: 18,
      repMaxDiscountPercentage: 5,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
      isPromotional: true,
      promotionalDiscountPercentage: 18,
    });

    expect(result.isValid).toBe(true);
    expect(result.requiresSpecialApproval).toBe(false);
  });

  it('rejects negative discounts even when promotional is set', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: -5,
      isPromotional: true,
      promotionalDiscountPercentage: 15,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('negative');
  });

  it('rejects discounts > 100% even when promotional is set', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: 110,
      isPromotional: true,
      promotionalDiscountPercentage: 15,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('exceed 100%');
  });

  it('calculates line item subtotal and discount correctly', () => {
    const line = calculateLineTotal(1000, 5, 10);
    expect(line.subtotal).toBe(5000);
    expect(line.discountAmount).toBe(500);
    expect(line.total).toBe(4500);
  });
});
