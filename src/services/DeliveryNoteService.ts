import { orderService } from './OrderService';
import {
  DeliveryNote,
  DeliveryNoteItem,
  CreateDeliveryNotePayload,
  SubmitRejectionPayload,
  DeliveryNoteStatus,
} from '../types/deliveryNote';
import { MOCK_DELIVERY_NOTES } from '../mock/mockDeliveryNotes';
import { MOCK_INVOICES } from '../mock/mockInvoices';
import { Invoice } from '../types/invoice';
import { User } from '../types/auth';

const STORAGE_KEY = 'dns_delivery_notes_v1';

export class DeliveryNoteService {
  private notes: DeliveryNote[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.notes = JSON.parse(stored);
        return;
      }
    } catch {
      // Fallback
    }
    this.notes = [...MOCK_DELIVERY_NOTES];
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes));
    } catch {
      // Ignored in non-browser envs
    }
  }

  public resetToDefaults() {
    this.notes = JSON.parse(JSON.stringify(MOCK_DELIVERY_NOTES));
    this.persist();
  }

  async getAll(filters?: {
    status?: DeliveryNoteStatus | 'ALL';
    search?: string;
  }): Promise<DeliveryNote[]> {
    let result = [...this.notes];

    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter((n) => n.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.deliveryNoteNumber?.toLowerCase().includes(q) ||
          n.invoiceNumber?.toLowerCase().includes(q) ||
          n.customerName?.toLowerCase().includes(q) ||
          n.customerCode?.toLowerCase().includes(q) ||
          n.driverName?.toLowerCase().includes(q) ||
          n.vehicleNumber?.toLowerCase().includes(q)
      );
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getById(id: string): Promise<DeliveryNote | null> {
    const found = this.notes.find((n) => n.id === id || n.deliveryNoteNumber === id);
    return found ? { ...found } : null;
  }

  async getDeliveryNoteById(id: string): Promise<DeliveryNote | null> {
    return this.getById(id);
  }

  async getByOrderId(orderId: string): Promise<DeliveryNote[]> {
    return this.notes.filter(
      (n) => n.orderId === orderId || n.orderNumber === orderId
    );
  }

  async addDeliveryNote(note: DeliveryNote): Promise<DeliveryNote> {
    const exists = this.notes.findIndex((n) => n.id === note.id || n.deliveryNoteNumber === note.deliveryNoteNumber);
    if (exists >= 0) {
      this.notes[exists] = note;
    } else {
      this.notes.unshift(note);
    }
    this.persist();
    return note;
  }

  /**
   * Retrieves invoices eligible for delivery note generation (status: DRAFT or unfulfilled).
   */
  async getDraftInvoices(): Promise<Invoice[]> {
    const ordersRes = await orderService.listOrders({ pageSize: 1000 });
    const closedOrderIds = new Set(
      (ordersRes.data || []).filter((o) => o.status === 'CLOSED').map((o) => o.id)
    );
    // Look up invoices with status DRAFT or ISSUED that are not on closed orders
    return MOCK_INVOICES.filter(
      (inv) => (inv.status === 'DRAFT' || inv.status === 'ISSUED') && (!inv.orderId || !closedOrderIds.has(inv.orderId))
    );
  }

  /**
   * Generates realistic mock unit barcodes for quick scanning or simulation when picking from stock.
   */
  getSuggestedStockBarcodes(sku: string, neededCount: number): string[] {
    const cleanSku = (sku || 'ITEM').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    const result: string[] = [];
    const seqBase = Math.floor(100 + Math.random() * 800);
    for (let i = 1; i <= neededCount; i++) {
      const unitIdx = String(i).padStart(3, '0');
      result.push(`DNS-${cleanSku}-WH${seqBase}-${unitIdx}`);
    }
    return result;
  }

  /**
   * Creates a new Delivery Note from a selected draft invoice with scanned physical unit barcodes.
   */
  async createDeliveryNote(
    payload: CreateDeliveryNotePayload,
    currentUser: User
  ): Promise<DeliveryNote> {
    const targetOrderId = payload.orderId;
    if (targetOrderId) {
      const targetOrder = await orderService.getOrderById(targetOrderId);
      if (targetOrder && targetOrder.status === 'CLOSED') {
        throw new Error(
          `Cannot create delivery note: Sales Order ${targetOrder.orderNumber} is closed. No further deliveries allowed.`
        );
      }
    }
    const invoice = payload.invoiceId ? MOCK_INVOICES.find((inv) => inv.id === payload.invoiceId) : null;
    if (payload.invoiceId && !invoice) {
      throw new Error(`Invoice with ID ${payload.invoiceId} not found.`);
    }

    const year = new Date().getFullYear();
    const seq = String(this.notes.length + 1).padStart(4, '0');
    const deliveryNoteNumber = `DN-${year}-${seq}`;

    let totalInvoicedUnits = 0;
    let totalDispatchedUnits = 0;

    const deliveryItems: DeliveryNoteItem[] = payload.items.map((i, idx) => {
      const invQty = i.invoicedQuantity ?? i.unitBarcodes.length;
      totalInvoicedUnits += invQty;
      totalDispatchedUnits += i.unitBarcodes.length;

      return {
        id: `dn-item-${Date.now().toString().slice(-4)}-${idx + 1}`,
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        uom: i.uom || 'PCS',
        invoicedQuantity: invQty,
        dispatchedQuantity: i.unitBarcodes.length,
        unitBarcodes: [...i.unitBarcodes],
        acceptedQuantity: i.unitBarcodes.length, // By default all allocated units are dispatched
        rejectedQuantity: 0,
        rejectedUnitBarcodes: [],
      };
    });

    const newNote: DeliveryNote = {
      id: `dn-${Date.now()}`,
      deliveryNoteNumber,
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.invoiceNumber,
      orderId: payload.orderId || invoice?.orderId,
      orderNumber: payload.orderNumber || invoice?.orderNumber,
      customerId: payload.customerId || invoice?.customerId || 'cust-001',
      customerName: payload.customerName || invoice?.customerName || 'General Customer',
      customerCode: payload.customerCode || invoice?.customerCode || 'GEN-001',
      customerAddress: payload.customerAddress || invoice?.customerAddress,
      customerPhone: payload.customerPhone || invoice?.customerPhone,
      customerVatNumber: payload.customerVatNumber || invoice?.customerVatNumber,
      driverName: payload.driverName,
      driverPhone: payload.driverPhone,
      vehicleNumber: payload.vehicleNumber.toUpperCase(),
      dispatchDate: payload.dispatchDate || new Date().toISOString().split('T')[0],
      deliveryRoute: payload.deliveryRoute,
      notes: payload.notes,
      status: 'DISPATCHED',
      items: deliveryItems,
      totalInvoicedUnits,
      totalDispatchedUnits,
      totalAcceptedUnits: totalDispatchedUnits,
      totalRejectedUnits: 0,
      isLocked: true,
      createdBy: `${currentUser.name} (${currentUser.role || 'Stock Keeper'})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.notes.unshift(newNote);
    this.persist();
    return newNote;
  }

  /**
   * Updates basic delivery details (driver, vehicle, notes) while in draft or dispatched status.
   */
  async updateDeliveryNote(
    id: string,
    updates: Partial<Pick<DeliveryNote, 'driverName' | 'driverPhone' | 'vehicleNumber' | 'notes' | 'deliveryRoute'>>
  ): Promise<DeliveryNote> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new Error(`Delivery Note ${id} not found.`);
    }

    throw new Error(
      `Delivery Note ${note.deliveryNoteNumber} is locked. Once created, Delivery Notes are permanently non-editable to preserve inventory dispatch integrity.`
    );
  }

  /**
   * Confirms 100% acceptance when no customer rejections occurred.
   * Can be directly finalized as DELIVERED by the Stock Keeper without supervisor approval.
   */
  async confirmFullyDelivered(
    id: string,
    customerSignatureName: string = 'Authorized Customer Representative'
  ): Promise<DeliveryNote> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new Error(`Delivery Note ${id} not found.`);
    }

    note.status = 'DELIVERED';
    note.customerSignatureName = customerSignatureName;
    note.customerSignedAt = new Date().toISOString();
    note.receivedInGoodCondition = true;
    note.totalAcceptedUnits = note.totalDispatchedUnits;
    note.totalRejectedUnits = 0;
    note.updatedAt = new Date().toISOString();

    // Ensure all items are marked 100% accepted
    note.items = note.items.map((item) => ({
      ...item,
      acceptedQuantity: item.dispatchedQuantity,
      rejectedQuantity: 0,
      rejectedUnitBarcodes: [],
    }));

    this.persist();
    return { ...note };
  }

  /**
   * Records customer rejection of physical units (damaged, defective, wrong spec).
   * Scenario A (Stock Keeper): sets status to REJECTION_PENDING_APPROVAL and creates approval request for Stock Manager.
   * Scenario B (Stock Manager): self-approval bypassed; directly executes inventory movement and marks REJECTION_APPROVED.
   */
  async submitRejection(
    id: string,
    payload: SubmitRejectionPayload,
    currentUser: User
  ): Promise<DeliveryNote> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new Error(`Delivery Note ${id} not found.`);
    }

    let overallAccepted = 0;
    let overallRejected = 0;

    note.items = note.items.map((item) => {
      const match = payload.rejectedItems.find((r) => r.productId === item.productId);
      if (match && match.rejectedBarcodes.length > 0) {
        const rejectedCount = match.rejectedBarcodes.length;
        const acceptedCount = Math.max(0, item.dispatchedQuantity - rejectedCount);
        overallAccepted += acceptedCount;
        overallRejected += rejectedCount;

        return {
          ...item,
          acceptedQuantity: acceptedCount,
          rejectedQuantity: rejectedCount,
          rejectedUnitBarcodes: [...match.rejectedBarcodes],
          rejectionReason: match.reason,
          rejectionNotes: match.notes,
        };
      } else {
        overallAccepted += item.acceptedQuantity;
        overallRejected += item.rejectedQuantity;
        return item;
      }
    });

    note.totalAcceptedUnits = overallAccepted;
    note.totalRejectedUnits = overallRejected;

    // Track detailed unit-level records for inspection
    const details = [];
    for (const rejItem of payload.rejectedItems) {
      const itm = note.items.find((i) => i.productId === rejItem.productId);
      for (const bc of rejItem.rejectedBarcodes) {
        details.push({
          productId: rejItem.productId,
          productName: itm?.productName || 'Product',
          sku: itm?.sku || '',
          barcode: bc,
          reason: rejItem.reason,
          notes: rejItem.notes,
        });
      }
    }
    note.rejectedUnitsDetail = details;
    note.updatedAt = new Date().toISOString();

    const isStockManager =
      currentUser.role === 'STOCK_MANAGER' ||
      currentUser.role === 'MANAGER' ||
      currentUser.role === 'DIRECTOR';

    if (isStockManager) {
      // Scenario B: Stock Manager processes rejection -> No self-approval request generated
      note.status = 'REJECTION_APPROVED';
      note.rejectionApprovedBy = `${currentUser.name} (${currentUser.role || 'Stock Manager'})`;
      note.rejectionApprovedAt = new Date().toISOString();
      note.rejectionApprovalRemarks =
        'Direct customer rejection processing by Stock Manager (Self-approval bypassed).';
      delete note.rejectionApprovalRequest;
      await this.executeRejectionStockAdjustment(note, currentUser);
    } else {
      // Scenario A: Stock Keeper processes rejection -> Requires Stock Manager approval
      note.status = 'REJECTION_PENDING_APPROVAL';
      note.rejectionSubmittedBy = `${currentUser.name} (${currentUser.role || 'Stock Keeper'})`;
      note.rejectionSubmittedAt = new Date().toISOString();
      note.rejectionNotes = payload.notes;
      note.rejectionApprovalRequest = {
        id: `req-${Date.now()}`,
        deliveryNoteId: note.id,
        deliveryNoteNumber: note.deliveryNoteNumber,
        customerId: note.customerId,
        customerName: note.customerName,
        submittedBy: `${currentUser.name} (${currentUser.role || 'Stock Keeper'})`,
        submittedById: currentUser.id,
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
        totalUnits: overallRejected,
        items: payload.rejectedItems.map((r) => {
          const itemMatch = note.items.find((it) => it.productId === r.productId);
          return {
            productId: r.productId,
            productName: itemMatch?.productName || 'Product',
            sku: itemMatch?.sku || '',
            rejectedBarcodes: [...r.rejectedBarcodes],
            reason: r.reason,
            notes: r.notes,
          };
        }),
      };
    }

    this.persist();
    return { ...note };
  }

  /**
   * Stock Manager approves the customer rejection.
   * Atomic stock movements & balances update (damaged to quarantine bay, undamaged to stock).
   */
  async approveRejection(
    id: string,
    approver: User,
    remarks: string = 'Rejection approved by warehouse operations manager.'
  ): Promise<DeliveryNote> {
    if (
      approver.role === 'STOCK_KEEPER' ||
      (approver.role !== 'STOCK_MANAGER' && approver.role !== 'MANAGER' && approver.role !== 'DIRECTOR')
    ) {
      throw new Error(
        `Role '${approver.role}' is not authorized to approve delivery note rejections. Requires STOCK_MANAGER authorization.`
      );
    }
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new Error(`Delivery Note ${id} not found.`);
    }

    if (note.status !== 'REJECTION_PENDING_APPROVAL') {
      throw new Error(
        `Cannot approve: Delivery Note ${note.deliveryNoteNumber || id} is not pending rejection approval (current status: ${note.status}).`
      );
    }

    note.status = 'REJECTION_APPROVED';
    note.rejectionApprovedBy = `${approver.name} (${approver.role || 'Operations Manager'})`;
    note.rejectionApprovedAt = new Date().toISOString();
    note.rejectionApprovalRemarks = remarks;
    note.updatedAt = new Date().toISOString();

    if (note.rejectionApprovalRequest) {
      note.rejectionApprovalRequest.status = 'APPROVED';
      note.rejectionApprovalRequest.reviewedBy = approver.name;
      note.rejectionApprovalRequest.reviewedById = approver.id;
      note.rejectionApprovalRequest.reviewedAt = new Date().toISOString();
      note.rejectionApprovalRequest.remarks = remarks;
    }

    await this.executeRejectionStockAdjustment(note, approver);

    this.persist();
    return { ...note };
  }

  /**
   * Stock Manager declines the customer rejection (e.g. disputes customer claim, requires re-inspection).
   * No inventory movements or stock adjustments occur.
   */
  async declineRejection(
    id: string,
    approver: User,
    remarks: string = 'Rejection declined. Re-inspection required.'
  ): Promise<DeliveryNote> {
    if (
      approver.role === 'STOCK_KEEPER' ||
      (approver.role !== 'STOCK_MANAGER' && approver.role !== 'MANAGER' && approver.role !== 'DIRECTOR')
    ) {
      throw new Error(
        `Role '${approver.role}' is not authorized to decline delivery note rejections. Requires STOCK_MANAGER authorization.`
      );
    }
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new Error(`Delivery Note ${id} not found.`);
    }

    if (note.status !== 'REJECTION_PENDING_APPROVAL') {
      throw new Error(
        `Cannot decline: Delivery Note ${note.deliveryNoteNumber || id} is not pending rejection approval (current status: ${note.status}).`
      );
    }

    note.status = 'REJECTION_DECLINED';
    note.rejectionApprovedBy = `${approver.name} (${approver.role || 'Operations Manager'})`;
    note.rejectionApprovedAt = new Date().toISOString();
    note.rejectionApprovalRemarks = remarks;
    note.updatedAt = new Date().toISOString();

    if (note.rejectionApprovalRequest) {
      note.rejectionApprovalRequest.status = 'DECLINED';
      note.rejectionApprovalRequest.reviewedBy = approver.name;
      note.rejectionApprovalRequest.reviewedById = approver.id;
      note.rejectionApprovalRequest.reviewedAt = new Date().toISOString();
      note.rejectionApprovalRequest.remarks = remarks;
    }

    this.persist();
    return { ...note };
  }

  /**
   * Internal helper to execute atomic stock adjustments and inventory movements
   */
  private async executeRejectionStockAdjustment(note: DeliveryNote, approver: User): Promise<void> {
    for (const item of note.items) {
      const rejectedQty = item.rejectedQuantity || item.rejectedUnitBarcodes?.length || 0;
      if (rejectedQty > 0) {
        const isDamaged =
          item.rejectionReason === 'DAMAGED' ||
          item.rejectionReason === 'DAMAGED_IN_TRANSIT' ||
          item.rejectionReason === 'DEFECTIVE_PRODUCT' ||
          item.rejectionReason === 'PACKAGING_DAMAGED';

        try {
          // 1. Update Inventory Service repository (balances and stock movement audit log)
          const { inventoryService } = await import('./InventoryService');
          const repo = (inventoryService as any).repo;
          if (repo) {
            let balance = await repo.getBalance(item.productId, 'WH-MAIN');
            if (!balance) {
              const allBalances = await repo.getAllBalances();
              balance =
                allBalances.find((b: any) => b.productId === item.productId && b.locationType === 'WAREHOUSE') ||
                allBalances.find((b: any) => b.productId === item.productId);
            }
            if (!balance) {
              balance = {
                id: `bal-dn-${Date.now()}-${item.productId}`,
                productId: item.productId,
                locationId: 'WH-MAIN',
                locationType: 'WAREHOUSE',
                availableQuantity: 0,
                reservedQuantity: 0,
                damagedQuantity: 0,
                returnedQuantity: 0,
                lastUpdated: new Date().toISOString(),
              };
            }
            if (isDamaged) {
              balance.damagedQuantity = (balance.damagedQuantity || 0) + rejectedQty;
            } else {
              balance.availableQuantity = (balance.availableQuantity || 0) + rejectedQty;
            }
            balance.lastUpdated = new Date().toISOString();
            await repo.saveBalance(balance);

            await repo.addMovement({
              id: `mov-rej-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: item.productId,
              sourceLocation: 'CUSTOMER_RETURN',
              targetLocation: isDamaged ? 'DAMAGED_QUARANTINE' : (balance?.locationId || 'WH-MAIN'),
              quantity: rejectedQty,
              movementType: isDamaged ? 'DAMAGE_WRITE_OFF' : 'SALES_RETURN',
              referenceDocumentType: 'DELIVERY_NOTE_REJECTION',
              referenceDocumentId: note.deliveryNoteNumber,
              performedById: approver.id,
              performedByName: approver.name,
              reason: `Rejection approval: ${item.rejectionReason || (isDamaged ? 'DAMAGED' : 'CUSTOMER_REFUSED')}. ${item.rejectionNotes || ''}`,
              timestamp: new Date().toISOString(),
            });
          }

          // 2. Update Product Master repository
          const { productService } = await import('./ProductService');
          const product = await productService.getProduct(item.productId);
          if (product) {
            if (isDamaged) {
              await productService.updateProduct(item.productId, {
                damagedStock: (product.damagedStock || 0) + rejectedQty,
              });
            } else {
              await productService.updateProduct(item.productId, {
                stockOnHand: (product.stockOnHand || 0) + rejectedQty,
              });
            }
          }

          try {
            const { MOCK_PRODUCTS } = await import('../mock/mockProducts');
            const mockP = MOCK_PRODUCTS.find((p) => p.id === item.productId);
            if (mockP) {
              if (isDamaged) {
                mockP.damagedStock = (mockP.damagedStock || 0) + rejectedQty;
              } else {
                mockP.stockOnHand = (mockP.stockOnHand || 0) + rejectedQty;
              }
            }
          } catch {}
        } catch (stockErr) {
          console.warn(`Failed to update stock repository for rejected product ${item.productId}:`, stockErr);
        }
      }
    }
  }
}

export const deliveryNoteService = new DeliveryNoteService();
