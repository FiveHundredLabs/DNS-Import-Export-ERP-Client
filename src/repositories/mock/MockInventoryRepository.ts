import { IInventoryRepository } from '../IInventoryRepository';
import { StockBalance, StockMovement } from '../../types/inventory';
import { MOCK_STOCK_BALANCES, MOCK_STOCK_MOVEMENTS } from '../../mock/mockInventory';

export class MockInventoryRepository implements IInventoryRepository {
  private balances: StockBalance[] = JSON.parse(JSON.stringify(MOCK_STOCK_BALANCES));
  private movements: StockMovement[] = JSON.parse(JSON.stringify(MOCK_STOCK_MOVEMENTS));

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
  async getAllBalances(): Promise<StockBalance[]> { return JSON.parse(JSON.stringify(this.balances)); }
  async getMovements(): Promise<StockMovement[]> { return JSON.parse(JSON.stringify(this.movements)); }
}
