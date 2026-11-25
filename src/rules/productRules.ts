import { ProductPricing } from '../types/product';

export interface ProductValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateProductData(input: {
  sku?: string;
  name: string;
  categoryId: string;
  uomId?: string;
  barcode?: string;
  pricing: ProductPricing;
}): ProductValidationResult {
  const errors: Record<string, string> = {};

  if (input.sku && input.sku.trim().length > 0 && input.sku.trim().length < 3) {
    errors.sku = 'If provided, SKU must be at least 3 characters.';
  }

  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Product name is required and must be at least 2 characters.';
  }

  if (!input.categoryId) {
    errors.categoryId = 'Category is required.';
  }

  if (input.barcode && input.barcode.trim().length > 0 && input.barcode.trim().length < 6) {
    errors.barcode = 'A valid barcode of at least 6 digits is required if provided.';
  }

  const costPrice = input.pricing?.costPrice ?? 0;
  const sellingPrice = input.pricing?.currentSellingPrice ?? 0;

  if (costPrice < 0) {
    errors.costPrice = 'Cost price cannot be negative.';
  }

  if (sellingPrice > 0 && costPrice > 0) {
    if (sellingPrice < costPrice) {
      errors.sellingPrice = 'Selling price cannot be less than cost price.';
    }

    if (
      input.pricing.minimumSellingPrice > 0 &&
      input.pricing.minimumSellingPrice < costPrice
    ) {
      errors.minimumSellingPrice = 'Minimum selling price cannot be lower than cost price.';
    }

    if (
      input.pricing.minimumSellingPrice > 0 &&
      input.pricing.minimumSellingPrice > sellingPrice
    ) {
      errors.minimumSellingPrice = 'Minimum selling price cannot exceed current selling price.';
    }
  }

  if (
    input.pricing.minFloorPricePercentage !== undefined &&
    input.pricing.minFloorPricePercentage !== null
  ) {
    const floorPct = Number(input.pricing.minFloorPricePercentage);
    if (isNaN(floorPct) || floorPct < 0 || floorPct > 100) {
      errors.minFloorPricePercentage = 'Minimum floor price percentage must be between 0 and 100%.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
