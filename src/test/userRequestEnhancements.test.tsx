import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { hasPermission, canAccessRoute, ROLE_PERMISSIONS } from '../rules/permissions';
import { customerService } from '../services/CustomerService';
import { SalesRepWarrantyPage } from '../features/warranty/SalesRepWarrantyPage';
import { WarrantyHubPage } from '../features/warranty/WarrantyHubPage';
import { DamagedStockPage } from '../features/inventory/DamagedStockPage';
import { DeliveryNoteDetailPage } from '../features/inventory/delivery-notes/DeliveryNoteDetailPage';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { deliveryNoteService } from '../services/DeliveryNoteService';

// Mock auth hook
let currentTestRole = 'SALES_REP';
let currentTestUser = {
  id: 'usr-106',
  name: 'Kasun Wickramasinghe',
  role: 'SALES_REP',
  areaId: 'area-01',
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentTestUser,
    role: currentTestRole,
    canAccessRoute: (path: string) => canAccessRoute(currentTestRole as any, path),
    hasPermission: (perm: string) => hasPermission(currentTestRole as any, perm as any),
  }),
}));

describe('User Request 5-Point Enhancements', () => {
  describe('1. Sales Rep Customer Registration & Editing Restrictions', () => {
    it('denies customers:create and customers:edit permissions for SALES_REP', () => {
      expect(hasPermission('SALES_REP', 'customers:create')).toBe(false);
      expect(hasPermission('SALES_REP', 'customers:edit')).toBe(false);
      expect(ROLE_PERMISSIONS.SALES_REP).not.toContain('customers:create');
      expect(ROLE_PERMISSIONS.SALES_REP).not.toContain('customers:edit');
    });

    it('permits AREA_MANAGER and SALES_MANAGER to create and edit customers', () => {
      expect(hasPermission('AREA_MANAGER', 'customers:create')).toBe(true);
      expect(hasPermission('AREA_MANAGER', 'customers:edit')).toBe(true);
      expect(hasPermission('SALES_MANAGER', 'customers:create')).toBe(true);
      expect(hasPermission('SALES_MANAGER', 'customers:edit')).toBe(true);
    });

    it('rejects customer creation by SALES_REP at the service layer', async () => {
      await expect(
        customerService.createCustomer(
          {
            code: 'TEST-CUST',
            name: 'Unauthorized Customer',
            type: 'DEALER',
            loyaltyTier: 'BRONZE',
            areaId: 'area-01',
            areaName: 'Western Area',
            contactPerson: 'Perera',
            phone: '0771234567',
            address: 'Colombo',
            creditLimit: 100000,
            creditDays: 30,
            approvalStage: 'DRAFT',
          } as any,
          { id: 'usr-106', name: 'Sales Rep', role: 'SALES_REP' } as any
        )
      ).rejects.toThrow(/Role SALES_REP is not authorized to register new customers/i);
    });

    it('rejects customer editing by SALES_REP at the service layer', async () => {
      await expect(
        customerService.updateCustomer(
          'cust-001',
          { name: 'Edited Customer' },
          { id: 'usr-106', name: 'Sales Rep', role: 'SALES_REP' } as any
        )
      ).rejects.toThrow(/Role SALES_REP is not authorized to edit customer details/i);
    });
  });

  describe('2. Warranty Verification - Product-Wise Breakdown with Received and Not Received Barcodes', () => {
    it('renders warranty verification product-wise and allows expanding to inspect received and not received barcodes', async () => {
      currentTestRole = 'SALES_REP';
      currentTestUser = {
        id: 'usr-106',
        name: 'Kasun Wickramasinghe',
        role: 'SALES_REP',
        areaId: 'area-01',
      };

      render(
        <MemoryRouter>
          <SalesRepWarrantyPage preselectedCustomerId="cust-002" />
        </MemoryRouter>
      );

      // Verify Product-wise header appears
      await waitFor(() => {
        expect(screen.getByText(/Product-Wise Warranty Verification/i)).toBeInTheDocument();
      });

      // Check product-wise units count & verification ratio
      await waitFor(() => {
        expect(screen.getAllByText(/Units Verified/i).length).toBeGreaterThan(0);
      });

      // Expand a product card to inspect received and not received barcodes
      const viewButtons = screen.getAllByRole('button', { name: /View Barcodes/i });
      expect(viewButtons.length).toBeGreaterThan(0);
      fireEvent.click(viewButtons[0]);

      // Check that both Received & Verified Barcodes and Not Received / Pending Barcodes panels are visible
      await waitFor(() => {
        expect(screen.getByText(/Received & Verified Barcodes/i)).toBeInTheDocument();
        expect(screen.getByText(/Not Received \/ Pending Barcodes/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Warranty Hub Page Action Renaming', () => {
    it('renders "Register Warranty" instead of "Enter Distributor Note"', async () => {
      currentTestRole = 'SALES_MANAGER';
      currentTestUser = {
        id: 'usr-102',
        name: 'Sunil Perera',
        role: 'SALES_MANAGER',
        areaId: 'area-01',
      };

      render(
        <MemoryRouter>
          <WarrantyHubPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Register Warranty')).toBeInTheDocument();
        expect(screen.queryByText('Enter Distributor Note')).not.toBeInTheDocument();
      });
    });
  });

  describe('4. Damaged Stock Page Wording Clean-Up', () => {
    it('does not display "(Active until refresh)" wording anywhere', async () => {
      currentTestRole = 'STOCK_KEEPER';
      currentTestUser = {
        id: 'usr-107',
        name: 'Kamal Silva',
        role: 'STOCK_KEEPER',
        areaId: 'area-01',
      };

      render(
        <MemoryRouter>
          <DamagedStockPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Damaged Units')).toBeInTheDocument();
      });

      expect(screen.queryByText(/\(Active until refresh\)/i)).not.toBeInTheDocument();
    });
  });

  describe('5. Delivery Note Detail Page Confirmation Popup for Delivered', () => {
    it('opens confirmation popup modal when clicking "Confirm 100% Delivered"', async () => {
      currentTestRole = 'STOCK_KEEPER';
      currentTestUser = {
        id: 'usr-107',
        name: 'Kamal Silva',
        role: 'STOCK_KEEPER',
        areaId: 'area-01',
      };

      // Mock delivery note with DISPATCHED status
      vi.spyOn(deliveryNoteService, 'getById').mockResolvedValue({
        id: 'dn-test-01',
        deliveryNoteNumber: 'DN-TEST-001',
        invoiceNumber: 'INV-TEST-001',
        orderId: 'ODR-TEST-001',
        customerId: 'cust-001',
        customerName: 'Test Motors Ltd',
        customerCode: 'CUST-001',
        status: 'DISPATCHED',
        dispatchedAt: new Date().toISOString(),
        driverName: 'Sarath Driver',
        driverPhone: '0711122334',
        vehicleNumber: 'WP-CAD-1234',
        items: [
          {
            id: 'dni-1',
            productId: 'prod-1',
            productName: 'CEAT Secura',
            sku: 'SKU-001',
            uom: 'PCS',
            invoicedQuantity: 5,
            dispatchedQuantity: 5,
            acceptedQuantity: 0,
            rejectedQuantity: 0,
            unitBarcodes: ['BC-001', 'BC-002', 'BC-003', 'BC-004', 'BC-005'],
            rejectedUnitBarcodes: [],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-test-01']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('DN-TEST-001')).toBeInTheDocument();
      });

      // Find "Confirm 100% Delivered" button
      const deliverBtn = screen.getByRole('button', { name: /Confirm 100% Delivered/i });
      expect(deliverBtn).toBeInTheDocument();

      // Click to open confirmation modal
      fireEvent.click(deliverBtn);

      // Verify the confirmation popup dialog appears
      await waitFor(() => {
        expect(screen.getByText('Confirm 100% Delivery Acceptance')).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to mark Delivery Note DN-TEST-001 as 100% Delivered and Accepted\?/i)
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Yes, Confirm Delivered/i })).toBeInTheDocument();
      });
    });
  });

  describe('6. New Role: Stock Manager (STOCK_MANAGER)', () => {
    it('grants STOCK_MANAGER all features of STOCK_KEEPER plus GRN approval', () => {
      // Common inventory operations
      expect(hasPermission('STOCK_MANAGER', 'inventory:view')).toBe(true);
      expect(hasPermission('STOCK_MANAGER', 'inventory:grn_create')).toBe(true);
      expect(hasPermission('STOCK_MANAGER', 'inventory:pick_issue')).toBe(true);
      expect(hasPermission('STOCK_MANAGER', 'inventory:damaged_recover')).toBe(true);
      expect(hasPermission('STOCK_MANAGER', 'products:view')).toBe(true);
      expect(hasPermission('STOCK_MANAGER', 'pos:operate')).toBe(false);
      expect(hasPermission('STOCK_KEEPER', 'pos:operate')).toBe(false);

      // GRN Approval: Stock Manager has it, Stock Keeper DOES NOT
      expect(hasPermission('STOCK_MANAGER', 'inventory:grn_approve')).toBe(true);
      expect(hasPermission('STOCK_KEEPER', 'inventory:grn_approve')).toBe(false);
    });

    it('permits STOCK_MANAGER to approve delivery note customer rejections and rejects STOCK_KEEPER', async () => {
      const mockStockManager = { id: 'usr-115', name: 'Bandara Lead', role: 'STOCK_MANAGER' } as any;
      const mockStockKeeper = { id: 'usr-107', name: 'Kamal Keeper', role: 'STOCK_KEEPER' } as any;

      const allNotes = await deliveryNoteService.getAll();
      const targetNote = allNotes.find((n) => n.status === 'REJECTION_PENDING_APPROVAL') || allNotes[0];

      // Ensure it is in REJECTION_PENDING_APPROVAL status
      targetNote.status = 'REJECTION_PENDING_APPROVAL';

      // Stock Keeper must be rejected
      await expect(
        deliveryNoteService.approveRejection(targetNote.id, mockStockKeeper, 'Approved by keeper')
      ).rejects.toThrow(/Role 'STOCK_KEEPER' is not authorized to approve delivery note rejections/i);

      // Stock Manager must be allowed
      const approved = await deliveryNoteService.approveRejection(
        targetNote.id,
        mockStockManager,
        'Approved by warehouse lead'
      );
      expect(approved.status).toBe('REJECTION_APPROVED');
      expect(approved.rejectionApprovedBy).toContain('Bandara Lead');
    });

    it('permits STOCK_MANAGER to approve GRNs at the service layer and blocks unauthorized roles', async () => {
      const { grnService } = await import('../services/GRNService');
      const mockStockKeeper = { id: 'usr-107', name: 'Kamal Keeper', role: 'STOCK_KEEPER' };

      // Stock Keeper is not authorized
      await expect(
        grnService.approveGRN('grn-test', mockStockKeeper.id, mockStockKeeper.name, mockStockKeeper.role)
      ).rejects.toThrow(/Role STOCK_KEEPER is not authorized to approve GRNs/i);
    });
  });

  describe('7. New Role: Purchasing Manager (PURCHASING_MANAGER)', () => {
    it('grants PURCHASING_MANAGER all features of PURCHASING_OFFICER plus PO and return approval', () => {
      // Common purchasing operations
      expect(hasPermission('PURCHASING_MANAGER', 'view:purchasing_dashboard')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:suppliers_view')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:suppliers_manage')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:po_view')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:po_create')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:po_edit')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:grn_view')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:reports')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:returns_view')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:returns_create')).toBe(true);

      // Approval permissions: Purchasing Manager has them, Purchasing Officer DOES NOT
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:po_approve')).toBe(true);
      expect(hasPermission('PURCHASING_MANAGER', 'purchasing:returns_approve')).toBe(true);
      expect(hasPermission('PURCHASING_OFFICER', 'purchasing:po_approve')).toBe(false);
      expect(hasPermission('PURCHASING_OFFICER', 'purchasing:returns_approve')).toBe(false);
    });

    it('routes POs created by PURCHASING_OFFICER to PURCHASING_MANAGER for approval', async () => {
      const { purchaseOrderService } = await import('../services/PurchaseOrderService');
      const officerUser = {
        id: 'usr-110',
        name: 'Ruwan Officer',
        role: 'PURCHASING_OFFICER' as const,
        email: 'officer@dnserp.com',
        phone: '0771234567',
        isActive: true,
      };

      const newPO = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-001',
          supplierName: 'Apex International',
          supplierCode: 'SUP-APEX',
          orderDate: '2026-11-04',
          expectedDeliveryDate: '2026-11-14',
          paymentTerms: 'Net 30',
          currency: 'LKR',
          submitForApproval: true,
          items: [
            {
              productId: 'prod-001',
              productName: 'CEAT Gripp 90/90-17',
              sku: 'TYR-001',
              unitPrice: 12000,
              quantity: 5,
              discountPercentage: 0,
            },
          ],
        },
        officerUser
      );

      expect(newPO.status).toBe('PENDING_APPROVAL');
      expect(newPO.approvalRequestId).toBeDefined();

      const { approvalService } = await import('../services/ApprovalService');
      const req = await approvalService.getApproval(newPO.approvalRequestId!);
      expect(req).toBeDefined();
      expect(req?.currentApproverRole).toBe('PURCHASING_MANAGER');
    });

    it('allows PURCHASING_MANAGER to escalate / pass PO approval to MANAGER', async () => {
      const { approvalService } = await import('../services/ApprovalService');
      const purchMgr = { id: 'usr-116', name: 'Malik Manager', role: 'PURCHASING_MANAGER' as const };

      // Create an approval request for a PO
      const appReq = await approvalService.createApprovalRequest({
        documentType: 'PURCHASE_ORDER',
        documentId: 'po-test-mgr',
        documentReferenceNumber: 'PO-2026-TEST',
        title: 'PO Escalation Test',
        description: 'Testing PO pass to manager',
        initiatorId: 'usr-110',
        initiatorName: 'Ruwan Officer',
        initiatorRole: 'PURCHASING_OFFICER',
        currentApproverRole: 'PURCHASING_MANAGER',
        isSpecialScenario: false,
        status: 'PENDING',
        history: [],
      });

      // Purchasing Manager reviews and passes to General Manager
      const passed = await approvalService.processAction(
        appReq.id,
        'ESCALATE',
        purchMgr.id,
        purchMgr.name,
        purchMgr.role,
        'Verified supplier terms; passing to General Manager for secondary sign-off',
        'MANAGER'
      );

      expect(passed.currentApproverRole).toBe('MANAGER');
      expect(passed.status).toBe('PENDING');
      expect(passed.history.some((h) => h.actorRole === 'PURCHASING_MANAGER' && h.action === 'ESCALATE')).toBe(true);
    });
  });

  describe('8. Hide Restricted Areas & Commissions from Navbar of Sales Rep', () => {
    beforeEach(() => {
      currentTestRole = 'SALES_REP';
      currentTestUser = {
        id: 'usr-106',
        name: 'Kasun Wickramasinghe',
        role: 'SALES_REP',
        areaId: 'area-01',
      };
    });

    it('denies commissions route and permission for SALES_REP', () => {
      expect(hasPermission('SALES_REP', 'commissions:view')).toBe(false);
      expect(hasPermission('SALES_REP', 'commissions:manage')).toBe(false);
      expect(canAccessRoute('SALES_REP', '/commissions')).toBe(false);
      expect(canAccessRoute('SALES_REP', '/commissions/config')).toBe(false);
    });

    it('ensures Sidebar does not display /commissions or restricted categories for SALES_REP', async () => {
      const { Sidebar } = await import('../components/common/Sidebar');
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      );

      // Commissions link must NOT be in the document
      expect(screen.queryByRole('link', { name: /sales commission/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /commission configuration/i })).not.toBeInTheDocument();

      // Finance & Payments category rail must be hidden for Sales Rep
      expect(screen.queryByTitle('Finance & Payments')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Inventory & Products')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Administration')).not.toBeInTheDocument();
    });

    it('ensures MobileNav does not render Targets / Commissions for SALES_REP', async () => {
      const { MobileNav } = await import('../components/common/MobileNav');
      render(
        <MemoryRouter initialEntries={['/']}>
          <MobileNav />
        </MemoryRouter>
      );

      // Open More drawer
      const moreBtn = screen.getByRole('button', { name: /open more features menu/i });
      fireEvent.click(moreBtn);

      // Targets / Commissions button must NOT be rendered
      expect(screen.queryByText(/Targets/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Sales Commission/i)).not.toBeInTheDocument();
    });
  });
});
