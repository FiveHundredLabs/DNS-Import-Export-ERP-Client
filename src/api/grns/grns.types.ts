import type { GRN, GRNItem } from '../../types/inventory';

export type ApportionMethod = 'BY_VALUE' | 'BY_QUANTITY';

export interface AppliedSupplierAdvanceItem {
  paymentId: string;
  amount: number;
}

export interface UpdateGrnCostingPayload {
  freightCharges?: number;
  otherLandingCosts?: number;
  vatAmount?: number;
  isVatRecoverable?: boolean;
  apportionMethod?: ApportionMethod;
  appliedAdvances?: AppliedSupplierAdvanceItem[];
  postedToGL?: boolean;
  journalEntryId?: string;
  expensesBreakdown?: Record<string, any>;
}

export interface ProductPricingItemPayload {
  grnProductId: string;
  sellingPrice: number;
  minFloorPricePercentage?: number;
}

export interface UpdateGrnPricingPayload {
  items: ProductPricingItemPayload[];
}

export interface LandedCostItemBreakdown {
  grnProductId: string;
  productId: string;
  acceptedQuantity: number;
  damagedQuantity: number;
  totalReceivedQuantity: number;
  baseUnitCost: string | number;
  baseSubtotal: string | number;
  apportionedAdditionalCost: string | number;
  landedUnitCost: string | number;
  goodLandedTotalCost: string | number;
  damagedLandedTotalCost: string | number;
  landedTotalCost: string | number;
}

export interface GrnCostingCalculationResponse {
  apportionMethod: ApportionMethod;
  isVatRecoverable: boolean;
  itemsSubtotal: string | number;
  freightCharges: string | number;
  otherLandingCosts: string | number;
  vatAmount: string | number;
  totalLandingAdditions: string | number;
  totalGoodStockValue: string | number;
  totalDamagedStockValue: string | number;
  totalLandedCost: string | number;
  itemBreakdown: LandedCostItemBreakdown[];
}

export interface GrnStockBatchItem {
  id: string;
  batchNumber: string;
  grnId: string;
  productId: string;
  productName: string;
  sku: string;
  initialQuantity: number;
  availableQuantity: number;
  unitCost: string | number;
  sellingPrice: string | number;
  minFloorPricePercentage?: string | number | null;
  status: 'ACTIVE' | 'DEPLETED' | 'QUARANTINED';
  receivedDate: string;
  createdAt?: string;
}

export interface CapitalizeGrnResponse {
  id: string;
  grnNumber: string;
  status: string;
  stockBatches?: GrnStockBatchItem[];
  journal?: {
    id: string;
    entryNumber: string;
    status: string;
  };
}

export interface GrnProductApiRecord {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  uom: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  acceptedQuantity: number;
  unitCost: string | number;
  cableSpecs?: Record<string, unknown> | null;
  product?: { name?: string; sku?: string; unitOfMeasure?: string | null };
}

export interface GrnApiRecord {
  id: string;
  grnNumber: string;
  poId?: string | null;
  poNumber?: string | null;
  supplierId: string;
  supplierName: string;
  supplier?: { name?: string; address?: string | null; phone?: string | null; email?: string | null };
  supplierInvoiceNumber?: string | null;
  receivedDate: string;
  createdAt?: string;
  updatedAt?: string;
  status: GRN['status'];
  notes?: string | null;
  receivedById: string;
  receivedByName?: string | null;
  verifiedById?: string | null;
  verifiedByName?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  grnProducts?: GrnProductApiRecord[];
  costing?: {
    totalLandedCost?: string | number | null;
    freightCharges?: string | number | null;
    otherLandingCosts?: string | number | null;
    vatAmount?: string | number | null;
    isVatRecoverable?: boolean | null;
    apportionMethod?: ApportionMethod | null;
    postedToGL?: boolean | null;
    journalEntryId?: string | null;
  } | null;
  _count?: { grnProducts?: number; stockBatches?: number };
}

export interface CreateGrnPayload {
  poId: string;
  supplierId?: string;
  supplierInvoiceNumber?: string;
  receivedDate?: string;
  notes?: string;
  submitForVerification?: boolean;
  products: Array<{
    productId: string;
    receivedQuantity: number;
    damagedQuantity: number;
    unitCost: number;
    serialNumbers?: string[];
  }>;
}

export interface IntakeUnitsPayload {
  supplierInvoiceNumber?: string;
  receivedDate?: string;
  notes?: string;
  submitForVerification?: boolean;
  products: Array<{
    productId: string;
    receivedQuantity: number;
    damagedQuantity: number;
    unitCost: number;
    serialNumbers?: string[];
  }>;
}

export interface GrnActionPayload {
  remark?: string;
  rejectionReason?: string;
}

export interface GrnListQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  poId?: string;
  search?: string;
}
