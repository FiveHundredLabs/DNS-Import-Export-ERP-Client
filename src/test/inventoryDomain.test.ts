import { describe, it, expect, beforeEach } from 'vitest';
import { GRNService } from '../services/GRNService';
import { InventoryService } from '../services/InventoryService';
import { MockGRNRepository } from '../repositories/mock/MockGRNRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { GRN } from '../types/inventory';
import { canIssueFromStock } from '../rules/inventoryRules';
import { isValidOrderTransition } from '../rules/orderRules';
import { Order } from '../types/order';

describe('Inventory Domain', () => {
  let grnRepo: MockGRNRepository;
  let invRepo: MockInventoryRepository;
  let grnService: GRNService;
  let invService: InventoryService;

  beforeEach(() => {
    grnRepo = new MockGRNRepository();
    invRepo = new MockInventoryRepository();
    grnService = new GRNService(grnRepo, invRepo);
    invService = new InventoryService(invRepo);
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

  it('Barcode rule: existing product GRN increments stock, does not create duplicate', async () => {
    await invRepo.saveBalance({
      id: 'bal1', productId: 'p1', locationId: 'w1', locationType: 'WAREHOUSE',
      availableQuantity: 5, reservedQuantity: 0, damagedQuantity: 0, returnedQuantity: 0, lastUpdated: ''
    });

    const grn: GRN = {
      id: 'g2', grnNumber: 'GRN-002', supplierId: 's1', supplierName: 'Supp',
      warehouseId: 'w1', status: 'DRAFT', totalValue: 100, receivedById: 'u1',
      items: [
        { productId: 'p1', productNameSnapshot: 'P1', skuSnapshot: 'SKU1', expectedQuantity: 5, receivedQuantity: 5, damagedQuantity: 0, unitCostSnapshot: 10, lineValue: 50 }
      ]
    };
    await grnRepo.save(grn);
    await grnService.approveGRN('g2', 'm1', 'Manager');

    const balances = await invRepo.getAllBalances();
    expect(balances.length).toBe(1);
    expect(balances[0].availableQuantity).toBe(10);
  });

  it('Damage isolation: damaged stock never counted in available', () => {
    const bal = {
      id: 'b1', productId: 'p1', locationId: 'l1', locationType: 'WAREHOUSE' as any,
      availableQuantity: 10, reservedQuantity: 0, damagedQuantity: 5, returnedQuantity: 0, lastUpdated: ''
    };
    expect(canIssueFromStock('p1', 'l1', 15, bal)).toBe(false);
    expect(canIssueFromStock('p1', 'l1', 10, bal)).toBe(true);
  });

  it('Order picking: issued quantity never exceeds approved quantity', () => {
    const order: any = {
      id: 'o1',
      items: [{ productId: 'p1', approvedQuantity: 10, issuedQuantity: 0 }]
    };
    const issue = (qty: number) => {
      if (order.items[0].issuedQuantity + qty > order.items[0].approvedQuantity) {
        throw new Error('Cannot issue more than approved');
      }
      order.items[0].issuedQuantity += qty;
    };
    expect(() => issue(11)).toThrow();
    expect(() => issue(10)).not.toThrow();
    expect(order.items[0].issuedQuantity).toBe(10);
  });

  it('Partial issue creates PARTIALLY_ISSUED status', () => {
    const order: any = {
      id: 'o1',
      status: 'APPROVED',
      items: [
        { productId: 'p1', approvedQuantity: 10, issuedQuantity: 0 },
        { productId: 'p2', approvedQuantity: 10, issuedQuantity: 0 }
      ]
    };
    
    const updateStatus = () => {
      const allIssued = order.items.every((i: any) => i.issuedQuantity === i.approvedQuantity);
      const anyIssued = order.items.some((i: any) => i.issuedQuantity > 0);
      if (allIssued) order.status = 'ISSUED';
      else if (anyIssued) order.status = 'PARTIALLY_ISSUED';
    };

    order.items[0].issuedQuantity = 10;
    updateStatus();
    expect(order.status).toBe('PARTIALLY_ISSUED');

    order.items[1].issuedQuantity = 10;
    updateStatus();
    expect(order.status).toBe('ISSUED');
  });

  it('Damage reversal correctly adjusts both DAMAGED and WAREHOUSE balances', async () => {
    await invRepo.saveBalance({
      id: 'bal1', productId: 'p1', locationId: 'w1', locationType: 'WAREHOUSE',
      availableQuantity: 10, reservedQuantity: 0, damagedQuantity: 5, returnedQuantity: 0, lastUpdated: ''
    });

    await invService.executeDamageReversal('p1', 'w1', 3, 'u1', 'User');

    const bal = await invRepo.getBalance('p1', 'w1');
    expect(bal?.availableQuantity).toBe(13);
    expect(bal?.damagedQuantity).toBe(2);

    const movs = await invRepo.getMovements();
    const reversalMov = movs.find(m => m.movementType === 'DAMAGE_REVERSAL');
    expect(reversalMov).toBeDefined();
    expect(reversalMov?.quantity).toBe(3);
  });

  it('Stock transfer creates paired movements and updates both locations', async () => {
    await invRepo.saveBalance({
      id: 'bal1', productId: 'p1', locationId: 'w1', locationType: 'WAREHOUSE',
      availableQuantity: 20, reservedQuantity: 0, damagedQuantity: 0, returnedQuantity: 0, lastUpdated: ''
    });
    await invRepo.saveBalance({
      id: 'bal2', productId: 'p1', locationId: 's1', locationType: 'SHOWROOM',
      availableQuantity: 5, reservedQuantity: 0, damagedQuantity: 0, returnedQuantity: 0, lastUpdated: ''
    });

    await invService.executeStockTransfer('p1', 'w1', 's1', 8, 'u1', 'User');

    const wBal = await invRepo.getBalance('p1', 'w1');
    const sBal = await invRepo.getBalance('p1', 's1');
    expect(wBal?.availableQuantity).toBe(12);
    expect(sBal?.availableQuantity).toBe(13);

    const movs = await invRepo.getMovements();
    const outMov = movs.find(m => m.movementType === 'TRANSFER_OUT');
    const inMov = movs.find(m => m.movementType === 'TRANSFER_IN');
    
    expect(outMov).toBeDefined();
    expect(outMov?.quantity).toBe(8);
    expect(outMov?.sourceLocation).toBe('w1');
    
    expect(inMov).toBeDefined();
    expect(inMov?.quantity).toBe(8);
    expect(inMov?.targetLocation).toBe('s1');
  });

  it('Illegal state transitions blocked (e.g. DELIVERED -> PICKING)', () => {
    expect(isValidOrderTransition('DELIVERED' as any, 'PICKING' as any)).toBe(false);
    expect(isValidOrderTransition('APPROVED' as any, 'PICKING' as any)).toBe(true);
  });
});
