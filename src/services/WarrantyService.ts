import { IWarrantyRepository } from '../repositories/IWarrantyRepository';
import { MockWarrantyRepository } from '../repositories/mock/MockWarrantyRepository';
import { ICustomerRepository } from '../repositories/ICustomerRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { IProductRepository } from '../repositories/IProductRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import {
  WarrantyRecord,
  WarrantyClaim,
  ShopWarrantyFollowUp,
  WarrantyFilters,
  ClaimFilters,
  WarrantySaleType,
  ClaimResolutionType,
} from '../types/warranty';
import { Invoice, InvoiceItem } from '../types/invoice';
import { User } from '../types/auth';
import { PaginatedResult } from '../types/common';
import {
  calculateWarrantyExpiry,
  isWarrantyValid,
  calculatePendingWarrantyNotes,
  determineWarrantyStartDate,
} from '../rules/warrantyRules';

export interface CreateClaimDTO {
  warrantyRecordId: string;
  complaintDate: string;
  complaintReason: string;
  serialNumber?: string;
}

export class WarrantyService {
  private repo: IWarrantyRepository;
  private customerRepo: ICustomerRepository;
  private productRepo: IProductRepository;

  constructor(
    repo?: IWarrantyRepository,
    customerRepo?: ICustomerRepository,
    productRepo?: IProductRepository
  ) {
    this.repo = repo || new MockWarrantyRepository();
    this.customerRepo = customerRepo || new MockCustomerRepository();
    this.productRepo = productRepo || new MockProductRepository();
  }

  /**
   * Registers a canonical warranty record linked to customer, product, and invoice.
   * Single source of truth: does NOT duplicate product or customer master entities.
   */
  async registerWarranty(
    invoice: Invoice,
    item: InvoiceItem,
    saleType: WarrantySaleType,
    dealerSoldDate?: string,
    serialNumber?: string
  ): Promise<WarrantyRecord> {
    // Lookup product to fetch official warranty period months
    let periodMonths = 12;
    try {
      const prod = await this.productRepo.getById(item.productId);
      if (prod && prod.warrantyPeriodMonths) {
        periodMonths = prod.warrantyPeriodMonths;
      }
    } catch {
      // Fallback to default
    }

    const warrantyStartDate = determineWarrantyStartDate(
      saleType,
      invoice.issueDate,
      dealerSoldDate
    );
    const warrantyExpiryDate = calculateWarrantyExpiry(warrantyStartDate, periodMonths);
    const notesReceived = saleType === 'SHOWROOM' || !!dealerSoldDate;

    const record = await this.repo.createRecord({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      productId: item.productId,
      productName: item.productNameSnapshot,
      sku: item.skuSnapshot,
      serialNumber: serialNumber || `SN-${item.skuSnapshot}-${Date.now().toString().slice(-6)}`,
      saleDate: invoice.issueDate,
      warrantyStartDate,
      warrantyPeriodMonths: periodMonths,
      warrantyExpiryDate,
      saleType,
      status: 'ACTIVE',
      dealerSoldDate,
      notesReceived,
      notesReceivedDate: notesReceived ? new Date().toISOString() : undefined,
    });

    // Update shop follow-up tracking for dealer sales
    if (saleType === 'DEALER') {
      try {
        const customer = await this.customerRepo.getById(invoice.customerId);
        const existingFollowUp = await this.repo.getFollowUpByCustomerId(invoice.customerId);

        const baseSold = existingFollowUp?.totalUnitsSold ?? customer?.warrantyNotesExpected ?? 0;
        const baseReceived = existingFollowUp?.warrantyNotesReceived ?? customer?.warrantyNotesReceived ?? 0;

        const totalUnitsSold = baseSold + (item.quantity || 1);
        const warrantyNotesReceived = baseReceived + (notesReceived ? (item.quantity || 1) : 0);
        const pendingNotesCount = calculatePendingWarrantyNotes(totalUnitsSold, warrantyNotesReceived);

        await this.repo.saveFollowUp({
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          totalUnitsSold,
          warrantyNotesReceived,
          pendingNotesCount,
          lastFollowUpDate: existingFollowUp?.lastFollowUpDate || invoice.issueDate,
          followUpNotes: existingFollowUp?.followUpNotes || [],
        });

        // Sync Customer Master expected and received notes
        if (customer) {
          await this.customerRepo.update(customer.id, {
            warrantyNotesExpected: totalUnitsSold,
            warrantyNotesReceived: warrantyNotesReceived,
          });
        }
      } catch (err) {
        console.warn('Could not update dealer follow up stats:', err);
      }
    }

    return record;
  }

  async getWarrantyRecords(filters?: WarrantyFilters): Promise<PaginatedResult<WarrantyRecord>> {
    return this.repo.getAllRecords(filters);
  }

  async getWarrantyById(id: string): Promise<WarrantyRecord | null> {
    return this.repo.getRecordById(id);
  }

  async getWarrantiesByCustomerId(customerId: string): Promise<WarrantyRecord[]> {
    return this.repo.getRecordsByCustomerId(customerId);
  }

  /**
   * Lodges a new warranty claim against an active warranty record.
   * Enforces strict expiration check against complaint date.
   */
  async createClaim(data: CreateClaimDTO, _user?: User): Promise<WarrantyClaim> {
    const record = await this.repo.getRecordById(data.warrantyRecordId);
    if (!record) {
      throw new Error(`Warranty record with ID ${data.warrantyRecordId} not found`);
    }

    const complaintDate = data.complaintDate || new Date().toISOString().split('T')[0];

    if (complaintDate < record.warrantyStartDate.split('T')[0]) {
      throw new Error(
        `Complaint date ${complaintDate} cannot precede warranty start date ${record.warrantyStartDate}.`
      );
    }

    const isValid = isWarrantyValid(record.warrantyExpiryDate, complaintDate, record.warrantyStartDate);

    if (!isValid) {
      throw new Error(
        `Warranty expired on ${record.warrantyExpiryDate}. Cannot lodge claim for complaint date ${complaintDate}.`
      );
    }

    const year = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const claimNumber = `CLM-${year}-${randomCode}`;

    const claim = await this.repo.createClaim({
      claimNumber,
      warrantyRecordId: record.id,
      invoiceId: record.invoiceId,
      customerId: record.customerId,
      customerName: record.customerName,
      productId: record.productId,
      productName: record.productName,
      sku: record.sku,
      serialNumber: data.serialNumber || record.serialNumber,
      complaintDate,
      complaintReason: data.complaintReason,
      status: 'SUBMITTED',
    });

    // Mark warranty record status as CLAIMED
    await this.repo.updateRecord(record.id, { status: 'CLAIMED' });

    return claim;
  }

  async getClaims(filters?: ClaimFilters): Promise<PaginatedResult<WarrantyClaim>> {
    return this.repo.getAllClaims(filters);
  }

  async getClaimById(id: string): Promise<WarrantyClaim | null> {
    return this.repo.getClaimById(id);
  }

  async getClaimsByCustomerId(customerId: string): Promise<WarrantyClaim[]> {
    return this.repo.getClaimsByCustomerId(customerId);
  }

  async inspectClaim(claimId: string, user: User, notes?: string): Promise<WarrantyClaim> {
    const claim = await this.repo.getClaimById(claimId);
    if (!claim) {
      throw new Error(`Warranty claim ${claimId} not found`);
    }
    return this.repo.updateClaim(claimId, {
      status: 'IN_INSPECTION',
      inspectedById: user.id,
      resolutionNotes: notes ? (claim.resolutionNotes ? `${claim.resolutionNotes}\n${notes}` : notes) : claim.resolutionNotes,
    });
  }

  async approveClaim(claimId: string, user: User, notes?: string): Promise<WarrantyClaim> {
    const claim = await this.repo.getClaimById(claimId);
    if (!claim) {
      throw new Error(`Warranty claim ${claimId} not found`);
    }
    return this.repo.updateClaim(claimId, {
      status: 'APPROVED',
      inspectedById: claim.inspectedById || user.id,
      resolutionNotes: notes ? (claim.resolutionNotes ? `${claim.resolutionNotes}\n${notes}` : notes) : claim.resolutionNotes,
    });
  }

  /**
   * Resolves a warranty claim (REPLACE, REPAIR, or REJECT).
   * Transitions state machine and attaches immutable resolution audit.
   */
  async resolveClaim(
    claimId: string,
    resolution: ClaimResolutionType,
    notes: string,
    user: User
  ): Promise<WarrantyClaim> {
    const claim = await this.repo.getClaimById(claimId);
    if (!claim) {
      throw new Error(`Warranty claim ${claimId} not found`);
    }

    let nextStatus: 'REPLACED' | 'REPAIRED' | 'REJECTED';
    switch (resolution) {
      case 'REPLACE':
        nextStatus = 'REPLACED';
        break;
      case 'REPAIR':
        nextStatus = 'REPAIRED';
        break;
      case 'REJECT':
        nextStatus = 'REJECTED';
        break;
      default:
        throw new Error(`Invalid resolution type: ${resolution}`);
    }

    return this.repo.updateClaim(claimId, {
      status: nextStatus,
      resolutionType: resolution,
      resolutionNotes: notes,
      resolvedById: user.id,
      resolvedAt: new Date().toISOString(),
    });
  }

  /**
   * Retrieves shop warranty card collection follow-up statuses.
   * If salesRepId is provided, scopes exclusively to dealers assigned to that sales representative.
   */
  async getShopWarrantyFollowUps(salesRepId?: string): Promise<ShopWarrantyFollowUp[]> {
    const followUps = await this.repo.getFollowUps(salesRepId);
    return followUps.map((f) => ({
      ...f,
      pendingNotesCount: calculatePendingWarrantyNotes(f.totalUnitsSold, f.warrantyNotesReceived),
    }));
  }

  /**
   * Records a field representative shop visit and updates warranty note collection.
   */
  async recordFollowUp(
    customerId: string,
    notes: string,
    user: User,
    receivedNotesIncrement: number = 0
  ): Promise<ShopWarrantyFollowUp> {
    let followUp = await this.repo.getFollowUpByCustomerId(customerId);
    const customer = await this.customerRepo.getById(customerId);

    if (!followUp) {
      followUp = {
        customerId,
        customerName: customer ? customer.name : 'Unknown Dealer',
        totalUnitsSold: customer ? customer.warrantyNotesExpected : 0,
        warrantyNotesReceived: customer ? customer.warrantyNotesReceived : 0,
        pendingNotesCount: customer
          ? calculatePendingWarrantyNotes(customer.warrantyNotesExpected, customer.warrantyNotesReceived)
          : 0,
        followUpNotes: [],
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const logEntry = `[${today} - ${user.name}]: ${notes}${
      receivedNotesIncrement > 0 ? ` (+${receivedNotesIncrement} cards collected)` : ''
    }`;

    const newReceived = followUp.warrantyNotesReceived + receivedNotesIncrement;
    const newPending = calculatePendingWarrantyNotes(followUp.totalUnitsSold, newReceived);
    const updatedNotes = [...(followUp.followUpNotes || []), logEntry];

    const updated = await this.repo.saveFollowUp({
      ...followUp,
      warrantyNotesReceived: newReceived,
      pendingNotesCount: newPending,
      lastFollowUpDate: today,
      followUpNotes: updatedNotes,
    });

    // Sync Customer Master
    if (customer) {
      await this.customerRepo.update(customerId, {
        warrantyNotesReceived: newReceived,
      });
    }

    return updated;
  }
}

export const warrantyService = new WarrantyService();
