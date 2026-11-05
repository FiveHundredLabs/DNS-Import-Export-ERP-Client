import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import { approvalService } from '../services/ApprovalService';
import { apService } from '../features/finance/services/apService';
import { mockPurchaseOrderRepository } from '../repositories/mock/MockPurchaseOrderRepository';
import { MockApprovalRepository } from '../repositories/mock/MockApprovalRepository';
import { canAccessRoute, hasPermission } from '../rules/permissions';
import { User } from '../types/auth';
import { PurchasingSupplierPaymentsPage } from '../features/purchasing/PurchasingSupplierPaymentsPage';
import { ApprovalsPage } from '../features/approvals/ApprovalsPage';
import { authService } from '../services/AuthService';

// Mock users
const mockPurchasingOfficer: User = {
  id: 'usr-po-01',
  name: 'Ruwan Wickramasinghe',
  email: 'purchasing.officer@dnserp.com',
  role: 'PURCHASING_OFFICER',
  phone: '+94 77 987 6543',
  isActive: true,
};

const mockPurchasingManager: User = {
  id: 'usr-pm-01',
  name: 'Malik Samarasekera',
  email: 'purchasing.manager@dnserp.com',
  role: 'PURCHASING_MANAGER',
  phone: '+94 77 987 1122',
  isActive: true,
};

const mockGeneralManager: User = {
  id: 'usr-gm-01',
  name: 'Ruwan Wijesinghe',
  email: 'manager@dnserp.com',
  role: 'MANAGER',
  phone: '+94 77 234 5678',
  isActive: true,
};

const mockDirector: User = {
  id: 'usr-dir-01',
  name: 'Saman Jayasuriya',
  email: 'director@dnserp.com',
  role: 'DIRECTOR',
  phone: '+94 77 123 4567',
  isActive: true,
};

describe('Purchasing Approval System & Supplier Payment Visibility', () => {
  beforeEach(() => {
    mockPurchaseOrderRepository.reset();
    MockApprovalRepository.getInstance().resetToDefaults();
  });

  // =========================================================================
  // 1. PO Approval Workflow: Scenario A (Purchasing Officer Initiates)
  // =========================================================================
  describe('Workflow 1: Scenario A – Purchasing Officer creates a PO', () => {
    it('routes PO to Purchasing Manager first, then to higher-level Manager upon PM approval', async () => {
      // Step 1: Purchasing Officer creates and submits a PO
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics & Electronics Ltd',
          supplierCode: 'SUP-001',
          orderDate: '2026-11-01',
          expectedDeliveryDate: '2026-11-10',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-001',
              productCode: 'SWG-MCB-16A',
              productName: 'Schneider 16A MCB',
              quantity: 20,
              unitPrice: 2000,
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      expect(po.status).toBe('PENDING_APPROVAL');
      expect(po.createdByRole).toBe('PURCHASING_OFFICER');
      expect(po.approvalRequestId).toBeDefined();

      // Verify approval request was routed to PURCHASING_MANAGER
      const approvalReq = await approvalService.getApproval(po.approvalRequestId!);
      expect(approvalReq).not.toBeNull();
      expect(approvalReq?.currentApproverRole).toBe('PURCHASING_MANAGER');
      expect(approvalReq?.targetApproverRole).toBe('MANAGER');
      expect(approvalReq?.status).toBe('PENDING');

      // Step 2: Purchasing Manager inspects and approves
      const pmApproval = await approvalService.processAction(
        po.approvalRequestId!,
        'APPROVE',
        mockPurchasingManager.id,
        mockPurchasingManager.name,
        mockPurchasingManager.role,
        'Physical specifications and vendor rates verified. Forwarding to General Manager.'
      );

      // Approval request should remain PENDING but advance to MANAGER
      expect(pmApproval.status).toBe('PENDING');
      expect(pmApproval.currentApproverRole).toBe('MANAGER');
      expect(pmApproval.history.length).toBe(2);
      expect(pmApproval.history[1].actorRole).toBe('PURCHASING_MANAGER');
      expect(pmApproval.history[1].action).toBe('APPROVE');

      // PO should record Purchasing Manager verification and stay PENDING_APPROVAL
      const poAfterPM = await purchaseOrderService.getById(po.id);
      expect(poAfterPM?.status).toBe('PENDING_APPROVAL');
      expect(poAfterPM?.purchasingManagerApproval?.approvedById).toBe(mockPurchasingManager.id);
      expect(poAfterPM?.purchasingManagerApproval?.remarks).toContain('Forwarding to General Manager');

      // Step 3: Higher-level General Manager grants final authorization
      const gmApproval = await approvalService.processAction(
        po.approvalRequestId!,
        'APPROVE',
        mockGeneralManager.id,
        mockGeneralManager.name,
        mockGeneralManager.role,
        'Executive financial budget approved for inventory replenishment.'
      );

      expect(gmApproval.status).toBe('APPROVED');
      expect(gmApproval.history.length).toBe(3);
      expect(gmApproval.history[2].actorRole).toBe('MANAGER');

      // PO should now be fully APPROVED
      const poFinal = await purchaseOrderService.getById(po.id);
      expect(poFinal?.status).toBe('APPROVED');
      expect(poFinal?.approvedByName).toContain('Ruwan Wijesinghe');

      // PO can now be dispatched to supplier
      const dispatched = await purchaseOrderService.markAsSentToSupplier(po.id, mockPurchasingOfficer);
      expect(dispatched.status).toBe('SENT_TO_SUPPLIER');
      expect(dispatched.sentAt).toBeDefined();
    });

    it('Scenario A: Purchasing Manager rejection terminates workflow and prevents reaching Manager', async () => {
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-11-01',
          expectedDeliveryDate: '2026-11-10',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-001',
              productCode: 'SWG-MCB-16A',
              productName: 'Schneider 16A MCB',
              quantity: 10,
              unitPrice: 3500, // inflated price
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      // Purchasing Manager rejects
      await approvalService.processAction(
        po.approvalRequestId!,
        'REJECT',
        mockPurchasingManager.id,
        mockPurchasingManager.name,
        mockPurchasingManager.role,
        'UnitPrice of LKR 3,500 exceeds standard catalog baseline. Renegotiate with supplier.'
      );

      const rejectedPO = await purchaseOrderService.getById(po.id);
      expect(rejectedPO?.status).toBe('REJECTED');
      expect(rejectedPO?.rejectionReason).toContain('exceeds standard catalog baseline');

      const approvalReq = await approvalService.getApproval(po.approvalRequestId!);
      expect(approvalReq?.status).toBe('REJECTED');
    });

    it('Scenario A: Higher-level Manager can reject after Purchasing Manager approval', async () => {
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-11-01',
          expectedDeliveryDate: '2026-11-10',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-001',
              productCode: 'SWG-MCB-16A',
              productName: 'Schneider 16A MCB',
              quantity: 50,
              unitPrice: 2000,
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      // PM approves
      await approvalService.processAction(
        po.approvalRequestId!,
        'APPROVE',
        mockPurchasingManager.id,
        mockPurchasingManager.name,
        mockPurchasingManager.role,
        'Verified and endorsed.'
      );

      // General Manager rejects
      await approvalService.processAction(
        po.approvalRequestId!,
        'REJECT',
        mockGeneralManager.id,
        mockGeneralManager.name,
        mockGeneralManager.role,
        'Current quarterly cash flow constraints prevent new commitments.'
      );

      const rejectedPO = await purchaseOrderService.getById(po.id);
      expect(rejectedPO?.status).toBe('REJECTED');
      expect(rejectedPO?.rejectionReason).toContain('cash flow constraints');
    });
  });

  // =========================================================================
  // 2. PO Approval Workflow: Scenario B (Purchasing Manager Initiates)
  // =========================================================================
  describe('Workflow 1: Scenario B – Purchasing Manager creates a PO', () => {
    it('bypasses PM self-approval and routes directly to higher-level Manager', async () => {
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-2',
          supplierName: 'Apex International Importers',
          supplierCode: 'SUP-002',
          orderDate: '2026-11-01',
          expectedDeliveryDate: '2026-11-15',
          paymentTerms: 'Net 15',
          items: [
            {
              productId: 'prod-003',
              productCode: 'CBL-CU-4MM',
              productName: 'Kelani 4.0mm Copper Cable',
              quantity: 15,
              unitPrice: 18000,
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingManager
      );

      expect(po.status).toBe('PENDING_APPROVAL');
      expect(po.createdByRole).toBe('PURCHASING_MANAGER');

      // Check approval request: MUST go directly to MANAGER (no PM self-approval)
      const approvalReq = await approvalService.getApproval(po.approvalRequestId!);
      expect(approvalReq?.currentApproverRole).toBe('MANAGER');
      expect(approvalReq?.initiatorRole).toBe('PURCHASING_MANAGER');
      expect(approvalReq?.status).toBe('PENDING');

      // Higher-level Manager approves directly
      await approvalService.processAction(
        po.approvalRequestId!,
        'APPROVE',
        mockGeneralManager.id,
        mockGeneralManager.name,
        mockGeneralManager.role,
        'Direct manager submission authorized.'
      );

      const approvedPO = await purchaseOrderService.getById(po.id);
      expect(approvedPO?.status).toBe('APPROVED');
      expect(approvedPO?.approvedByName).toContain('Ruwan Wijesinghe');
    });

    it('Scenario B: Strictly prevents Purchasing Manager self-approval on their own PO', async () => {
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-2',
          supplierName: 'Apex International Importers',
          supplierCode: 'SUP-002',
          orderDate: '2026-11-01',
          expectedDeliveryDate: '2026-11-15',
          paymentTerms: 'Net 15',
          items: [
            {
              productId: 'prod-003',
              productCode: 'CBL-CU-4MM',
              productName: 'Kelani 4.0mm Copper Cable',
              quantity: 5,
              unitPrice: 18000,
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingManager
      );

      // Purchasing Manager attempts to approve their own PO
      await expect(
        approvalService.processAction(
          po.approvalRequestId!,
          'APPROVE',
          mockPurchasingManager.id,
          mockPurchasingManager.name,
          mockPurchasingManager.role,
          'Self approving my order.'
        )
      ).rejects.toThrow(/Self-approval is strictly prohibited/i);

      // Status must remain unapproved
      const poCheck = await purchaseOrderService.getById(po.id);
      expect(poCheck?.status).toBe('PENDING_APPROVAL');
    });
  });

  // =========================================================================
  // 3. Security, Authorization & Concurrency Guards
  // =========================================================================
  describe('Security, Authorization & Concurrency Guards', () => {
    it('prevents Purchasing Officer from approving any PO', async () => {
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-11-01',
          expectedDeliveryDate: '2026-11-10',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-001',
              productCode: 'SWG-MCB-16A',
              productName: 'Schneider 16A MCB',
              quantity: 5,
              unitPrice: 2000,
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      await expect(
        approvalService.processAction(
          po.approvalRequestId!,
          'APPROVE',
          mockPurchasingOfficer.id,
          mockPurchasingOfficer.name,
          mockPurchasingOfficer.role,
          'Unauthorized attempt.'
        )
      ).rejects.toThrow(/not authorized/i);
    });

    it('prevents duplicate approval action by the same approver', async () => {
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-11-01',
          expectedDeliveryDate: '2026-11-10',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-001',
              productCode: 'SWG-MCB-16A',
              productName: 'Schneider 16A MCB',
              quantity: 5,
              unitPrice: 2000,
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      // PM approves once
      await approvalService.processAction(
        po.approvalRequestId!,
        'APPROVE',
        mockPurchasingManager.id,
        mockPurchasingManager.name,
        mockPurchasingManager.role,
        'First verification.'
      );

      // PM attempts to approve again
      await expect(
        approvalService.processAction(
          po.approvalRequestId!,
          'APPROVE',
          mockPurchasingManager.id,
          mockPurchasingManager.name,
          mockPurchasingManager.role,
          'Duplicate attempt.'
        )
      ).rejects.toThrow(/already approved/i);
    });

    it('routes high-value PO (> 500,000 LKR) to DIRECTOR for executive approval', async () => {
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-11-01',
          expectedDeliveryDate: '2026-11-20',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-002',
              productCode: 'SWG-MCCB-100A',
              productName: 'ABB MCCB 100A',
              quantity: 100,
              unitPrice: 5800, // 580,000 > 500,000 threshold
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      expect(po.grandTotal).toBeGreaterThan(500000);
      const approvalReq = await approvalService.getApproval(po.approvalRequestId!);
      expect(approvalReq?.currentApproverRole).toBe('DIRECTOR');
      expect(approvalReq?.isSpecialScenario).toBe(true);
    });
  });

  // =========================================================================
  // 4. Supplier Payment Visibility (View-Only & RBAC)
  // =========================================================================
  describe('Supplier Payment Visibility & Backend Role Authorization', () => {
    it('verifies route permissions for /purchasing/payments', () => {
      expect(canAccessRoute('PURCHASING_OFFICER', '/purchasing/payments')).toBe(true);
      expect(canAccessRoute('PURCHASING_MANAGER', '/purchasing/payments')).toBe(true);
      expect(canAccessRoute('MANAGER', '/purchasing/payments')).toBe(true);
      expect(canAccessRoute('DIRECTOR', '/purchasing/payments')).toBe(true);

      // Blocked non-procurement roles
      expect(canAccessRoute('SALES_REP', '/purchasing/payments')).toBe(false);
      expect(canAccessRoute('CASHIER', '/purchasing/payments')).toBe(false);
      expect(canAccessRoute('STOCK_KEEPER', '/purchasing/payments')).toBe(false);
    });

    it('allows Purchasing Officer and Purchasing Manager to view supplier payments and advances', () => {
      const payments = apService.getSupplierPayments();
      expect(payments.length).toBeGreaterThan(0);
      expect(payments[0].paymentNumber).toBeDefined();
      expect(payments[0].totalPaymentAmount).toBeGreaterThan(0);

      const advances = apService.getSupplierAdvances();
      expect(advances.length).toBeGreaterThan(0);
      expect(advances[0].advanceNumber).toBeDefined();
      expect(advances[0].amount).toBeGreaterThan(0);
    });

    it('strictly forbids Purchasing Officer and Purchasing Manager from creating supplier payments (backend check)', async () => {
      // Purchasing Officer attempt
      await expect(
        apService.postBatchSupplierPayment({
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          paymentDate: '2026-11-01',
          bankAccountId: 'acc-1010',
          bankAccountCode: '1010',
          paymentReference: 'UNAUTHORIZED-PAY',
          totalPaymentAmount: 100000,
          allocations: [{ billId: 'bill-101', amountToApply: 100000 }],
          userRole: 'PURCHASING_OFFICER',
        })
      ).rejects.toThrow(/view-only access to supplier payments/i);

      // Purchasing Manager attempt
      await expect(
        apService.postSupplierAdvance({
          supplierId: 'sup-1',
          paymentDate: '2026-11-01',
          bankAccountId: 'acc-1010',
          bankAccountCode: '1010',
          reference: 'UNAUTHORIZED-ADV',
          amount: 50000,
          userRole: 'PURCHASING_MANAGER',
        })
      ).rejects.toThrow(/view-only access to supplier payments/i);
    });

    it('renders PurchasingSupplierPaymentsPage in view-only mode without create/edit controls', async () => {
      render(
        <MemoryRouter>
          <PurchasingSupplierPaymentsPage />
        </MemoryRouter>
      );

      // Verify title & View-Only badge
      expect(screen.getByText('Supplier Payments Register')).toBeDefined();
      expect(screen.getByText(/Finance Audited • View-Only Access/i)).toBeDefined();

      // Wait for async load to finish and verify table headers
      await waitFor(() => {
        expect(screen.getByText('Payment #')).toBeDefined();
      });
      expect(screen.getByText('Date Paid')).toBeDefined();
      expect(screen.getByText('Bank / Cash Account')).toBeDefined();

      // Ensure NO create/record payment button is present
      expect(screen.queryByText(/Record Payment/i)).toBeNull();
      expect(screen.queryByText(/Post Payment/i)).toBeNull();
      expect(screen.queryByText(/New Disbursement/i)).toBeNull();
    });
  });
  // =========================================================================
  // 3. Purchasing Approvals Hub & Role Routing (/approvals)
  // =========================================================================
  describe('Workflow 3: Purchasing Approvals Hub UI & Departmental Isolation (/approvals)', () => {
    it('verifies route permissions for /approvals for purchasing roles', () => {
      expect(canAccessRoute('PURCHASING_OFFICER', '/approvals')).toBe(true);
      expect(canAccessRoute('PURCHASING_MANAGER', '/approvals')).toBe(true);
    });

    it('renders PurchasingApprovalHub for PURCHASING_MANAGER without cross-department sales discounts', async () => {
      authService.switchRole('PURCHASING_MANAGER');

      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <ApprovalsPage />
        </MemoryRouter>
      );

      // Verify Purchasing Approval Hub header
      await waitFor(() => {
        expect(screen.getByText('Purchasing Approvals & Visibility Hub')).toBeDefined();
      });

      // Verify 3 dedicated tabs
      expect(screen.getByText('Purchase Order Approvals')).toBeDefined();
      expect(screen.getByText('Supplier Payments Visibility')).toBeDefined();
      expect(screen.getByText('Approval Audit Log & History')).toBeDefined();

      // Ensure NO Sales Quotation discount (QT-2026-008) is displayed to Purchasing Manager
      expect(screen.queryByText('Discount Approval for Muthurajawela Engineering Enterprises')).toBeNull();
      expect(screen.queryByText(/Enterprise Approvals Engine/i)).toBeNull();
    });

    it('switches to Supplier Payments Visibility tab in view-only mode within the hub', async () => {
      authService.switchRole('PURCHASING_MANAGER');

      render(
        <MemoryRouter initialEntries={['/approvals?tab=supplier-payments']}>
          <ApprovalsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Supplier Disbursements')).toBeDefined();
      });

      expect(screen.getByText('Settlement Payments Recorded')).toBeDefined();
      expect(screen.getByText('Supplier Advances Tracked')).toBeDefined();
      // Ensure view-only: no recording buttons
      expect(screen.queryByText(/Post Payment/i)).toBeNull();
      expect(screen.queryByText(/Record Payment/i)).toBeNull();
    });

    it('shows two sections on Purchasing Manager PO Approval page and displays approval UI with Manager forwarding notice', async () => {
      authService.switchRole('PURCHASING_MANAGER');

      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <ApprovalsPage />
        </MemoryRouter>
      );

      // Verify the two sections exist and list their POs
      await waitFor(() => {
        expect(screen.getByText('POs Pending Purchasing Manager Approval')).toBeInTheDocument();
        expect(screen.getByText('POs Pending Manager Approval')).toBeInTheDocument();
        expect(screen.getAllByText('PO-2026-0002').length).toBeGreaterThan(0);
        expect(screen.getAllByText('PO-2026-0006').length).toBeGreaterThan(0);
      });

      // Verify badges for Stage 1 (Pending PM) and Stage 2 (Awaiting Manager)
      expect(screen.getAllByText(/Pending PM Approval/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Awaiting Manager/i).length).toBeGreaterThan(0);

      // Verify existing PO approval UI is displayed for selected PO (PO-2026-0002)
      expect(screen.getByText(/Product Lines/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Units/i)).toBeInTheDocument();
      expect(screen.getByText(/Grand Total \(LKR\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Purchased Product Line Items/i)).toBeInTheDocument();
      expect(screen.getByText('Approval Decision & Review')).toBeInTheDocument();

      // Verify it clearly mentions forwarding to the Manager (System Manager) for the next approval stage
      expect(screen.getByText(/Next Approval Stage:/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Approve & Forward to Manager \(System Manager\)/i })
      ).toBeInTheDocument();

      // Clicking on PO in Section 2 (PO-2026-0006) displays existing approval UI showing awaiting Manager
      const po6Elements = screen.getAllByText('PO-2026-0006');
      const po6Card = po6Elements[0].closest('div[class*="cursor-pointer"]');
      if (po6Card) {
        fireEvent.click(po6Card);
      }

      await waitFor(() => {
        expect(screen.getByText(/Awaiting action by MANAGER/i)).toBeInTheDocument();
      });
    });
  });
});
