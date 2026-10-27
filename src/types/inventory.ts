export type StockLocation = 'WAREHOUSE' | 'SHOWROOM' | 'TRANSIT' | 'DAMAGED' | 'RETURNED';

export interface StockBalance {
  id: string;
  productId: string;
  locationId: string;
  locationType: StockLocation;
  availableQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  returnedQuantity: number;
  lastUpdated: string;
}

export type StockMovementType = 'GRN_INWARD' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'SALES_ISSUE' | 'SALES_RETURN' | 'DAMAGE_WRITE_OFF' | 'DAMAGE_REVERSAL' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productId: string;
  sourceLocation?: string;
  targetLocation?: string;
  quantity: number;
  movementType: StockMovementType;
  referenceDocumentType: string;
  referenceDocumentId: string;
  performedById: string;
  performedByName: string;
  reason?: string;
  timestamp: string;
}

export type GRNStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'COSTED' | 'REJECTED';

export interface GRNItem {
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  unitCostSnapshot: number;
  lineValue: number;
  serialNumbers?: string[];
  barcode?: string;
  serialNumber?: string;
  uom?: string; // e.g. 'PCS', 'SET', 'MTR', 'BOX', 'KG'
}

export interface GRN {
  id: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  supplierInvoiceNumber?: string; // Physical commercial invoice or delivery document #
  receivedDate?: string;
  warehouseId: string;
  status: GRNStatus;
  items: GRNItem[];
  totalValue: number;
  receivedById: string;
  submittedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  status: string;
  items: any[];
  requestedById: string;
  approvedById?: string;
  dispatchedAt?: string;
  receivedAt?: string;
}

export type StockBatchStatus = 'ACTIVE' | 'DEPLETED' | 'HOLD' | 'EXPIRED';

export interface StockBatch {
  id: string;
  batchNumber: string;
  productId: string;
  productName?: string;
  sku?: string;
  grnId?: string;
  grnNumber?: string;
  warehouseId: string;
  receivedDate: string; // YYYY-MM-DD
  initialQuantity: number;
  availableQuantity: number;
  quantityOnHand?: number;
  allocatedQuantity?: number;
  unitCost: number; // True landed cost per unit
  sellingPrice: number; // Current batch selling price
  status: StockBatchStatus;
}

export type PriceStrategyType = 'PRESERVE_BATCH' | 'STANDARDIZE_UNIFORM';

export interface ProductSellingPriceHistory {
  id: string;
  productId: string;
  productName?: string;
  sku?: string;
  productSku?: string;
  batchId?: string;
  batchNumber?: string;
  oldPrice: number;
  newPrice: number;
  previousSellingPrice?: number;
  newSellingPrice?: number;
  strategy: PriceStrategyType;
  strategyApplied?: string;
  changeReason: string;
  reason?: string;
  changedBy: string;
  changedByName?: string;
  changedAt: string; // ISO date string
  affectedBatchCount?: number;
}

