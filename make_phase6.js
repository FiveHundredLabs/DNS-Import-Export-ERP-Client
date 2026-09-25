const fs = require('fs');
const path = require('path');

const root = 'd:/dns erp/src';

const files = {
  'types/inventory.ts': `
export type StockLocation = 'WAREHOUSE' | 'SHOWROOM' | 'TRANSIT' | 'DAMAGED' | 'RETURNED';

export interface StockBalance {
  id: string;
  productId: string;
  locationId: string;
  locationType: StockLocation;
  availableQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  returnedQuantity: number;
  lastUpdated: string;
}

export type StockMovementType = 'GRN_INWARD' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'SALES_ISSUE' | 'SALES_RETURN' | 'DAMAGE_WRITE_OFF' | 'DAMAGE_REVERSAL' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productId: string;
  sourceLocation?: string;
  targetLocation?: string;
  quantity: number;
  movementType: StockMovementType;
  referenceDocumentType: string;
  referenceDocumentId: string;
  performedById: string;
  performedByName: string;
  reason?: string;
  timestamp: string;
}

export type GRNStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface GRNItem {
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  unitCostSnapshot: number;
  lineValue: number;
}

export interface GRN {
  id: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  status: GRNStatus;
  items: GRNItem[];
  totalValue: number;
  receivedById: string;
  submittedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  status: string;
  items: any[];
  requestedById: string;
  approvedById?: string;
  dispatchedAt?: string;
  receivedAt?: string;
}
`,
  'repositories/IInventoryRepository.ts': `
import { StockBalance, StockMovement } from '../types/inventory';

export interface IInventoryRepository {
  getBalance(productId: string, locationId: string): Promise<StockBalance | null>;
  saveBalance(balance: StockBalance): Promise<void>;
  addMovement(movement: StockMovement): Promise<void>;
  getAllBalances(): Promise<StockBalance[]>;
  getMovements(): Promise<StockMovement[]>;
}
`,
  'repositories/IGRNRepository.ts': `
import { GRN } from '../types/inventory';

export interface IGRNRepository {
  getById(id: string): Promise<GRN | null>;
  save(grn: GRN): Promise<void>;
  getAll(): Promise<GRN[]>;
}
`,
  'repositories/IStockTransferRepository.ts': `
import { StockTransfer } from '../types/inventory';

export interface IStockTransferRepository {
  getById(id: string): Promise<StockTransfer | null>;
  save(transfer: StockTransfer): Promise<void>;
  getAll(): Promise<StockTransfer[]>;
}
`,
  'repositories/mock/MockInventoryRepository.ts': `
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
`,
  'repositories/mock/MockGRNRepository.ts': `
import { IGRNRepository } from '../IGRNRepository';
import { GRN } from '../../types/inventory';

export class MockGRNRepository implements IGRNRepository {
  private grns: GRN[] = [];
  async getById(id: string): Promise<GRN | null> { return this.grns.find(g => g.id === id) || null; }
  async save(grn: GRN): Promise<void> {
    const idx = this.grns.findIndex(g => g.id === grn.id);
    if (idx >= 0) this.grns[idx] = grn;
    else this.grns.push(grn);
  }
  async getAll(): Promise<GRN[]> { return this.grns; }
}
`,
  'repositories/mock/MockStockTransferRepository.ts': `
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
`,
  'rules/inventoryRules.ts': `
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
`,
  'services/InventoryService.ts': `
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
}
`,
  'services/GRNService.ts': `
import { IGRNRepository } from '../repositories/IGRNRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { GRN } from '../types/inventory';
import { validateGRNReceipt } from '../rules/inventoryRules';

export class GRNService {
  constructor(private grnRepo: IGRNRepository, private invRepo: IInventoryRepository) {}

  async submitGRN(grn: GRN) {
    grn.items.forEach(validateGRNReceipt);
    grn.status = 'SUBMITTED';
    grn.submittedAt = new Date().toISOString();
    await this.grnRepo.save(grn);
  }

  async approveGRN(grnId: string, managerId: string, managerName: string) {
    const grn = await this.grnRepo.getById(grnId);
    if (!grn) throw new Error("GRN not found");
    grn.status = 'APPROVED';
    grn.approvedById = managerId;
    grn.approvedAt = new Date().toISOString();
    
    for (const item of grn.items) {
      let bal = await this.invRepo.getBalance(item.productId, grn.warehouseId);
      if (!bal) {
        bal = {
          id: Math.random().toString(),
          productId: item.productId,
          locationId: grn.warehouseId,
          locationType: 'WAREHOUSE',
          availableQuantity: 0,
          reservedQuantity: 0,
          damagedQuantity: 0,
          returnedQuantity: 0,
          lastUpdated: new Date().toISOString()
        };
      }
      const goodQty = item.receivedQuantity - item.damagedQuantity;
      bal.availableQuantity += goodQty;
      bal.damagedQuantity += item.damagedQuantity;
      await this.invRepo.saveBalance(bal);

      if (goodQty > 0) {
        await this.invRepo.addMovement({
          id: Math.random().toString(),
          productId: item.productId,
          targetLocation: grn.warehouseId,
          quantity: goodQty,
          movementType: 'GRN_INWARD',
          referenceDocumentType: 'GRN',
          referenceDocumentId: grn.id,
          performedById: managerId,
          performedByName: managerName,
          timestamp: new Date().toISOString()
        });
      }
    }
    await this.grnRepo.save(grn);
  }
}
`,
  'test/inventoryDomain.test.ts': `
import { describe, it, expect, beforeEach } from 'vitest';
import { GRNService } from '../services/GRNService';
import { MockGRNRepository } from '../repositories/mock/MockGRNRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { GRN } from '../types/inventory';
import { canIssueFromStock } from '../rules/inventoryRules';

describe('Inventory Domain', () => {
  let grnRepo: MockGRNRepository;
  let invRepo: MockInventoryRepository;
  let grnService: GRNService;

  beforeEach(() => {
    grnRepo = new MockGRNRepository();
    invRepo = new MockInventoryRepository();
    grnService = new GRNService(grnRepo, invRepo);
  });

  it('approves GRN and updates stock balances', async () => {
    const grn: GRN = {
      id: 'g1', grnNumber: 'GRN-001', supplierId: 's1', supplierName: 'Supp',
      warehouseId: 'w1', status: 'DRAFT', totalValue: 100, receivedById: 'u1',
      items: [
        { productId: 'p1', productNameSnapshot: 'P1', skuSnapshot: 'SKU1', expectedQuantity: 10, receivedQuantity: 10, damagedQuantity: 2, unitCostSnapshot: 10, lineValue: 100 }
      ]
    };
    await grnRepo.save(grn);
    await grnService.approveGRN('g1', 'm1', 'Manager');
    
    const bal = await invRepo.getBalance('p1', 'w1');
    expect(bal?.availableQuantity).toBe(8);
    expect(bal?.damagedQuantity).toBe(2);
    
    const movs = await invRepo.getMovements();
    expect(movs.length).toBe(1);
    expect(movs[0].movementType).toBe('GRN_INWARD');
    expect(movs[0].quantity).toBe(8);
  });

  it('canIssueFromStock works correctly', () => {
    const bal = {
      id: 'b1', productId: 'p1', locationId: 'l1', locationType: 'WAREHOUSE' as any,
      availableQuantity: 10, reservedQuantity: 2, damagedQuantity: 0, returnedQuantity: 0, lastUpdated: ''
    };
    expect(canIssueFromStock('p1', 'l1', 8, bal)).toBe(true);
    expect(canIssueFromStock('p1', 'l1', 9, bal)).toBe(false);
  });
});
`,
  'test/inventoryComponents.test.tsx': `
import { describe, it, expect } from 'vitest';
import React from 'react';

describe('Inventory Components', () => {
  it('placeholder test', () => {
    expect(true).toBe(true);
  });
});
`
};

for (const [relPath, content] of Object.entries(files)) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\\n');
}
console.log('Files generated successfully.');
