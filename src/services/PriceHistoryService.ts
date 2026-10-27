import { ProductSellingPriceHistory, PriceStrategyType } from '../types/inventory';

export const INITIAL_PRICE_HISTORY: ProductSellingPriceHistory[] = [
  {
    id: 'ph-001',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    batchId: 'batch-001',
    batchNumber: 'BATCH-2025-01',
    oldPrice: 3000,
    newPrice: 3250,
    strategy: 'PRESERVE_BATCH',
    changeReason: 'GRN Post-Costing: Inbound Landed Cost adjustment (PO-2025-001)',
    changedBy: 'Nadeeka Rathnayake (Finance)',
    changedAt: '2025-06-01T10:30:00Z',
    affectedBatchCount: 1,
  },
  {
    id: 'ph-002',
    productId: 'prod-001',
    productName: 'Schneider Acti9 32A Double Pole MCB',
    sku: 'DNS-MCB-32A-2P',
    batchId: 'batch-002',
    batchNumber: 'BATCH-2025-02',
    oldPrice: 3250,
    newPrice: 3500,
    strategy: 'PRESERVE_BATCH',
    changeReason: 'GRN Post-Costing: Currency exchange fluctuation on new shipment',
    changedBy: 'Nadeeka Rathnayake (Finance)',
    changedAt: '2025-08-15T14:15:00Z',
    affectedBatchCount: 1,
  },
  {
    id: 'ph-003',
    productId: 'prod-002',
    productName: 'Schneider Acti9 63A Triple Pole MCB',
    sku: 'DNS-MCB-63A-3P',
    batchId: 'batch-003',
    batchNumber: 'BATCH-2025-03',
    oldPrice: 7900,
    newPrice: 8400,
    strategy: 'STANDARDIZE_UNIFORM',
    changeReason: 'Annual supplier tariff revision standardized across unsold stock',
    changedBy: 'Nadeeka Rathnayake (Finance)',
    changedAt: '2025-07-01T09:00:00Z',
    affectedBatchCount: 2,
  },
  {
    id: 'ph-004',
    productId: 'prod-003',
    productName: 'Kelani 4.0mm² Single Core Copper Cable',
    sku: 'DNS-CAB-4MM-CU',
    batchId: 'batch-005',
    batchNumber: 'BATCH-2025-05',
    oldPrice: 23500,
    newPrice: 24800,
    strategy: 'PRESERVE_BATCH',
    changeReason: 'Copper commodity raw material increase on shipment GRN-2025-002',
    changedBy: 'Nadeeka Rathnayake (Finance)',
    changedAt: '2025-06-15T11:45:00Z',
    affectedBatchCount: 1,
  },
];

export class PriceHistoryService {
  private history: ProductSellingPriceHistory[] = [...INITIAL_PRICE_HISTORY];

  getHistoryByProductId(productId: string): ProductSellingPriceHistory[] {
    return this.history
      .filter((h) => h.productId === productId)
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }

  getAllHistory(): ProductSellingPriceHistory[] {
    return [...this.history].sort(
      (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  }

  recordPriceChange(
    entry: Partial<ProductSellingPriceHistory> & {
      productId: string;
      productSku?: string;
      previousSellingPrice?: number;
      newSellingPrice?: number;
      reason?: string;
      changedByName?: string;
      strategyApplied?: string;
    }
  ): ProductSellingPriceHistory {
    const oldPrice = entry.oldPrice ?? entry.previousSellingPrice ?? 0;
    const newPrice = entry.newPrice ?? entry.newSellingPrice ?? 0;
    const strategy =
      entry.strategy ??
      (entry.strategyApplied === 'PRESERVE_BATCH_PRICES'
        ? 'PRESERVE_BATCH'
        : (entry.strategyApplied as any)) ??
      'PRESERVE_BATCH';
    const changeReason = entry.changeReason || entry.reason || 'Price adjustment';
    const changedBy = entry.changedBy || entry.changedByName || 'Finance Manager';

    const newEntry: ProductSellingPriceHistory = {
      ...entry,
      id: `ph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: entry.productId,
      productName: entry.productName,
      sku: entry.sku || entry.productSku,
      batchId: entry.batchId,
      batchNumber: entry.batchNumber,
      oldPrice,
      newPrice,
      strategy,
      changeReason,
      changedBy,
      changedAt: entry.changedAt || new Date().toISOString(),
      affectedBatchCount: entry.affectedBatchCount ?? 1,
      previousSellingPrice: oldPrice,
      newSellingPrice: newPrice,
      reason: changeReason,
      changedByName: changedBy,
      strategyApplied: strategy,
    };
    this.history.unshift(newEntry);
    return newEntry;
  }

  reset(): void {
    this.history = [...INITIAL_PRICE_HISTORY];
  }
}

export const priceHistoryService = new PriceHistoryService();
