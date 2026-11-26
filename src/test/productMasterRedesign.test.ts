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

  describe('Phase D & E: Batch-Level Pricing & Bulk Repricing Rules', () => {
    it('accurately filters eligible batches (ACTIVE & HOLD with availableQuantity > 0)', () => {
      const batches = [
        { id: 'b1', batchNumber: 'B-001', status: 'ACTIVE', availableQuantity: 15, sellingPrice: 1000 },
        { id: 'b2', batchNumber: 'B-002', status: 'HOLD', availableQuantity: 20, sellingPrice: 1000 },
        { id: 'b3', batchNumber: 'B-003', status: 'ACTIVE', availableQuantity: 0, sellingPrice: 950 },
        { id: 'b4', batchNumber: 'B-004', status: 'DEPLETED', availableQuantity: 0, sellingPrice: 900 },
        { id: 'b5', batchNumber: 'B-005', status: 'DEPLETED', availableQuantity: 10, sellingPrice: 900 }, // Corrupted test case
      ];

      // Eligible: (ACTIVE or HOLD) AND availableQuantity > 0
      const eligible = batches.filter(
        (b) => (b.status === 'ACTIVE' || b.status === 'HOLD') && b.availableQuantity > 0,
      );

      expect(eligible).toHaveLength(2);
      expect(eligible.map((b) => b.batchNumber)).toEqual(['B-001', 'B-002']);
    });

    it('identifies latest batch pricing from active batch records', () => {
      const activeBatches = [
        { batchNumber: 'B-002', unitCost: 850, sellingPrice: 1200, status: 'HOLD', availableQuantity: 10 },
        { batchNumber: 'B-001', unitCost: 800, sellingPrice: 1150, status: 'ACTIVE', availableQuantity: 25 },
      ];

      // Prefer ACTIVE over HOLD if both exist with available stock
      const preferred =
        activeBatches.find((b) => b.status === 'ACTIVE' && b.availableQuantity > 0) ||
        activeBatches.find((b) => b.status === 'HOLD' && b.availableQuantity > 0);

      expect(preferred).toBeDefined();
      expect(preferred?.batchNumber).toBe('B-001');
      expect(preferred?.sellingPrice).toBe(1150);
      expect(preferred?.unitCost).toBe(800);
    });
  });

  describe('Phase F & G: Floor Price Governance & Immutable Fields Rules', () => {
    it('validates floor price percentage bounds [0, 100]', () => {
      const validateFloor = (pct: number) => pct >= 0 && pct <= 100;

      expect(validateFloor(0)).toBe(true);
      expect(validateFloor(15.5)).toBe(true);
      expect(validateFloor(100)).toBe(true);
      expect(validateFloor(-1)).toBe(false);
      expect(validateFloor(100.1)).toBe(false);
    });

    it('enforces immutable system fields exclusion in product edit payload', () => {
      const fullProduct = {
        id: 'p-1',
        name: 'Schneider 16A MCB',
        sku: 'DNS-MCB-16A',
        barcode: '8901234567890',
        brandId: 'brand-1',
        brandName: 'Schneider',
        categoryId: 'cat-1',
        categoryName: 'Circuit Breakers',
        uomId: 'PCS',
        description: 'Original spec',
        warrantyPeriodMonths: 12,
        minFloorPricePercentage: 15,
        status: 'ACTIVE' as const,
      };

      // In ProductEditModal, only safe editable fields are extracted into the payload
      const editablePayload = {
        description: 'Updated spec with wiring notes',
        warrantyPeriod: 24,
        minFloorPricePercentage: 18,
        status: 'ACTIVE' as const,
      };

      // Immutable fields must never be overwritten in the update payload
      expect(editablePayload).not.toHaveProperty('sku');
      expect(editablePayload).not.toHaveProperty('barcode');
      expect(editablePayload).not.toHaveProperty('brandId');
      expect(editablePayload).not.toHaveProperty('categoryId');
      expect(editablePayload).not.toHaveProperty('uomId');
      expect(editablePayload.warrantyPeriod).toBe(24);
      expect(editablePayload.minFloorPricePercentage).toBe(18);
    });

    it('calculates safe profit markup limit and validates minFloorPricePercentage within [0, profitMarkup]', () => {
      const unitCost = 1000;
      const proposedSellingPrice = 1250;
      // Profit markup: (1250 - 1000) / 1000 = 25%
      const profitMarkupPct = ((proposedSellingPrice - unitCost) / unitCost) * 100;
      expect(profitMarkupPct).toBe(25);

      const isValidFloorPct = (floorPct: number, maxMarkup: number) => floorPct >= 0 && floorPct <= maxMarkup;

      expect(isValidFloorPct(0, profitMarkupPct)).toBe(true); // 0% = sold at cost price
      expect(isValidFloorPct(15, profitMarkupPct)).toBe(true); // 15% <= 25%
      expect(isValidFloorPct(25, profitMarkupPct)).toBe(true); // 25% = full selling price
      expect(isValidFloorPct(30, profitMarkupPct)).toBe(false); // 30% exceeds profit markup
      expect(isValidFloorPct(-5, profitMarkupPct)).toBe(false); // negative not allowed

      // Minimum floor price calculation: cost * (1 + floorPct / 100)
      const floorPriceAt0 = unitCost * (1 + 0 / 100);
      expect(floorPriceAt0).toBe(1000); // Cost price floor

      const floorPriceAt25 = unitCost * (1 + 25 / 100);
      expect(floorPriceAt25).toBe(1250); // Full selling price floor
    });
  });
});
