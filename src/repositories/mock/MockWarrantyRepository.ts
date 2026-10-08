import { IWarrantyRepository } from '../IWarrantyRepository';
import {
  WarrantyRecord,
  WarrantyClaim,
  ShopWarrantyFollowUp,
  WarrantyFilters,
  ClaimFilters,
  WarrantyNote,
  WarrantyNoteFilters,
} from '../../types/warranty';
import { PaginatedResult } from '../../types/common';
import {
  MOCK_WARRANTY_RECORDS,
  MOCK_WARRANTY_CLAIMS,
  MOCK_SHOP_FOLLOW_UPS,
  MOCK_WARRANTY_NOTES,
} from '../../mock/mockWarranty';
import { MOCK_CUSTOMERS } from '../../mock/mockCustomers';

export class MockWarrantyRepository implements IWarrantyRepository {
  private records: WarrantyRecord[] = [...MOCK_WARRANTY_RECORDS];
  private claims: WarrantyClaim[] = [...MOCK_WARRANTY_CLAIMS];
  private followUps: ShopWarrantyFollowUp[] = [...MOCK_SHOP_FOLLOW_UPS];
  private notes: WarrantyNote[] = [...MOCK_WARRANTY_NOTES];

  // ================= Warranty Records =================

  async getAllRecords(filters?: WarrantyFilters): Promise<PaginatedResult<WarrantyRecord>> {
    let filtered = [...this.records];

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    if (filters?.saleType && filters.saleType !== 'ALL') {
      filtered = filtered.filter((r) => r.saleType === filters.saleType);
    }

    if (filters?.customerId) {
      filtered = filtered.filter((r) => r.customerId === filters.customerId);
    }

    if (filters?.productId) {
      filtered = filtered.filter((r) => r.productId === filters.productId);
    }

    if (filters?.invoiceId) {
      filtered = filtered.filter((r) => r.invoiceId === filters.invoiceId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.invoiceNumber.toLowerCase().includes(q) ||
          (r.serialNumber && r.serialNumber.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt || b.saleDate).getTime() - new Date(a.createdAt || a.saleDate).getTime());

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  }

  async getRecordById(id: string): Promise<WarrantyRecord | null> {
    return this.records.find((r) => r.id === id) || null;
  }

  async getRecordsByInvoiceId(invoiceId: string): Promise<WarrantyRecord[]> {
    return this.records.filter((r) => r.invoiceId === invoiceId);
  }

  async getRecordsByCustomerId(customerId: string): Promise<WarrantyRecord[]> {
    return this.records.filter((r) => r.customerId === customerId);
  }

  async createRecord(record: Omit<WarrantyRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<WarrantyRecord> {
    const now = new Date().toISOString();
    const newRecord: WarrantyRecord = {
      ...record,
      id: `war-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.records.unshift(newRecord);
    return newRecord;
  }

  async updateRecord(id: string, updates: Partial<WarrantyRecord>): Promise<WarrantyRecord> {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`Warranty record with ID ${id} not found`);
    }
    const updated: WarrantyRecord = {
      ...this.records[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.records[idx] = updated;
    return updated;
  }

  // ================= Warranty Claims =================

  async getAllClaims(filters?: ClaimFilters): Promise<PaginatedResult<WarrantyClaim>> {
    let filtered = [...this.claims];

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters?.customerId) {
      filtered = filtered.filter((c) => c.customerId === filters.customerId);
    }

    if (filters?.productId) {
      filtered = filtered.filter((c) => c.productId === filters.productId);
    }

    if (filters?.warrantyRecordId) {
      filtered = filtered.filter((c) => c.warrantyRecordId === filters.warrantyRecordId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.productName.toLowerCase().includes(q) ||
          c.sku.toLowerCase().includes(q) ||
          c.complaintReason.toLowerCase().includes(q) ||
          (c.serialNumber && c.serialNumber.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  }

  async getClaimById(id: string): Promise<WarrantyClaim | null> {
    return this.claims.find((c) => c.id === id) || null;
  }

  async getClaimsByCustomerId(customerId: string): Promise<WarrantyClaim[]> {
    return this.claims.filter((c) => c.customerId === customerId);
  }

  async getClaimsByRecordId(warrantyRecordId: string): Promise<WarrantyClaim[]> {
    return this.claims.filter((c) => c.warrantyRecordId === warrantyRecordId);
  }

  async createClaim(claim: Omit<WarrantyClaim, 'id' | 'createdAt' | 'updatedAt'>): Promise<WarrantyClaim> {
    const now = new Date().toISOString();
    const newClaim: WarrantyClaim = {
      ...claim,
      id: `claim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.claims.unshift(newClaim);
    return newClaim;
  }

  async updateClaim(id: string, updates: Partial<WarrantyClaim>): Promise<WarrantyClaim> {
    const idx = this.claims.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Warranty claim with ID ${id} not found`);
    }
    const updated: WarrantyClaim = {
      ...this.claims[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.claims[idx] = updated;
    return updated;
  }

  // ================= Distributor Warranty Notes =================

  async getAllWarrantyNotes(filters?: WarrantyNoteFilters): Promise<PaginatedResult<WarrantyNote>> {
    let filtered = [...this.notes];

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((n) => n.status === filters.status);
    }

    if (filters?.distributorId) {
      filtered = filtered.filter((n) => n.distributorId === filters.distributorId);
    }

    if (filters?.productId) {
      filtered = filtered.filter((n) => n.productId === filters.productId);
    }

    if (filters?.warrantyRecordId) {
      filtered = filtered.filter((n) => n.warrantyRecordId === filters.warrantyRecordId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.noteNumber.toLowerCase().includes(q) ||
          n.distributorName.toLowerCase().includes(q) ||
          n.productName.toLowerCase().includes(q) ||
          n.sku.toLowerCase().includes(q) ||
          n.serialNumber.toLowerCase().includes(q) ||
          (n.endCustomerName && n.endCustomerName.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt || b.receivedDate).getTime() - new Date(a.createdAt || a.receivedDate).getTime());

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  }

  async getWarrantyNoteById(id: string): Promise<WarrantyNote | null> {
    return this.notes.find((n) => n.id === id) || null;
  }

  async getWarrantyNoteByRecordId(warrantyRecordId: string): Promise<WarrantyNote | null> {
    return this.notes.find((n) => n.warrantyRecordId === warrantyRecordId) || null;
  }

  async getWarrantyNotesByDistributorId(distributorId: string): Promise<WarrantyNote[]> {
    return this.notes.filter((n) => n.distributorId === distributorId);
  }

  async createWarrantyNote(
    note: Omit<WarrantyNote, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WarrantyNote> {
    const now = new Date().toISOString();
    const newNote: WarrantyNote = {
      ...note,
      id: `wn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.notes.unshift(newNote);
    return newNote;
  }

  async updateWarrantyNote(id: string, updates: Partial<WarrantyNote>): Promise<WarrantyNote> {
    const idx = this.notes.findIndex((n) => n.id === id);
    if (idx === -1) {
      throw new Error(`Warranty note with ID ${id} not found`);
    }
    const updated: WarrantyNote = {
      ...this.notes[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.notes[idx] = updated;
    return updated;
  }

  // ================= Shop Follow-ups =================

  async getFollowUps(salesRepId?: string): Promise<ShopWarrantyFollowUp[]> {
    if (!salesRepId) {
      return [...this.followUps];
    }
    // Filter by customers assigned to this sales rep
    const repCustomerIds = new Set(
      MOCK_CUSTOMERS.filter((c) => c.assignedRepId === salesRepId).map((c) => c.id)
    );
    return this.followUps.filter((f) => repCustomerIds.has(f.customerId));
  }

  async getFollowUpByCustomerId(customerId: string): Promise<ShopWarrantyFollowUp | null> {
    return this.followUps.find((f) => f.customerId === customerId) || null;
  }

  async saveFollowUp(followUp: ShopWarrantyFollowUp): Promise<ShopWarrantyFollowUp> {
    const idx = this.followUps.findIndex((f) => f.customerId === followUp.customerId);
    if (idx >= 0) {
      this.followUps[idx] = { ...this.followUps[idx], ...followUp };
      return this.followUps[idx];
    } else {
      this.followUps.push(followUp);
      return followUp;
    }
  }
}
