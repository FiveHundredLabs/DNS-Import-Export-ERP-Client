import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VendorBillCostingPage } from '../features/finance/pages/ap/VendorBillCostingPage';
import { InvoiceListPage } from '../features/invoices/InvoiceListPage';
import { ApprovalsPage } from '../features/approvals/ApprovalsPage';
import { apService } from '../features/finance/services/apService';
import { mockInventoryService } from '../services/inventory.service';
import { mockInvoices } from '../mock/mockInvoices';

describe('Unified Approvals and Costing Workflow Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Vendor Bill Voiding / Reversal', () => {
    it('voids a vendor bill without throwing journal entry not found', async () => {
      // Get existing pre-seeded posted bill
      const bills = apService.getAllBills();
      const bill = bills.find((b) => b.status === 'POSTED') || bills[0];
      expect(bill).toBeDefined();

      // Void the bill
      const voided = await apService.voidVendorBill(bill.id, 'Duplicate entry test');
      expect(voided.status).toBe('VOIDED');
    });

    it('voids a bill even if the journal entry is completely missing or orphaned', async () => {
      const bills = apService.getAllBills();
      const bill = bills[1] || bills[0];
      // Tamper journalEntryId to a missing ID
      bill.journalEntryId = 'je-completely-missing-id-9999';

      const voided = await apService.voidVendorBill(bill.id, 'Orphaned reversal test');
      expect(voided.status).toBe('VOIDED');
    });
  });

  describe('VendorBillCostingPage GRN List & Detail View', () => {
    it('renders the inbound GRNs selection table in list mode and transitions to detail view on click', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/ap/bills/new?view=list']}>
          <Routes>
            <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Should display the selection screen title
      expect(await screen.findByText('Inbound Goods Receipts (GRN) Costing Queue')).toBeInTheDocument();

      // Should show table headers
      expect(screen.getByText('GRN Reference')).toBeInTheDocument();
      expect(screen.getByText('Estimated Value')).toBeInTheDocument();

      // Find action buttons to cost a GRN
      const costButtons = screen.getAllByRole('button', { name: /Cost & Price|View Costing/i });
      expect(costButtons.length).toBeGreaterThan(0);

      // Click on the first one
      fireEvent.click(costButtons[0]);

      // Should transition to inner costing sheet with back button
      expect(await screen.findByRole('button', { name: /Back to GRN Selection/i })).toBeInTheDocument();
      expect(screen.getByText(/Vendor Bill Processing \(GRN Costing\)/i)).toBeInTheDocument();

      // Click back button to return to list view
      fireEvent.click(screen.getByRole('button', { name: /Back to GRN Selection/i }));
      expect(await screen.findByText('Inbound Goods Receipts (GRN) Costing Queue')).toBeInTheDocument();
    });
  });

  describe('InvoiceListPage Draft Filter & Edit Draft Button', () => {
    it('displays draft invoice badges, Drafts tab, and Edit Draft action buttons', async () => {
      render(
        <MemoryRouter initialEntries={['/invoices']}>
          <Routes>
            <Route path="/invoices" element={<InvoiceListPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Filter tabs should contain "Drafts"
      const draftsTab = await screen.findByRole('button', { name: /Drafts/i });
      expect(draftsTab).toBeInTheDocument();

      // Filter by Drafts
      fireEvent.click(draftsTab);

      // Find "Edit Draft" buttons
      const editDraftButtons = await screen.findAllByRole('button', { name: /Edit Draft/i });
      expect(editDraftButtons.length).toBeGreaterThan(0);
    });
  });

  describe('ApprovalsPage Central Engine Queue', () => {
    it('displays unified approval queue including sales orders, quotations, and GRNs', async () => {
      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <Routes>
            <Route path="/approvals" element={<ApprovalsPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Category filter buttons
      expect(await screen.findByRole('button', { name: /All Queue Items/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sales Orders & Exceptions/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Quotations/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Inbound GRNs/i })).toBeInTheDocument();

      // Check for unified items (loaded asynchronously)
      expect(await screen.findByText(/Credit Limit Breach Exception/i)).toBeInTheDocument();
      expect(await screen.findByText(/Minimum Selling Price \(MSP\) Floor Exception/i)).toBeInTheDocument();
      expect(await screen.findByText(/Quotation Discount Tier Override/i)).toBeInTheDocument();
      expect(await screen.findByText(/Inbound GRN Approval & Landed Costing/i)).toBeInTheDocument();
    });
  });
});
