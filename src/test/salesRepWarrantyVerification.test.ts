import { describe, it, expect, beforeEach } from 'vitest';
import { warrantyService } from '../services/WarrantyService';
import { classifyUnitWarrantyStatus } from '../rules/warrantyRules';

describe('Sales Representative Warranty Collection & Unit Barcode Verification', () => {
  const salesRepId = 'usr-106'; // Kasun Wickramasinghe

  describe('1. Business Rule: classifyUnitWarrantyStatus', () => {
    it('classifies verified warranty note unit as RECEIVED_VERIFIED', () => {
      const res = classifyUnitWarrantyStatus({
        notesReceived: true,
        warrantyNoteStatus: 'VERIFIED',
        dealerSoldDate: '2025-01-15',
      });
      expect(res.status).toBe('RECEIVED_VERIFIED');
      expect(res.label).toBe('Received & Verified');
    });

    it('classifies note pending review as RECEIVED_PENDING', () => {
      const res = classifyUnitWarrantyStatus({
        notesReceived: false,
        warrantyNoteStatus: 'PENDING_REVIEW',
        dealerSoldDate: '2025-02-01',
      });
      expect(res.status).toBe('RECEIVED_PENDING');
      expect(res.label).toBe('Received (Pending Review)');
    });

    it('classifies unit sold to customer without received note as MISSING_CONFIRMED', () => {
      const res = classifyUnitWarrantyStatus({
        notesReceived: false,
        warrantyNoteStatus: undefined,
        dealerSoldDate: '2025-02-14',
      });
      expect(res.status).toBe('MISSING_CONFIRMED');
      expect(res.label).toBe('Missing Note (Sold to Customer)');
    });

    it('classifies unit in distributor stock (unsold to customer) as IN_DISTRIBUTOR_STOCK', () => {
      const res = classifyUnitWarrantyStatus({
        notesReceived: false,
        warrantyNoteStatus: undefined,
        dealerSoldDate: undefined,
      });
      expect(res.status).toBe('IN_DISTRIBUTOR_STOCK');
      expect(res.label).toBe('In Distributor Stock (Unaccounted)');
    });
  });

  describe('2. Distributor-Level Tracking & Business Reconciliation', () => {
    it('retrieves assigned distributors for sales representative usr-106', async () => {
      const distributors = await warrantyService.getDistributorWarrantySummaries(salesRepId, 'SALES_REP');

      expect(distributors.length).toBeGreaterThan(0);
      // All returned distributors must belong to this sales rep
      distributors.forEach((d) => {
        expect(d.assignedRepId).toBe(salesRepId);
      });

      const muthurajawela = distributors.find((d) => d.distributorId === 'cust-002');
      expect(muthurajawela).toBeDefined();
      expect(muthurajawela?.customerCode).toBe('DLR-NEG-002');
    });

    it('correctly calculates the 10 units scenario for distributor cust-002', async () => {
      const distributors = await warrantyService.getDistributorWarrantySummaries(salesRepId, 'SALES_REP');
      const muth = distributors.find((d) => d.distributorId === 'cust-002');

      expect(muth).toBeDefined();
      expect(muth!.warrantyNotesReceived).toBe(5);
      expect(muth!.confirmedMissingCount).toBe(1);
      expect(muth!.unaccountedInStockCount).toBeGreaterThanOrEqual(4);
      expect(muth!.hasOutstandingNotes).toBe(true);
    });

    it('calculates aggregated summary metrics across all assigned distributors for the sales rep', async () => {
      const summary = await warrantyService.getSalesRepWarrantySummary(salesRepId, 'Kasun Wickramasinghe');

      expect(summary.salesRepId).toBe(salesRepId);
      expect(summary.totalUnitsSold).toBeGreaterThan(0);
      expect(summary.warrantyNotesReceived).toBeGreaterThan(0);
      expect(summary.pendingNotesCount).toBe(
        Math.max(0, summary.totalUnitsSold - summary.warrantyNotesReceived)
      );
      expect(summary.collectionProgress).toBe(
        Math.round((summary.warrantyNotesReceived / summary.totalUnitsSold) * 100)
      );
      expect(summary.distributorsCount).toBeGreaterThan(0);
    });
  });

  describe('3. Unit-Level Barcode Verification & Drill-Down', () => {
    it('retrieves individual physical units with unique barcodes for distributor cust-002', async () => {
      const units = await warrantyService.getUnitBarcodesForDistributor('cust-002');

      expect(units.length).toBeGreaterThanOrEqual(10);

      // Verify specific unique barcodes exist
      const verifiedUnit = units.find((u) => u.barcode === '8901020305001');
      expect(verifiedUnit).toBeDefined();
      expect(verifiedUnit?.warrantyStatus).toBe('RECEIVED_VERIFIED');
      expect(verifiedUnit?.warrantyNoteNumber).toBe('WN-2025-0201');

      // Verify confirmed missing unit (sold to end customer Damith Bandara)
      const missingUnit = units.find((u) => u.barcode === '8901020305006');
      expect(missingUnit).toBeDefined();
      expect(missingUnit?.warrantyStatus).toBe('MISSING_CONFIRMED');
      expect(missingUnit?.endCustomerSaleDate).toBe('2025-02-14');

      // Verify unsold unit in distributor stock
      const inStockUnit = units.find((u) => u.barcode === '8901020305007');
      expect(inStockUnit).toBeDefined();
      expect(inStockUnit?.warrantyStatus).toBe('IN_DISTRIBUTOR_STOCK');
      expect(inStockUnit?.endCustomerSaleDate).toBeUndefined();
    });

    it('filters unit barcodes by barcode search query', async () => {
      const filtered = await warrantyService.getUnitBarcodesForDistributor('cust-002', {
        search: '8901020305006',
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].barcode).toBe('8901020305006');
      expect(filtered[0].warrantyStatus).toBe('MISSING_CONFIRMED');
    });

    it('filters unit barcodes by status filter', async () => {
      const verifiedUnits = await warrantyService.getUnitBarcodesForDistributor('cust-002', {
        status: 'RECEIVED_VERIFIED',
      });
      expect(verifiedUnits.length).toBe(5);
      verifiedUnits.forEach((u) => {
        expect(u.warrantyStatus).toBe('RECEIVED_VERIFIED');
      });

      const missingUnits = await warrantyService.getUnitBarcodesForDistributor('cust-002', {
        status: 'MISSING_CONFIRMED',
      });
      expect(missingUnits.length).toBe(1);
      expect(missingUnits[0].barcode).toBe('8901020305006');
    });
  });

  describe('4. Sales Manager Global vs Scoped Visibility', () => {
    it('returns all distributors across all reps when no rep filter is applied', async () => {
      const allDistributors = await warrantyService.getDistributorWarrantySummaries(undefined, 'SALES_MANAGER');
      const scopedDistributors = await warrantyService.getDistributorWarrantySummaries(salesRepId, 'SALES_REP');

      expect(allDistributors.length).toBeGreaterThanOrEqual(scopedDistributors.length);
    });
  });
});
