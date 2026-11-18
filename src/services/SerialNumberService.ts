import { SerialNumberRecord, SerialNumberStatus } from '../types/inventory';
import { productService } from './ProductService';

const INITIAL_SERIALS: SerialNumberRecord[] = [];

class SerialNumberService {
  private records: SerialNumberRecord[] = JSON.parse(JSON.stringify(INITIAL_SERIALS));

  public async getAll(): Promise<SerialNumberRecord[]> {
    return [...this.records];
  }

  public async getFiltered(params: {
    query?: string;
    status?: string;
    locationId?: string;
    productId?: string;
    grnId?: string;
  }): Promise<SerialNumberRecord[]> {
    let result = [...this.records];

    if (params.query?.trim()) {
      const q = params.query.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.serialNumber.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          (r.grnNumber && r.grnNumber.toLowerCase().includes(q)) ||
          (r.orderNumber && r.orderNumber.toLowerCase().includes(q)) ||
          (r.customerName && r.customerName.toLowerCase().includes(q)) ||
          r.barcode.includes(q)
      );
    }

    if (params.status && params.status !== 'ALL') {
      result = result.filter((r) => r.status === params.status);
    }

    if (params.locationId && params.locationId !== 'ALL') {
      result = result.filter((r) => r.locationId === params.locationId);
    }

    if (params.productId && params.productId !== 'ALL') {
      result = result.filter((r) => r.productId === params.productId);
    }

    if (params.grnId && params.grnId !== 'ALL') {
      result = result.filter((r) => r.grnId === params.grnId);
    }

    return result;
  }

  public async getBySerialNumber(serial: string): Promise<SerialNumberRecord | null> {
    const trimmed = serial.trim().toUpperCase();
    return this.records.find((r) => r.serialNumber.toUpperCase() === trimmed) || null;
  }

  public isSerialRegistered(serial: string): boolean {
    if (!serial) return false;
    const trimmed = serial.trim().toUpperCase();
    return this.records.some((r) => r.serialNumber.toUpperCase() === trimmed);
  }

  public async registerBatch(params: {
    productId: string;
    locationId: string;
    locationName: string;
    binLocation?: string;
    grnId?: string;
    grnNumber?: string;
    receivedBy: string;
    serialNumbers: string[];
  }): Promise<{ registeredCount: number; duplicates: string[] }> {
    const product = await productService.getProduct(params.productId);
    if (!product) throw new Error('Product not found');

    const duplicates: string[] = [];
    const validToAdd: string[] = [];

    params.serialNumbers.forEach((sn) => {
      const clean = sn.trim();
      if (!clean) return;
      if (this.records.some((r) => r.serialNumber.toUpperCase() === clean.toUpperCase())) {
        duplicates.push(clean);
      } else {
        validToAdd.push(clean);
      }
    });

    const now = new Date().toISOString();
    validToAdd.forEach((sn) => {
      this.records.unshift({
        id: `sn-auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        serialNumber: sn,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        locationId: params.locationId,
        locationName: params.locationName,
        binLocation: params.binLocation || 'Warehouse General Bay',
        status: 'IN_STOCK',
        grnId: params.grnId,
        grnNumber: params.grnNumber,
        receivedDate: now,
        receivedBy: params.receivedBy,
      });
    });

    return { registeredCount: validToAdd.length, duplicates };
  }

  public async updateStatus(
    id: string,
    status: SerialNumberStatus,
    options?: { locationId?: string; locationName?: string; binLocation?: string; notes?: string }
  ): Promise<SerialNumberRecord> {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Serial number record not found');

    const updated: SerialNumberRecord = {
      ...this.records[idx],
      status,
      ...(options?.locationId && { locationId: options.locationId }),
      ...(options?.locationName && { locationName: options.locationName }),
      ...(options?.binLocation && { binLocation: options.binLocation }),
      ...(options?.notes !== undefined && { notes: options.notes }),
    };

    this.records[idx] = updated;
    return updated;
  }

  public async getSummary() {
    const total = this.records.length;
    const inStock = this.records.filter((r) => r.status === 'IN_STOCK').length;
    const allocated = this.records.filter((r) => r.status === 'ALLOCATED').length;
    const dispatched = this.records.filter((r) => r.status === 'DISPATCHED').length;
    const damaged = this.records.filter((r) => r.status === 'DAMAGED').length;

    return { total, inStock, allocated, dispatched, damaged };
  }

  public resetToDefaults() {
    this.records = JSON.parse(JSON.stringify(INITIAL_SERIALS));
  }
}

export const serialNumberService = new SerialNumberService();
