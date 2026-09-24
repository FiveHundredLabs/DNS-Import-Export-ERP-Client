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

export type GRNStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface GRNItem {
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  unitCostSnapshot: number;
  lineValue: number;
}

export interface GRN {
  id: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
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
