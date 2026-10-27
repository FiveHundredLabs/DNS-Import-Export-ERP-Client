import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VendorBillCostingPage } from '../features/finance/pages/ap/VendorBillCostingPage';
import { apService } from '../features/finance/services/apService';
import { financeRepository } from '../features/finance/api';
import { batchInventoryService } from '../services/BatchInventoryService';

describe('Vendor Bill Costing Workflow: Selling Price Modal & Redirection Prevention', () => {
  beforeEach(async () => {
    localStorage.clear();
    await financeRepository.resetToDefaults();
    apService.reset();
  });

  it('1. Triggers FinancePricingModal after posting bill, and does NOT redirect to dashboard on modal dismiss', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/ap/bills/new']}>
        <Routes>
          <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
          <Route path="/finance/dashboard" element={<div data-testid="finance-dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Verify initial render on bills/new
    expect(screen.getByText(/Vendor Bill Processing \(GRN Costing\)/i)).toBeDefined();

    // Fill in required vendor invoice number
    const invInput = screen.getByPlaceholderText(/e\.g\. INV-SCH-90214/i);
    fireEvent.change(invInput, { target: { value: 'INV-TEST-PRICE-01' } });

    const postBillBtn = screen.getByRole('button', { name: /post vendor bill/i });
    await waitFor(() => {
      expect(postBillBtn.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(postBillBtn);

    // Selling-Price Strategy Decision Modal should trigger and be open
    await waitFor(() => {
      expect(screen.getByText(/GRN Post-Costing Price Assignment/i)).toBeDefined();
      expect(screen.getAllByText(/Strategy 1: Preserve Existing Batch Prices/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Strategy 2: Standardize Under One Price/i).length).toBeGreaterThan(0);
    });

    // Close or Skip the modal
    const skipBtn = screen.getByRole('button', { name: /skip \/ keep defaults/i });
    fireEvent.click(skipBtn);

    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByText(/GRN Post-Costing Price Assignment/i)).toBeNull();
    });

    // CRITICAL: Ensure page did NOT prematurely redirect to /finance/dashboard!
    expect(screen.queryByTestId('finance-dashboard')).toBeNull();
    // User remains on the vendor bill costing page
    expect(screen.getByText(/Vendor Bill Processing \(GRN Costing\)/i)).toBeDefined();
    // Audit Lock banner with action button is present
    expect(screen.getByText(/Audit Lock Active/i)).toBeDefined();
    expect(screen.getAllByRole('button', { name: /set.*selling prices/i }).length).toBeGreaterThan(0);
  });

  it('2. Completes selling price strategy assignment and releases inventory without kicking user to dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/ap/bills/new']}>
        <Routes>
          <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
          <Route path="/finance/dashboard" element={<div data-testid="finance-dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Fill in required invoice number
    const invInput = screen.getByPlaceholderText(/e\.g\. INV-SCH-90214/i);
    fireEvent.change(invInput, { target: { value: 'INV-TEST-PRICE-02' } });

    // Post bill
    const postBillBtn = screen.getByRole('button', { name: /post vendor bill/i });
    await waitFor(() => {
      expect(postBillBtn.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(postBillBtn);

    // Modal appears
    await waitFor(() => {
      expect(screen.getByText(/GRN Post-Costing Price Assignment/i)).toBeDefined();
    });

    // Confirm & Apply Selling Price Strategy
    const applyBtn = screen.getByRole('button', { name: /confirm & apply selling price strategy/i });
    fireEvent.click(applyBtn);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText(/GRN Post-Costing Price Assignment/i)).toBeNull();
    });

    // Verify user is NOT kicked to dashboard
    expect(screen.queryByTestId('finance-dashboard')).toBeNull();

    // Verify success banner is displayed
    expect(screen.getByText(/Selling Price Strategy Assigned & Inventory Released/i)).toBeDefined();
  });

  it('3. Selects the GRN automatically when grnId query parameter is provided in URL', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/ap/bills/new?grnId=GRN-2025-002']}>
        <Routes>
          <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should automatically select Kelani Cables GRN
    await waitFor(() => {
      expect(screen.getAllByText(/Kelani Cables PLC/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/GRN-2025-002/i).length).toBeGreaterThan(0);
    });
  });

  it('4. Allows Finance to open Selling Price setting modal anytime on an already costed GRN', async () => {
    // First, cost GRN-2025-001
    const available = apService.getAvailableGRNs();
    const grn = available[0];
    await apService.postVendorBill({
      grnId: grn.id,
      vendorInvoiceNumber: 'INV-PRECOSTED-99',
      invoiceDate: '2026-10-01',
      dueDate: '2026-11-01',
      lineItems: [
        {
          id: 'li-test',
          productId: grn.items[0].productId,
          productName: grn.items[0].productNameSnapshot,
          sku: grn.items[0].skuSnapshot,
          receivedQuantity: grn.items[0].receivedQuantity,
          draftUnitCost: grn.items[0].unitCostSnapshot,
          unitCost: grn.items[0].unitCostSnapshot,
          lineDiscount: 0,
          vatCode: 'STANDARD_18',
          vatAmount: 0,
          lineTotal: 1000,
        },
      ],
      freightCharges: 0,
      otherLandingCosts: 0,
    });

    render(
      <MemoryRouter initialEntries={['/finance/ap/bills/new']}>
        <Routes>
          <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
          <Route path="/finance/dashboard" element={<div data-testid="finance-dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Audit Lock is active
    await waitFor(() => {
      expect(screen.getByText(/Audit Lock Active/i)).toBeDefined();
    });

    // Click "Set Selling Prices" button in header
    const setPricesButtons = screen.getAllByRole('button', { name: /set.*selling prices/i });
    expect(setPricesButtons.length).toBeGreaterThan(0);
    fireEvent.click(setPricesButtons[0]);

    // Modal/inline section opens cleanly without dialog popup
    await waitFor(() => {
      expect(screen.getByText(/GRN Post-Costing Price Assignment/i)).toBeDefined();
    });
    // Verify NOT inside role="dialog"
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('5. Confirms removal of Costing Summary ribbon and verifies Step 4 tab dismissal returns to all sections', async () => {
    // Post bill for first GRN
    const available = apService.getAvailableGRNs();
    const grn = available[0];
    await apService.postVendorBill({
      grnId: grn.id,
      vendorInvoiceNumber: 'INV-PRECOSTED-100',
      invoiceDate: '2026-10-01',
      dueDate: '2026-11-01',
      lineItems: [
        {
          id: 'li-test-1',
          productId: grn.items[0].productId,
          productName: grn.items[0].productNameSnapshot,
          sku: grn.items[0].skuSnapshot,
          receivedQuantity: grn.items[0].receivedQuantity,
          draftUnitCost: grn.items[0].unitCostSnapshot,
          unitCost: grn.items[0].unitCostSnapshot,
          lineDiscount: 0,
          vatCode: 'STANDARD_18',
          vatAmount: 0,
          lineTotal: 1000,
        },
      ],
      freightCharges: 0,
      otherLandingCosts: 0,
    });

    render(
      <MemoryRouter initialEntries={['/finance/ap/bills/new']}>
        <Routes>
          <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify Costing Summary ribbon is completely removed
    expect(screen.queryByText(/Supplier Base:/i)).toBeNull();
    expect(screen.queryByText(/AP Commitment \(Cr 2010\):/i)).toBeNull();
    expect(screen.queryByText(/True Landed \(Dr 1100\):/i)).toBeNull();

    // Click "Step 4: Selling Prices" tab in navigation bar
    const step4Tab = await screen.findByRole('button', { name: /Step 4: Selling Prices/i });
    expect(step4Tab).toBeInTheDocument();
    fireEvent.click(step4Tab);

    // Verify Step 4 section is active
    expect(screen.getByText(/GRN Post-Costing Price Assignment/i)).toBeInTheDocument();

    // Click "Skip / Keep Defaults"
    const skipBtn = screen.getByRole('button', { name: /skip \/ keep defaults/i });
    fireEvent.click(skipBtn);

    // Verify Step 4 section closes and resets
    await waitFor(() => {
      expect(screen.queryByText(/GRN Post-Costing Price Assignment/i)).toBeNull();
    });
    // Active view returns to all sections
    expect(screen.getByText(/Step 1: Inbound & Invoice Items/i)).toBeInTheDocument();
  });

  it('6. Synchronizes approvals engine and updates status to PRICED after applying strategy', async () => {
    // Seed pending approval for GRN-2025-005 in localStorage
    localStorage.setItem(
      'dns_erp_approval_requests',
      JSON.stringify([
        {
          id: 'app-test-grn-05',
          documentId: 'GRN-2025-005',
          documentReferenceNumber: 'GRN-2025-005',
          documentType: 'GRN_RECEIPT',
          title: 'Inbound GRN Approval',
          status: 'PENDING',
        },
      ])
    );

    render(
      <MemoryRouter initialEntries={['/finance/ap/bills/new?grnId=GRN-2025-005']}>
        <Routes>
          <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Fill invoice number
    const invInput = screen.getByPlaceholderText(/e\.g\. INV-SCH-90214/i);
    fireEvent.change(invInput, { target: { value: 'INV-TEST-SYNC-05' } });

    // Post bill
    const postBillBtn = screen.getByRole('button', { name: /post vendor bill/i });
    await waitFor(() => {
      expect(postBillBtn.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(postBillBtn);

    // Verify localStorage approval was marked APPROVED
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('dns_erp_approval_requests') || '[]');
      const req = stored.find((r: any) => r.documentId === 'GRN-2025-005');
      expect(req?.status).toBe('APPROVED');
    });

    // Apply strategy in inline pricing
    const applyBtn = await screen.findByRole('button', { name: /confirm & apply selling price strategy/i });
    fireEvent.click(applyBtn);

    // Verify GRN status updated to PRICED
    await waitFor(() => {
      const grn = apService.getGRNById('GRN-2025-005');
      expect(grn?.status).toBe('PRICED');
    });
  });
});
