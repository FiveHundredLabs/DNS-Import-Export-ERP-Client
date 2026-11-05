import { IGRNRepository } from '../repositories/IGRNRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { GRN } from '../types/inventory';
import { validateGRNReceipt } from '../rules/inventoryRules';
import { MockGRNRepository } from '../repositories/mock/MockGRNRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { apService } from '../features/finance/services/apService';

export class GRNService {
  constructor(private grnRepo: IGRNRepository, private invRepo: IInventoryRepository) {}

  /**
   * Submit a GRN for workflow processing.
   * Scenario A: Stock Keeper creates GRN -> requires Stock Manager verification (PENDING_STOCK_MANAGER_APPROVAL).
   * Scenario B: Stock Manager creates GRN -> bypasses self-approval directly to Finance (SUBMITTED).
   */
  async submitGRN(grn: GRN, user?: { id?: string; name?: string; role?: string }) {
    if (!grn.purchaseOrderId && !grn.poId && !grn.poNumber) {
      throw new Error('BR-01 Violation: GRN must originate from an approved Purchase Order. Unlinked GRN creation is prohibited.');
    }
    grn.items.forEach(validateGRNReceipt);

    const creatorRole = user?.role || grn.createdByRole || (grn as any).receivedByRole;
    if (user) {
      if (user.id) grn.createdById = user.id;
      if (user.name) grn.createdByName = user.name;
      if (user.role) grn.createdByRole = user.role;
    }

    const isStockKeeper = creatorRole === 'STOCK_KEEPER';
    if (!isStockKeeper) {
      // Scenario B: Stock Manager / Admin creates GRN (or legacy call) - proceed directly to Finance
      grn.status = 'SUBMITTED';
      grn.stockManagerApproval = {
        status: 'APPROVED',
        approvedById: user?.id || grn.receivedById || 'system',
        approvedByName: user?.name || grn.receivedByName || 'Stock Manager',
        approvedAt: new Date().toISOString(),
        remarks: 'Direct submission by Stock Manager (Self-approval bypassed)',
      };
      grn.verifiedById = user?.id || grn.receivedById;
      grn.verifiedByName = user?.name || grn.receivedByName;
    } else {
      // Scenario A: Stock Keeper creates GRN - first goes to Stock Manager for verification
      grn.status = 'PENDING_STOCK_MANAGER_APPROVAL';
      grn.stockManagerApproval = {
        status: 'PENDING',
      };
    }

    grn.submittedAt = new Date().toISOString();
    await this.grnRepo.save(grn);
  }

  /**
   * Stock Manager physical verification and approval.
   * Verifies physical stock, damaged counts, serial numbers & barcodes.
   * Once approved, transitions to SUBMITTED so Finance can process Vendor Bill Landed Costing.
   */
  async verifyAndApproveGRN(
    grnId: string,
    manager: { id: string; name: string; role: string },
    remarks?: string
  ): Promise<GRN> {
    if (manager.role !== 'STOCK_MANAGER' && manager.role !== 'MANAGER' && manager.role !== 'DIRECTOR') {
      throw new Error(`Unauthorized: Role '${manager.role}' is not authorized to verify or approve GRNs. Requires STOCK_MANAGER authorization.`);
    }

    const grn = await this.grnRepo.getById(grnId);
    if (!grn) throw new Error('GRN not found');

    if (grn.status !== 'PENDING_STOCK_MANAGER_APPROVAL') {
      throw new Error(`GRN ${grn.grnNumber || grnId} is not pending Stock Manager verification (current status: ${grn.status}).`);
    }

    grn.status = 'SUBMITTED';
    grn.verifiedById = manager.id;
    grn.verifiedByName = manager.name;
    grn.stockManagerApproval = {
      status: 'APPROVED',
      approvedById: manager.id,
      approvedByName: manager.name,
      approvedAt: new Date().toISOString(),
      remarks: remarks || 'Physical quantities & barcode compliance verified by Stock Manager. Forwarded to Finance AP.',
    };
    grn.notes = (grn.notes ? grn.notes + '\n' : '') + `[Stock Manager Verification - ${manager.name}] ${remarks || 'Approved'}`;

    await this.grnRepo.save(grn);

    // Sync with Finance AP service so it is now visible in available GRNs
    try {
      apService.setGRNStatus(grn.id, 'SUBMITTED');
    } catch {
      // Ignore if finance sync in non-browser env
    }

    return grn;
  }

  /**
   * Stock Manager rejects the physical intake verification.
   * Finance must NOT receive the GRN, and no stock is released.
   */
  async rejectGRNVerification(
    grnId: string,
    manager: { id: string; name: string; role: string },
    reason: string
  ): Promise<GRN> {
    if (manager.role !== 'STOCK_MANAGER' && manager.role !== 'MANAGER' && manager.role !== 'DIRECTOR') {
      throw new Error(`Unauthorized: Role '${manager.role}' is not authorized to reject GRN verification. Requires STOCK_MANAGER authorization.`);
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error('Rejection requires a documented reason (minimum 3 characters)');
    }

    const grn = await this.grnRepo.getById(grnId);
    if (!grn) throw new Error('GRN not found');

    if (grn.status !== 'PENDING_STOCK_MANAGER_APPROVAL') {
      throw new Error(`GRN ${grn.grnNumber || grnId} is not pending Stock Manager verification (current status: ${grn.status}).`);
    }

    grn.status = 'STOCK_MANAGER_REJECTED';
    grn.rejectedReason = reason.trim();
    grn.stockManagerApproval = {
      status: 'REJECTED',
      rejectedById: manager.id,
      rejectedByName: manager.name,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason.trim(),
    };
    grn.notes = (grn.notes ? grn.notes + '\n' : '') + `[Stock Manager Rejection - ${manager.name}] ${reason.trim()}`;

    await this.grnRepo.save(grn);

    try {
      apService.setGRNStatus(grn.id, 'REJECTED');
    } catch {}

    return grn;
  }

  /**
   * Finance approval and inventory posting.
   * Only Finance or Executive Management can perform final approval to officially post physical stock to inventory.
   * Stock Manager physical verification approves the intake and forwards to Finance, but NEVER posts to inventory.
   */
  async approveGRN(grnId: string, managerId: string, managerName: string, role?: string) {
    if (role === 'STOCK_MANAGER') {
      throw new Error(
        'Stock Manager approval does not post directly to inventory. The GRN must be forwarded to Finance for approval. Only after Finance approves will stock be posted to inventory.'
      );
    }
    if (
      role &&
      role !== 'FINANCE_MANAGER' &&
      role !== 'FINANCE_OFFICER' &&
      role !== 'DIRECTOR' &&
      role !== 'MANAGER'
    ) {
      throw new Error(`Role ${role} is not authorized to approve GRNs into inventory. Only Finance or Executive Management can approve.`);
    }

    const grn = await this.grnRepo.getById(grnId);
    if (!grn) throw new Error('GRN not found');

    if (grn.status === 'PENDING_STOCK_MANAGER_APPROVAL') {
      throw new Error(
        `GRN ${grn.grnNumber || grnId} must first be verified and approved by the Stock Manager before Finance approval.`
      );
    }
    grn.status = 'APPROVED';
    grn.approvedById = managerId;
    grn.approvedByName = managerName;
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
          lastUpdated: new Date().toISOString(),
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
          timestamp: new Date().toISOString(),
        });
      }
    }
    await this.grnRepo.save(grn);
  }

  async getGRNById(id: string): Promise<GRN | null> {
    return this.grnRepo.getById(id);
  }

  async createGRN(grn: GRN, user?: any): Promise<GRN> {
    if (!grn.purchaseOrderId && !grn.poId && !grn.poNumber) {
      throw new Error('BR-01 Violation: GRN must originate from an approved Purchase Order. Unlinked GRN creation is prohibited.');
    }
    grn.status = 'DRAFT';
    if (user) {
      if (user.id) grn.createdById = user.id;
      if (user.name) grn.createdByName = user.name;
      if (user.role) grn.createdByRole = user.role;
    }
    await this.grnRepo.save(grn);
    return grn;
  }

  async getGRNs(filters?: any): Promise<GRN[]> {
    return this.grnRepo.getAll();
  }

  async getAll(): Promise<GRN[]> {
    return this.grnRepo.getAll();
  }

  async rejectGRN(grnId: string, reason: string, rejectedById: string, rejectedByName: string, role?: string): Promise<void> {
    if (role && role !== 'MANAGER' && role !== 'DIRECTOR' && role !== 'STOCK_MANAGER') {
      throw new Error(`Role ${role} is not authorized to reject GRNs.`);
    }
    const grn = await this.grnRepo.getById(grnId);
    if (!grn) throw new Error('GRN not found');
    grn.status = 'REJECTED';
    grn.notes = (grn.notes || '') + '\nRejected Reason: ' + reason;
    await this.grnRepo.save(grn);
  }
}

export const grnRepository = MockGRNRepository.getInstance();
export const inventoryRepository = new MockInventoryRepository();
export const grnService = new GRNService(grnRepository, inventoryRepository);
