import { apiGet, apiGetPaginated, apiPost } from '../client';
import type { GRN, GRNItem } from '../../types/inventory';

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
  costing?: { totalLandedCost?: string | number | null } | null;
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
    unitBarcode: u.barcode || '',
    barcode: u.barcode || '',
    serialNumber: u.serialNumber || undefined,
    unitIndex: u.unitIndex || idx + 1,
    isDamaged: Boolean(u.isDamaged),
    unitSeq: u.unitSeq,
  }));

  const unitBarcodes = unitRecords.map((u) => u.unitBarcode).filter(Boolean);

  return {
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
  };
}

function queryString(params: { page?: number; limit?: number; status?: string; poId?: string; search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(Math.min(params.limit, 100)));
  if (params.status) query.set('status', params.status);
  if (params.poId) query.set('poId', params.poId);
  if (params.search?.trim()) query.set('search', params.search.trim());
  return query.toString();
}

export const grnsApi = {
  list: async (params: { page?: number; limit?: number; status?: string; poId?: string; search?: string } = {}, signal?: AbortSignal) => {
    const qs = queryString(params);
    return apiGetPaginated<GrnApiRecord>(`/grns${qs ? `?${qs}` : ''}`, {
      signal,
      suppressErrorToast: true,
    });
  },

  getById: async (id: string, signal?: AbortSignal) =>
    mapGrn(await apiGet<GrnApiRecord>(`/grns/${encodeURIComponent(id)}`, {
      signal,
      suppressErrorToast: true,
    })),

  create: (payload: CreateGrnPayload) =>
    apiPost<GrnApiRecord>('/grns', payload, { suppressErrorToast: true }),

  intakeUnits: (id: string, payload: IntakeUnitsPayload) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/intake-units`, payload, { suppressErrorToast: true }),

  submit: (id: string, payload: GrnActionPayload = {}) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/submit`, payload, { suppressErrorToast: true }),

  verify: (id: string, payload: GrnActionPayload = {}) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/verify`, payload, { suppressErrorToast: true }),

  approve: (id: string, payload: GrnActionPayload = {}) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/approve`, payload, { suppressErrorToast: true }),

  reject: (id: string, payload: GrnActionPayload) =>
    apiPost<GrnApiRecord>(`/grns/${encodeURIComponent(id)}/reject`, payload, { suppressErrorToast: true }),
};

