import { describe, it, expect } from 'vitest';
import { validateProductData } from '../rules/productRules';

describe('Product Master Redesign – Unit Tests', () => {
  it('validates product with auto-generated SKU (empty SKU allowed)', () => {
    const res = validateProductData({
      name: 'Schneider 16A MCB',
      categoryId: 'cat-1',
      pricing: {
        costPrice: 500,
        currentSellingPrice: 0, // Optional unset selling price
        minimumSellingPrice: 0,
        maxDiscountPercentage: 0,
        taxRatePercentage: 18,
      },
    });

    expect(res.isValid).toBe(true);
    expect(res.errors).toEqual({});
  });

  it('allows sellingPrice to be 0 (unset / batch priced)', () => {
    const res = validateProductData({
      sku: 'DNS-SCH-16-000001',
      name: 'Schneider 16A MCB',
      categoryId: 'cat-1',
      pricing: {
        costPrice: 800,
        currentSellingPrice: 0,
        minimumSellingPrice: 0,
        maxDiscountPercentage: 0,
        taxRatePercentage: 18,
      },
    });

    expect(res.isValid).toBe(true);
  });

  it('rejects sellingPrice lower than costPrice when sellingPrice is positive', () => {
    const res = validateProductData({
      sku: 'DNS-SCH-16-000001',
      name: 'Schneider 16A MCB',
      categoryId: 'cat-1',
      pricing: {
        costPrice: 800,
        currentSellingPrice: 700,
        minimumSellingPrice: 700,
        maxDiscountPercentage: 0,
        taxRatePercentage: 18,
      },
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.sellingPrice).toBe('Selling price cannot be less than cost price.');
  });

  it('validates minFloorPricePercentage within [0, 100]', () => {
    const validRes = validateProductData({
      name: 'Schneider 16A MCB',
      categoryId: 'cat-1',
      pricing: {
        costPrice: 800,
        currentSellingPrice: 1000,
        minimumSellingPrice: 850,
        minFloorPricePercentage: 85,
        maxDiscountPercentage: 15,
        taxRatePercentage: 18,
      },
    });
    expect(validRes.isValid).toBe(true);

    const invalidRes = validateProductData({
      name: 'Schneider 16A MCB',
      categoryId: 'cat-1',
      pricing: {
        costPrice: 800,
        currentSellingPrice: 1000,
        minimumSellingPrice: 850,
        minFloorPricePercentage: 150, // Invalid > 100
        maxDiscountPercentage: 15,
        taxRatePercentage: 18,
      },
    });
    expect(invalidRes.isValid).toBe(false);
    expect(invalidRes.errors.minFloorPricePercentage).toContain('between 0 and 100%');
  });

  it('requires product name with at least 2 characters', () => {
    const res = validateProductData({
      name: 'A',
      categoryId: 'cat-1',
      pricing: {
        costPrice: 500,
        currentSellingPrice: 0,
        minimumSellingPrice: 0,
        maxDiscountPercentage: 0,
        taxRatePercentage: 18,
      },
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.name).toContain('at least 2 characters');
  });
});
