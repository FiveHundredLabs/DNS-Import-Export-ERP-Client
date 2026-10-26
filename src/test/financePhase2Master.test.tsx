import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Decimal from 'decimal.js';

import { financeRepository } from '../features/finance/api';
import { apService, VendorBillLineItem } from '../features/finance/services/apService';
import { GRNCreateEditPage } from '../features/inventory/GRNCreateEditPage';
import { GRNDetailPage } from '../features/inventory/GRNDetailPage';
import { SupplierAdvancePaymentsPage } from '../features/finance/pages/ap/SupplierAdvancePaymentsPage';
import { SupplierDebitNotesPage } from '../features/finance/pages/ap/SupplierDebitNotesPage';
import { VendorBillCostingPage } from '../features/finance/pages/ap/VendorBillCostingPage';

// Mock Auth Context to switch between STOCK_KEEPER and FINANCE_OFFICER / ADMIN
let mockCurrentUser = {
  id: 'usr-stock-1',
  username: 'stockkeeper',
  role: 'STOCK_KEEPER',
  name: 'Sam Stockkeeper',
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
    user: mockCurrentUser,
    isAuthenticated: true,
    role: mockCurrentUser.role,
    hasPermission: () => true,
    canAccessRoute: () => true,
  }),
}));

describe('Phase 2 Master Test Suite: AP, Procurement & Supplier Management', () => {
  beforeEach(async () => {
    mockCurrentUser = {
      id: 'usr-stock-1',
      username: 'stockkeeper',
      role: 'STOCK_KEEPER',
      name: 'Sam Stockkeeper',
    };
    await financeRepository.resetToDefaults();
    apService.reset();
  });

  describe('1. Warehouse Isolation (GRN UI Restrictions)', () => {
    it('Stock Keeper UI hides unit cost, line values, total valuation, and displays Warehouse Isolation banner', async () => {
      mockCurrentUser = {
        id: 'usr-stock-1',
        username: 'stockkeeper',
        role: 'STOCK_KEEPER',
        name: 'Sam Stockkeeper',
      };

      render(
        <MemoryRouter>
          <GRNCreateEditPage />
        </MemoryRouter>
      );

      // Warehouse Isolation Mode banner is rendered
      expect(screen.getByText(/Warehouse Isolation Mode Active/i)).toBeDefined();
      expect(
        screen.getByText(/Stock Keepers record physical quantities received and damaged only/i)
      ).toBeDefined();

      // Open product picker and add a product
      const addBtn = screen.getByRole('button', { name: /\+ add product/i });
      fireEvent.click(addBtn);

      const productBtn = screen.getByText('Schneider Acti9 32A Double Pole MCB');
      fireEvent.click(productBtn);

      // Financial columns must NOT be present for Stock Keeper
      expect(screen.queryByText(/Unit Cost \(LKR\)/i)).toBeNull();
      expect(screen.queryByText(/Line Value/i)).toBeNull();
      expect(screen.queryByText(/Total Estimated Value/i)).toBeNull();

      // Physical quantity inputs and headers must remain accessible
      expect(screen.getByText(/Received Qty/i)).toBeDefined();
      expect(screen.getByText(/Damaged Qty/i)).toBeDefined();
      expect(screen.getByText(/Expected Qty/i)).toBeDefined();
    });

    it('Admin / Finance Officer UI shows financial valuation, unit cost inputs, and line values', async () => {
      mockCurrentUser = {
        id: 'usr-fin-1',
        username: 'fin_officer',
        role: 'FINANCE_OFFICER',
        name: 'Fiona Finance',
      };

      render(
        <MemoryRouter>
          <GRNCreateEditPage />
        </MemoryRouter>
      );

      // Isolation banner must NOT appear for Finance Officer
      expect(screen.queryByText(/Warehouse Isolation Mode/i)).toBeNull();

      // Open product picker and add a product
      const addBtn = screen.getByRole('button', { name: /\+ add product/i });
      fireEvent.click(addBtn);

      const productBtn = screen.getByText('Schneider Acti9 32A Double Pole MCB');
      fireEvent.click(productBtn);

      // Financial columns must be present
      expect(screen.getByText(/Unit Cost \(LKR\)/i)).toBeDefined();
      expect(screen.getByText(/Line Value/i)).toBeDefined();
    });

    it('GRNDetailPage hides Cost in Finance button and cost details for Stock Keeper', async () => {
      mockCurrentUser = {
        id: 'usr-stock-1',
        username: 'stockkeeper',
        role: 'STOCK_KEEPER',
        name: 'Sam Stockkeeper',
      };

      render(
        <MemoryRouter initialEntries={['/inventory/grn/GRN-2025-001']}>
          <Routes>
            <Route path="/inventory/grn/:id" element={<GRNDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        // "Cost in Finance" button must be completely hidden for Stock Keeper
        expect(screen.queryByRole('button', { name: /cost in finance/i })).toBeNull();
        // Total value financial metrics must be hidden
        expect(screen.queryByText(/Total Value \(LKR\)/i)).toBeNull();
      });
    });

    it('GRNDetailPage shows Cost in Finance and Return Damaged Stock for Finance Officer on damaged GRN', async () => {
      mockCurrentUser = {
        id: 'usr-fin-1',
        username: 'fin_officer',
        role: 'FINANCE_OFFICER',
        name: 'Fiona Finance',
      };

      render(
        <MemoryRouter initialEntries={['/inventory/grn/GRN-2025-001']}>
          <Routes>
            <Route path="/inventory/grn/:id" element={<GRNDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        // "Cost in Finance" button must be visible for Finance Officer
        expect(screen.getByRole('button', { name: /cost in finance/i })).toBeDefined();
        // "Return Damaged Stock (Debit Note)" shortcut must be visible for damaged items
        expect(screen.getByRole('button', { name: /return damaged stock/i })).toBeDefined();
      });
    });
  });

  describe('2. Historical Purchase Price Auto-Pull & Variance Tracking', () => {
    it('retrieves historical price from Supplier Master historicalPrices table', () => {
      // sup-1 has prod-001 at 2200 and prod-002 at 5800
      const price1 = apService.getHistoricalPurchasePrice('sup-1', 'prod-001');
      expect(price1).toBe(2200);

      const price2 = apService.getHistoricalPurchasePrice('sup-1', 'prod-002');
      expect(price2).toBe(5800);
    });

    it('falls back to previous bill line items if not present in supplier historical table', () => {
      // sup-2 does not have historicalPrices for prod-001 in seed, but previous bills or product catalogue exist
      const price = apService.getHistoricalPurchasePrice('sup-2', 'prod-001');
      expect(price).toBeGreaterThan(0);
    });

    it('calculates historical price and displays variance badge in VendorBillCostingPage', async () => {
      render(
        <MemoryRouter>
          <VendorBillCostingPage />
        </MemoryRouter>
      );

      // Ensure historical purchase price label is rendered
      await waitFor(() => {
        expect(screen.getAllByText(/Last Historical Price:/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('3. Landed Cost Engine: Freight Apportionment', () => {
    const sampleItems: VendorBillLineItem[] = [
      {
        id: 'li-1',
        productId: 'prod-001',
        productName: 'Item A',
        sku: 'SKU-A',
        receivedQuantity: 10,
        draftUnitCost: 100,
        unitCost: 100, // Value = 1,000 (10 * 100)
        lineDiscount: 0,
        vatCode: 'STANDARD_18',
        vatAmount: 180,
        lineTotal: 1180,
      },
      {
        id: 'li-2',
        productId: 'prod-002',
        productName: 'Item B',
        sku: 'SKU-B',
        receivedQuantity: 30,
        draftUnitCost: 100,
        unitCost: 100, // Value = 3,000 (30 * 100)
        lineDiscount: 0,
        vatCode: 'STANDARD_18',
        vatAmount: 540,
        lineTotal: 3540,
      },
    ];

    it('apportions bulk freight BY_VALUE proportionally across items and computes true landed unit cost', () => {
      const bulkFreight = 1000; // Total value = 4000. Item A = 25% (250), Item B = 75% (750)
      const apportioned = apService.apportionFreight(sampleItems, bulkFreight, 'BY_VALUE');

      expect(apportioned[0].apportionedFreight).toBe(250);
      expect(apportioned[0].landedUnitCost).toBe(125); // 100 + (250 / 10) = 125

      expect(apportioned[1].apportionedFreight).toBe(750);
      expect(apportioned[1].landedUnitCost).toBe(125); // 100 + (750 / 30) = 125

      // Sum of apportioned freight equals total bulk freight
      const totalApportioned = apportioned.reduce((sum, i) => sum + (i.apportionedFreight || 0), 0);
      expect(totalApportioned).toBe(1000);
    });

    it('apportions bulk freight BY_QUANTITY proportionally across items', () => {
      const bulkFreight = 400; // Total qty = 40. Item A = 10 units (25% = 100), Item B = 30 units (75% = 300)
      const apportioned = apService.apportionFreight(sampleItems, bulkFreight, 'BY_QUANTITY');

      expect(apportioned[0].apportionedFreight).toBe(100);
      expect(apportioned[0].landedUnitCost).toBe(110); // 100 + (100 / 10) = 110

      expect(apportioned[1].apportionedFreight).toBe(300);
      expect(apportioned[1].landedUnitCost).toBe(110); // 100 + (300 / 30) = 110

      const totalApportioned = apportioned.reduce((sum, i) => sum + (i.apportionedFreight || 0), 0);
      expect(totalApportioned).toBe(400);
    });

    it('handles zero freight, empty array, and single item edge cases', () => {
      const zeroResult = apService.apportionFreight(sampleItems, 0, 'BY_VALUE');
      expect(zeroResult[0].apportionedFreight).toBe(0);
      expect(zeroResult[0].landedUnitCost).toBe(100);

      const emptyResult = apService.apportionFreight([], 500, 'BY_VALUE');
      expect(emptyResult).toEqual([]);

      const singleResult = apService.apportionFreight([sampleItems[0]], 350, 'BY_VALUE');
      expect(singleResult[0].apportionedFreight).toBe(350);
      expect(singleResult[0].landedUnitCost).toBe(135); // 100 + (350 / 10)
    });
  });

  describe('4. Tax Separation (1025 Input VAT Receivable)', () => {
    it('debits 1025 Input VAT Receivable on vendor bill posting instead of netting against 2020 VAT Payable', async () => {
      const available = apService.getAvailableGRNs();
      const grn = available[0];

      const bill = await apService.postVendorBill({
        grnId: grn.id,
        vendorInvoiceNumber: 'INV-TAX-SEP-001',
        invoiceDate: '2026-10-01',
        dueDate: '2026-10-31',
        lineItems: [
          {
            id: 'li-tax-1',
            productId: 'prod-001',
            productName: 'Acti9 MCB',
            sku: 'DNS-MCB-32A-2P',
            receivedQuantity: 10,
            draftUnitCost: 2000,
            unitCost: 2000,
            lineDiscount: 0,
            vatCode: 'STANDARD_18',
            vatAmount: 3600, // 18% of 20,000
            lineTotal: 23600,
          },
        ],
        freightCharges: 0,
        otherLandingCosts: 0,
      });

      expect(bill.journalEntryId).toBeDefined();

      // Retrieve the generated Journal Entry
      const je = await financeRepository.getJournalEntryById(bill.journalEntryId!);
      expect(je).toBeDefined();

      // Must have debit to 1025 Input VAT Receivable
      const vatLine = je!.lines.find((line) => line.accountCode === '1025');
      expect(vatLine).toBeDefined();
      expect(vatLine?.debit).toBe(3600);
      expect(vatLine?.credit).toBe(0);

      // Must have debit to Inventory (1030)
      const invLine = je!.lines.find((line) => line.accountCode === '1030');
      expect(invLine).toBeDefined();
      expect(invLine?.debit).toBe(20000);

      // Must have credit to Accounts Payable (2010)
      const apLine = je!.lines.find((line) => line.accountCode === '2010');
      expect(apLine).toBeDefined();
      expect(apLine?.credit).toBe(23600);

      // Verify books are balanced
      const totalDebit = je!.lines.reduce((acc, l) => acc + l.debit, 0);
      const totalCredit = je!.lines.reduce((acc, l) => acc + l.credit, 0);
      expect(totalDebit).toBe(totalCredit);
    });

    it('calculates VAT summary report with vatPaidOnPurchases from 1025 debits and netVatPayable', async () => {
      // Post a bill to generate 1025 debits
      const available = apService.getAvailableGRNs();
      await apService.postVendorBill({
        grnId: available[0].id,
        vendorInvoiceNumber: 'INV-TAX-REP-001',
        invoiceDate: '2026-10-01',
        dueDate: '2026-10-31',
        lineItems: [
          {
            id: 'li-tax-2',
            productId: 'prod-001',
            productName: 'Acti9 MCB',
            sku: 'DNS-MCB-32A-2P',
            receivedQuantity: 5,
            draftUnitCost: 2000,
            unitCost: 2000,
            lineDiscount: 0,
            vatCode: 'STANDARD_18',
            vatAmount: 1800,
            lineTotal: 11800,
          },
        ],
        freightCharges: 0,
        otherLandingCosts: 0,
      });

      const report = await financeRepository.getVatSummaryReport('2026-10-01', '2026-10-31');
      expect(report.vatPaidOnPurchases).toBeGreaterThanOrEqual(1800);
      expect(report.netVatPayable).toBe(
        new Decimal(report.vatCollected).minus(report.vatPaidOnPurchases).toNumber()
      );
    });
  });

  describe('5. Advance Payments (Prepayments)', () => {
    it('creates supplier advance prepayment with Dr 1050 Advance to Suppliers, Cr 1010 Bank', async () => {
      const advance = await apService.postSupplierAdvance({
        supplierId: 'sup-1',
        supplierName: 'DNS Global Logistics & Electronics Ltd',
        paymentDate: '2026-10-05',
        bankAccountCode: '1010',
        amount: 75000,
        reference: 'ADV-TEST-001',
        notes: 'Deposit for procurement batch #9',
      });

      expect(advance.id).toBeDefined();
      expect(advance.unappliedBalance).toBe(75000);
      expect(advance.status).toBe('UNAPPLIED');
      expect(advance.journalEntryId).toBeDefined();

      const je = await financeRepository.getJournalEntryById(advance.journalEntryId!);
      expect(je).toBeDefined();

      const advanceLine = je!.lines.find((l) => l.accountCode === '1050');
      expect(advanceLine?.debit).toBe(75000);

      const bankLine = je!.lines.find((l) => l.accountCode === '1010');
      expect(bankLine?.credit).toBe(75000);

      // Balanced
      expect(je!.totalDebit).toBe(je!.totalCredit);
    });

    it('maps advance prepayment to finalized GRN / bill with Dr 2010 A/P, Cr 1050 Advance', async () => {
      // First create advance
      const advance = await apService.postSupplierAdvance({
        supplierId: 'sup-1',
        supplierName: 'DNS Global Logistics & Electronics Ltd',
        paymentDate: '2026-10-05',
        bankAccountCode: '1010',
        amount: 50000,
        reference: 'ADV-MAP-001',
      });

      // Apply partially (20,000 out of 50,000) to bill-101 (linked to GRN-HIST-001)
      const result = await apService.applyAdvanceToGRNOrBill({
        advanceId: advance.id,
        billId: 'bill-101',
        amountToApply: 20000,
        note: 'Partial allocation to bill-101',
      });

      expect(result.advance.unappliedBalance).toBe(30000);
      expect(result.advance.status).toBe('PARTIALLY_APPLIED');
      expect(result.advance.appliedTo.length).toBe(1);

      // Verify settlement journal entry
      const jeId = result.advance.appliedTo[0].journalEntryId;
      const je = await financeRepository.getJournalEntryById(jeId);
      expect(je).toBeDefined();

      const apLine = je!.lines.find((l) => l.accountCode === '2010');
      expect(apLine?.debit).toBe(20000);

      const advLine = je!.lines.find((l) => l.accountCode === '1050');
      expect(advLine?.credit).toBe(20000);

      // Apply remainder to same bill
      const finalResult = await apService.applyAdvanceToGRNOrBill({
        advanceId: advance.id,
        billId: 'bill-101',
        amountToApply: 30000,
      });

      expect(finalResult.advance.unappliedBalance).toBe(0);
      expect(finalResult.advance.status).toBe('APPLIED');
    });

    it('rejects advance allocation exceeding remaining unapplied balance', async () => {
      const advance = await apService.postSupplierAdvance({
        supplierId: 'sup-1',
        supplierName: 'DNS Global Logistics & Electronics Ltd',
        paymentDate: '2026-10-05',
        bankAccountCode: '1010',
        amount: 10000,
        reference: 'ADV-EXCEED-001',
      });

      await expect(
        apService.applyAdvanceToGRNOrBill({
          advanceId: advance.id,
          billId: 'bill-101',
          amountToApply: 15000,
        })
      ).rejects.toThrow(/exceeds available unapplied advance balance/i);
    });

    it('SupplierAdvancePaymentsPage renders advance registry and allows recording new prepayment', async () => {
      render(
        <MemoryRouter>
          <SupplierAdvancePaymentsPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Supplier Advance Payments \(Prepayments\)/i)).toBeDefined();

      // Switch to Create tab
      const createTabBtn = screen.getByRole('button', { name: /record advance/i });
      fireEvent.click(createTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Record Advance to Supplier/i)).toBeDefined();
      });

      // Wait for async suppliers and bank accounts from useFinanceLedger to populate options
      await waitFor(() => {
        expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
      });

      // Fill in amount
      const amountInput = screen.getByPlaceholderText(/0\.00/i);
      fireEvent.change(amountInput, { target: { value: '45000' } });

      const refInput = screen.getByPlaceholderText(/WIRE-BOC/i);
      fireEvent.change(refInput, { target: { value: 'UI-ADV-TEST-1' } });

      const submitBtn = screen.getByRole('button', { name: /post advance payment/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('UI-ADV-TEST-1')).toBeDefined();
      });
    });
  });

  describe('6. Supplier Debit Notes (Damaged Stock Returns)', () => {
    it('creates supplier debit note with Dr 2010 A/P, Cr 1030 Inventory and decreases payable', async () => {
      const debitNote = await apService.postSupplierDebitNote({
        supplierId: 'sup-1',
        supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
        grnId: 'GRN-2025-001',
        grnNumber: 'GRN-2025-001',
        date: '2026-10-06',
        reason: 'Broken terminal screws during physical transit',
        lineItems: [
          {
            productId: 'prod-001',
            productName: 'Schneider Acti9 32A MCB',
            sku: 'DNS-MCB-32A-2P',
            damagedQuantity: 4,
            unitCost: 2000,
            lineTotal: 8000,
            reason: 'Cracked plastic molding',
          },
        ],
      });

      expect(debitNote.id).toBeDefined();
      expect(debitNote.totalAmount).toBe(8000);
      expect(debitNote.journalEntryId).toBeDefined();

      const je = await financeRepository.getJournalEntryById(debitNote.journalEntryId!);
      expect(je).toBeDefined();

      // Debit 2010 A/P
      const apLine = je!.lines.find((l) => l.accountCode === '2010');
      expect(apLine?.debit).toBe(8000);

      // Credit 1030 Inventory
      const invLine = je!.lines.find((l) => l.accountCode === '1030');
      expect(invLine?.credit).toBe(8000);

      // Books balance
      expect(je!.totalDebit).toBe(je!.totalCredit);
    });

    it('rejects debit note with empty items or zero damaged quantity', async () => {
      await expect(
        apService.postSupplierDebitNote({
          supplierId: 'sup-1',
          supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
          date: '2026-10-06',
          reason: 'No items test',
          lineItems: [],
        })
      ).rejects.toThrow(/at least one damaged item line/i);
    });

    it('SupplierDebitNotesPage renders debit notes registry and allows creating new debit note', async () => {
      render(
        <MemoryRouter>
          <SupplierDebitNotesPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Supplier Debit Notes \(Purchase Returns\)/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /issue debit note/i })).toBeDefined();
    });
  });

  describe('7. End-to-End AP Advance Prepayment & Settlement Integration Edge Cases', () => {
    it('applies advance prepayment during vendor bill posting without double-deducting balanceDue', async () => {
      // Create advance payment of 10,000
      const advance = await apService.postSupplierAdvance({
        supplierId: 'sup-1',
        supplierName: 'DNS Global Logistics & Electronics Ltd',
        paymentDate: '2026-10-01',
        bankAccountCode: '1010',
        amount: 10000,
        reference: 'ADV-DOUBLE-TEST',
      });

      const available = apService.getAvailableGRNs();
      const grn = available[0];

      // Total bill: 10 units @ 2000 = 20,000 + 18% VAT (3600) = 23,600
      // Apply 10,000 advance.
      // Expected balanceDue = 23,600 - 10,000 = 13,600 (NOT 3,600 from double deduction!)
      const bill = await apService.postVendorBill({
        grnId: grn.id,
        vendorInvoiceNumber: 'INV-ADV-NO-DOUBLE-01',
        invoiceDate: '2026-10-02',
        dueDate: '2026-11-02',
        lineItems: [
          {
            id: 'li-adv-1',
            productId: 'prod-001',
            productName: 'Acti9 MCB',
            sku: 'DNS-MCB-32A-2P',
            receivedQuantity: 10,
            draftUnitCost: 2000,
            unitCost: 2000,
            lineDiscount: 0,
            vatCode: 'STANDARD_18',
            vatAmount: 3600,
            lineTotal: 23600,
          },
        ],
        freightCharges: 0,
        otherLandingCosts: 0,
        applyAdvanceId: advance.id,
        advanceAmountToApply: 10000,
      });

      expect(bill.totalAmount).toBe(23600);
      expect(bill.balanceDue).toBe(13600); // Exactly once deduction
      expect(bill.status).toBe('PARTIALLY_PAID');

      // Verify advance status is updated
      const updatedAdvances = apService.getSupplierAdvances();
      const updatedAdv = updatedAdvances.find((a) => a.id === advance.id);
      expect(updatedAdv?.unappliedBalance).toBe(0);
      expect(updatedAdv?.status).toBe('APPLIED');
    });

    it('settles advance previously mapped to an unbilled GRN when bill is subsequently posted', async () => {
      // 1. Create advance of 15,000
      const advance = await apService.postSupplierAdvance({
        supplierId: 'sup-1',
        supplierName: 'DNS Global Logistics & Electronics Ltd',
        paymentDate: '2026-10-01',
        bankAccountCode: '1010',
        amount: 15000,
        reference: 'ADV-PREMAP-001',
      });

      // 2. Map advance directly to unbilled GRN-2025-001
      await apService.applyAdvanceToGRNOrBill({
        advanceId: advance.id,
        grnId: 'GRN-2025-001',
        grnNumber: 'GRN-2025-001',
        amountToApply: 15000,
      });

      // 3. Post vendor bill for GRN-2025-001
      // Bill total = 10 * 2000 + 3600 VAT = 23,600
      const bill = await apService.postVendorBill({
        grnId: 'GRN-2025-001',
        vendorInvoiceNumber: 'INV-PREMAP-SETTLE',
        invoiceDate: '2026-10-03',
        dueDate: '2026-11-03',
        lineItems: [
          {
            id: 'li-premap-1',
            productId: 'prod-001',
            productName: 'Acti9 MCB',
            sku: 'DNS-MCB-32A-2P',
            receivedQuantity: 10,
            draftUnitCost: 2000,
            unitCost: 2000,
            lineDiscount: 0,
            vatCode: 'STANDARD_18',
            vatAmount: 3600,
            lineTotal: 23600,
          },
        ],
        freightCharges: 0,
        otherLandingCosts: 0,
      });

      // Bill balance due should have the 15,000 deducted: 23,600 - 15,000 = 8,600
      expect(bill.balanceDue).toBe(8600);
      expect(bill.status).toBe('PARTIALLY_PAID');

      // Check advance mapping now has billId linked and settlement journal entry created
      const adv = apService.getSupplierAdvances().find((a) => a.id === advance.id);
      expect(adv?.appliedTo[0].billId).toBe(bill.id);
      expect(adv?.appliedTo[0].journalEntryId).toBeDefined();

      const je = await financeRepository.getJournalEntryById(adv!.appliedTo[0].journalEntryId!);
      expect(je).toBeDefined();
      const apLine = je!.lines.find((l) => l.accountCode === '2010');
      expect(apLine?.debit).toBe(15000);
      const advLine = je!.lines.find((l) => l.accountCode === '1050');
      expect(advLine?.credit).toBe(15000);
    });
  });
});

