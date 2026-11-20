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
  minFloorPricePercentage?: number;
  maxDiscountPercentage: number;
  showroomDiscountPercentage: number;
  taxRatePercentage: number;
  discountLevels: number[];
  latestBatchCostPrice?: number | null;
  latestBatchSellingPrice?: number | null;
  latestBatchFloorPct?: number | null;
  hasBatchPricing?: boolean;
  batchNumber?: string | null;
}

export interface StockBatchItem {
  id: string;
  batchNumber: string;
  grnId: string;
  grnNumber: string;
  grnDate: string;
  grnStatus: string;
  supplierName: string | null;
  unitCost: number;
  sellingPrice: number;
  minFloorPricePercentage: number;
  initialQuantity: number;
  availableQuantity: number;
  status: 'ACTIVE' | 'HOLD' | 'DEPLETED';
  receivedDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchPricingSummary {
  totalBatches: number;
  activeBatches: number;
  holdBatches: number;
  depletedBatches: number;
  totalAvailableQty: number;
  latestCostPrice: number | null;
  latestSellingPrice: number | null;
  eligibleForPriceUpdate: number;
}

export interface ProductBatchPricingResponse {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  batches: StockBatchItem[];
  summary: BatchPricingSummary;
}

export interface EligibleBatchPreviewItem {
  id: string;
  batchNumber: string;
  grnNumber: string;
  grnDate: string;
  status: 'ACTIVE' | 'HOLD';
  availableQuantity: number;
  unitCost: number;
  currentSellingPrice: number;
  minFloorPricePercentage: number;
}

export interface BatchPricePreviewResponse {
  productId: string;
  productName: string;
  sku: string;
  count: number;
  batches: EligibleBatchPreviewItem[];
}

export interface UpdateBatchPricePayload {
  newSellingPrice: number;
  reason?: string;
  batchIds?: string[];
}

export interface UpdateBatchPriceResponse {
  success: boolean;
  productId: string;
  updatedCount: number;
  newSellingPrice: number;
  updatedBatches: Array<{
    id: string;
    batchNumber: string;
    previousPrice: number;
    newPrice: number;
    status: string;
    availableQuantity: number;
  }>;
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
  minFloorPricePercentage?: number;
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
  costPrice?: number;
  sellingPrice?: number;
  minimumSellingPrice?: number;
  minFloorPricePercentage?: number;
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
  minFloorPricePercentage?: number;
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
