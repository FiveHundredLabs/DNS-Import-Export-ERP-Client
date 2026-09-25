import { StockTransfer } from '../types/inventory';

export interface IStockTransferRepository {
  getById(id: string): Promise<StockTransfer | null>;
  save(transfer: StockTransfer): Promise<void>;
  getAll(): Promise<StockTransfer[]>;
}
