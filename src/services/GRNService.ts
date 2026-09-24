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

  async approveGRN(grnId: string, managerId: string, managerName: string, role?: string) {
    if (role && role !== 'MANAGER' && role !== 'DIRECTOR') {
      throw new Error(`Role ${role} is not authorized to approve GRNs.`);
    }
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

  async getGRNs(filters?: any): Promise<GRN[]> {
    return this.grnRepo.getAll();
  }

  async rejectGRN(grnId: string, reason: string, rejectedById: string, rejectedByName: string, role?: string): Promise<void> {
    if (role && role !== 'MANAGER' && role !== 'DIRECTOR') {
      throw new Error(`Role ${role} is not authorized to reject GRNs.`);
    }
    const grn = await this.grnRepo.getById(grnId);
    if (!grn) throw new Error("GRN not found");
    grn.status = 'REJECTED';
    grn.notes = (grn.notes || '') + '\nRejected Reason: ' + reason;
    await this.grnRepo.save(grn);
  }
}

import { MockGRNRepository } from '../repositories/mock/MockGRNRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
export const grnService = new GRNService(new MockGRNRepository(), new MockInventoryRepository());
