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
          n.deliveryNoteNumber.toLowerCase().includes(q) ||
          n.invoiceNumber.toLowerCase().includes(q) ||
          n.customerName.toLowerCase().includes(q) ||
          n.customerCode.toLowerCase().includes(q) ||
          n.driverName.toLowerCase().includes(q) ||
          n.vehicleNumber.toLowerCase().includes(q)
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

    Object.assign(note, updates, { updatedAt: new Date().toISOString() });
    this.persist();
    return { ...note };
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
   * Records customer rejection of physical units (damaged, defective, wrong spec),
   * sets the Delivery Note status to REJECTION_PENDING_APPROVAL, and submits for supervisor review.
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
    note.status = 'REJECTION_PENDING_APPROVAL';
    note.rejectionSubmittedBy = `${currentUser.name} (${currentUser.role || 'Stock Keeper'})`;
    note.rejectionSubmittedAt = new Date().toISOString();
    note.rejectionNotes = payload.notes;
    note.updatedAt = new Date().toISOString();

    this.persist();
    return { ...note };
  }

  /**
   * Manager / Supervisor approves the customer rejection.
   * Units are formally logged for Quarantine Bay return and finance credit processing.
   */
  async approveRejection(
    id: string,
    approver: User,
    remarks: string = 'Rejection approved by warehouse operations manager.'
  ): Promise<DeliveryNote> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new Error(`Delivery Note ${id} not found.`);
    }

    note.status = 'REJECTION_APPROVED';
    note.rejectionApprovedBy = `${approver.name} (${approver.role || 'Operations Manager'})`;
    note.rejectionApprovedAt = new Date().toISOString();
    note.rejectionApprovalRemarks = remarks;
    note.updatedAt = new Date().toISOString();

    this.persist();
    return { ...note };
  }

  /**
   * Supervisor declines the customer rejection (e.g. requires re-inspection or disputes customer claim).
   */
  async declineRejection(
    id: string,
    approver: User,
    remarks: string = 'Rejection declined. Re-inspection required.'
  ): Promise<DeliveryNote> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new Error(`Delivery Note ${id} not found.`);
    }

    note.status = 'REJECTION_DECLINED';
    note.rejectionApprovedBy = `${approver.name} (${approver.role || 'Operations Manager'})`;
    note.rejectionApprovedAt = new Date().toISOString();
    note.rejectionApprovalRemarks = remarks;
    note.updatedAt = new Date().toISOString();

    this.persist();
    return { ...note };
  }
}

export const deliveryNoteService = new DeliveryNoteService();
