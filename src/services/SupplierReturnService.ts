import { SupplierReturn, CreateSupplierReturnDTO, SupplierReturnStatus } from '../types/purchasing';
import { User } from '../types/auth';
import { apService } from '../features/finance/services/apService';
import { hasPermission } from '../rules/permissions';

class SupplierReturnService {
  private returns: SupplierReturn[] = [
    {
      id: 'ret-001',
      returnNumber: 'SR-2026-081',
      supplierId: 'sup-001',
      supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
      supplierCode: 'SUP-SCH-001',
      originalPoId: 'po-101',
      originalPoNumber: 'PO-2026-101',
      grnId: 'grn-001',
      grnNumber: 'GRN-2026-001',
      returnDate: '2026-10-15',
      reasonCategory: 'DEFECTIVE_DAMAGED',
      reasonDescription: 'Defective trip coils identified during warehouse batch quality intake',
      warehouseId: 'WH-MAIN',
      items: [
        {
          id: 'item-ret-1',
          productId: 'prod-001',
          productCode: 'DNS-MCB-32A-2P',
          productName: 'Schneider Acti9 32A Double Pole MCB',
          returnedQuantity: 5,
          unitCost: 2800,
          lineTotal: 14000,
          reason: 'Defective internal trip coil mechanism',
        },
      ],
      totalAmount: 14000,
      status: 'APPROVED',
      createdBy: 'usr-107',
      createdByName: 'Kasun Bandara (Purchasing Officer)',
      approvedBy: 'usr-101',
      approvedByName: 'Anura Perera (Purchasing Manager)',
      approvedAt: '2026-10-15T14:30:00.000Z',
      linkedDebitNoteId: 'dn-2026-081',
      linkedDebitNoteNumber: 'DN-2026-081',
      createdAt: '2026-10-15T11:00:00.000Z',
      updatedAt: '2026-10-15T14:30:00.000Z',
    },
  ];

  async getReturns(): Promise<SupplierReturn[]> {
    return [...this.returns];
  }

  async getReturnById(id: string): Promise<SupplierReturn | null> {
    return this.returns.find((r) => r.id === id) || null;
  }

  async createReturn(dto: CreateSupplierReturnDTO, currentUser: User): Promise<SupplierReturn> {
    if (!dto.items || dto.items.length === 0) {
      throw new Error('At least one item must be added for a supplier return.');
    }

    for (const item of dto.items) {
      if (!item.returnedQuantity || item.returnedQuantity <= 0) {
        throw new Error(`Returned quantity must be greater than zero for ${item.productName}`);
      }
      if (item.unitCost < 0) {
        throw new Error(`Unit cost cannot be negative for ${item.productName}`);
      }
    }

    const itemsWithTotals = dto.items.map((it, idx) => ({
      id: `ret-item-${Date.now()}-${idx}`,
      productId: it.productId,
      productCode: it.productCode,
      productName: it.productName,
      returnedQuantity: it.returnedQuantity,
      unitCost: it.unitCost,
      lineTotal: it.returnedQuantity * it.unitCost,
      reason: it.reason || dto.reasonDescription,
    }));

    const totalAmount = itemsWithTotals.reduce((sum, it) => sum + it.lineTotal, 0);
    const returnNumber = `SR-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const newReturn: SupplierReturn = {
      id: `ret-${Date.now()}`,
      returnNumber,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      supplierCode: dto.supplierCode,
      originalPoId: dto.originalPoId,
      originalPoNumber: dto.originalPoNumber,
      grnId: dto.grnId,
      grnNumber: dto.grnNumber,
      returnDate: dto.returnDate || now.split('T')[0],
      reasonCategory: dto.reasonCategory,
      reasonDescription: dto.reasonDescription,
      warehouseId: dto.warehouseId || 'WH-MAIN',
      items: itemsWithTotals,
      totalAmount,
      status: 'PENDING_APPROVAL',
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: now,
      updatedAt: now,
    };

    this.returns.unshift(newReturn);

    // If autoApprove requested and user has approval authority (PM-02)
    if (dto.autoApprove && hasPermission(currentUser.role, 'purchasing:returns_approve')) {
      return this.approveReturn(newReturn.id, currentUser);
    }

    return newReturn;
  }

  async approveReturn(returnId: string, currentUser: User): Promise<SupplierReturn> {
    const ret = this.returns.find((r) => r.id === returnId);
    if (!ret) {
      throw new Error(`Supplier return record not found: ${returnId}`);
    }

    // Role validation: PM-02 requirement
    const canApprove =
      currentUser.role === 'DIRECTOR' ||
      currentUser.role === 'MANAGER' ||
      hasPermission(currentUser.role, 'purchasing:returns_approve');

    if (!canApprove) {
      throw new Error('Only Purchasing Manager or Executive Management can approve supplier returns.');
    }

    if (ret.status === 'APPROVED') {
      return ret;
    }

    // BR-08 / Feature 9: Automatically post and link Accounts Payable Debit Note in Finance
    const debitNote = await apService.postSupplierDebitNote({
      supplierId: ret.supplierId,
      supplierName: ret.supplierName,
      grnId: ret.grnId,
      grnNumber: ret.grnNumber,
      date: ret.returnDate || new Date().toISOString().slice(0, 10),
      reason: `Supplier Return ${ret.returnNumber}: ${ret.reasonDescription}`,
      lineItems: ret.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        sku: it.productCode,
        damagedQuantity: it.returnedQuantity,
        unitCost: it.unitCost,
        lineTotal: it.lineTotal,
        reason: it.reason || ret.reasonDescription,
      })),
    });

    ret.status = 'APPROVED';
    ret.approvedBy = currentUser.id;
    ret.approvedByName = currentUser.name;
    ret.approvedAt = new Date().toISOString();
    ret.updatedAt = new Date().toISOString();
    ret.linkedDebitNoteId = debitNote.id;
    ret.linkedDebitNoteNumber = debitNote.debitNoteNumber;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supplier-return-approved', { detail: ret }));
    }

    return ret;
  }

  async rejectReturn(returnId: string, rejectionReason: string, currentUser: User): Promise<SupplierReturn> {
    const ret = this.returns.find((r) => r.id === returnId);
    if (!ret) {
      throw new Error(`Supplier return record not found: ${returnId}`);
    }

    const canApprove =
      currentUser.role === 'DIRECTOR' ||
      currentUser.role === 'MANAGER' ||
      hasPermission(currentUser.role, 'purchasing:returns_approve');

    if (!canApprove) {
      throw new Error('Only Purchasing Manager or Executive Management can reject supplier returns.');
    }

    ret.status = 'REJECTED';
    ret.rejectionReason = rejectionReason;
    ret.updatedAt = new Date().toISOString();
    return ret;
  }
}

export const supplierReturnService = new SupplierReturnService();
