import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { DeliveryNoteListPage } from '../features/inventory/delivery-notes/DeliveryNoteListPage';
import { DeliveryNoteCreatePage } from '../features/inventory/delivery-notes/DeliveryNoteCreatePage';
import { DeliveryNoteDetailPage } from '../features/inventory/delivery-notes/DeliveryNoteDetailPage';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { canAccessRoute } from '../rules/permissions';
import { UserRole } from '../types/auth';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Stock Keeper Delivery Notes Flow', () => {
  beforeEach(() => {
    deliveryNoteService.resetToDefaults();
  });

  const setupStockKeeper = () => {
    mockUseAuth.mockReturnValue({
      role: 'STOCK_KEEPER' as UserRole,
      currentUser: {
        id: 'usr-stock-01',
        name: 'Amal Perera',
        role: 'STOCK_KEEPER' as UserRole,
        email: 'amal@dns.lk',
        phone: '0771234567',
        status: 'ACTIVE',
      },
      canAccessRoute: (path: string) => canAccessRoute('STOCK_KEEPER', path),
      hasPermission: () => true,
      isAuthenticated: true,
    });
  };

  describe('1. Sidebar Navigation', () => {
    it('displays Delivery Notes directly bottom of GRN for Stock Keeper', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      );

      // Open Inventory & Products category rail
      const inventoryRail = screen.getByTitle('Inventory & Products');
      expect(inventoryRail).toBeInTheDocument();
      fireEvent.click(inventoryRail);

      // Check flyout links
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /^grn$/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /delivery notes/i })).toBeInTheDocument();
      });

      // Verify link target
      const dnLink = screen.getByRole('link', { name: /delivery notes/i });
      expect(dnLink).toHaveAttribute('href', '/inventory/delivery-notes');
    });

    it('ensures Sales Rep cannot see or access Inventory Delivery Notes', () => {
      mockUseAuth.mockReturnValue({
        role: 'SALES_REP' as UserRole,
        currentUser: { id: 'usr-rep-01', name: 'Kasun Rep', role: 'SALES_REP' as UserRole },
        canAccessRoute: (path: string) => canAccessRoute('SALES_REP', path),
        hasPermission: () => true,
        isAuthenticated: true,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      );

      expect(screen.queryByTitle('Inventory & Products')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /delivery notes/i })).not.toBeInTheDocument();
    });
  });

  describe('2. Delivery Note List & Dashboard Hub', () => {
    it('renders 5 operational KPIs and seeded delivery notes with status badges', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <DeliveryNoteListPage />
        </MemoryRouter>
      );

      // Header
      expect(screen.getByRole('heading', { name: 'Warehouse Delivery Notes' })).toBeInTheDocument();
      expect(screen.getByText(/Stock Keeper Dispatch Hub/i)).toBeInTheDocument();

      // Operational KPIs
      await waitFor(() => {
        expect(screen.getByText('Total Notes')).toBeInTheDocument();
        expect(screen.getByText('In Transit / Dispatched')).toBeInTheDocument();
        expect(screen.getByText('Delivered & Accepted')).toBeInTheDocument();
        expect(screen.getByText('Rejection Approvals')).toBeInTheDocument();
        expect(screen.getByText('Total Rejected Units')).toBeInTheDocument();
      });

      // Seeded Delivery Notes
      await waitFor(() => {
        expect(screen.getByText('DN-2026-0001')).toBeInTheDocument();
        expect(screen.getByText('DN-2026-0002')).toBeInTheDocument();
        expect(screen.getByText('DN-2026-0003')).toBeInTheDocument();
      });
    });

    it('filters delivery notes by search term (driver or customer)', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <DeliveryNoteListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('DN-2026-0001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search dn #, invoice #/i);
      fireEvent.change(searchInput, { target: { value: 'Samantha Perera' } });

      await waitFor(() => {
        expect(screen.getByText('DN-2026-0003')).toBeInTheDocument();
        expect(screen.queryByText('DN-2026-0001')).not.toBeInTheDocument();
      });
    });
  });

  describe('3. Delivery Note Creation & Barcode Allocation', () => {
    it('renders creation page with draft invoices and allows selecting an invoice', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <DeliveryNoteCreatePage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: 'Create Warehouse Delivery Note' })).toBeInTheDocument();

      // Find draft invoice in the list
      await waitFor(() => {
        expect(screen.getByText('INV-2026-DRAFT-001')).toBeInTheDocument();
      });

      // Click the draft invoice card to select it
      const draftCard = screen.getByText('INV-2026-DRAFT-001');
      fireEvent.click(draftCard);

      // Verify active selection shows items and driver fields
      await waitFor(() => {
        expect(screen.getByText('Active Selected')).toBeInTheDocument();
        expect(screen.getByText('Handheld Barcode Scanner Station')).toBeInTheDocument();
        expect(screen.getByText(/Schneider Acti9 32A Double Pole MCB/i)).toBeInTheDocument();
      });
    });

    it('allows physical unit barcode allocation using "Pick from Stock" and submits delivery note', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/new?invoiceId=inv-draft-002']}>
          <Routes>
            <Route path="/inventory/delivery-notes/new" element={<DeliveryNoteCreatePage />} />
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Draft invoice 2 has 2 units of ABB 100A MCCB
      await waitFor(() => {
        expect(screen.getByText('ABB 100A 4P MCCB Adjustable 36kA')).toBeInTheDocument();
      });

      // Fill logistics fields
      const driverInput = screen.getByPlaceholderText(/e\.g\. Kamal Silva/i);
      fireEvent.change(driverInput, { target: { value: 'Rohan Jayasuriya' } });

      const vehicleInput = screen.getByPlaceholderText(/e\.g\. WP WP-8921/i);
      fireEvent.change(vehicleInput, { target: { value: 'WP GA-9002' } });

      // Click "Pick from Stock" for the product
      const pickBtn = screen.getByRole('button', { name: /pick from stock/i });
      fireEvent.click(pickBtn);

      // Verify 2 unit barcodes allocated
      await waitFor(() => {
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
      });

      // Click Save & Dispatch
      const submitBtn = screen.getByRole('button', { name: /save & dispatch delivery note/i });
      fireEvent.click(submitBtn);

      // Navigates to detail page with new DN
      await waitFor(() => {
        expect(screen.getByText(/Dispatched \/ In Transit/i)).toBeInTheDocument();
        expect(screen.getByText('Rohan Jayasuriya')).toBeInTheDocument();
        expect(screen.getByText('WP GA-9002')).toBeInTheDocument();
      });
    });
  });

  describe('4. Delivery Note Detail & Printable A4 Slip', () => {
    it('opens Printable Delivery Note modal showing official Customer Signature block', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-001']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('DN-2026-0001')).toBeInTheDocument();
      });

      // Click "Print Delivery Note"
      const printBtn = screen.getByRole('button', { name: /print delivery note/i });
      fireEvent.click(printBtn);

      // Modal opens
      await waitFor(() => {
        expect(screen.getByText('DELIVERY NOTE / DISPATCH RECEIPT')).toBeInTheDocument();
        expect(screen.getByText('Customer Receipt & Acceptance Declaration:')).toBeInTheDocument();
        expect(screen.getByText(/Authorized Customer Signature & Official Company Rubber Stamp/i)).toBeInTheDocument();
        expect(screen.getByText(/Store Keeper Signature/i)).toBeInTheDocument();
        expect(screen.getByText(/Driver \/ Courier Signature/i)).toBeInTheDocument();
      });
    });

    it('confirms 100% delivered when customer accepted all units without rejections', async () => {
      setupStockKeeper();
      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-001']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('DN-2026-0001')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: /confirm 100% delivered/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/Delivered & 100% Accepted/i)).toBeInTheDocument();
      });
    });
  });

  describe('5. Customer Rejection Workflow & Manager Approval Gating', () => {
    it('processes customer rejection by scanning returned unit barcodes and gates behind Manager Approval', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-001']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('DN-2026-0001')).toBeInTheDocument();
      });

      // Open Customer Rejection modal
      const rejBtn = screen.getByRole('button', { name: /process customer rejection/i });
      fireEvent.click(rejBtn);

      // Verify modal opened
      await waitFor(() => {
        expect(screen.getByText('Process Customer Returns & Rejections')).toBeInTheDocument();
        expect(screen.getByText(/Manager Approval Gating Required/i)).toBeInTheDocument();
      });

      // Scan returned unit barcode for Schneider 32A MCB
      const barcodeInput = screen.getByPlaceholderText(/scan returned unit barcode/i);
      fireEvent.change(barcodeInput, { target: { value: 'DNS-MCB32A2P-001-001' } });
      const scanBtn = screen.getByRole('button', { name: /scan unit/i });
      fireEvent.click(scanBtn);

      // Verify 1 unit is marked rejected
      await waitFor(() => {
        expect(screen.getByText('1 Units')).toBeInTheDocument(); // In Customer Rejected box
      });

      // Submit rejection for approval
      const submitRejBtn = screen.getByRole('button', { name: /submit 1 rejected unit\(s\) for manager approval/i });
      fireEvent.click(submitRejBtn);

      // Verify Delivery Note status updated to REJECTION_PENDING_APPROVAL
      await waitFor(() => {
        expect(screen.getByText(/Rejection Pending Approval/i)).toBeInTheDocument();
        expect(screen.getByText(/Customer Rejection Submitted — Awaiting Operations Manager Review/i)).toBeInTheDocument();
      });
    });

    it('allows Operations Manager to approve customer rejection and log units into Quarantine Bay', async () => {
      setupStockKeeper();
      vi.spyOn(window, 'prompt').mockReturnValue('Rejection verified. Damaged in transit.');

      // DN-2026-0003 is already seeded in REJECTION_PENDING_APPROVAL
      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-003']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('DN-2026-0003')).toBeInTheDocument();
        expect(screen.getByText(/Rejection Pending Approval/i)).toBeInTheDocument();
      });

      // Manager clicks "Approve Customer Rejection"
      const approveBtn = screen.getByRole('button', { name: /approve customer rejection/i });
      fireEvent.click(approveBtn);

      // Status transitions to REJECTION_APPROVED
      await waitFor(() => {
        expect(screen.getByText(/Rejection Approved \(Quarantine\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Customer Rejection Approved & Logged for Quarantine/i)).toBeInTheDocument();
      });
    });
  });

  describe('6. Delivery Note Stepper & 3-Tier Barcode Sticker Printing (Bulk, Item-wise, One-by-One)', () => {
    it('supports smart 4-step stepper navigation and all 3 printing levels during creation', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/create?invoiceId=inv-draft-002']}>
          <Routes>
            <Route path="/inventory/delivery-notes/create" element={<DeliveryNoteCreatePage />} />
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify Stepper Header is rendered
      expect(screen.getByText(/1\. Invoice & Logistics/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Unit Barcode Allocation/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Barcode Stickers Studio/i)).toBeInTheDocument();
      expect(screen.getByText(/4\. Review & Dispatch Note/i)).toBeInTheDocument();

      // Wait for preselected draft invoice items to load
      await waitFor(() => {
        expect(screen.getByText('ABB 100A 4P MCCB Adjustable 36kA')).toBeInTheDocument();
      });

      // Fill Logistics info
      const driverInput = screen.getByPlaceholderText(/e\.g\. Kamal Silva/i);
      fireEvent.change(driverInput, { target: { value: 'Saman Kumara' } });
      const vehicleInput = screen.getByPlaceholderText(/e\.g\. WP WP-8921/i);
      fireEvent.change(vehicleInput, { target: { value: 'WP CAD-4488' } });

      // Step 2: Allocate barcodes using "Quick Allocate All from Stock"
      const quickAllocateAllBtn = screen.getByRole('button', { name: /quick allocate all from stock/i });
      fireEvent.click(quickAllocateAllBtn);

      // Now "Bulk Print Barcodes (2)" appears in header
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bulk print barcodes \(2\)/i })).toBeInTheDocument();
      });

      // Navigate to Step 3: Barcode Studio
      const toStudioBtn = screen.getByRole('button', { name: /open barcode studio \(step 3\)/i });
      fireEvent.click(toStudioBtn);

      // Verify Step 3 Barcode Studio is active
      expect(screen.getByText('Delivery Note Barcode Stickers Studio')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulk print all stickers \(2\)/i })).toBeInTheDocument();

      // Test Laser Scan Verification Gun input
      const laserInput = screen.getByPlaceholderText(/test laser scan sticker/i);
      fireEvent.change(laserInput, { target: { value: 'DNS-1004-MCB32-001' } });
      const verifyBtn = screen.getByRole('button', { name: /verify/i });
      fireEvent.click(verifyBtn);

      // Test One-by-One Print Button on a sticker card
      const printOneBtns = screen.getAllByRole('button', { name: /print one/i });
      expect(printOneBtns.length).toBeGreaterThan(0);
      fireEvent.click(printOneBtns[0]);

      // Verify Barcode Modal opened for Single Sticker
      await waitFor(() => {
        expect(screen.getByText(/Delivery Note Barcode Stickers \(Code-128\)/i)).toBeInTheDocument();
      });
      // Close Modal
      const closeBtn = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeBtn);

      // Test Bulk Print Modal
      const bulkPrintBtn = screen.getByRole('button', { name: /bulk print all stickers \(2\)/i });
      fireEvent.click(bulkPrintBtn);

      await waitFor(() => {
        expect(screen.getByText(/Delivery Note Barcode Stickers \(Code-128\)/i)).toBeInTheDocument();
      });
      const closeBtn2 = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeBtn2);

      // Navigate to Step 4: Review & Dispatch
      const toReviewBtn = screen.getByRole('button', { name: /proceed to review & dispatch \(step 4\)/i });
      fireEvent.click(toReviewBtn);

      // Step 4: Review summary & customer signature notice
      expect(screen.getByText('Delivery Note Dispatch Sign-Off Summary')).toBeInTheDocument();
      expect(screen.getByText(/Official Customer Signature & Rubber Stamp Spaces Included/i)).toBeInTheDocument();

      // Item-wise print button in Step 4 breakdown table
      const itemWisePrintBtns = screen.getAllByRole('button', { name: /print \(2\)/i });
      expect(itemWisePrintBtns.length).toBe(1);
      fireEvent.click(itemWisePrintBtns[0]);

      // Verify Modal opens filtered for this item
      await waitFor(() => {
        expect(screen.getByText(/Delivery Note Barcode Stickers \(Code-128\)/i)).toBeInTheDocument();
      });
      const closeBtn3 = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeBtn3);

      // Dispatch Delivery Note from Step 4
      const dispatchBtn = screen.getByRole('button', { name: /save & dispatch delivery note/i });
      fireEvent.click(dispatchBtn);

      // Navigates to Delivery Note Details
      await waitFor(() => {
        expect(screen.getByText(/Dispatched \/ In Transit/i)).toBeInTheDocument();
        expect(screen.getByText('Saman Kumara')).toBeInTheDocument();
      });
    });

    it('allows reprinting barcode stickers (bulk, item-wise, one-by-one) from Delivery Note Details', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-001']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('DN-2026-0001')).toBeInTheDocument();
      });

      // 1. Bulk Print Barcodes Button in Header
      const headerBarcodeBtn = screen.getByRole('button', { name: /print barcode stickers/i });
      expect(headerBarcodeBtn).toBeInTheDocument();
      fireEvent.click(headerBarcodeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Delivery Note Barcode Stickers \(Code-128\)/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      // 2. Item-wise Print Button on Line Item row
      const linePrintBtns = screen.getAllByRole('button', { name: /print \(\d+\)/i });
      expect(linePrintBtns.length).toBeGreaterThan(0);
      fireEvent.click(linePrintBtns[0]);

      await waitFor(() => {
        expect(screen.getByText(/Delivery Note Barcode Stickers \(Code-128\)/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      // 3. One-by-one print button next to unit barcode chip
      const singlePrintBtns = screen.getAllByTitle(/print this single unit barcode sticker/i);
      expect(singlePrintBtns.length).toBeGreaterThan(0);
      fireEvent.click(singlePrintBtns[0]);

      await waitFor(() => {
        expect(screen.getByText(/Delivery Note Barcode Stickers \(Code-128\)/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    });
  });
});
