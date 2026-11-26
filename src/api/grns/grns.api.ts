import { apiGet, apiGetPaginated, apiPost } from '../client';
import type { GRN, GRNItem } from '../../types/inventory';
import type {
  CapitalizeGrnResponse,
  CreateGrnPayload,
  GrnActionPayload,
  GrnApiRecord,
  GrnCostingCalculationResponse,
  GrnListQueryParams,
  GrnProductApiRecord,
  GrnStockBatchItem,
  IntakeUnitsPayload,
  UpdateGrnCostingPayload,
  UpdateGrnPricingPayload,
} from './grns.types';

function mapGrnProduct(record: GrnProductApiRecord): GRNItem {
  const acceptedQuantity = record.acceptedQuantity ?? Math.max(0, record.receivedQuantity - record.damagedQuantity);
  const unitCost = Number(record.unitCost ?? 0);
  const serialNumbers = Array.isArray(record.cableSpecs?.serialNumbers)
    ? record.cableSpecs.serialNumbers.map(String)
    : [];

  const rawUnits = Array.isArray((record.cableSpecs as any)?.units)
    ? ((record.cableSpecs as any).units as Array<any>)
    : [];

  const unitRecords = rawUnits.map((u: any, idx: number) => ({
    id: u.id || `unit-${idx}`,
    unitId: u.unitId || (u.unitSeq ? `UNIT${String(u.unitSeq).padStart(6, '0')}` : undefined),
    unitBarcode: u.barcode || u.unitBarcode || '',
    barcode: u.barcode || u.unitBarcode || '',
    serialNumber: u.serialNumber || undefined,
    unitIndex: u.unitIndex || idx + 1,
    isDamaged: Boolean(u.isDamaged),
    unitSeq: u.unitSeq,
    status: u.status || 'PENDING_LABEL',
  }));

  const unitBarcodes = unitRecords.map((u) => u.unitBarcode).filter(Boolean);

  return {
    id: record.id,
    productId: record.productId,
    productNameSnapshot: record.productName || record.product?.name || record.productId,
    skuSnapshot: record.sku || record.product?.sku || '',
    expectedQuantity: record.expectedQuantity,
    receivedQuantity: record.receivedQuantity,
    acceptedQuantity,
    damagedQuantity: record.damagedQuantity,
    unitCostSnapshot: unitCost,
    lineValue: unitCost * acceptedQuantity,
    serialNumbers,
    unitBarcodes,
    unitRecords,
    barcodesConfirmed: unitBarcodes.length > 0,
    uom: record.uom || record.product?.unitOfMeasure || 'PCS',
    cableSpecs: record.cableSpecs as GRNItem['cableSpecs'],
  };
}

export function mapGrn(record: GrnApiRecord): GRN {
  const items = (record.grnProducts ?? []).map(mapGrnProduct);
  const calculatedValue = items.reduce((total, item) => total + item.lineValue, 0);

  return {
    id: record.id,
    grnNumber: record.grnNumber,
    sourceType: record.poId ? 'PO' : 'MANUAL',
    poId: record.poId ?? undefined,
    poNumber: record.poNumber ?? undefined,
    purchaseOrderId: record.poId ?? undefined,
    purchaseOrderNumber: record.poNumber ?? undefined,
    supplierId: record.supplierId,
    supplierName: record.supplierName || record.supplier?.name || '',
    supplierAddress: record.supplier?.address ?? undefined,
    supplierContact: record.supplier?.phone ?? undefined,
    supplierEmail: record.supplier?.email ?? undefined,
    supplierInvoiceNumber: record.supplierInvoiceNumber ?? undefined,
    receivedDate: record.receivedDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    warehouseId: 'WH-MAIN',
    status: record.status,
    items,
    totalValue: Number(record.costing?.totalLandedCost ?? calculatedValue),
    receivedById: record.receivedById,
    receivedByName: record.receivedByName ?? undefined,
    verifiedById: record.verifiedById ?? undefined,
    verifiedByName: record.verifiedByName ?? undefined,
    approvedById: record.approvedById ?? undefined,
    approvedByName: record.approvedByName ?? undefined,
    notes: record.notes ?? undefined,
    backendManaged: true,
    costing: (record.costing as any) ?? undefined,
  };
}

function queryString(params: GrnListQueryParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(Math.min(params.limit, 100)));
  if (params.status) query.set('status', params.status);
  if (params.poId) query.set('poId', params.poId);
  if (params.search?.trim()) query.set('search', params.search.trim());
  return query.toString();
}

export const grnsApi = {
  list: async (params: GrnListQueryParams = {}, signal?: AbortSignal) => {
    const qs = queryString(params);
    const result = await apiGetPaginated<GrnApiRecord>(`/grns${qs ? `?${qs}` : ''}`, {
      signal,
      suppressErrorToast: true,
    });
    return {
      ...result,
      data: result.data.map(mapGrn),
    };
  },

  getById: async (id: string, signal?: AbortSignal): Promise<GRN> =>
    mapGrn(
      await apiGet<GrnApiRecord>(`/grns/${encodeURIComponent(id)}`, {
        signal,
        suppressErrorToast: true,
      }),
    ),

  create: (payload: CreateGrnPayload) =>
    apiPost<GrnApiRecord>('/grns', payload, { suppressErrorToast: true }),

  intakeUnits: (id: string, payload: IntakeUnitsPayload) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/intake-units`, payload, {
      suppressErrorToast: true,
    }),

  submit: (id: string, payload: GrnActionPayload = {}) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/submit`, payload, {
      suppressErrorToast: true,
    }),

  verify: (id: string, payload: GrnActionPayload = {}) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/verify`, payload, {
      suppressErrorToast: true,
    }),

  approve: (id: string, payload: GrnActionPayload = {}) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/approve`, payload, {
      suppressErrorToast: true,
    }),

  reject: (id: string, payload: GrnActionPayload) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/reject`, payload, {
      suppressErrorToast: true,
    }),

  // Costing & Landed Apportionment APIs
  updateCosting: (id: string, payload: UpdateGrnCostingPayload) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/costing`, payload, {
      suppressErrorToast: true,
    }),

  completeCosting: (id: string) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/complete-costing`, {}, {
      suppressErrorToast: true,
    }),

  getCosting: (id: string, signal?: AbortSignal): Promise<GrnCostingCalculationResponse> =>
    apiGet<GrnCostingCalculationResponse>(`/grns/${encodeURIComponent(id)}/costing`, {
      signal,
      suppressErrorToast: true,
    }),

  // Pricing & Stock Batch Generation APIs
  assignPricing: (id: string, payload: UpdateGrnPricingPayload) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/pricing`, payload, {
      suppressErrorToast: true,
    }),

  completePricing: (id: string) =>
    apiPost<CapitalizeGrnResponse>(`/grns/${encodeURIComponent(id)}/complete-pricing`, {}, {
      suppressErrorToast: true,
    }),

  capitalize: (id: string): Promise<CapitalizeGrnResponse> =>
    apiPost<CapitalizeGrnResponse>(`/grns/${encodeURIComponent(id)}/capitalize`, {}, {
      suppressErrorToast: true,
    }),

  reverseCapitalize: (id: string, payload: { reversalReason: string; reversalDate?: string }): Promise<GrnApiRecord> =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/reverse`, payload, {
      suppressErrorToast: true,
    }),

  getBatches: (id: string, signal?: AbortSignal): Promise<GrnStockBatchItem[]> =>
    apiGet<GrnStockBatchItem[]>(`/grns/${encodeURIComponent(id)}/batches`, {
      signal,
      suppressErrorToast: true,
    }),
};
