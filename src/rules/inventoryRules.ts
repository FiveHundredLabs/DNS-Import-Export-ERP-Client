import { GRNItem, StockBalance } from '../types/inventory';

export function validateGRNReceipt(item: GRNItem): boolean {
  if (item.receivedQuantity <= 0) throw new Error("receivedQuantity must be > 0");
  if (item.damagedQuantity > item.receivedQuantity) throw new Error("damagedQuantity cannot exceed receivedQuantity");
  return true;
}

export function canIssueFromStock(productId: string, locationId: string, requestedQty: number, stockBalance: StockBalance): boolean {
  if (stockBalance.locationType === 'DAMAGED') return false;
  return calculateAvailableForSale(stockBalance) >= requestedQty;
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
