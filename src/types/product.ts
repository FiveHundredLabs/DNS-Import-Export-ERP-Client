import { BaseEntity } from './common';

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
export type ApprovalStatus = 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';

export interface Category extends BaseEntity {
  name: string;
  code: string;
  description?: string;
}

export interface UnitOfMeasure extends BaseEntity {
  name: string;
  code: string;
  symbol: string;
}

export interface ProductPricing {
  costPrice: number;
  currentSellingPrice: number;
  minimumSellingPrice: number; // Lowest price rep can ever discount to
  maxDiscountPercentage: number;
  promotionalDiscountPercentage?: number;
  taxRatePercentage: number; // e.g., 18% VAT
}

export interface Product extends BaseEntity {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  uomId: string;
  uomCode: string;
  barcode: string;
  pricing: ProductPricing;
  isPromotional: boolean;
  warrantyPeriodMonths: number;
  status: ProductStatus;
  approvalStatus: ApprovalStatus;
  stockOnHand: number;
  damagedStock: number;
}

export interface PriceChangeProposal extends BaseEntity {
  productId: string;
  productSku: string;
  productName: string;
  currentSellingPrice: number;
  proposedSellingPrice: number;
  proposedMinSellingPrice: number;
  reason: string;
  proposedById: string;
  proposedByName: string;
  approvalStatus: ApprovalStatus;
  directorApprovalRequired: boolean;
  reviewedById?: string;
  reviewedByName?: string;
  rejectionReason?: string;
}
