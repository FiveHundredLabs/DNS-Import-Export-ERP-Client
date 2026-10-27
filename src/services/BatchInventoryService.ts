import { StockBatch } from '../types/inventory';
import { priceHistoryService } from './PriceHistoryService';

export const INITIAL_STOCK_BATCHES: StockBatch[] = [
  {
    id: 'batch-001',
    batchNumber: 'BATCH-2025-01',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    warehouseId: 'WH-MAIN',
    receivedDate: '2025-06-01',
    initialQuantity: 250,
    availableQuantity: 230,
    unitCost: 2200,
    sellingPrice: 3250,
    status: 'ACTIVE',
  },
  {
    id: 'batch-002',
    batchNumber: 'BATCH-2025-02',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    grnId: 'GRN-2025-005',
    grnNumber: 'GRN-2025-005',
    warehouseId: 'WH-MAIN',
    receivedDate: '2025-08-15',
    initialQuantity: 150,
    availableQuantity: 150,
    unitCost: 2400,
    sellingPrice: 3500,
    status: 'ACTIVE',
  },
  {
    id: 'batch-003',
    batchNumber: 'BATCH-2025-03',
    productId: 'prod-002',
    productName: 'Schneider Acti9 63A Triple Pole MCB',
    sku: 'DNS-MCB-63A-3P',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    warehouseId: 'WH-MAIN',
    receivedDate: '2025-06-01',
    initialQuantity: 180,
    availableQuantity: 168,
    unitCost: 5800,
    sellingPrice: 8400,
    status: 'ACTIVE',
  },
  {
    id: 'batch-004',
    batchNumber: 'BATCH-2025-04',
    productId: 'prod-003',
    productName: 'Kelani 4.0mm² Single Core Copper Cable',
    sku: 'DNS-CAB-4MM-CU',
    grnId: 'GRN-2025-002',
    grnNumber: 'GRN-2025-002',
    warehouseId: 'WH-MAIN',
    receivedDate: '2025-06-15',
    initialQuantity: 85,
    availableQuantity: 80,
    unitCost: 18500,
    sellingPrice: 24800,
    status: 'ACTIVE',
  },
  {
    id: 'batch-005',
    batchNumber: 'BATCH-2025-05',
    productId: 'prod-004',
    productName: 'Philips SmartBright 600x600 48W Recessed Panel',
    sku: 'DNS-LED-PNL-48W',
    grnId: 'GRN-2025-003',
    grnNumber: 'GRN-2025-003',
    warehouseId: 'WH-MAIN',
    receivedDate: '2025-07-01',
    initialQuantity: 320,
    availableQuantity: 310,
    unitCost: 4200,
    sellingPrice: 5600,
    status: 'ACTIVE',
  },
  {
    id: 'batch-006',
    batchNumber: 'BATCH-2025-06',
    productId: 'prod-005',
    productName: 'Growatt 5000ES 5kW Off-Grid Solar Inverter',
    sku: 'DNS-SOL-INV-5KW',
    grnId: 'GRN-2025-004',
    grnNumber: 'GRN-2025-004',
    warehouseId: 'WH-MAIN',
    receivedDate: '2025-07-15',
    initialQuantity: 22,
    availableQuantity: 10,
    unitCost: 195000,
    sellingPrice: 245000,
    status: 'ACTIVE',
  },
];

export class BatchInventoryService {
  private batches: StockBatch[] = [...INITIAL_STOCK_BATCHES];

  getAllBatches(): StockBatch[] {
    return [...this.batches];
  }

  getBatchesByProductId(productId: string): StockBatch[] {
    return this.batches.filter((b) => b.productId === productId);
  }

  getActiveBatches(productId: string): StockBatch[] {
    return this.batches.filter(
      (b) => b.productId === productId && b.status === 'ACTIVE' && b.availableQuantity > 0
    );
  }

  getBatchById(batchId: string): StockBatch | undefined {
    return this.batches.find((b) => b.id === batchId);
  }

  getPriceRange(productId: string): {
    minPrice: number;
    maxPrice: number;
    activeBatchCount: number;
    hasMultiplePrices: boolean;
    prices: number[];
  } {
    const active = this.getActiveBatches(productId);
    if (active.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        activeBatchCount: 0,
        hasMultiplePrices: false,
        prices: [],
      };
    }

    const prices = Array.from(new Set(active.map((b) => b.sellingPrice))).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];

    return {
      minPrice,
      maxPrice,
      activeBatchCount: active.length,
      hasMultiplePrices: prices.length > 1,
      prices,
    };
  }

  createBatch(batchData: Omit<StockBatch, 'id'>): StockBatch {
    const newBatch: StockBatch = {
      ...batchData,
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.batches.unshift(newBatch);
    return newBatch;
  }

  updateBatchPrice(
    batchId: string,
    newPrice: number,
    actorName: string = 'Finance Manager',
    reason?: string
  ): StockBatch | undefined {
    const idx = this.batches.findIndex((b) => b.id === batchId);
    if (idx < 0) return undefined;

    const oldBatch = this.batches[idx];
    const oldPrice = oldBatch.sellingPrice;

    this.batches[idx] = {
      ...oldBatch,
      sellingPrice: newPrice,
    };

    priceHistoryService.recordPriceChange({
      productId: oldBatch.productId,
      productName: oldBatch.productName,
      sku: oldBatch.sku,
      batchId: oldBatch.id,
      batchNumber: oldBatch.batchNumber,
      oldPrice,
      newPrice,
      strategy: 'PRESERVE_BATCH',
      changeReason: reason || `Updated batch ${oldBatch.batchNumber} selling price`,
      changedBy: actorName,
      affectedBatchCount: 1,
    });

    return this.batches[idx];
  }

  standardizeProductBatchPrices(
    productId: string,
    newPrice: number,
    actorName: string = 'Finance Manager',
    reason?: string
  ): { affectedCount: number; updatedBatches: StockBatch[] } {
    const updatedBatches: StockBatch[] = [];
    let affectedCount = 0;
    let oldPriceBaseline = 0;

    this.batches = this.batches.map((batch) => {
      if (batch.productId === productId && batch.status === 'ACTIVE') {
        if (!oldPriceBaseline) oldPriceBaseline = batch.sellingPrice;
        affectedCount += 1;
        const updated = { ...batch, sellingPrice: newPrice };
        updatedBatches.push(updated);
        return updated;
      }
      return batch;
    });

    priceHistoryService.recordPriceChange({
      productId,
      productName: updatedBatches[0]?.productName,
      sku: updatedBatches[0]?.sku,
      oldPrice: oldPriceBaseline || newPrice,
      newPrice,
      strategy: 'STANDARDIZE_UNIFORM',
      changeReason:
        reason ||
        `Standardized selling price across all ${affectedCount} active unsold batch(es)`,
      changedBy: actorName,
      affectedBatchCount: affectedCount,
    });

    return { affectedCount, updatedBatches };
  }

  deductBatchStock(batchId: string, quantity: number): StockBatch {
    const idx = this.batches.findIndex((b) => b.id === batchId);
    if (idx < 0) throw new Error(`Batch not found: ${batchId}`);

    const batch = this.batches[idx];
    const newQty = Math.max(0, batch.availableQuantity - quantity);
    const newStatus = newQty === 0 ? 'DEPLETED' : batch.status;

    this.batches[idx] = {
      ...batch,
      availableQuantity: newQty,
      status: newStatus,
    };

    return this.batches[idx];
  }

  reset(): void {
    this.batches = [...INITIAL_STOCK_BATCHES];
  }
}

export const batchInventoryService = new BatchInventoryService();
