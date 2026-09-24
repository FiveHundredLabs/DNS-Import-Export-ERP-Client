import { describe, it, expect, beforeEach } from 'vitest';
import { WarrantyService } from '../services/WarrantyService';
import { MockWarrantyRepository } from '../repositories/mock/MockWarrantyRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import {
  calculateWarrantyExpiry,
  isWarrantyValid,
  calculatePendingWarrantyNotes,
  determineWarrantyStartDate,
} from '../rules/warrantyRules';
import { User } from '../types/auth';
import { Invoice } from '../types/invoice';

describe('Phase 10 — Warranty Domain & Dealer Reconciliation', () => {
  let warrantyRepo: MockWarrantyRepository;
  let customerRepo: MockCustomerRepository;
  let productRepo: MockProductRepository;
  let warrantySvc: WarrantyService;

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

  const mockManagerUser: User = {
    id: 'usr-102',
    name: 'Ruwan Wijesinghe',
    email: 'manager@dnserp.com',
    role: 'MANAGER',
    phone: '+94 77 234 5678',
    isActive: true,
  };

  const mockTestInvoice: Invoice = {
    id: 'inv-test-100',
    invoiceNumber: 'INV-2025-9999',
    orderId: 'ord-test-100',
    orderNumber: 'SO-2025-9999',
    customerId: 'cust-001',
    customerName: 'Lanka Electrical & Hardware Superstore',
    customerCode: 'DLR-COL-001',
    salesRepId: 'usr-106',
    salesRepName: 'Kasun Wickramasinghe',
    issueDate: '2025-01-15',
    dueDate: '2025-02-15',
    subtotal: 65000,
    discountTotal: 0,
    taxTotal: 0,
    totalAmount: 65000,
    paidAmount: 0,
    balanceAmount: 65000,
    status: 'ISSUED',
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
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    warrantyRepo = new MockWarrantyRepository();
    customerRepo = new MockCustomerRepository();
    productRepo = new MockProductRepository();
    warrantySvc = new WarrantyService(warrantyRepo, customerRepo, productRepo);
  });

  describe('1. Pure Business Rules (warrantyRules.ts)', () => {
    it('calculates exact warranty expiry date for standard periods', () => {
      // 12 months from 2025-01-15
      const expiry12 = calculateWarrantyExpiry('2025-01-15', 12);
      expect(expiry12).toBe('2026-01-15');

      // 24 months from 2025-06-20
      const expiry24 = calculateWarrantyExpiry('2025-06-20', 24);
      expect(expiry24).toBe('2027-06-20');
    });

    it('safely handles month-end rollover and leap year boundaries', () => {
      // Jan 31 + 1 month -> clamped to Feb 28 (non-leap year 2025)
      const febExpiry = calculateWarrantyExpiry('2025-01-31', 1);
      expect(febExpiry).toBe('2025-02-28');

      // Jan 31 + 1 month in leap year 2024 -> clamped to Feb 29
      const leapExpiry = calculateWarrantyExpiry('2024-01-31', 1);
      expect(leapExpiry).toBe('2024-02-29');

      // March 31 + 1 month -> clamped to April 30
      const aprExpiry = calculateWarrantyExpiry('2025-03-31', 1);
      expect(aprExpiry).toBe('2025-04-30');
    });

    it('rejects invalid or negative warranty period', () => {
      expect(() => calculateWarrantyExpiry('2025-01-15', -6)).toThrow(
        /Warranty period must be a non-negative number/
      );
      expect(() => calculateWarrantyExpiry('2025-01-15', NaN)).toThrow(
        /Warranty period must be a non-negative number/
      );
    });

    it('validates complaint date against warranty expiry window and start date', () => {
      const expiryDate = '2026-01-15';
      const startDate = '2025-01-15';

      // Within window
      expect(isWarrantyValid(expiryDate, '2025-06-01', startDate)).toBe(true);

      // Exactly on expiry date (inclusive)
      expect(isWarrantyValid(expiryDate, '2026-01-15', startDate)).toBe(true);

      // Exactly on start date (inclusive)
      expect(isWarrantyValid(expiryDate, '2025-01-15', startDate)).toBe(true);

      // One day before start date -> invalid
      expect(isWarrantyValid(expiryDate, '2025-01-14', startDate)).toBe(false);

      // One day after expiry date
      expect(isWarrantyValid(expiryDate, '2026-01-16', startDate)).toBe(false);

      // Months after expiry date
      expect(isWarrantyValid(expiryDate, '2026-05-20', startDate)).toBe(false);
    });

    it('calculates pending warranty notes (Sold - Received) clamped to zero', () => {
      expect(calculatePendingWarrantyNotes(100, 80)).toBe(20);
      expect(calculatePendingWarrantyNotes(50, 50)).toBe(0);
      expect(calculatePendingWarrantyNotes(40, 60)).toBe(0); // Clamped, cannot be negative
      expect(calculatePendingWarrantyNotes(0, 0)).toBe(0);
    });

    it('activates warranty from showroom invoice date vs dealer sold-date', () => {
      // Showroom sale: begins on invoice date
      const showroomStart = determineWarrantyStartDate('SHOWROOM', '2025-01-10', '2025-02-01');
      expect(showroomStart).toBe('2025-01-10');

      // Dealer sale with customer registration card: begins on dealer sold date
      const dealerStart = determineWarrantyStartDate('DEALER', '2025-01-10', '2025-02-01');
      expect(dealerStart).toBe('2025-02-01');

      // Dealer sale without registered card: falls back to invoice issue date
      const dealerFallback = determineWarrantyStartDate('DEALER', '2025-01-10', undefined);
      expect(dealerFallback).toBe('2025-01-10');
    });
  });

  describe('2. Canonical Warranty Registration & Single Source of Truth', () => {
    it('creates warranty record referencing canonical invoice, customer, and product', async () => {
      const record = await warrantySvc.registerWarranty(
        mockTestInvoice,
        mockTestInvoice.items[0],
        'DEALER',
        '2025-01-20',
        'SN-TEST-88123'
      );

      expect(record.id).toBeDefined();
      expect(record.invoiceId).toBe('inv-test-100');
      expect(record.invoiceNumber).toBe('INV-2025-9999');
      expect(record.customerId).toBe('cust-001');
      expect(record.customerName).toBe('Lanka Electrical & Hardware Superstore');
      expect(record.productId).toBe('prod-001');
      expect(record.productName).toBe('Schneider Acti9 32A Double Pole MCB');
      expect(record.sku).toBe('DNS-MCB-32A-2P');
      expect(record.serialNumber).toBe('SN-TEST-88123');
      expect(record.warrantyStartDate).toBe('2025-01-20');
      expect(record.warrantyPeriodMonths).toBe(24); // From prod-001 in MockProductRepository
      expect(record.warrantyExpiryDate).toBe('2027-01-20');
      expect(record.saleType).toBe('DEALER');
      expect(record.status).toBe('ACTIVE');
      expect(record.notesReceived).toBe(true);
    });

    it('updates shop follow-up tracking and Customer Master when dealer sale is registered', async () => {
      const initialCustomer = await customerRepo.getById('cust-001');
      const prevExpected = initialCustomer?.warrantyNotesExpected || 0;

      await warrantySvc.registerWarranty(
        mockTestInvoice,
        mockTestInvoice.items[0], // quantity = 20
        'DEALER',
        '2025-01-20'
      );

      const updatedCustomer = await customerRepo.getById('cust-001');
      expect(updatedCustomer?.warrantyNotesExpected).toBe(prevExpected + 20);

      const followUp = await warrantyRepo.getFollowUpByCustomerId('cust-001');
      expect(followUp).toBeDefined();
      expect(followUp?.totalUnitsSold).toBeGreaterThanOrEqual(20);
    });
  });

  describe('3. Warranty Claims Lifecycle & Resolution Workflow', () => {
    it('creates warranty claim for active warranty record within valid window', async () => {
      const claim = await warrantySvc.createClaim(
        {
          warrantyRecordId: 'war-001', // Active until 2027-01-20
          complaintDate: '2025-03-01',
          complaintReason: 'Unit fails to latch under nominal current test.',
          serialNumber: 'SN-SCH-2025-88190',
        },
        mockSalesRepUser
      );

      expect(claim.id).toBeDefined();
      expect(claim.claimNumber).toMatch(/^CLM-\d{4}-\d+/);
      expect(claim.status).toBe('SUBMITTED');
      expect(claim.complaintDate).toBe('2025-03-01');
      expect(claim.warrantyRecordId).toBe('war-001');
      expect(claim.customerName).toBe('Lanka Electrical & Hardware Superstore');

      // Warranty record status transitioned to CLAIMED
      const updatedRecord = await warrantySvc.getWarrantyById('war-001');
      expect(updatedRecord?.status).toBe('CLAIMED');
    });

    it('rejects claim creation if warranty has expired', async () => {
      // war-003 expired on 2025-01-10
      await expect(
        warrantySvc.createClaim(
          {
            warrantyRecordId: 'war-003',
            complaintDate: '2025-02-15',
            complaintReason: 'Socket switch loose',
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/Warranty expired on 2025-01-10/);
    });

    it('rejects claim creation if complaint date precedes warranty start date', async () => {
      // war-001 started on 2025-01-20
      await expect(
        warrantySvc.createClaim(
          {
            warrantyRecordId: 'war-001',
            complaintDate: '2025-01-10', // 10 days before warranty started
            complaintReason: 'Pre-sale defect allegation',
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/cannot precede warranty start date/);
    });

    it('executes full claim lifecycle: SUBMITTED -> IN_INSPECTION -> APPROVED -> REPLACED', async () => {
      const claim = await warrantySvc.createClaim(
        {
          warrantyRecordId: 'war-004',
          complaintDate: '2025-02-01',
          complaintReason: 'Trip coil open circuit',
        },
        mockSalesRepUser
      );
      expect(claim.status).toBe('SUBMITTED');

      // Inspection
      const inspected = await warrantySvc.inspectClaim(claim.id, mockManagerUser, 'Verified open circuit on bench test.');
      expect(inspected.status).toBe('IN_INSPECTION');
      expect(inspected.inspectedById).toBe('usr-102');

      // Approval
      const approved = await warrantySvc.approveClaim(claim.id, mockManagerUser, 'Claim authorized for warehouse exchange.');
      expect(approved.status).toBe('APPROVED');
      expect(approved.resolutionNotes).toContain('Claim authorized for warehouse exchange.');

      // Resolution: REPLACE
      const resolved = await warrantySvc.resolveClaim(
        claim.id,
        'REPLACE',
        'Authorized replacement unit issued from central inventory.',
        mockManagerUser
      );
      expect(resolved.status).toBe('REPLACED');
      expect(resolved.resolutionType).toBe('REPLACE');
      expect(resolved.resolvedById).toBe('usr-102');
      expect(resolved.resolvedAt).toBeDefined();
      expect(resolved.resolutionNotes).toContain('Authorized replacement unit');
    });

    it('supports REPAIR and REJECT resolution outcomes', async () => {
      const claim1 = await warrantySvc.createClaim(
        {
          warrantyRecordId: 'war-004',
          complaintDate: '2025-02-05',
          complaintReason: 'Aux contact loose screw',
        },
        mockSalesRepUser
      );

      const repaired = await warrantySvc.resolveClaim(
        claim1.id,
        'REPAIR',
        'Tightened contact terminal and recalibrated.',
        mockManagerUser
      );
      expect(repaired.status).toBe('REPAIRED');
      expect(repaired.resolutionType).toBe('REPAIR');

      const claim2 = await warrantySvc.createClaim(
        {
          warrantyRecordId: 'war-004',
          complaintDate: '2025-02-06',
          complaintReason: 'Water ingress damage',
        },
        mockSalesRepUser
      );

      const rejected = await warrantySvc.resolveClaim(
        claim2.id,
        'REJECT',
        'Damage caused by direct external water exposure, outside warranty coverage.',
        mockManagerUser
      );
      expect(rejected.status).toBe('REJECTED');
      expect(rejected.resolutionType).toBe('REJECT');
    });
  });

  describe('4. Sales Rep Territory Scoping & Shop Follow-ups', () => {
    it('scopes shop warranty follow-ups exclusively to the sales reps assigned territory', async () => {
      // usr-106 is assigned to cust-001, cust-002, and cust-004
      const repFollowUps = await warrantySvc.getShopWarrantyFollowUps('usr-106');
      expect(repFollowUps.length).toBeGreaterThan(0);
      for (const fu of repFollowUps) {
        expect(['cust-001', 'cust-002', 'cust-004']).toContain(fu.customerId);
      }

      // Rep with no assigned territory/dealers receives empty list
      const otherRepFollowUps = await warrantySvc.getShopWarrantyFollowUps('usr-108');
      expect(otherRepFollowUps.length).toBe(0);

      // Manager/Director sees all follow-ups
      const allFollowUps = await warrantySvc.getShopWarrantyFollowUps();
      expect(allFollowUps.length).toBeGreaterThanOrEqual(repFollowUps.length);
    });

    it('records shop visit follow-up and reconciles collected warranty cards', async () => {
      const followUp = await warrantySvc.recordFollowUp(
        'cust-001',
        'Visited shopkeeper; gathered 5 filled registration cards from contractors.',
        mockSalesRepUser,
        5 // collected cards increment
      );

      expect(followUp.warrantyNotesReceived).toBe(133); // 128 initial + 5
      expect(followUp.pendingNotesCount).toBe(Math.max(0, followUp.totalUnitsSold - 133));
      expect(followUp.lastFollowUpDate).toBe(new Date().toISOString().split('T')[0]);
      expect(followUp.followUpNotes?.some((n) => n.includes('gathered 5 filled registration cards'))).toBe(true);

      // Synchronizes Customer Master
      const cust = await customerRepo.getById('cust-001');
      expect(cust?.warrantyNotesReceived).toBe(133);
    });
  });
});
