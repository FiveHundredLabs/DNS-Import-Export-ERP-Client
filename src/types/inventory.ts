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

export type GRNStatus =
  | 'DRAFT'
  | 'PENDING_STOCK_MANAGER_APPROVAL'
  | 'STOCK_MANAGER_REJECTED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'COSTED'
  | 'PRICED'
  | 'REJECTED';

export interface GRNStockManagerApproval {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedById?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  remarks?: string;
}

export type ElectricalProductCategory = 'GENERAL_ELECTRICAL' | 'SERIAL_TRACKED' | 'WIRES_CABLES';

export interface CableSpecification {
  coreCount?: string;
  conductorSize?: string;
  voltageGrade?: string;
  lengthPerRoll?: number;
  drumNumber?: string;
}

export interface GRNAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
  fileUrl?: string;
}

export interface GRNQualityInspection {
  status: 'PENDING' | 'PASSED' | 'PASSED_WITH_EXCEPTION' | 'FAILED';
  inspectorName?: string;
  inspectorId?: string;
  inspectedAt?: string;
  notes?: string;
  damageDetails?: string;
  visualInspectionPassed?: boolean;
  specVerificationPassed?: boolean;
  packagingCondition?: 'INTACT' | 'DAMAGED' | 'TAMPERED';
}

export interface UnitBarcodeRecord {
  unitIndex: number;
  unitBarcode: string;
  serialNumber?: string;
  status: 'PENDING_LABEL' | 'LABELED';
  labeledAt?: string;
}

export interface GRNItem {
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  supplierItemCode?: string;
  category?: ElectricalProductCategory;
  expectedQuantity: number;
  previouslyReceivedQuantity?: number;
  receivedQuantity: number;
  acceptedQuantity?: number;
  damagedQuantity: number;
  rejectedQuantity?: number;
  unitCostSnapshot: number;
  lineValue: number;
  batchNumber?: string;
  serialNumbers?: string[];
  barcode?: string;
  serialNumber?: string;
  uom?: string; // e.g. 'PCS', 'SET', 'MTR', 'ROLL', 'COIL', 'DRUM', 'BOX', 'KG'
  cableSpecs?: CableSpecification;
  damageReason?: string;
  rejectionReason?: string;
  unitBarcodes?: string[];
  unitRecords?: UnitBarcodeRecord[];
  barcodesConfirmed?: boolean;
  barcodesConfirmedAt?: string;
}

export interface GRN {
  id: string;
  grnNumber: string;
  sourceType?: 'PO' | 'MANUAL';
  poId?: string;
  poNumber?: string;
  supplierId: string;
  supplierName: string;
  supplierAddress?: string;
  supplierContact?: string;
  supplierEmail?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  poDate?: string;
  expectedDeliveryDate?: string;
  supplierInvoiceNumber?: string; // Physical commercial invoice or delivery document #
  supplierDeliveryNoteNumber?: string;
  referenceNumber?: string;
  receivedDate?: string;
  warehouseId: string;
  receivingLocationBay?: string;
  status: GRNStatus;
  items: GRNItem[];
  totalValue: number;
  receivedById: string;
  receivedByName?: string;
  verifiedById?: string;
  verifiedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  notes?: string;
  deliveryNotes?: string;
  internalRemarks?: string;
  inspection?: GRNQualityInspection;
  attachments?: GRNAttachment[];
  barcodesGenerated?: boolean;
  barcodesConfirmed?: boolean;
  barcodesConfirmedAt?: string;
  barcodesConfirmedBy?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
  stockManagerApproval?: GRNStockManagerApproval;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  expectedQuantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  warehouseId: string;
  status: 'APPROVED' | 'PARTIALLY_RECEIVED' | 'OPEN';
  items: PurchaseOrderItem[];
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

export type SerialNumberStatus = 'IN_STOCK' | 'ALLOCATED' | 'DISPATCHED' | 'DAMAGED' | 'RETURNED';

export interface SerialNumberRecord {
  id: string;
  serialNumber: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  locationId: string;
  locationName: string;
  binLocation?: string;
  status: SerialNumberStatus;
  grnId?: string;
  grnNumber?: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  receivedDate: string;
  receivedBy: string;
  dispatchedDate?: string;
  notes?: string;
}
