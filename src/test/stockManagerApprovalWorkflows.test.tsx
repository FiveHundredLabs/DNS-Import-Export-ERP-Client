import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { authService } from '../services/AuthService';
import { grnService, grnRepository, GRNService } from '../services/GRNService';
import { MockGRNRepository } from '../repositories/mock/MockGRNRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { apService } from '../features/finance/services/apService';
import { GRNStockManagerVerificationPanel } from '../features/inventory/components/GRNStockManagerVerificationPanel';
import { UnitSerialBarcodeInspector } from '../features/inventory/components/UnitSerialBarcodeInspector';
import { ApprovalsPage } from '../features/approvals/ApprovalsPage';
import { DeliveryNoteDetailPage } from '../features/inventory/delivery-notes/DeliveryNoteDetailPage';
import { GRN } from '../types/inventory';
import { DeliveryNote, SubmitRejectionPayload } from '../types/deliveryNote';
import { User } from '../types/auth';

describe('Stock Manager Workflow-Specific Approval System', () => {
  const stockKeeperUser: User = {
    id: 'usr-keeper-01',
    name: 'Amal Perera',
    email: 'amal@dnserp.com',
    role: 'STOCK_KEEPER',
    status: 'ACTIVE',
  };

  const stockManagerUser: User = {
    id: 'usr-mgr-01',
    name: 'Bandara Jayasinghe',
    email: 'stock.mgr@dnserp.com',
    role: 'STOCK_MANAGER',
    status: 'ACTIVE',
  };

  const unauthorizedCashier: User = {
    id: 'usr-cashier-01',
    name: 'Kasun Bandara',
    email: 'cashier@dnserp.com',
    role: 'CASHIER',
    status: 'ACTIVE',
  };

  const financeOfficerUser: User = {
    id: 'usr-fin-01',
    name: 'Nimal Finance',
    email: 'finance@dnserp.com',
    role: 'FINANCE_OFFICER',
    status: 'ACTIVE',
  };

  beforeEach(() => {
    MockGRNRepository.getInstance().reset();
    apService.reset();
    deliveryNoteService.resetToDefaults();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKFLOW 1: GRN – Stock Manager Verification Before Finance Approval
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Workflow 1: GRN Stock Manager Verification Before Finance Approval', () => {
    const buildSampleGRN = (id: string, poNumber: string = 'PO-2025-001'): GRN => ({
      id,
      grnNumber: id,
      supplierId: 'sup-001',
      supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
      purchaseOrderId: poNumber,
      purchaseOrderNumber: poNumber,
      warehouseId: 'WH-MAIN',
      status: 'DRAFT',
      totalValue: 500000,
      receivedById: stockKeeperUser.id,
      receivedByName: stockKeeperUser.name,
      items: [
        {
          productId: 'prod-001',
          productNameSnapshot: 'Schneider Acti9 32A Double Pole MCB',
          skuSnapshot: 'DNS-MCB-32A-2P',
          expectedQuantity: 100,
          receivedQuantity: 100,
          damagedQuantity: 2,
          damageReason: 'Chipped terminal during transport',
          unitCostSnapshot: 2500,
          lineValue: 250000,
          unitBarcodes: ['DNS-MCB-001', 'DNS-MCB-002'],
          unitRecords: [
            { unitIndex: 1, unitBarcode: 'DNS-MCB-001', status: 'LABELED' },
            { unitIndex: 2, unitBarcode: 'DNS-MCB-002', status: 'LABELED' },
          ],
          serialNumbers: ['SN-001', 'SN-002'],
        },
      ],
    });

    it('Scenario 1: Stock Keeper creates GRN → Stock Manager approves → Finance receives approval request', async () => {
      const grn = buildSampleGRN('GRN-TEST-001');

      // 1. Stock Keeper creates and submits GRN
      await grnService.submitGRN(grn, stockKeeperUser);
      expect(grn.status).toBe('PENDING_STOCK_MANAGER_APPROVAL');
      expect(grn.stockManagerApproval?.status).toBe('PENDING');

      // 2. Finance must NOT receive the GRN while awaiting Stock Manager approval
      let financeGRNs = apService.getAvailableGRNs();
      expect(financeGRNs.some((g) => g.id === grn.id)).toBe(false);

      // 3. Stock Manager verifies and approves physical intake
      const remarks = 'Counts verified against PO. Barcodes and packaging intact.';
      const approvedGRN = await grnService.verifyAndApproveGRN(grn.id, stockManagerUser, remarks);

      expect(approvedGRN.status).toBe('SUBMITTED');
      expect(approvedGRN.verifiedById).toBe(stockManagerUser.id);
      expect(approvedGRN.verifiedByName).toBe(stockManagerUser.name);
      expect(approvedGRN.stockManagerApproval?.status).toBe('APPROVED');
      expect(approvedGRN.stockManagerApproval?.approvedByName).toBe(stockManagerUser.name);
      expect(approvedGRN.stockManagerApproval?.remarks).toBe(remarks);

      // 4. Finance now receives the approved GRN in its queue ready for costing
      financeGRNs = apService.getAvailableGRNs();
      const receivedByFinance = financeGRNs.find((g) => g.id === grn.id);
      expect(receivedByFinance).toBeDefined();
      expect(receivedByFinance?.status).toBe('SUBMITTED');
    });

    it('Scenario 2: Stock Keeper creates GRN → Stock Manager rejects → Finance must NOT receive it', async () => {
      const grn = buildSampleGRN('GRN-TEST-002');

      // 1. Stock Keeper submits GRN
      await grnService.submitGRN(grn, stockKeeperUser);
      expect(grn.status).toBe('PENDING_STOCK_MANAGER_APPROVAL');

      // 2. Stock Manager inspects and rejects verification
      const reason = 'Severe packaging damage and water leakage detected across all cartons.';
      const rejectedGRN = await grnService.rejectGRNVerification(grn.id, stockManagerUser, reason);

      expect(rejectedGRN.status).toBe('STOCK_MANAGER_REJECTED');
      expect(rejectedGRN.rejectedReason).toBe(reason);
      expect(rejectedGRN.stockManagerApproval?.status).toBe('REJECTED');
      expect(rejectedGRN.stockManagerApproval?.rejectedByName).toBe(stockManagerUser.name);

      // 3. Finance must NOT receive the rejected GRN
      const financeGRNs = apService.getAvailableGRNs();
      expect(financeGRNs.some((g) => g.id === grn.id)).toBe(false);
    });

    it('Scenario 3: Stock Manager creates GRN → Directly proceeds to Finance (Bypasses self-approval)', async () => {
      const grn = buildSampleGRN('GRN-TEST-003');

      // Stock Manager submits their own GRN
      await grnService.submitGRN(grn, stockManagerUser);

      // Status proceeds directly to SUBMITTED without pending self-approval
      expect(grn.status).toBe('SUBMITTED');
      expect(grn.stockManagerApproval?.status).toBe('APPROVED');
      expect(grn.stockManagerApproval?.approvedById).toBe(stockManagerUser.id);

      // Finance immediately receives it
      const financeGRNs = apService.getAvailableGRNs();
      const available = financeGRNs.find((g) => g.id === grn.id);
      expect(available).toBeDefined();
      expect(available?.status).toBe('SUBMITTED');
    });

    it('Scenario 9A: Unauthorized users cannot verify, approve or reject GRN', async () => {
      const grn = buildSampleGRN('GRN-TEST-SEC01');
      await grnService.submitGRN(grn, stockKeeperUser);

      // Stock Keeper attempts to approve their own GRN
      await expect(
        grnService.verifyAndApproveGRN(grn.id, stockKeeperUser)
      ).rejects.toThrow(/Unauthorized/);

      // Cashier attempts to approve GRN
      await expect(
        grnService.verifyAndApproveGRN(grn.id, unauthorizedCashier)
      ).rejects.toThrow(/Unauthorized/);

      // Cashier attempts to reject GRN
      await expect(
        grnService.rejectGRNVerification(grn.id, unauthorizedCashier, 'Shortage')
      ).rejects.toThrow(/Unauthorized/);
    });

    it('Scenario 10A: Concurrent/duplicate GRN verification calls are safely prevented', async () => {
      const grn = buildSampleGRN('GRN-TEST-CONCUR01');
      await grnService.submitGRN(grn, stockKeeperUser);

      // First approval succeeds
      await grnService.verifyAndApproveGRN(grn.id, stockManagerUser, 'First approval');

      // Duplicate approval attempt throws error and preserves status
      await expect(
        grnService.verifyAndApproveGRN(grn.id, stockManagerUser, 'Duplicate approval')
      ).rejects.toThrow(/is not pending Stock Manager verification/);

      // Duplicate rejection attempt also rejected
      await expect(
        grnService.rejectGRNVerification(grn.id, stockManagerUser, 'Late rejection')
      ).rejects.toThrow(/is not pending Stock Manager verification/);
    });

    it('renders GRNStockManagerVerificationPanel with matching reference UI (Product cards, barcodes, damaged counts)', () => {
      const grn = buildSampleGRN('GRN-TEST-UI01');
      grn.status = 'PENDING_STOCK_MANAGER_APPROVAL';

      const mockApprove = vi.fn();
      const mockReject = vi.fn();

      render(
        <MemoryRouter>
          <GRNStockManagerVerificationPanel
            grn={grn}
            currentUser={stockManagerUser}
            onApprove={mockApprove}
            onReject={mockReject}
          />
        </MemoryRouter>
      );

      // Verify UI reference panel elements
      expect(screen.getByText('Warehouse Goods Receipt (Stock Manager Verification)')).toBeInTheDocument();
      expect(screen.getByText('AWAITING VERIFICATION')).toBeInTheDocument();
      expect(screen.getByText('Schneider Electric Lanka (Pvt) Ltd')).toBeInTheDocument();
      expect(screen.getByText('Damaged Units')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Damaged count
      expect(screen.getByText('Schneider Acti9 32A Double Pole MCB')).toBeInTheDocument();
      expect(screen.getByText(/Show Barcode & Details/i)).toBeInTheDocument();

      // Verify Stock Manager verification buttons
      expect(screen.getByText('Approve & Forward to Finance')).toBeInTheDocument();
      expect(screen.getByText('Reject Verification')).toBeInTheDocument();
    });

    it('displays all 450 unit serial numbers and barcodes when inspecting 450 received units', () => {
      // Line item with 450 units received
      const grn450 = buildSampleGRN('GRN-2025-001');
      grn450.items[0].expectedQuantity = 450;
      grn450.items[0].receivedQuantity = 450;
      grn450.status = 'PENDING_STOCK_MANAGER_APPROVAL';

      const mockApprove = vi.fn();
      const mockReject = vi.fn();

      render(
        <MemoryRouter>
          <GRNStockManagerVerificationPanel
            grn={grn450}
            currentUser={stockManagerUser}
            onApprove={mockApprove}
            onReject={mockReject}
          />
        </MemoryRouter>
      );

      // Verify the 450 units line summary badge is displayed
      expect(screen.getByText(/450 serials & barcodes verified/i)).toBeInTheDocument();

      // Click to expand item details and inspector
      const expandBtn = screen.getByText(/Show Barcode & Details/i);
      fireEvent.click(expandBtn);

      // Verify inspector header and mode tabs
      expect(screen.getByText(/450 \/ 450 Units Barcoded & Serialized/i)).toBeInTheDocument();
      expect(screen.getByText(/Barcodes \(450\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Serials \(450\)/i)).toBeInTheDocument();

      // Verify pagination showing initial page (50 items)
      expect(screen.getByText(/1 - 50 of 450 units/i)).toBeInTheDocument();

      // Verify unit #1 is rendered in table
      expect(screen.getByText('#1')).toBeInTheDocument();

      // Search for unit 450
      const searchInput = screen.getByPlaceholderText(/Search across all 450 units/i);
      fireEvent.change(searchInput, { target: { value: '450' } });

      // After filtering for '450', unit 450 should be visible with its assigned barcode and registered serial
      expect(screen.getByText('#450')).toBeInTheDocument();
      expect(screen.getByText('SN-450')).toBeInTheDocument();
      expect(screen.getByText(/DNS-.*-450/)).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKFLOW 2: Delivery Note – Rejected Item Approval
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Workflow 2: Delivery Note – Rejected Item Approval', () => {
    let testDeliveryNote: DeliveryNote;

    beforeEach(async () => {
      const notes = await deliveryNoteService.getAll();
      testDeliveryNote = notes.find((n) => n.status === 'DISPATCHED') || notes[0];
    });

    it('Scenario 4: Stock Keeper rejects one unit → Stock Manager receives approval request', async () => {
      const item = testDeliveryNote.items[0];
      const rejectedBarcode = item.unitBarcodes[0];

      const payload: SubmitRejectionPayload = {
        deliveryNoteId: testDeliveryNote.id,
        submittedBy: stockKeeperUser.name,
        notes: 'Outer casing broken during unloading',
        rejectedItems: [
          {
            productId: item.productId,
            rejectedBarcodes: [rejectedBarcode],
            reason: 'DAMAGED_IN_TRANSIT',
            notes: 'Dent on top terminal clamp',
          },
        ],
      };

      const updated = await deliveryNoteService.submitRejection(
        testDeliveryNote.id,
        payload,
        stockKeeperUser
      );

      // Status must become REJECTION_PENDING_APPROVAL
      expect(updated.status).toBe('REJECTION_PENDING_APPROVAL');
      expect(updated.totalRejectedUnits).toBe(1);
      expect(updated.rejectionSubmittedBy).toContain(stockKeeperUser.name);
      expect(updated.rejectionApprovalRequest).toBeDefined();
      expect(updated.rejectionApprovalRequest?.status).toBe('PENDING');
      expect(updated.rejectionApprovalRequest?.totalUnits).toBe(1);
      expect(updated.rejectedUnitsDetail).toHaveLength(1);
      expect(updated.rejectedUnitsDetail?.[0].barcode).toBe(rejectedBarcode);
      expect(updated.rejectedUnitsDetail?.[0].reason).toBe('DAMAGED_IN_TRANSIT');
    });

    it('Scenario 5: Stock Keeper rejects multiple units → All rejected units, barcodes, and reasons are captured', async () => {
      const item = testDeliveryNote.items[0];
      const barcodes = item.unitBarcodes.slice(0, 3);

      const payload: SubmitRejectionPayload = {
        deliveryNoteId: testDeliveryNote.id,
        submittedBy: stockKeeperUser.name,
        notes: 'Multiple units rejected at Colombo jobsite',
        rejectedItems: [
          {
            productId: item.productId,
            rejectedBarcodes: barcodes,
            reason: 'DEFECTIVE_PRODUCT',
            notes: 'Continuity test failed on 3 units',
          },
        ],
      };

      const updated = await deliveryNoteService.submitRejection(
        testDeliveryNote.id,
        payload,
        stockKeeperUser
      );

      expect(updated.status).toBe('REJECTION_PENDING_APPROVAL');
      expect(updated.totalRejectedUnits).toBe(3);
      expect(updated.rejectedUnitsDetail).toHaveLength(3);

      // Verify each individual unit barcode and reason
      barcodes.forEach((bc, idx) => {
        expect(updated.rejectedUnitsDetail?.[idx].barcode).toBe(bc);
        expect(updated.rejectedUnitsDetail?.[idx].reason).toBe('DEFECTIVE_PRODUCT');
      });
    });

    it('Scenario 6: Stock Manager approves rejected items → Correct existing inventory workflow is executed', async () => {
      const item = testDeliveryNote.items[0];
      const rejectedBarcode = item.unitBarcodes[0];

      // Submit rejection first
      await deliveryNoteService.submitRejection(
        testDeliveryNote.id,
        {
          deliveryNoteId: testDeliveryNote.id,
          submittedBy: stockKeeperUser.name,
          rejectedItems: [
            {
              productId: item.productId,
              rejectedBarcodes: [rejectedBarcode],
              reason: 'DAMAGED',
              notes: 'Physical crack',
            },
          ],
        },
        stockKeeperUser
      );

      // Stock Manager approves
      const approvedNote = await deliveryNoteService.approveRejection(
        testDeliveryNote.id,
        stockManagerUser,
        'Approved. Move damaged unit to Quarantine Bay Q-01.'
      );

      expect(approvedNote.status).toBe('REJECTION_APPROVED');
      expect(approvedNote.rejectionApprovedBy).toContain(stockManagerUser.name);
      expect(approvedNote.rejectionApprovalRequest?.status).toBe('APPROVED');
      expect(approvedNote.rejectionApprovalRemarks).toContain('Quarantine Bay Q-01');
    });

    it('Scenario 7: Stock Manager rejects the rejection request (declines) → No unauthorized inventory adjustment occurs', async () => {
      const item = testDeliveryNote.items[0];
      const rejectedBarcode = item.unitBarcodes[0];

      // Submit rejection
      await deliveryNoteService.submitRejection(
        testDeliveryNote.id,
        {
          deliveryNoteId: testDeliveryNote.id,
          submittedBy: stockKeeperUser.name,
          rejectedItems: [
            {
              productId: item.productId,
              rejectedBarcodes: [rejectedBarcode],
              reason: 'CUSTOMER_REFUSED',
            },
          ],
        },
        stockKeeperUser
      );

      // Stock Manager declines rejection (customer disputes claim)
      const declinedNote = await deliveryNoteService.declineRejection(
        testDeliveryNote.id,
        stockManagerUser,
        'Disputed claim. Customer signed delivery without note on invoice. Hold for re-inspection.'
      );

      expect(declinedNote.status).toBe('REJECTION_DECLINED');
      expect(declinedNote.rejectionApprovalRequest?.status).toBe('DECLINED');
      expect(declinedNote.rejectionApprovalRemarks).toContain('Disputed claim');
    });

    it('Scenario 8: Stock Manager rejects their own Delivery Note items → No self-approval request is generated', async () => {
      const item = testDeliveryNote.items[0];
      const rejectedBarcode = item.unitBarcodes[0];

      const payload: SubmitRejectionPayload = {
        deliveryNoteId: testDeliveryNote.id,
        submittedBy: stockManagerUser.name,
        notes: 'Handled directly by Stock Manager',
        rejectedItems: [
          {
            productId: item.productId,
            rejectedBarcodes: [rejectedBarcode],
            reason: 'DAMAGED_IN_TRANSIT',
          },
        ],
      };

      // Stock Manager processes rejection directly
      const updated = await deliveryNoteService.submitRejection(
        testDeliveryNote.id,
        payload,
        stockManagerUser
      );

      // Bypasses REJECTION_PENDING_APPROVAL and self-approval request
      expect(updated.status).toBe('REJECTION_APPROVED');
      expect(updated.rejectionApprovalRequest).toBeUndefined();
      expect(updated.rejectionApprovedBy).toContain(stockManagerUser.name);
      expect(updated.rejectionApprovalRemarks).toContain('Self-approval bypassed');
    });

    it('Scenario 9B: Unauthorized users cannot approve or decline Delivery Note rejections', async () => {
      const item = testDeliveryNote.items[0];
      await deliveryNoteService.submitRejection(
        testDeliveryNote.id,
        {
          deliveryNoteId: testDeliveryNote.id,
          submittedBy: stockKeeperUser.name,
          rejectedItems: [
            {
              productId: item.productId,
              rejectedBarcodes: [item.unitBarcodes[0]],
              reason: 'DAMAGED',
            },
          ],
        },
        stockKeeperUser
      );

      // Stock Keeper cannot approve
      await expect(
        deliveryNoteService.approveRejection(testDeliveryNote.id, stockKeeperUser)
      ).rejects.toThrow(/Requires STOCK_MANAGER authorization/);

      // Cashier cannot approve
      await expect(
        deliveryNoteService.approveRejection(testDeliveryNote.id, unauthorizedCashier)
      ).rejects.toThrow(/Requires STOCK_MANAGER authorization/);

      // Stock Keeper cannot decline
      await expect(
        deliveryNoteService.declineRejection(testDeliveryNote.id, stockKeeperUser)
      ).rejects.toThrow(/Requires STOCK_MANAGER authorization/);
    });

    it('Scenario 10B: Concurrency & duplicate approval attempts on Delivery Note rejections throw errors', async () => {
      const item = testDeliveryNote.items[0];
      await deliveryNoteService.submitRejection(
        testDeliveryNote.id,
        {
          deliveryNoteId: testDeliveryNote.id,
          submittedBy: stockKeeperUser.name,
          rejectedItems: [
            {
              productId: item.productId,
              rejectedBarcodes: [item.unitBarcodes[0]],
              reason: 'DAMAGED',
            },
          ],
        },
        stockKeeperUser
      );

      // First approval succeeds
      await deliveryNoteService.approveRejection(testDeliveryNote.id, stockManagerUser, 'First approval');

      // Second approval attempt on already approved rejection fails
      await expect(
        deliveryNoteService.approveRejection(testDeliveryNote.id, stockManagerUser, 'Second approval attempt')
      ).rejects.toThrow(/is not pending rejection approval/);

      // Attempting to decline after approval also fails
      await expect(
        deliveryNoteService.declineRejection(testDeliveryNote.id, stockManagerUser, 'Late decline attempt')
      ).rejects.toThrow(/is not pending rejection approval/);
    });
  });

  describe('Workflow 3: Stock Manager Approvals Page & Hub UI (/approvals)', () => {
    it('renders dedicated StockManagerApprovalHub when STOCK_MANAGER accesses /approvals', async () => {
      authService.switchRole('STOCK_MANAGER');

      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <ApprovalsPage />
        </MemoryRouter>
      );

      // Verify dedicated Stock Manager Hub is rendered instead of generic Approvals Engine
      await waitFor(() => {
        expect(screen.getByText('Stock Manager Verification & Approvals Hub')).toBeInTheDocument();
        expect(screen.getByText('Warehouse Approval Engine • Stock Manager')).toBeInTheDocument();
      });

      // Verify tabs
      expect(screen.getByRole('button', { name: /Inbound Goods Receipts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delivery Note Customer Rejections/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Verification Audit Log & History/i })).toBeInTheDocument();

      // Wait for data load and verify pending GRN table renders cleanly
      await waitFor(() => {
        expect(
          screen.getByText('Inbound Goods Receipts Pending Approval')
        ).toBeInTheDocument();
      });

      // Verify removed cards and dropdown are NOT in the document
      expect(
        screen.queryByText('Warehouse Goods Receipt (Read-Only Physical Intake)')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Stock Manager Verification Decision')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Quick Inbound GRN:')
      ).not.toBeInTheDocument();

      // Verify that generic Enterprise Approvals Engine content is NOT shown
      expect(screen.queryByText('Enterprise Approvals Engine')).not.toBeInTheDocument();
    });

    it('shows pending & rejected Distribution Notes table without split cards and navigates to detailed page on click', async () => {
      authService.switchRole('STOCK_MANAGER');

      render(
        <MemoryRouter initialEntries={['/approvals?tab=delivery-notes']}>
          <ApprovalsPage />
        </MemoryRouter>
      );

      // Verify that the removed split cards & dropdown selector are NOT in the document
      await waitFor(() => {
        expect(
          screen.queryByText('Delivery Note Customer Rejection (Physical Return)')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Stock Manager Rejection Authorization')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Selected Delivery Note:')
        ).not.toBeInTheDocument();
      });

      // Verify Distribution Notes table is present
      expect(screen.getByText('Pending & Rejected Distribution Notes')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Click any Delivery Note to open its detailed page with full unit serialization/i
        )
      ).toBeInTheDocument();

      // Verify pending and rejected notes exist in the table
      expect(screen.getByText('DN-2026-0003')).toBeInTheDocument();
      expect(screen.getByText('Kandy Industrial Electrical Mart')).toBeInTheDocument();

      // Verify action buttons exist
      const actionBtns = screen.getAllByRole('button', { name: /Review & Authorize|Inspect Delivery Note/i });
      expect(actionBtns.length).toBeGreaterThan(0);
    });

    it('renders detailed page with full delivery note details and authorization controls when inspecting a delivery note', async () => {
      authService.switchRole('STOCK_MANAGER');

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-003']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/DN-2026-0003/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Kandy Industrial Electrical Mart/i).length).toBeGreaterThan(0);
      });

      // Verify detailed sections: customer consignee, transport logistics, dispatched lines
      expect(screen.getByText(/Consignee & Deliver-To Customer/i)).toBeInTheDocument();
      expect(screen.getByText(/Transport & Dispatch Logistics/i)).toBeInTheDocument();
      expect(screen.getByText(/Dispatched Line Items & Physical Unit Barcodes/i)).toBeInTheDocument();

      // Stock Manager authorization actions
      expect(screen.getByRole('button', { name: /Approve Customer Rejection/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Decline Rejection/i })).toBeInTheDocument();
    });

    it('shows ONLY GRNs that are pending approval and navigates to the full GRN document when clicked', async () => {
      authService.switchRole('STOCK_MANAGER');

      render(
        <MemoryRouter initialEntries={['/approvals?tab=grn']}>
          <ApprovalsPage />
        </MemoryRouter>
      );

      // Wait for data load
      await waitFor(() => {
        expect(screen.getByText('Inbound Goods Receipts Pending Approval')).toBeInTheDocument();
      });

      // Verify GRN Queue shows strictly Pending Approval count
      expect(screen.getByText(/Pending Approval \(/i)).toBeInTheDocument();

      // Non-pending status filter buttons ('Verified / Forwarded', 'All GRNs') should NOT exist
      expect(screen.queryByRole('button', { name: 'Verified / Forwarded' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'All GRNs' })).not.toBeInTheDocument();

      // Verify pending GRNs are displayed (e.g. GRN-2025-007, GRN-2025-008)
      expect(screen.getAllByText('GRN-2025-007').length).toBeGreaterThan(0);
      expect(screen.getAllByText('GRN-2025-008').length).toBeGreaterThan(0);

      // Verify already approved GRN-2025-001 is NOT listed in the pending approvals table
      expect(screen.queryByText('GRN-2025-001')).not.toBeInTheDocument();

      // Verify "Inspect Full GRN Document" action button is available on the pending GRN rows
      const inspectButtons = screen.getAllByRole('button', { name: /Inspect Full GRN Document/i });
      expect(inspectButtons.length).toBeGreaterThan(0);
    });

    it('Stock Manager approval forwards GRN to Finance and DOES NOT post to inventory; only Finance approval posts stock', async () => {
      const invRepo = new MockInventoryRepository();
      const grnRepo = new MockGRNRepository();
      const grnSvc = new GRNService(grnRepo, invRepo);

      // Create a test GRN in PENDING_STOCK_MANAGER_APPROVAL
      const testGRN: GRN = {
        id: 'GRN-TEST-FIN-01',
        grnNumber: 'GRN-TEST-FIN-01',
        supplierId: 'sup-001',
        supplierName: 'Schneider Electric Lanka',
        warehouseId: 'WH-MAIN',
        status: 'PENDING_STOCK_MANAGER_APPROVAL',
        totalValue: 500000,
        receivedById: 'usr-keeper-01',
        receivedByName: 'Amal Perera',
        items: [
          {
            productId: 'prod-001',
            productNameSnapshot: 'Schneider Acti9 32A MCB',
            skuSnapshot: 'DNS-MCB-32A',
            expectedQuantity: 100,
            receivedQuantity: 100,
            damagedQuantity: 0,
            unitCostSnapshot: 2500,
            lineValue: 250000,
          },
        ],
      };
      await grnRepo.save(testGRN);

      // Verify baseline stock balance
      const initialBal = await invRepo.getBalance('prod-001', 'WH-MAIN');
      const initialQty = initialBal?.availableQuantity || 0;

      // 1. Stock Manager approves the GRN
      const approvedBySM = await grnSvc.verifyAndApproveGRN(
        testGRN.id,
        { id: stockManagerUser.id, name: stockManagerUser.name, role: stockManagerUser.role },
        'Physical count verified. Forwarded to Finance.'
      );

      // GRN is now SUBMITTED (forwarded to Finance)
      expect(approvedBySM.status).toBe('SUBMITTED');
      expect(approvedBySM.stockManagerApproval?.status).toBe('APPROVED');

      // CRUCIAL: Stock balance must NOT have been posted or increased!
      const balAfterSM = await invRepo.getBalance('prod-001', 'WH-MAIN');
      expect((balAfterSM?.availableQuantity || 0)).toBe(initialQty);

      // Verify no GRN_INWARD movement was created yet
      const movementsAfterSM = await invRepo.getMovements();
      const smMovement = movementsAfterSM.find(m => m.referenceDocumentId === testGRN.id);
      expect(smMovement).toBeUndefined();

      // 2. Stock Manager attempting to call approveGRN directly must be blocked
      await expect(
        grnSvc.approveGRN(testGRN.id, stockManagerUser.id, stockManagerUser.name, stockManagerUser.role)
      ).rejects.toThrow(/Stock Manager approval does not post directly to inventory/i);

      // 3. Finance Manager approves the GRN
      await grnSvc.approveGRN(
        testGRN.id,
        financeOfficerUser.id,
        financeOfficerUser.name,
        'FINANCE_MANAGER'
      );

      // GRN status is now APPROVED
      const finalGRN = await grnRepo.getById(testGRN.id);
      expect(finalGRN?.status).toBe('APPROVED');

      // ONLY AFTER Finance approves should stock be posted to inventory
      const finalBal = await invRepo.getBalance('prod-001', 'WH-MAIN');
      expect((finalBal?.availableQuantity || 0)).toBe(initialQty + 100);

      // Inward movement must now be recorded
      const movementsAfterFinance = await invRepo.getMovements();
      const finMovement = movementsAfterFinance.find(m => m.referenceDocumentId === testGRN.id);
      expect(finMovement).toBeDefined();
      expect(finMovement?.movementType).toBe('GRN_INWARD');
      expect(finMovement?.quantity).toBe(100);
    });
  });

});
