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

    // Modal opens cleanly
    await waitFor(() => {
      expect(screen.getByText(/GRN Post-Costing Price Assignment/i)).toBeDefined();
    });
  });
});
