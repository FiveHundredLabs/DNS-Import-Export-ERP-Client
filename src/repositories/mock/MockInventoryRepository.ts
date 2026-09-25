import { IInventoryRepository } from '../IInventoryRepository';
import { StockBalance, StockMovement } from '../../types/inventory';

export class MockInventoryRepository implements IInventoryRepository {
  private balances: StockBalance[] = [];
  private movements: StockMovement[] = [];

  async getBalance(productId: string, locationId: string): Promise<StockBalance | null> {
    return this.balances.find(b => b.productId === productId && b.locationId === locationId) || null;
  }
  async saveBalance(balance: StockBalance): Promise<void> {
    const idx = this.balances.findIndex(b => b.id === balance.id);
    if (idx >= 0) this.balances[idx] = balance;
    else this.balances.push(balance);
  }
  async addMovement(movement: StockMovement): Promise<void> {
    this.movements.push(movement);
  }
  async getAllBalances(): Promise<StockBalance[]> { return this.balances; }
  async getMovements(): Promise<StockMovement[]> { return this.movements; }
}
