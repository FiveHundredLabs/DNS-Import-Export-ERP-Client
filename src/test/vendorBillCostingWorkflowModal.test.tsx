import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VendorBillCostingPage } from '../features/finance/pages/ap/VendorBillCostingPage';
import { apService } from '../features/finance/services/apService';
import { financeRepository } from '../features/finance/api';

describe('Vendor Bill 2-Step Guided Workflow: Costing to Pricing & Redirection Prevention', () => {
  beforeEach(async () => {
    localStorage.clear();
    await financeRepository.resetToDefaults();
    apService.reset();
  });

  it('1. Navigates seamlessly from Step 1 to Step 2 and posts bill without kicking user to dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/ap/bills/new']}>
        <Routes>
          <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
          <Route path="/finance/dashboard" element={<div data-testid="finance-dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Verify initial render on Step 1
    expect(screen.getByText(/Vendor Bill Processing \(GRN Costing\)/i)).toBeDefined();
    expect(screen.getByText(/Step 1: Invoice & Landed Costing/i)).toBeDefined();
    expect(screen.getByText(/Step 2: Selling Price & Margin Setup/i)).toBeDefined();

    // Fill in required vendor invoice number in persistent top header
    const invInput = screen.getByPlaceholderText(/e\.g\. INV-SCH-90214/i);
    fireEvent.change(invInput, { target: { value: 'INV-TEST-PRICE-01' } });

    // Click Continue to Pricing (Step 2)
    const continueBtn = screen.getByRole('button', { name: /continue to pricing \(step 2\)/i });
    fireEvent.click(continueBtn);

    // Verify Step 2 is active
    await waitFor(() => {
      expect(screen.getByText(/Commercial Price & Margin Assignment/i)).toBeDefined();
    });

    // Check that Post Bill & Apply Prices button is enabled and works
    const postBillBtn = screen.getByRole('button', { name: /post bill & apply prices/i });
    expect(postBillBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(postBillBtn);

    // Verify bill is posted and audit lock is active
    await waitFor(() => {
      expect(screen.getByText(/Audit Lock Active/i)).toBeDefined();
      expect(screen.getByText(/Bill Costed & Approved/i)).toBeDefined();
    });

    // CRITICAL: Ensure user remains on page and was not prematurely redirected to dashboard
    expect(screen.queryByTestId('finance-dashboard')).toBeNull();
  });

  it('2. Switches rules between Incoming Batch Only (FIFO) and Standardize All Stock in Step 2', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/ap/bills/new']}>
        <Routes>
          <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Click step 2 pill tab directly
    const step2Tab = screen.getByRole('button', { name: /Step 2: Selling Price & Margin Setup/i });
    fireEvent.click(step2Tab);

    await waitFor(() => {
      expect(screen.getByText(/Commercial Price & Margin Assignment/i)).toBeDefined();
    });

    // Toggle global rule to Standardize All Stock
    const standardizeBtn = screen.getByRole('button', { name: /standardize all stock/i });
    fireEvent.click(standardizeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Updates catalog selling price and standardizes all existing active inventory batches/i)).toBeDefined();
    });

    // Toggle back to Incoming Batch Only
    const batchOnlyBtn = screen.getByRole('button', { name: /incoming batch only \(fifo\)/i });
    fireEvent.click(batchOnlyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Preserves existing inventory batches at their current prices/i)).toBeDefined();
    });
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

  it('4. Allows user to navigate back and forth between Step 1 and Step 2 using the bottom buttons', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/ap/bills/new']}>
        <Routes>
          <Route path="/finance/ap/bills/new" element={<VendorBillCostingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Click Continue to Step 2
    const continueBtn = screen.getByRole('button', { name: /continue to pricing \(step 2\)/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText(/Commercial Price & Margin Assignment/i)).toBeDefined();
    });

    // Click Back to Costing (Step 1)
    const backBtn = screen.getByRole('button', { name: /back to costing \(step 1\)/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText(/Additional Landed Costs \(Inbound Logistics & Customs\)/i)).toBeDefined();
    });
  });

  it('5. Synchronizes approvals engine and updates status to APPROVED after posting bill and prices', async () => {
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

    // Navigate to Step 2
    const continueBtn = screen.getByRole('button', { name: /continue to pricing \(step 2\)/i });
    fireEvent.click(continueBtn);

    // Post bill & apply prices
    const postBillBtn = await screen.findByRole('button', { name: /post bill & apply prices/i });
    fireEvent.click(postBillBtn);

    // Verify localStorage approval was marked APPROVED
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('dns_erp_approval_requests') || '[]');
      const req = stored.find((r: any) => r.documentId === 'GRN-2025-005');
      expect(req?.status).toBe('APPROVED');
    });

    // Verify GRN status updated to APPROVED
    await waitFor(() => {
      const grn = apService.getGRNById('GRN-2025-005');
      expect(grn?.status).toBe('APPROVED');
    });
  });
});
