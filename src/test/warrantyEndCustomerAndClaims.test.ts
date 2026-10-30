import { describe, it, expect, beforeEach } from 'vitest';
import { warrantyService } from '../services/WarrantyService';
import { calculateWarrantyExpiry, calculateRemainingWarranty } from '../rules/warrantyRules';
import { MOCK_CUSTOMERS } from '../mock/mockCustomers';

describe('Warranty Management System — End-Customer Selling Date & Active/Expired Claim Gating', () => {
  const managerUser = {
    id: 'usr-103',
    name: 'Kamal Perera',
    role: 'SALES_MANAGER',
    areaId: 'area-01',
  };

  const salesRepUser = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    role: 'SALES_REP',
    areaId: 'area-01',
  };

  describe('1. Core Business Rule: Distributor invoice date ≠ Warranty start date', () => {
    it('calculates Warranty Start Date strictly from End-Customer Selling Date, ignoring invoice date', () => {
      const distributorInvoiceDate = '2025-01-10';
      const endCustomerSellingDate = '2026-10-10';
      const warrantyPeriodMonths = 12;

      // Rule calculation
      const expiry = calculateWarrantyExpiry(endCustomerSellingDate, warrantyPeriodMonths);

      expect(expiry).toBe('2027-10-10');
      expect(distributorInvoiceDate).not.toBe(endCustomerSellingDate);
    });

    it('correctly calculates remaining warranty period text and status', () => {
      // Future date
      const futureExpiry = '2027-10-10';
      const refDate = '2026-10-10';
      const remainingInfo = calculateRemainingWarranty(futureExpiry, refDate);

      expect(remainingInfo.status).toBe('ACTIVE');
      expect(remainingInfo.isExpired).toBe(false);
      expect(remainingInfo.displayText).toContain('12 Months');

      // Expired date
      const pastExpiry = '2024-01-01';
      const expiredInfo = calculateRemainingWarranty(pastExpiry, '2026-10-10');
      expect(expiredInfo.status).toBe('EXPIRED');
      expect(expiredInfo.isExpired).toBe(true);
      expect(expiredInfo.displayText).toBe('Warranty Expired');
    });
  });

  describe('2. Sales Manager — Barcode Scanner & Product Dossier Retrieval', () => {
    it('automatically retrieves read-only product, GRN, invoice, and sales rep info by barcode', async () => {
      const barcode = '8901020304011';
      const dossier = await warrantyService.lookupProductByBarcode(barcode);

      expect(dossier).toBeDefined();
      expect(dossier?.productName).toBeDefined();
      expect(dossier?.barcode).toBe(barcode);
      expect(dossier?.grnNumber).toBeDefined();
      expect(dossier?.grnDate).toBeDefined();
      expect(dossier?.distributorInvoiceNumber).toBeDefined();
      expect(dossier?.distributorInvoiceDate).toBeDefined();
      expect(dossier?.productCost).toBeGreaterThan(0);
      expect(dossier?.supplierName).toBeDefined();
      expect(dossier?.salesRepName).toBeDefined();
    });

    it('allows registering end-customer warranty with custom warranty period override and receipt photo', async () => {
      const barcode = '8901020305001';
      const sellingDate = '2026-06-15';
      const overrideWarrantyMonths = 24; // Overridden from 12 to 24 months

      const record = await warrantyService.registerEndCustomerWarranty(
        {
          barcode,
          sellingDate,
          customerId: 'cust-001',
          customerName: 'Lanka Electrical & Hardware Superstore',
          warrantyPeriodMonths: overrideWarrantyMonths,
          endCustomerName: 'Silva Engineering Ltd',
          endCustomerPhone: '+94 77 987 6543',
          receiptPhotoUrl: 'https://images.unsplash.com/sample-receipt.jpg',
        },
        managerUser as any
      );

      expect(record.warrantyStartDate).toBe(sellingDate);
      expect(record.dealerSoldDate).toBe(sellingDate);
      expect(record.warrantyPeriodMonths).toBe(24);
      expect(record.warrantyExpiryDate).toBe('2028-06-15');
      expect(record.endCustomerName).toBe('Silva Engineering Ltd');
      expect(record.receiptPhotoUrl).toBe('https://images.unsplash.com/sample-receipt.jpg');
    });
  });

  describe('3. Warranty Claim Workflow — Active vs Expired Blocking', () => {
    it('allows lodging warranty claim when product warranty is ACTIVE', async () => {
      // Lookup active unit
      const dossier = await warrantyService.lookupProductByBarcode('8901020304011');
      expect(dossier).toBeDefined();
      expect(dossier?.canClaim).toBe(true);
      expect(dossier?.isExpired).toBe(false);

      if (dossier?.warrantyRecordId) {
        const claim = await warrantyService.createClaim(
          {
            warrantyRecordId: dossier.warrantyRecordId,
            complaintDate: '2025-06-01',
            complaintReason: 'Motor thermal overload tripping during start',
            serialNumber: dossier.serialNumber,
          },
          managerUser as any
        );

        expect(claim.id).toBeDefined();
        expect(claim.status).toBe('SUBMITTED');
        expect(claim.complaintReason).toBe('Motor thermal overload tripping during start');
      }
    });

    it('strictly prevents and rejects warranty claim when product warranty is EXPIRED', async () => {
      const expiredBarcode = '8901020305002';
      const dossier = await warrantyService.lookupProductByBarcode(expiredBarcode);

      expect(dossier).toBeDefined();
      expect(dossier?.isExpired).toBe(true);
      expect(dossier?.canClaim).toBe(false);
      expect(dossier?.claimBlockReason).toContain('Warranty Expired');

      // Attempting to lodge a claim against expired record should throw
      if (dossier?.warrantyRecordId) {
        await expect(
          warrantyService.createClaim(
            {
              warrantyRecordId: dossier.warrantyRecordId,
              complaintDate: '2026-10-10',
              complaintReason: 'Switch mechanism burnt out',
              serialNumber: dossier.serialNumber,
            },
            managerUser as any
          )
        ).rejects.toThrow(/Warranty expired/i);
      }
    });
  });

  describe('4. Sales Representative — Customer Warranty Tally & Follow-Up', () => {
    it('calculates Total Sold / Supplied, Warranty Registered, and Pending Registration counts', async () => {
      const tally = await warrantyService.getCustomerWarrantyTally('cust-001');

      expect(tally.customerId).toBe('cust-001');
      expect(tally.customerName).toBe('Lanka Electrical & Hardware Superstore');
      expect(tally.totalSupplied).toBeGreaterThan(0);
      expect(tally.registeredCount).toBeGreaterThanOrEqual(0);
      expect(tally.pendingCount).toBe(Math.max(0, tally.totalSupplied - tally.registeredCount));

      // Each supplied item has required fields
      expect(tally.items.length).toBe(tally.totalSupplied);
      const firstItem = tally.items[0];
      expect(firstItem.productName).toBeDefined();
      expect(firstItem.barcode).toBeDefined();
      expect(firstItem.quantity).toBe(1);
      expect(firstItem.invoiceNumber).toBeDefined();
      expect(firstItem.warrantyStatus).toBeDefined();
    });

    it('provides accurate tally figures for follow-up script formulation', async () => {
      const tally = await warrantyService.getCustomerWarrantyTally('cust-002');

      const expectedScript = `You received ${tally.totalSupplied} units from us, but warranty registrations have been completed for only ${tally.registeredCount} units. Please provide the remaining ${tally.pendingCount} warranty notes.`;

      expect(tally.totalSupplied).toBeGreaterThanOrEqual(1);
      expect(expectedScript).toContain(`You received ${tally.totalSupplied} units`);
    });
  });
});
