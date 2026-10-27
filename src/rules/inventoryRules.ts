import { GRNItem, StockBalance } from '../types/inventory';

export function validateGRNReceipt(item: GRNItem): boolean {
  if (item.receivedQuantity <= 0) throw new Error("receivedQuantity must be > 0");
  if (item.damagedQuantity > item.receivedQuantity) throw new Error("damagedQuantity cannot exceed receivedQuantity");
  return true;
}

export function canIssueFromStock(productId: string, locationId: string, requestedQty: number, stockBalance: StockBalance): boolean {
  if (requestedQty <= 0) return false;
  if (stockBalance.locationType === 'DAMAGED') return false;
  if (stockBalance.availableQuantity <= 0) return false;
  const available = calculateAvailableForSale(stockBalance);
  // System strictly prevents stock from being issued/dispatched when available stock is negative or would become negative
  return available >= requestedQty && (stockBalance.availableQuantity - requestedQty) >= 0;
}

export function calculateAvailableForSale(stockBalance: StockBalance): number {
  return stockBalance.availableQuantity - stockBalance.reservedQuantity;
}

export function isLowStock(stockBalance: StockBalance, reorderThreshold: number): boolean {
  return calculateAvailableForSale(stockBalance) < reorderThreshold;
}

export function validateStockAdjustment(reason: string | undefined, quantity: number): boolean {
  if (!reason || reason.trim() === '') throw new Error("reason required for manual adjustments");
  return true;
}
