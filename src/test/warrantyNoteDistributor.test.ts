import { describe, it, expect, beforeEach } from 'vitest';
import { WarrantyService } from '../services/WarrantyService';
import { MockWarrantyRepository } from '../repositories/mock/MockWarrantyRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { canProcessWarrantyClaim } from '../rules/warrantyRules';
import { User } from '../types/auth';
import { Invoice } from '../types/invoice';

describe('Distributor Warranty Note Management & Sales Manager Validation', () => {
  let warrantyRepo: MockWarrantyRepository;
  let customerRepo: MockCustomerRepository;
  let productRepo: MockProductRepository;
  let warrantySvc: WarrantyService;

  const mockSalesManagerUser: User = {
    id: 'usr-103',
    name: 'Kamal Perera',
    email: 'sales.manager@dnserp.com',
    role: 'SALES_MANAGER',
    phone: '+94 77 345 6789',
    isActive: true,
  };

  const mockDirectorUser: User = {
    id: 'usr-101',
    name: 'Deshamanya Nihal Jayawardena',
    email: 'director@dnserp.com',
    role: 'DIRECTOR',
    phone: '+94 77 123 4567',
    isActive: true,
  };

  const mockSalesRepUser: User = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    email: 'rep.colombo@dnserp.com',
    role: 'SALES_REP',
    areaId: 'area-01',
    areaName: 'Western Province Central',
    phone: '+94 77 678 9012',
    isActive: true,
  };

  const mockDistributorInvoice: Invoice = {
    id: 'inv-dist-200',
    invoiceNumber: 'INV-2025-5500',
    orderId: 'ord-dist-200',
    orderNumber: 'SO-2025-5500',
    customerId: 'cust-001',
    customerName: 'Lanka Electrical & Hardware Superstore',
    customerCode: 'DLR-COL-001',
    salesRepId: 'usr-106',
    salesRepName: 'Kasun Wickramasinghe',
    issueDate: '2025-01-10',
    dueDate: '2025-02-10',
    subtotal: 100000,
    discountTotal: 0,
    taxTotal: 0,
    totalAmount: 100000,
    paidAmount: 100000,
    balanceAmount: 0,
    status: 'PAID',
    items: [
      {
        id: 'item-01',
        productId: 'prod-001',
        productNameSnapshot: 'Schneider Acti9 32A Double Pole MCB',
        skuSnapshot: 'DNS-MCB-32A-2P',
        unitPriceSnapshot: 3250,
        discountPercentage: 0,
        taxPercentage: 0,
        lineTotal: 65000,
        quantity: 20,
      },
    ],
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: '2025-01-10T08:00:00Z',
  };

  beforeEach(() => {
    warrantyRepo = new MockWarrantyRepository();
    customerRepo = new MockCustomerRepository();
    productRepo = new MockProductRepository();
    warrantySvc = new WarrantyService(warrantyRepo, customerRepo, productRepo);
  });

  describe('1. Business Rule: canProcessWarrantyClaim', () => {
    it('blocks warranty claim for DEALER sale if warranty note is missing or unverified', () => {
      // Missing note
      const check1 = canProcessWarrantyClaim('DEALER', false, undefined);
      expect(check1.allowed).toBe(false);
      expect(check1.reason).toContain('Distributor sales require a valid warranty note reviewed and verified by the Sales Manager');

      // Pending review note
      const check2 = canProcessWarrantyClaim('DEALER', false, 'PENDING_REVIEW');
      expect(check2.allowed).toBe(false);
      expect(check2.reason).toContain('Distributor sales require a valid warranty note');

      // Rejected note
      const check3 = canProcessWarrantyClaim('DEALER', false, 'REJECTED');
      expect(check3.allowed).toBe(false);
    });

    it('allows warranty claim for DEALER sale when warranty note is received and VERIFIED', () => {
      const check = canProcessWarrantyClaim('DEALER', true, 'VERIFIED');
      expect(check.allowed).toBe(true);
      expect(check.reason).toBeUndefined();
    });

    it('allows warranty claim for SHOWROOM sales directly without distributor note', () => {
      const check = canProcessWarrantyClaim('SHOWROOM', true, undefined);
      expect(check.allowed).toBe(true);
    });
  });

  describe('2. Sales Manager Recording of Warranty Notes', () => {
    it('permits Sales Manager to enter and record distributor warranty note with immediate verification', async () => {
      // Register a distributor sale without note initially
      const record = await warrantyRepo.createRecord({
        invoiceId: mockDistributorInvoice.id,
        invoiceNumber: mockDistributorInvoice.invoiceNumber,
        customerId: mockDistributorInvoice.customerId,
        customerName: mockDistributorInvoice.customerName,
        productId: 'prod-001',
        productName: 'Schneider Acti9 32A Double Pole MCB',
        sku: 'DNS-MCB-32A-2P',
        serialNumber: 'SN-SCH-2025-99881',
        saleDate: '2025-01-10',
        warrantyStartDate: '2025-01-10',
        warrantyPeriodMonths: 24,
        warrantyExpiryDate: '2027-01-10',
        saleType: 'DEALER',
        status: 'ACTIVE',
        notesReceived: false,
      });

      // Sales Manager enters and verifies the warranty note
      const note = await warrantySvc.recordWarrantyNote(
        {
          warrantyRecordId: record.id,
          noteNumber: 'WN-DIST-8801',
          distributorSaleDate: '2025-01-28',
          receivedDate: '2025-01-30',
          endCustomerName: 'Aruna Jayasekera (Apex Towers Project)',
          endCustomerPhone: '+94 77 999 1234',
          endCustomerAddress: '55 Nawam Mawatha, Colombo 02',
          reviewNotes: 'Distributor stamp and end-customer invoice verified.',
          verifyImmediately: true,
        },
        mockSalesManagerUser
      );

      expect(note.id).toBeDefined();
      expect(note.noteNumber).toBe('WN-DIST-8801');
      expect(note.status).toBe('VERIFIED');
      expect(note.distributorName).toBe('Lanka Electrical & Hardware Superstore');
      expect(note.distributorSaleDate).toBe('2025-01-28');
      expect(note.endCustomerName).toBe('Aruna Jayasekera (Apex Towers Project)');
      expect(note.reviewedByUserId).toBe(mockSalesManagerUser.id);
      expect(note.reviewedByUserName).toBe('Kamal Perera');

      // Linked warranty record lifecycle dates recalculated based on distributor sale date
      const updatedRecord = await warrantySvc.getWarrantyById(record.id);
      expect(updatedRecord?.dealerSoldDate).toBe('2025-01-28');
      expect(updatedRecord?.warrantyStartDate).toBe('2025-01-28');
      expect(updatedRecord?.warrantyExpiryDate).toBe('2027-01-28');
      expect(updatedRecord?.notesReceived).toBe(true);
      expect(updatedRecord?.warrantyNoteStatus).toBe('VERIFIED');
      expect(updatedRecord?.warrantyNoteNumber).toBe('WN-DIST-8801');
      expect(updatedRecord?.endCustomerName).toBe('Aruna Jayasekera (Apex Towers Project)');
    });

    it('rejects unauthorized roles (e.g. SALES_REP) from entering distributor warranty notes', async () => {
      await expect(
        warrantySvc.recordWarrantyNote(
          {
            warrantyRecordId: 'war-006',
            distributorSaleDate: '2025-01-25',
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/Access denied: Only the Sales Manager or authorized management/);
    });
  });

  describe('3. Sales Manager Review & Validation Workflow', () => {
    it('records note as PENDING_REVIEW and validates it upon subsequent Sales Manager review', async () => {
      // Record entered with verifyImmediately: false
      const note = await warrantySvc.recordWarrantyNote(
        {
          warrantyRecordId: 'war-006',
          noteNumber: 'WN-PEND-001',
          distributorSaleDate: '2025-01-22',
          receivedDate: '2025-01-24',
          endCustomerName: 'Bandara & Sons Electricals',
          verifyImmediately: false,
        },
        mockSalesManagerUser
      );

      expect(note.status).toBe('PENDING_REVIEW');
      const recordPending = await warrantySvc.getWarrantyById('war-006');
      expect(recordPending?.notesReceived).toBe(false);
      expect(recordPending?.warrantyNoteStatus).toBe('PENDING_REVIEW');

      // Attempting to lodge a claim while note is PENDING_REVIEW is blocked
      await expect(
        warrantySvc.createClaim(
          {
            warrantyRecordId: 'war-006',
            complaintDate: '2025-02-01',
            complaintReason: 'Defective trip coil reported by distributor',
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/Distributor sales require a valid warranty note reviewed and verified by the Sales Manager/);

      // Sales Manager reviews and validates the note
      const reviewedNote = await warrantySvc.reviewWarrantyNote(
        note.id,
        'VERIFY',
        'Distributor counterfoil confirmed and verified by Sales Manager Kamal Perera.',
        mockSalesManagerUser
      );

      expect(reviewedNote.status).toBe('VERIFIED');
      expect(reviewedNote.reviewedByUserId).toBe('usr-103');
      expect(reviewedNote.reviewedByUserName).toBe('Kamal Perera');

      // Record is now verified
      const recordVerified = await warrantySvc.getWarrantyById('war-006');
      expect(recordVerified?.notesReceived).toBe(true);
      expect(recordVerified?.warrantyNoteStatus).toBe('VERIFIED');

      // Claim can now be lodged successfully
      const claim = await warrantySvc.createClaim(
        {
          warrantyRecordId: 'war-006',
          complaintDate: '2025-02-01',
          complaintReason: 'Defective trip coil reported by distributor',
        },
        mockSalesRepUser
      );

      expect(claim.id).toBeDefined();
      expect(claim.status).toBe('SUBMITTED');
      expect(claim.warrantyNoteNumber).toBe('WN-PEND-001');
      expect(claim.endCustomerName).toBe('Bandara & Sons Electricals');
    });

    it('handles distributor note rejection by Sales Manager with mandatory review reason', async () => {
      const note = await warrantySvc.recordWarrantyNote(
        {
          warrantyRecordId: 'war-006',
          noteNumber: 'WN-REJ-002',
          distributorSaleDate: '2025-01-20',
          receivedDate: '2025-01-24',
          endCustomerName: 'Unknown Contractor',
          verifyImmediately: false,
        },
        mockSalesManagerUser
      );

      const rejected = await warrantySvc.reviewWarrantyNote(
        note.id,
        'REJECT',
        'Distributor official stamp missing and serial number unreadable on card.',
        mockSalesManagerUser
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.reviewNotes).toContain('Distributor official stamp missing');

      const record = await warrantySvc.getWarrantyById('war-006');
      expect(record?.warrantyNoteStatus).toBe('REJECTED');
      expect(record?.notesReceived).toBe(false);

      // Claim creation rejected
      await expect(
        warrantySvc.createClaim(
          {
            warrantyRecordId: 'war-006',
            complaintDate: '2025-02-01',
            complaintReason: 'Claim on rejected card',
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/Distributor sales require a valid warranty note reviewed and verified by the Sales Manager/);
    });
  });
});
