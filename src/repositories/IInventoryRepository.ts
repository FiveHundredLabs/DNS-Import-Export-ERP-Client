import { StockBalance, StockMovement } from '../types/inventory';

export interface IInventoryRepository {
  getBalance(productId: string, locationId: string): Promise<StockBalance | null>;
  saveBalance(balance: StockBalance): Promise<void>;
  addMovement(movement: StockMovement): Promise<void>;
  getAllBalances(): Promise<StockBalance[]>;
  getMovements(): Promise<StockMovement[]>;
}
