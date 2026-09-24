import { IStockTransferRepository } from '../IStockTransferRepository';
import { StockTransfer } from '../../types/inventory';

export class MockStockTransferRepository implements IStockTransferRepository {
  private transfers: StockTransfer[] = [];
  async getById(id: string): Promise<StockTransfer | null> { return this.transfers.find(t => t.id === id) || null; }
  async save(transfer: StockTransfer): Promise<void> {
    const idx = this.transfers.findIndex(t => t.id === transfer.id);
    if (idx >= 0) this.transfers[idx] = transfer;
    else this.transfers.push(transfer);
  }
  async getAll(): Promise<StockTransfer[]> { return this.transfers; }
}
