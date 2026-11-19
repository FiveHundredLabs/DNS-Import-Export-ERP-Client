export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'DELETED';
export type ProductUnitOfMeasure = 'PCS' | 'BOX' | 'SET' | 'MTR' | 'ROLL' | 'PKT' | 'KG' | 'LTR';

export interface ProductStockBalance {
  id: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  dispatchQuantity: number;
  deliveredQuantity: number;
  soldQuantity: number;
  damagedQuantity: number;
  scrapOffQuantity: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPricing {
  costPrice: number;
  currentSellingPrice: number;
  minimumSellingPrice: number;
  maxDiscountPercentage: number;
  showroomDiscountPercentage: number;
  taxRatePercentage: number;
  discountLevels: number[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  brandId?: string | null;
  brandName?: string;
  uomId?: string;
  uomCode?: string;
  barcode: string;
  pricing: ProductPricing;
  discountLevels: number[];
  warrantyPeriodMonths: number;
  status: ProductStatus;
  approvalStatus?: string;
  stockOnHand: number;
  damagedStock: number;
  requiresSerialNumber: boolean;
  stockBalance?: ProductStockBalance | null;
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  brandId?: string;
  categoryId?: string;
  status?: ProductStatus;
  unitOfMeasure?: ProductUnitOfMeasure;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateProductPayload {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  brandId?: string;
  categoryId: string;
  unitOfMeasure: ProductUnitOfMeasure;
  warrantyPeriod?: number;
  costPrice: number;
  sellingPrice: number;
  minimumSellingPrice?: number;
  hasSerialNumber?: boolean;
  discountLevels?: number[];
  showroomDiscount?: number;
  lowStockAlertLevel?: number;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  brandId?: string;
  categoryId?: string;
  unitOfMeasure?: ProductUnitOfMeasure;
  warrantyPeriod?: number;
  costPrice?: number;
  sellingPrice?: number;
  minimumSellingPrice?: number;
  hasSerialNumber?: boolean;
  discountLevels?: number[];
  showroomDiscount?: number;
  lowStockAlertLevel?: number;
  status?: ProductStatus;
}

export interface SkuPreviewResponse {
  previewPrefix: string;
  previewSku: string;
  note: string;
}
