import { ProductPricing } from '../types/product';

export interface ProductValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateProductData(input: {
  sku: string;
  name: string;
  categoryId: string;
  uomId: string;
  barcode: string;
  pricing: ProductPricing;
}): ProductValidationResult {
  const errors: Record<string, string> = {};

  if (!input.sku || input.sku.trim().length < 3) {
    errors.sku = 'SKU is required and must be at least 3 characters.';
  }

  if (!input.name || input.name.trim().length < 3) {
    errors.name = 'Product name is required and must be at least 3 characters.';
  }

  if (!input.categoryId) {
    errors.categoryId = 'Category is required.';
  }

  if (!input.uomId) {
    errors.uomId = 'Unit of measure is required.';
  }

  if (!input.barcode || input.barcode.trim().length < 6) {
    errors.barcode = 'A valid barcode of at least 6 digits is required.';
  }

  if (input.pricing.costPrice <= 0) {
    errors.costPrice = 'Cost price must be greater than zero.';
  }

  if (input.pricing.currentSellingPrice <= 0) {
    errors.sellingPrice = 'Selling price must be greater than zero.';
  }

  if (input.pricing.currentSellingPrice < input.pricing.costPrice) {
    errors.sellingPrice = 'Selling price cannot be less than cost price.';
  }

  if (input.pricing.minimumSellingPrice < input.pricing.costPrice) {
    errors.minimumSellingPrice = 'Minimum selling price cannot be lower than cost price.';
  }

  if (input.pricing.minimumSellingPrice > input.pricing.currentSellingPrice) {
    errors.minimumSellingPrice = 'Minimum selling price cannot exceed current selling price.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
