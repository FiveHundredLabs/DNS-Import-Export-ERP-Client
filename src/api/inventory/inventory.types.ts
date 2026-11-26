export interface StockBalanceStages {
  available: number;
  reserved: number;
  dispatch: number;
  delivered: number;
  sold: number;
  damaged: number;
  scrapOff: number;
}

export interface StockBalanceApiItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  uom?: string;
  costPrice: number;
  sellingPrice: number;
  brand: string | null;
  category: string | null;
  reorderLevel: number;
  stages: StockBalanceStages;
  totalActiveStock: number;
  updatedAt: string;
}

export interface ListStockBalancesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
}

export interface PaginatedStockBalancesResponse {
  data: StockBalanceApiItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

export interface StockMovementApiItem {
  id: string;
  productId: string;
  batchId?: string | null;
  movementType: string;
  quantity: number;
  referenceDocumentType: string;
  referenceDocumentId?: string | null;
  performedById?: string | null;
  performedByName?: string | null;
  reason?: string | null;
  createdAt: string;
  product?: { id: string; sku: string; name: string };
  actor?: { id: string; fullName: string; email: string } | null;
}

export interface ListStockMovementsParams {
  page?: number;
  pageSize?: number;
  productId?: string;
  movementType?: string;
  referenceDocumentType?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedStockMovementsResponse {
  data: StockMovementApiItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
