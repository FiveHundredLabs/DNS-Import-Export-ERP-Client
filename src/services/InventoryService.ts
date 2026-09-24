import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { StockMovement, StockBalance } from '../types/inventory';
import { canIssueFromStock, validateStockAdjustment } from '../rules/inventoryRules';

export class InventoryService {
  constructor(private repo: IInventoryRepository) {}

  async adjustStock(productId: string, locationId: string, locationType: any, qtyDiff: number, reason: string, actorId: string, actorName: string) {
    validateStockAdjustment(reason, qtyDiff);
    let balance = await this.repo.getBalance(productId, locationId);
    if (!balance) {
      balance = {
        id: Math.random().toString(), productId, locationId, locationType,
        availableQuantity: 0, reservedQuantity: 0, damagedQuantity: 0, returnedQuantity: 0,
        lastUpdated: new Date().toISOString()
      };
    }
    balance.availableQuantity += qtyDiff;
    await this.repo.saveBalance(balance);

    await this.repo.addMovement({
      id: Math.random().toString(),
      productId,
      targetLocation: locationId,
      quantity: qtyDiff,
      movementType: 'ADJUSTMENT',
      referenceDocumentType: 'MANUAL',
      referenceDocumentId: '',
      performedById: actorId,
      performedByName: actorName,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  async getAllStockBalances(filters?: any): Promise<StockBalance[]> {
    return this.repo.getAllBalances();
  }

  async getStockMovements(filters?: any): Promise<StockMovement[]> {
    return this.repo.getMovements();
  }

  async executeDamageReversal(productId: string, locationId: string, quantity: number, user: any): Promise<void> {
    let balance = await this.repo.getBalance(productId, locationId);
    if (!balance || balance.damagedQuantity < quantity) {
      throw new Error('Not enough damaged quantity to reverse');
    }
    
    balance.damagedQuantity -= quantity;
    balance.availableQuantity += quantity;
    await this.repo.saveBalance(balance);

    await this.repo.addMovement({
      id: Math.random().toString(),
      productId,
      targetLocation: locationId,
      quantity,
      movementType: 'DAMAGE_REVERSAL',
      referenceDocumentType: 'MANUAL',
      referenceDocumentId: '',
      performedById: user.id,
      performedByName: user.name,
      timestamp: new Date().toISOString()
    });
  }

  async executeStockTransfer(productId: string, fromLocationId: string, toLocationId: string, quantity: number, actorId: string, actorName: string) {
    return this.executeTransfer(fromLocationId, toLocationId, productId, quantity, { id: actorId, name: actorName });
  }

  async executeTransfer(fromLocationId: string, toLocationId: string, productId: string, quantity: number, user: any): Promise<void> {
    let fromBalance = await this.repo.getBalance(productId, fromLocationId);
    if (!fromBalance || fromBalance.availableQuantity < quantity) {
      throw new Error('Not enough available quantity to transfer');
    }
    
    fromBalance.availableQuantity -= quantity;
    await this.repo.saveBalance(fromBalance);

    let toBalance = await this.repo.getBalance(productId, toLocationId);
    if (!toBalance) {
      toBalance = {
        id: Math.random().toString(), productId, locationId: toLocationId, locationType: 'WAREHOUSE', // assuming for transfer
        availableQuantity: 0, reservedQuantity: 0, damagedQuantity: 0, returnedQuantity: 0,
        lastUpdated: new Date().toISOString()
      };
    }
    toBalance.availableQuantity += quantity;
    await this.repo.saveBalance(toBalance);

    await this.repo.addMovement({
      id: Math.random().toString(),
      productId,
      sourceLocation: fromLocationId,
      quantity,
      movementType: 'TRANSFER_OUT',
      referenceDocumentType: 'TRANSFER',
      referenceDocumentId: '',
      performedById: user.id,
      performedByName: user.name,
      timestamp: new Date().toISOString()
    });

    await this.repo.addMovement({
      id: Math.random().toString(),
      productId,
      targetLocation: toLocationId,
      quantity,
      movementType: 'TRANSFER_IN',
      referenceDocumentType: 'TRANSFER',
      referenceDocumentId: '',
      performedById: user.id,
      performedByName: user.name,
      timestamp: new Date().toISOString()
    });
  }

  async executeSalesIssue(
    productId: string,
    locationId: string,
    quantity: number,
    referenceDocumentId: string,
    user: { id: string; name: string }
  ): Promise<void> {
    const balance = await this.repo.getBalance(productId, locationId);
    if (!balance || !canIssueFromStock(productId, locationId, quantity, balance)) {
      throw new Error(`Insufficient stock to issue for product ${productId} at location ${locationId}`);
    }

    balance.availableQuantity -= quantity;
    balance.lastUpdated = new Date().toISOString();
    await this.repo.saveBalance(balance);

    await this.repo.addMovement({
      id: Math.random().toString(),
      productId,
      sourceLocation: locationId,
      quantity,
      movementType: 'SALES_ISSUE',
      referenceDocumentType: 'SALES_ORDER',
      referenceDocumentId,
      performedById: user.id,
      performedByName: user.name,
      timestamp: new Date().toISOString(),
    });
  }
}

import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
export const inventoryService = new InventoryService(new MockInventoryRepository());
