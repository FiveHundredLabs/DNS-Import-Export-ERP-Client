import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { DeliveryNoteDetailPage } from '../features/inventory/delivery-notes/DeliveryNoteDetailPage';
import { GRNCreateEditPage } from '../features/inventory/GRNCreateEditPage';
import { GRNStockManagerVerificationPanel } from '../features/inventory/components/GRNStockManagerVerificationPanel';
import { canAccessRoute } from '../rules/permissions';
import { UserRole } from '../types/auth';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { grnService } from '../services/GRNService';
import { DeliveryNote } from '../types/deliveryNote';
import { GRN } from '../types/inventory';

const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Stock Roles: Approval Confirmation Popups & Reports Deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Sidebar Reports Deduplication for Stock Manager & Stock Keeper', () => {
    const setupSidebar = (role: UserRole) => {
      mockUseAuth.mockReturnValue({
        role,
        currentUser: {
          id: `usr-${role.toLowerCase()}`,
          name: `Test ${role}`,
          role,
          email: `${role.toLowerCase()}@dns.lk`,
        },
        canAccessRoute: (path: string) => canAccessRoute(role, path),
        hasPermission: () => true,
        isAuthenticated: true,
      });

      return render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      );
    };

    it('STOCK_MANAGER sees only ONE Inventory Reports item and NO Enterprise Reports duplicate', () => {
      setupSidebar('STOCK_MANAGER');

      // Click on Inventory & Products category in rail
      const invCategoryBtn = screen.getByTitle('Inventory & Products');
      fireEvent.click(invCategoryBtn);

      // Exactly ONE Inventory Reports link in the inventory section
      const inventoryReportLinks = screen.getAllByRole('link', { name: /Inventory Reports/i });
      expect(inventoryReportLinks).toHaveLength(1);
      expect(inventoryReportLinks[0]).toHaveAttribute('href', '/reports/inventory');

      // Enterprise Reports must NOT be in the sidebar
      expect(screen.queryByTitle('Enterprise Reports')).toBeNull();
      expect(screen.queryByRole('link', { name: /Enterprise Reports/i })).toBeNull();
    });

    it('STOCK_KEEPER has NO Enterprise Reports link', () => {
      setupSidebar('STOCK_KEEPER');

      expect(screen.queryByTitle('Enterprise Reports')).toBeNull();
      expect(screen.queryByRole('link', { name: /Enterprise Reports/i })).toBeNull();
    });
  });

  describe('2. Delivery Note Rejection Approval & Decline Confirmation Popups', () => {
    const mockPendingRejectionDN: DeliveryNote = {
      id: 'dn-rej-001',
      deliveryNoteNumber: 'DN-2026-TEST',
      invoiceId: 'inv-001',
      invoiceNumber: 'INV-2026-001',
      customerName: 'Colombo Electrical Supplies',
      customerId: 'cust-001',
      status: 'REJECTION_PENDING_APPROVAL',
      issuedDate: '2026-11-01',
      dispatchedDate: '2026-11-02',
      items: [
        {
          id: 'item-1',
          productId: 'prod-001',
          productNameSnapshot: 'Schneider 16A MCB',
          skuSnapshot: 'SCH-16A',
          quantity: 10,
          deliveredQuantity: 8,
          rejectedQuantity: 2,
          rejectionReason: 'Damaged packaging',
          unitBarcodes: ['BC-01', 'BC-02'],
          rejectedUnitBarcodes: ['BC-01', 'BC-02'],
        },
      ],
      totalUnits: 10,
      totalDeliveredUnits: 8,
      totalRejectedUnits: 2,
      rejectionSubmittedBy: 'Amal Keeper',
      rejectionNotes: 'Customer rejected 2 damaged MCBs',
      warehouseId: 'WH-MAIN',
      isLocked: true,
    };

    beforeEach(() => {
      vi.spyOn(deliveryNoteService, 'getById').mockResolvedValue(mockPendingRejectionDN);
    });

    it('opens confirmation popup modal when Stock Manager clicks Approve Customer Rejection', async () => {
      mockUseAuth.mockReturnValue({
        role: 'STOCK_MANAGER' as UserRole,
        currentUser: { id: 'usr-sm-01', name: 'Bandara Lead', role: 'STOCK_MANAGER' },
        canAccessRoute: () => true,
        hasPermission: () => true,
      });

      const approveSpy = vi.spyOn(deliveryNoteService, 'approveRejection').mockResolvedValue({
        ...mockPendingRejectionDN,
        status: 'REJECTION_APPROVED',
      });

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-rej-001']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('DN-2026-TEST')).toBeInTheDocument();
      });

      const approveBtn = screen.getByRole('button', { name: /Approve Customer Rejection/i });
      fireEvent.click(approveBtn);

      // Verify Confirmation Modal appears
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Approve Customer Rejection/i })).toBeInTheDocument();
        expect(screen.getByText(/Approve the customer rejection for 2 unit\(s\)\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Approval Remarks/i)).toBeInTheDocument();
      });

      // Confirm the modal
      const confirmApproveBtn = screen.getByTestId('confirm-dialog-submit-btn');
      fireEvent.click(confirmApproveBtn);

      await waitFor(() => {
        expect(approveSpy).toHaveBeenCalledWith(
          'dn-rej-001',
          expect.objectContaining({ role: 'STOCK_MANAGER' }),
          expect.stringContaining('Rejection verified')
        );
      });
    });

    it('opens confirmation popup modal when Stock Manager clicks Decline Rejection and requires reason', async () => {
      mockUseAuth.mockReturnValue({
        role: 'STOCK_MANAGER' as UserRole,
        currentUser: { id: 'usr-sm-01', name: 'Bandara Lead', role: 'STOCK_MANAGER' },
        canAccessRoute: () => true,
        hasPermission: () => true,
      });

      const declineSpy = vi.spyOn(deliveryNoteService, 'declineRejection').mockResolvedValue({
        ...mockPendingRejectionDN,
        status: 'REJECTION_DECLINED',
      });

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-rej-001']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('DN-2026-TEST')).toBeInTheDocument();
      });

      const declineBtn = screen.getByRole('button', { name: /Reject Customer Rejection|Decline Rejection/i });
      fireEvent.click(declineBtn);

      // Verify Confirmation Modal appears
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Decline Customer Rejection/i })).toBeInTheDocument();
        expect(screen.getByText(/Declining this customer rejection will mark it as Rejection Declined/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Physical counts do not match/i)).toBeInTheDocument();
      });

      // Type reason
      const reasonInput = screen.getByPlaceholderText(/Physical counts do not match/i);
      fireEvent.change(reasonInput, { target: { value: 'Goods were verified intact upon inspection' } });

      // Click Decline Rejection button in modal
      const confirmDeclineBtn = screen.getByTestId('confirm-dialog-submit-btn');
      fireEvent.click(confirmDeclineBtn);

      await waitFor(() => {
        expect(declineSpy).toHaveBeenCalledWith(
          'dn-rej-001',
          expect.objectContaining({ role: 'STOCK_MANAGER' }),
          'Goods were verified intact upon inspection'
        );
      });
    });
  });

  describe('3. GRN Creation Submission Confirmation Popup', () => {
    it('prompts confirmation modal before submitting for Stock Manager approval', async () => {
      mockUseAuth.mockReturnValue({
        role: 'STOCK_KEEPER' as UserRole,
        user: { id: 'usr-sk-01', name: 'Amal Keeper', role: 'STOCK_KEEPER' },
        currentUser: { id: 'usr-sk-01', name: 'Amal Keeper', role: 'STOCK_KEEPER' },
        canAccessRoute: () => true,
        hasPermission: () => true,
      });

      const submitSpy = vi.spyOn(grnService, 'submitGRN').mockResolvedValue(undefined as any);

      render(
        <MemoryRouter initialEntries={['/inventory/grn/new']}>
          <Routes>
            <Route path="/inventory/grn/new" element={<GRNCreateEditPage />} />
            <Route path="/inventory/grn" element={<div>GRN List Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Select approved PO
      const poPill = screen.getByRole('button', { name: 'PO-2026-0891' });
      fireEvent.click(poPill);

      await waitFor(() => {
        expect(screen.getByText(/Purchase Order items and unit barcodes populated/i)).toBeInTheDocument();
      });

      // Click "Submit for Manager Approval"
      const submitBtn = screen.getByRole('button', { name: /Submit for Manager Approval/i });
      fireEvent.click(submitBtn);

      // Gating modal appears for unconfirmed stickers
      await waitFor(() => {
        expect(screen.getByText(/Unit Barcode Stickers Not Confirmed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Confirm Affixed & Submit/i })).toBeInTheDocument();
      });

      // Confirm physical affixing in gating prompt
      const confirmAffixedBtn = screen.getByRole('button', { name: /Confirm Affixed & Submit/i });
      fireEvent.click(confirmAffixedBtn);

      // Wait for gating modal to close
      await waitFor(() => {
        expect(screen.queryByText(/Unit Barcode Stickers Not Confirmed/i)).toBeNull();
      });

      // Confirmation popup modal must appear
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Submit GRN for Stock Manager Approval/i })).toBeInTheDocument();
        expect(screen.getByText(/You are about to submit this Goods Received Note for Stock Manager verification/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Yes, Submit for Approval/i })).toBeInTheDocument();
      });

      // Confirm in the modal
      const modalConfirmBtn = screen.getByRole('button', { name: /Yes, Submit for Approval/i });
      fireEvent.click(modalConfirmBtn);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            poNumber: 'PO-2026-0891',
          }),
          expect.objectContaining({ role: 'STOCK_KEEPER' })
        );
      });
    });
  });

  describe('4. GRN Verification & Forward Confirmation Popups', () => {
    const mockGrnPendingSM: GRN = {
      id: 'grn-test-01',
      grnNumber: 'GRN-2026-01',
      poNumber: 'PO-2026-0891',
      supplierName: 'Schneider Electric Lanka',
      warehouseId: 'WH-MAIN',
      status: 'PENDING_STOCK_MANAGER_APPROVAL',
      items: [
        {
          productId: 'prod-001',
          productNameSnapshot: 'Schneider 16A MCB',
          expectedQuantity: 50,
          receivedQuantity: 50,
          damagedQuantity: 0,
          unitCost: 1200,
        },
      ],
      createdAt: '2026-11-01',
    };

    it('renders confirmation dialog when Stock Manager verifies and forwards GRN', async () => {
      const mockApprove = vi.fn().mockResolvedValue(undefined);
      const mockReject = vi.fn().mockResolvedValue(undefined);

      render(
        <MemoryRouter>
          <GRNStockManagerVerificationPanel
            grn={mockGrnPendingSM}
            currentUser={{ id: 'usr-sm-01', name: 'Bandara Lead', role: 'STOCK_MANAGER' }}
            onApprove={mockApprove}
            onReject={mockReject}
          />
        </MemoryRouter>
      );

      expect(screen.getAllByText('GRN-2026-01').length).toBeGreaterThan(0);

      // Click "Approve & Forward to Finance"
      const forwardBtn = screen.getByRole('button', { name: /Approve & Forward to Finance/i });
      fireEvent.click(forwardBtn);

      // ConfirmDialog appears
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Approve Physical Inbound Verification/i })).toBeInTheDocument();
        expect(screen.getByText(/This will forward the GRN directly to Finance for approval and landed costing/i)).toBeInTheDocument();
      });

      // Confirm in dialog
      const confirmBtn = screen.getByTestId('confirm-dialog-submit-btn');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockApprove).toHaveBeenCalled();
      });
    });
  });
});
