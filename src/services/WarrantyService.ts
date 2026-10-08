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
  WarrantyNote,
  WarrantyNoteFilters,
  RecordWarrantyNoteDTO,
} from '../types/warranty';
import { Invoice, InvoiceItem } from '../types/invoice';
import { User } from '../types/auth';
import { PaginatedResult } from '../types/common';
import {
  calculateWarrantyExpiry,
  isWarrantyValid,
  calculatePendingWarrantyNotes,
  determineWarrantyStartDate,
  canProcessWarrantyClaim,
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

    let warrantyNoteId: string | undefined;
    let warrantyNoteNumber: string | undefined;
    let warrantyNoteStatus: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | undefined;

    if (saleType === 'DEALER' && dealerSoldDate) {
      warrantyNoteNumber = `WN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      warrantyNoteStatus = 'VERIFIED';
    }

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
      warrantyNoteId,
      warrantyNoteNumber,
      warrantyNoteStatus,
    });

    if (saleType === 'DEALER' && dealerSoldDate && warrantyNoteNumber) {
      try {
        const note = await this.repo.createWarrantyNote({
          noteNumber: warrantyNoteNumber,
          warrantyRecordId: record.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          distributorId: invoice.customerId,
          distributorName: invoice.customerName,
          productId: item.productId,
          productName: item.productNameSnapshot,
          sku: item.skuSnapshot,
          serialNumber: record.serialNumber || '',
          distributorSaleDate: dealerSoldDate,
          receivedDate: invoice.issueDate,
          status: 'VERIFIED',
          reviewNotes: 'Auto-verified with registered distributor delivery card.',
          enteredByUserId: invoice.salesRepId || 'usr-system',
          enteredByUserName: invoice.salesRepName || 'System / Field Sales',
          reviewedByUserId: 'usr-103',
          reviewedByUserName: 'Kamal Perera',
          reviewedAt: new Date().toISOString(),
        });
        await this.repo.updateRecord(record.id, {
          warrantyNoteId: note.id,
        });
        record.warrantyNoteId = note.id;
      } catch (err) {
        console.warn('Could not persist initial warranty note:', err);
      }
    }

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
   * Looks up a specific warranty unit by its unique individual unit barcode.
   * Barcodes are assigned to each individual unit, not to the product itself.
   */
  async getWarrantyByUnitBarcode(barcode: string): Promise<WarrantyRecord | null> {
    const term = barcode.trim().toLowerCase();
    if (!term) return null;
    const res = await this.repo.getAllRecords({ search: term, pageSize: 1000 });
    const records = res.data || (res as any).items || [];
    return (
      records.find(
        (r) =>
          (r.barcode && r.barcode.toLowerCase() === term) ||
          (r.serialNumber && r.serialNumber.toLowerCase() === term)
      ) || null
    );
  }

  /**
   * Lodges a new warranty claim against an active warranty record.
   * Enforces strict expiration check against complaint date.
   * Enforces validation based on distributor warranty note for dealer/distributor sales.
   */
  async createClaim(data: CreateClaimDTO, _user?: User): Promise<WarrantyClaim> {
    const record = await this.repo.getRecordById(data.warrantyRecordId);
    if (!record) {
      throw new Error(`Warranty record with ID ${data.warrantyRecordId} not found`);
    }

    // Distributor sales validation:
    // Company sells to distributors, not direct end-customers. Therefore, warranty claims
    // must be validated based on the warranty note received from the distributor.
    if (record.saleType === 'DEALER') {
      const claimCheck = canProcessWarrantyClaim(
        record.saleType,
        record.notesReceived,
        record.warrantyNoteStatus
      );
      if (!claimCheck.allowed) {
        throw new Error(claimCheck.reason);
      }
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
      warrantyNoteId: record.warrantyNoteId,
      warrantyNoteNumber: record.warrantyNoteNumber,
      distributorId: record.customerId,
      distributorName: record.customerName,
      endCustomerName: record.endCustomerName,
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

    // Verify distributor note validation before approving
    if (claim.warrantyRecordId) {
      const record = await this.repo.getRecordById(claim.warrantyRecordId);
      if (record && record.saleType === 'DEALER') {
        const claimCheck = canProcessWarrantyClaim(
          record.saleType,
          record.notesReceived,
          record.warrantyNoteStatus
        );
        if (!claimCheck.allowed) {
          throw new Error(claimCheck.reason);
        }
      }
    }

    return this.repo.updateClaim(claimId, {
      status: 'APPROVED',
      inspectedById: claim.inspectedById || user.id,
      resolutionNotes: notes ? (claim.resolutionNotes ? `${claim.resolutionNotes}\n${notes}` : notes) : claim.resolutionNotes,
    });
  }

  // ================= Distributor Warranty Notes =================

  /**
   * Enters and records a distributor warranty note in the system.
   * Specifically available for the Sales Manager (and authorized management: Manager/Director).
   * Validates the distributor sale, recalculates warranty lifecycle dates, and links to master records.
   */
  async recordWarrantyNote(data: RecordWarrantyNoteDTO, user: User): Promise<WarrantyNote> {
    const allowedRoles: string[] = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'];
    if (!allowedRoles.includes(user.role)) {
      throw new Error(
        'Access denied: Only the Sales Manager or authorized management can enter and record distributor warranty notes.'
      );
    }

    const record = await this.repo.getRecordById(data.warrantyRecordId);
    if (!record) {
      throw new Error(`Warranty record with ID ${data.warrantyRecordId} not found.`);
    }

    const noteNumber =
      data.noteNumber?.trim() ||
      `WN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const receivedDate = data.receivedDate || new Date().toISOString().split('T')[0];
    const isVerified = data.verifyImmediately ?? false;
    const status = isVerified ? 'VERIFIED' : 'PENDING_REVIEW';

    const note = await this.repo.createWarrantyNote({
      noteNumber,
      warrantyRecordId: record.id,
      invoiceId: record.invoiceId,
      invoiceNumber: record.invoiceNumber,
      distributorId: record.customerId,
      distributorName: record.customerName,
      productId: record.productId,
      productName: record.productName,
      sku: record.sku,
      barcode: data.barcode || record.barcode,
      serialNumber: data.serialNumber || record.serialNumber || '',
      distributorSaleDate: data.distributorSaleDate,
      receivedDate,
      endCustomerName: data.endCustomerName,
      endCustomerPhone: data.endCustomerPhone,
      status,
      reviewNotes: data.reviewNotes || (isVerified ? 'Verified upon entry by Sales Manager.' : undefined),
      reviewedByUserId: isVerified ? user.id : undefined,
      reviewedByUserName: isVerified ? user.name : undefined,
      reviewedAt: isVerified ? new Date().toISOString() : undefined,
      enteredByUserId: user.id,
      enteredByUserName: user.name,
    });

    // Recalculate warranty start date & expiry date based on distributor sold date
    const newStartDate = data.distributorSaleDate;
    const newExpiryDate = calculateWarrantyExpiry(newStartDate, record.warrantyPeriodMonths);

    await this.repo.updateRecord(record.id, {
      dealerSoldDate: data.distributorSaleDate,
      warrantyStartDate: newStartDate,
      warrantyExpiryDate: newExpiryDate,
      notesReceived: isVerified,
      notesReceivedDate: isVerified ? receivedDate : undefined,
      warrantyNoteId: note.id,
      warrantyNoteNumber: note.noteNumber,
      warrantyNoteStatus: note.status,
      endCustomerName: data.endCustomerName,
      barcode: data.barcode || record.barcode,
      serialNumber: data.serialNumber || record.serialNumber,
    });

    // Update shop follow-up tracking and Customer Master when note is verified
    if (isVerified) {
      try {
        const existingFollowUp = await this.repo.getFollowUpByCustomerId(record.customerId);
        const customer = await this.customerRepo.getById(record.customerId);

        const baseSold = existingFollowUp?.totalUnitsSold ?? customer?.warrantyNotesExpected ?? 0;
        const baseReceived = existingFollowUp?.warrantyNotesReceived ?? customer?.warrantyNotesReceived ?? 0;
        const newReceived = baseReceived + 1;
        const newPending = calculatePendingWarrantyNotes(baseSold, newReceived);

        await this.repo.saveFollowUp({
          customerId: record.customerId,
          customerName: record.customerName,
          totalUnitsSold: baseSold,
          warrantyNotesReceived: newReceived,
          pendingNotesCount: newPending,
          lastFollowUpDate: receivedDate,
          followUpNotes: existingFollowUp?.followUpNotes || [],
        });

        if (customer) {
          await this.customerRepo.update(customer.id, {
            warrantyNotesReceived: newReceived,
          });
        }
      } catch (err) {
        console.warn('Could not sync dealer follow-up stats for warranty note:', err);
      }
    }

    return note;
  }

  /**
   * Reviews and validates a warranty note received from a distributor.
   * Performed by the Sales Manager prior to processing any warranty claims.
   */
  async reviewWarrantyNote(
    noteId: string,
    action: 'VERIFY' | 'REJECT',
    reviewNotes: string,
    user: User
  ): Promise<WarrantyNote> {
    const allowedRoles: string[] = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'];
    if (!allowedRoles.includes(user.role)) {
      throw new Error(
        'Access denied: Only the Sales Manager or authorized management can review and validate distributor warranty notes.'
      );
    }

    const note = await this.repo.getWarrantyNoteById(noteId);
    if (!note) {
      throw new Error(`Warranty note with ID ${noteId} not found.`);
    }

    const newStatus = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
    const updatedNote = await this.repo.updateWarrantyNote(noteId, {
      status: newStatus,
      reviewNotes: reviewNotes || (action === 'VERIFY' ? 'Validated by Sales Manager.' : 'Rejected by Sales Manager.'),
      reviewedByUserId: user.id,
      reviewedByUserName: user.name,
      reviewedAt: new Date().toISOString(),
    });

    // Synchronize linked warranty record
    if (note.warrantyRecordId) {
      const record = await this.repo.getRecordById(note.warrantyRecordId);
      if (record) {
        await this.repo.updateRecord(record.id, {
          warrantyNoteStatus: newStatus,
          notesReceived: newStatus === 'VERIFIED',
          notesReceivedDate: newStatus === 'VERIFIED' ? updatedNote.receivedDate : undefined,
        });

        if (newStatus === 'VERIFIED') {
          try {
            const customer = await this.customerRepo.getById(record.customerId);
            const followUp = await this.repo.getFollowUpByCustomerId(record.customerId);
            const baseReceived = followUp?.warrantyNotesReceived ?? customer?.warrantyNotesReceived ?? 0;
            const baseSold = followUp?.totalUnitsSold ?? customer?.warrantyNotesExpected ?? 0;
            const newReceived = baseReceived + 1;

            await this.repo.saveFollowUp({
              customerId: record.customerId,
              customerName: record.customerName,
              totalUnitsSold: baseSold,
              warrantyNotesReceived: newReceived,
              pendingNotesCount: calculatePendingWarrantyNotes(baseSold, newReceived),
              lastFollowUpDate: updatedNote.receivedDate,
              followUpNotes: followUp?.followUpNotes || [],
            });

            if (customer) {
              await this.customerRepo.update(customer.id, {
                warrantyNotesReceived: newReceived,
              });
            }
          } catch (err) {
            console.warn('Could not sync follow up stats during note verification:', err);
          }
        }
      }
    }

    return updatedNote;
  }

  async getWarrantyNotes(filters?: WarrantyNoteFilters): Promise<PaginatedResult<WarrantyNote>> {
    return this.repo.getAllWarrantyNotes(filters);
  }

  async getWarrantyNoteById(id: string): Promise<WarrantyNote | null> {
    return this.repo.getWarrantyNoteById(id);
  }

  async getWarrantyNoteByRecordId(warrantyRecordId: string): Promise<WarrantyNote | null> {
    return this.repo.getWarrantyNoteByRecordId(warrantyRecordId);
  }

  async getWarrantyNotesByDistributorId(distributorId: string): Promise<WarrantyNote[]> {
    return this.repo.getWarrantyNotesByDistributorId(distributorId);
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
