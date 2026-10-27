import { describe, it, expect, beforeEach } from 'vitest';
import { hasPermission, canAccessRoute, ROLE_PERMISSIONS } from '../rules/permissions';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import { approvalService } from '../services/ApprovalService';
import { mockPurchaseOrderRepository } from '../repositories/mock/MockPurchaseOrderRepository';
import { User } from '../types/auth';

const mockPurchasingOfficer: User = {
  id: 'usr-110',
  name: 'Ruwan Wickramasinghe',
  email: 'purchasing@dnserp.com',
  role: 'PURCHASING_OFFICER',
  phone: '+94 77 987 6543',
  isActive: true,
};

const mockManager: User = {
  id: 'usr-102',
  name: 'Ruwan Wijesinghe',
  email: 'manager@dnserp.com',
  role: 'MANAGER',
  phone: '+94 77 234 5678',
  isActive: true,
};

const mockDirector: User = {
  id: 'usr-101',
  name: 'Saman Jayasuriya',
  email: 'director@dnserp.com',
  role: 'DIRECTOR',
  phone: '+94 77 123 4567',
  isActive: true,
};

describe('Purchasing Officer Role & Workflow Test Suite', () => {
  beforeEach(() => {
    mockPurchaseOrderRepository.reset();
  });

  describe('1. Role-Based Access Control (RBAC) & Boundary Enforcement', () => {
    it('grants required purchasing permissions to PURCHASING_OFFICER', () => {
      expect(hasPermission('PURCHASING_OFFICER', 'view:purchasing_dashboard')).toBe(true);
      expect(hasPermission('PURCHASING_OFFICER', 'purchasing:suppliers_view')).toBe(true);
      expect(hasPermission('PURCHASING_OFFICER', 'purchasing:suppliers_manage')).toBe(true);
      expect(hasPermission('PURCHASING_OFFICER', 'purchasing:po_view')).toBe(true);
      expect(hasPermission('PURCHASING_OFFICER', 'purchasing:po_create')).toBe(true);
      expect(hasPermission('PURCHASING_OFFICER', 'purchasing:po_edit')).toBe(true);
      expect(hasPermission('PURCHASING_OFFICER', 'purchasing:grn_view')).toBe(true);
      expect(hasPermission('PURCHASING_OFFICER', 'purchasing:reports')).toBe(true);
      expect(hasPermission('PURCHASING_OFFICER', 'products:view')).toBe(true);
    });

    it('strictly forbids PURCHASING_OFFICER from creating or approving GRNs', () => {
      expect(hasPermission('PURCHASING_OFFICER', 'inventory:grn_create')).toBe(false);
      expect(hasPermission('PURCHASING_OFFICER', 'inventory:grn_approve')).toBe(false);
      expect(hasPermission('PURCHASING_OFFICER', 'inventory:pick_issue')).toBe(false);
    });

    it('strictly forbids PURCHASING_OFFICER from unauthorized modules (Finance, Sales, POS, Customers)', () => {
      expect(hasPermission('PURCHASING_OFFICER', 'finance:expenses')).toBe(false);
      expect(hasPermission('PURCHASING_OFFICER', 'finance:petty_cash')).toBe(false);
      expect(hasPermission('PURCHASING_OFFICER', 'finance:reports')).toBe(false);
      expect(hasPermission('PURCHASING_OFFICER', 'pos:operate')).toBe(false);
      expect(hasPermission('PURCHASING_OFFICER', 'orders:create')).toBe(false);
      expect(hasPermission('PURCHASING_OFFICER', 'quotations:create')).toBe(false);
      expect(hasPermission('PURCHASING_OFFICER', 'customers:create')).toBe(false);
    });

    it('verifies route access rules for /purchasing subroutes', () => {
      expect(canAccessRoute('PURCHASING_OFFICER', '/purchasing')).toBe(true);
      expect(canAccessRoute('PURCHASING_OFFICER', '/purchasing/dashboard')).toBe(true);
      expect(canAccessRoute('PURCHASING_OFFICER', '/purchasing/suppliers')).toBe(true);
      expect(canAccessRoute('PURCHASING_OFFICER', '/purchasing/orders')).toBe(true);
      expect(canAccessRoute('PURCHASING_OFFICER', '/purchasing/orders/new')).toBe(true);
      expect(canAccessRoute('PURCHASING_OFFICER', '/purchasing/grn')).toBe(true);
      expect(canAccessRoute('PURCHASING_OFFICER', '/purchasing/reports')).toBe(true);
      expect(canAccessRoute('PURCHASING_OFFICER', '/purchasing/returns')).toBe(true);

      // Blocked routes
      expect(canAccessRoute('PURCHASING_OFFICER', '/finance')).toBe(false);
      expect(canAccessRoute('PURCHASING_OFFICER', '/pos')).toBe(false);
      expect(canAccessRoute('PURCHASING_OFFICER', '/settings')).toBe(false);
      expect(canAccessRoute('PURCHASING_OFFICER', '/teams')).toBe(false);
    });

    it('allows DIRECTOR and MANAGER to access purchasing routes', () => {
      expect(canAccessRoute('DIRECTOR', '/purchasing')).toBe(true);
      expect(canAccessRoute('MANAGER', '/purchasing')).toBe(true);
    });

    it('blocks other non-procurement roles from /purchasing routes', () => {
      expect(canAccessRoute('SALES_REP', '/purchasing')).toBe(false);
      expect(canAccessRoute('CASHIER', '/purchasing')).toBe(false);
      expect(canAccessRoute('STOCK_KEEPER', '/purchasing')).toBe(false);
    });
  });

  describe('2. Purchase Order Financial Calculations', () => {
    it('accurately calculates line discounts, taxes, and grand totals', () => {
      const items = [
        {
          productId: 'prod-001',
          productCode: 'SWG-MCB-16A',
          productName: 'Schneider 16A MCB',
          quantity: 10,
          unitPrice: 2000, // 20,000 raw
          discountPercent: 10, // 2,000 discount -> 18,000 net
          taxRate: 18, // 18% of 18,000 = 3,240 tax -> line total = 21,240
        },
        {
          productId: 'prod-002',
          productCode: 'SWG-MCCB-100A',
          productName: 'ABB MCCB 100A',
          quantity: 2,
          unitPrice: 5000, // 10,000 raw
          discountPercent: 0, // 0 discount -> 10,000 net
          taxRate: 18, // 1,800 tax -> line total = 11,800
        },
      ];

      const calculation = purchaseOrderService.calculateTotals(items, 1500, 500);

      expect(calculation.subtotal).toBe(30000);
      expect(calculation.totalDiscount).toBe(2000);
      expect(calculation.taxTotal).toBe(5040); // 3240 + 1800
      expect(calculation.shippingCharges).toBe(1500);
      expect(calculation.otherCharges).toBe(500);
      // Net = 28,000 + 5040 tax + 1500 shipping + 500 other = 35,040
      expect(calculation.grandTotal).toBe(35040);
    });
  });

  describe('3. Purchase Order Lifecycle & Internal Approval Workflow', () => {
    it('creates a PO as DRAFT when submitForApproval is false', async () => {
      const newPO = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-05',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-001',
              productCode: 'SWG-MCB-16A',
              productName: 'Schneider 16A MCB',
              quantity: 20,
              unitPrice: 2200,
              discountPercent: 5,
              taxRate: 18,
            },
          ],
          submitForApproval: false,
        },
        mockPurchasingOfficer
      );

      expect(newPO.id).toBeDefined();
      expect(newPO.status).toBe('DRAFT');
      expect(newPO.approvalRequestId).toBeUndefined();
    });

    it('creates a PO and automatically submits for approval when flag is true', async () => {
      const newPO = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-05',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-001',
              productCode: 'SWG-MCB-16A',
              productName: 'Schneider 16A MCB',
              quantity: 10,
              unitPrice: 2000,
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      expect(newPO.status).toBe('PENDING_APPROVAL');
      expect(newPO.approvalRequestId).toBeDefined();

      const approvalReq = await approvalService.getApproval(newPO.approvalRequestId!);
      expect(approvalReq).not.toBeNull();
      expect(approvalReq?.documentType).toBe('PURCHASE_ORDER');
      expect(approvalReq?.currentApproverRole).toBe('MANAGER');
    });

    it('submits an existing DRAFT PO for approval', async () => {
      // Create draft
      const draftPO = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-05',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-001',
              productCode: 'SWG-MCB-16A',
              productName: 'Schneider 16A MCB',
              quantity: 5,
              unitPrice: 2200,
              taxRate: 18,
            },
          ],
          submitForApproval: false,
        },
        mockPurchasingOfficer
      );

      expect(draftPO.status).toBe('DRAFT');

      // Submit
      const submitted = await purchaseOrderService.submitForApproval(draftPO.id, mockPurchasingOfficer);
      expect(submitted.status).toBe('PENDING_APPROVAL');
      expect(submitted.approvalRequestId).toBeDefined();
    });

    it('handles Manager approval and updates PO status to APPROVED', async () => {
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-05',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-001',
              productCode: 'SWG-MCB-16A',
              productName: 'Schneider 16A MCB',
              quantity: 10,
              unitPrice: 2000,
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      // Manager approves
      await approvalService.processAction(
        po.approvalRequestId!,
        'APPROVE',
        mockManager.id,
        mockManager.name,
        mockManager.role,
        'Authorized for replenishment.'
      );

      const updatedPO = await purchaseOrderService.getById(po.id);
      expect(updatedPO?.status).toBe('APPROVED');
      expect(updatedPO?.approvedByName).toContain('Ruwan Wijesinghe');

      // Can now mark as sent to supplier
      const sentPO = await purchaseOrderService.markAsSentToSupplier(po.id, mockPurchasingOfficer);
      expect(sentPO.status).toBe('SENT_TO_SUPPLIER');
      expect(sentPO.sentAt).toBeDefined();
    });

    it('handles Manager rejection and records rejection reason', async () => {
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-2',
          supplierName: 'Apex International',
          supplierCode: 'SUP-002',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-05',
          paymentTerms: 'Net 15',
          items: [
            {
              productId: 'prod-003',
              productCode: 'AUT-VFD-7.5KW',
              productName: 'Siemens V20 VFD',
              quantity: 2,
              unitPrice: 25000, // excessive price
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      // Manager rejects
      await approvalService.processAction(
        po.approvalRequestId!,
        'REJECT',
        mockManager.id,
        mockManager.name,
        mockManager.role,
        'Unit price exceeds contracted catalogue rate. Please renegotiate.'
      );

      const updatedPO = await purchaseOrderService.getById(po.id);
      expect(updatedPO?.status).toBe('REJECTED');
      expect(updatedPO?.rejectionReason).toContain('Unit price exceeds');
    });

    it('requires DIRECTOR approval when grand total exceeds LKR 500,000 threshold', async () => {
      const highValuePO = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'DNS Global Logistics',
          supplierCode: 'SUP-001',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-15',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-009',
              productCode: 'CBL-CU-4C-16',
              productName: 'Heavy Armoured Cable',
              quantity: 500,
              unitPrice: 1500, // 750,000 raw value
              taxRate: 18,
            },
          ],
          submitForApproval: true,
        },
        mockPurchasingOfficer
      );

      expect(highValuePO.grandTotal).toBeGreaterThan(500000);
      const req = await approvalService.getApproval(highValuePO.approvalRequestId!);
      expect(req?.currentApproverRole).toBe('DIRECTOR');
      expect(req?.isSpecialScenario).toBe(true);
    });
  });

  describe('4. Purchase Order Filters & Reporting', () => {
    it('correctly filters purchase orders by status, supplier, and search', async () => {
      const all = await purchaseOrderService.getAll();
      expect(all.length).toBeGreaterThan(0);

      const drafts = await purchaseOrderService.getAll({ status: 'DRAFT' });
      for (const d of drafts) {
        expect(d.status).toBe('DRAFT');
      }

      const apexOrders = await purchaseOrderService.getAll({ supplierId: 'sup-2' });
      for (const po of apexOrders) {
        expect(po.supplierId).toBe('sup-2');
      }

      const searchOrders = await purchaseOrderService.getAll({ search: 'PO-2026-0001' });
      expect(searchOrders.length).toBe(1);
      expect(searchOrders[0].poNumber).toBe('PO-2026-0001');
    });
  });
});
