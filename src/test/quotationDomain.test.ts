import { describe, it, expect, beforeEach } from 'vitest';
import { QuotationService } from '../services/QuotationService';
import { MockQuotationRepository } from '../repositories/mock/MockQuotationRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { MockApprovalRepository } from '../repositories/mock/MockApprovalRepository';
import { ProductService } from '../services/ProductService';
import { CustomerService } from '../services/CustomerService';
import { ApprovalService } from '../services/ApprovalService';
import { User } from '../types/auth';

describe('Phase 4 — Quotation Domain & Sales Foundation', () => {
  let quotationRepo: MockQuotationRepository;
  let productRepo: MockProductRepository;
  let customerRepo: MockCustomerRepository;
  let approvalRepo: MockApprovalRepository;

  let productSvc: ProductService;
  let customerSvc: CustomerService;
  let approvalSvc: ApprovalService;
  let quotationSvc: QuotationService;

  const mockSalesRepUser: User = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    email: 'rep.colombo@dnserp.com',
    role: 'SALES_REP',
    areaId: 'area-01',
    areaName: 'Western Province Central',
    isActive: true,
  };

  const mockSalesManagerUser: User = {
    id: 'usr-103',
    name: 'Kamal Perera',
    email: 'sales.manager@dnserp.com',
    role: 'SALES_MANAGER',
    isActive: true,
  };

  const mockDirectorUser: User = {
    id: 'usr-101',
    name: 'Saman Jayasuriya',
    email: 'director@dnserp.com',
    role: 'DIRECTOR',
    isActive: true,
  };

  beforeEach(() => {
    productRepo = new MockProductRepository();
    customerRepo = new MockCustomerRepository();
    approvalRepo = new MockApprovalRepository();
    quotationRepo = new MockQuotationRepository();

    productSvc = new ProductService(productRepo);
    customerSvc = new CustomerService(customerRepo, approvalSvc);
    approvalSvc = new ApprovalService(approvalRepo);
    quotationSvc = new QuotationService(quotationRepo, productSvc, customerSvc, approvalSvc);
  });

  describe('1. Quotation Creation & Discount Evaluation Gating', () => {
    it('directly approves quotation when requested discount is within sales rep authority limit (5%)', async () => {
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            {
              productId: 'prod-001', // Selling price: 3250
              quantity: 10,
              requestedDiscountPercentage: 4, // 4% <= 5% rep limit
            },
          ],
        },
        mockSalesRepUser
      );

      expect(quotation.id).toBeDefined();
      expect(quotation.status).toBe('APPROVED');
      expect(quotation.requiresApproval).toBe(false);
      expect(quotation.items).toHaveLength(1);
      expect(quotation.items[0].discountPercentage).toBe(4);
      expect(quotation.items[0].requiresApproval).toBe(false);

      // Verify subtotal, discount, tax, total
      // Subtotal = 3250 * 10 = 32500
      // Discount = 32500 * 0.04 = 1300
      // Net = 31200
      // VAT (18%) = 31200 * 0.18 = 5616
      // Total = 36816
      expect(quotation.subtotal).toBe(32500);
      expect(quotation.discountAmount).toBe(1300);
      expect(quotation.taxAmount).toBe(5616);
      expect(quotation.totalAmount).toBe(36816);
    });

    it('flags PENDING_APPROVAL and routes to Sales Manager when discount exceeds rep authority limit (5%)', async () => {
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            {
              productId: 'prod-001',
              quantity: 10,
              requestedDiscountPercentage: 8, // 8% > 5% rep limit, within customer 12% and product 12%
            },
          ],
        },
        mockSalesRepUser
      );

      expect(quotation.status).toBe('PENDING_APPROVAL');
      expect(quotation.requiresApproval).toBe(true);
      expect(quotation.approvalRequestId).toBeDefined();
      expect(quotation.approvalReason).toContain('exceeds standard limit');

      // Verify approval request was created in approval repo
      const approvalReq = await approvalSvc.getApproval(quotation.approvalRequestId!);
      expect(approvalReq).not.toBeNull();
      expect(approvalReq?.documentType).toBe('QUOTATION_DISCOUNT');
      expect(approvalReq?.documentId).toBe(quotation.id);
      expect(approvalReq?.currentApproverRole).toBe('SALES_MANAGER');
      expect(approvalReq?.status).toBe('PENDING');
    });

    it('saves as DRAFT when requested by user even with standard or excess discount', async () => {
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            {
              productId: 'prod-001',
              quantity: 5,
              requestedDiscountPercentage: 8,
            },
          ],
          saveAsDraft: true,
        },
        mockSalesRepUser
      );

      expect(quotation.status).toBe('DRAFT');
      expect(quotation.requiresApproval).toBe(true);
      // Not yet submitted to approval engine in DRAFT
      expect(quotation.approvalRequestId).toBeUndefined();
    });

    it('rejects invalid discount percentages', async () => {
      await expect(
        quotationSvc.createQuotation(
          {
            customerId: 'cust-001',
            salesRepId: mockSalesRepUser.id,
            items: [
              {
                productId: 'prod-001',
                quantity: 1,
                requestedDiscountPercentage: -5,
              },
            ],
          },
          mockSalesRepUser
        )
      ).rejects.toThrow('cannot be negative');
    });

    it('rejects zero or negative quantities', async () => {
      await expect(
        quotationSvc.createQuotation(
          {
            customerId: 'cust-001',
            salesRepId: mockSalesRepUser.id,
            items: [
              {
                productId: 'prod-001',
                quantity: 0,
                requestedDiscountPercentage: 0,
              },
            ],
          },
          mockSalesRepUser
        )
      ).rejects.toThrow('Quantity must be greater than zero');
    });
  });

  describe('2. Territory & Role Scoping', () => {
    it('prevents Sales Rep from creating quotation for customer outside their assigned portfolio', async () => {
      const otherRepCustomer = await customerSvc.createCustomer({
        code: 'DLR-GAL-099',
        name: 'Southern Marine Supplies',
        type: 'DEALER',
        areaId: 'area-02',
        areaName: 'Southern Province',
        assignedRepId: 'usr-108',
        assignedRepName: 'Nuwan Pradeep',
        contactPerson: 'Mr. Nuwan',
        phone: '+94 91 224 5566',
        email: 'info@southernmarine.lk',
        address: '52 Matara Road, Galle',
        commercialTerms: {
          creditLimit: 1000000,
          creditDays: 30,
          defaultDiscountPercentage: 5,
          maxDiscountPercentage: 10,
        },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
        loyaltyTier: 'SILVER',
        warrantyNotesExpected: 10,
        warrantyNotesReceived: 10,
      });

      await expect(
        quotationSvc.createQuotation(
          {
            customerId: otherRepCustomer.id,
            salesRepId: mockSalesRepUser.id,
            items: [
              {
                productId: 'prod-001',
                quantity: 5,
                requestedDiscountPercentage: 2,
              },
            ],
          },
          mockSalesRepUser
        )
      ).rejects.toThrow('Permission Denied: Customer Southern Marine Supplies');
    });

    it('filters quotation list to only rep quotations when viewed by SALES_REP', async () => {
      const res = await quotationSvc.listQuotations(
        { page: 1, pageSize: 20 },
        { userId: mockSalesRepUser.id, role: 'SALES_REP' }
      );

      expect(res.data.every((q) => q.salesRepId === mockSalesRepUser.id)).toBe(true);
    });

    it('provides full visibility to Sales Manager and Director', async () => {
      const res = await quotationSvc.listQuotations(
        { page: 1, pageSize: 20 },
        { userId: mockSalesManagerUser.id, role: 'SALES_MANAGER' }
      );

      // MOCK_QUOTATIONS contains quotations from multiple reps (usr-106, usr-108)
      expect(res.data.length).toBeGreaterThan(0);
      const repIds = new Set(res.data.map((q) => q.salesRepId));
      expect(repIds.size).toBeGreaterThan(1);
    });
  });

  describe('3. Approval Workflow & State Transitions', () => {
    it('transitions quotation from PENDING_APPROVAL to APPROVED when Sales Manager approves', async () => {
      // Create pending quotation
      const pendingQuotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            {
              productId: 'prod-001',
              quantity: 20,
              requestedDiscountPercentage: 9, // requires approval
            },
          ],
        },
        mockSalesRepUser
      );

      expect(pendingQuotation.status).toBe('PENDING_APPROVAL');

      // Sales Manager approves
      const approved = await quotationSvc.approveQuotation(
        pendingQuotation.id,
        mockSalesManagerUser,
        'Special project discount authorized by Sales Manager.'
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedById).toBe(mockSalesManagerUser.id);
      expect(approved.approvedByName).toBe(mockSalesManagerUser.name);
      expect(approved.approvedAt).toBeDefined();
    });

    it('transitions quotation to REJECTED when rejected with reason', async () => {
      const pendingQuotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            {
              productId: 'prod-001',
              quantity: 20,
              requestedDiscountPercentage: 9,
            },
          ],
        },
        mockSalesRepUser
      );

      const rejected = await quotationSvc.rejectQuotation(
        pendingQuotation.id,
        mockSalesManagerUser,
        'Margin insufficient for this volume.'
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.rejectionReason).toBe('Margin insufficient for this volume.');
      expect(rejected.rejectedById).toBe(mockSalesManagerUser.id);
    });

    it('prevents non-manager roles from approving quotations', async () => {
      const pendingQuotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            {
              productId: 'prod-001',
              quantity: 20,
              requestedDiscountPercentage: 9,
            },
          ],
        },
        mockSalesRepUser
      );

      await expect(
        quotationSvc.approveQuotation(pendingQuotation.id, mockSalesRepUser, 'Self approval attempt')
      ).rejects.toThrow('Role SALES_REP is not authorized');
    });
  });

  describe('4. Historical Snapshot Immutability (Master Data Architecture)', () => {
    it('preserves immutable price snapshot on quotation even when Product Master price is updated', async () => {
      const product = await productSvc.getProduct('prod-001');
      expect(product).not.toBeNull();
      const originalPrice = product!.pricing.currentSellingPrice;

      // 1. Create Quotation with snapshot
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            {
              productId: product!.id,
              quantity: 10,
              requestedDiscountPercentage: 0,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(quotation.items[0].unitPriceSnapshot).toBe(originalPrice);
      expect(quotation.items[0].lineTotal).toBe(
        originalPrice * 10 + (originalPrice * 10 * 0.18)
      );

      // 2. Mutate Product Master selling price (+500 LKR)
      await productSvc.updateProduct(product!.id, {
        pricing: {
          ...product!.pricing,
          currentSellingPrice: originalPrice + 500,
        },
      });

      // 3. Verify Product Master has new price
      const updatedProduct = await productSvc.getProduct(product!.id);
      expect(updatedProduct?.pricing.currentSellingPrice).toBe(originalPrice + 500);

      // 4. Retrieve original quotation and verify price snapshot is unchanged
      const retrievedQuotation = await quotationSvc.getQuotationById(quotation.id);
      expect(retrievedQuotation?.items[0].unitPriceSnapshot).toBe(originalPrice);
      expect(retrievedQuotation?.totalAmount).toBe(quotation.totalAmount);
    });
  });

  describe('5. Quotation to Sales Order Conversion Flow', () => {
    it('converts APPROVED quotation to Sales Order, preserving quotationId and item snapshots', async () => {
      // Create approved quotation
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            {
              productId: 'prod-001',
              quantity: 15,
              requestedDiscountPercentage: 4,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(quotation.status).toBe('APPROVED');

      // Convert to Sales Order
      const convertedOrder = await quotationSvc.convertToSalesOrder(
        quotation.id,
        mockSalesRepUser,
        {
          deliveryAddress: 'Main Warehouse, 48 Bloemendhal Road, Colombo 13',
          deliveryDate: '2026-10-05',
          customerPoNumber: 'PO-89472',
        }
      );

      // Verify converted order payload
      expect(convertedOrder.quotationId).toBe(quotation.id);
      expect(convertedOrder.quotationNumber).toBe(quotation.quotationNumber);
      expect(convertedOrder.orderNumber).toMatch(/^(ODR-[A-Z]{2}-[A-Z]{2}-\d{4}|SO-DLR-COL-001-\d+)$/);
      expect(convertedOrder.totalAmount).toBe(quotation.totalAmount);
      expect(convertedOrder.items).toHaveLength(quotation.items.length);
      expect(convertedOrder.items[0].unitPriceSnapshot).toBe(quotation.items[0].unitPriceSnapshot);
      expect(convertedOrder.deliveryAddress).toBe('Main Warehouse, 48 Bloemendhal Road, Colombo 13');
      expect(convertedOrder.customerPoNumber).toBe('PO-89472');

      // Verify quotation status in repo is CONVERTED
      const updatedQuotation = await quotationSvc.getQuotationById(quotation.id);
      expect(updatedQuotation?.status).toBe('CONVERTED');
      expect(updatedQuotation?.convertedOrderNumber).toBe(convertedOrder.orderNumber);
      expect(updatedQuotation?.convertedAt).toBeDefined();
    });

    it('rejects conversion of unapproved or rejected quotation', async () => {
      // Create draft quotation
      const draft = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 2 }],
          saveAsDraft: true,
        },
        mockSalesRepUser
      );

      await expect(
        quotationSvc.convertToSalesOrder(draft.id, mockSalesRepUser)
      ).rejects.toThrow("Quotation status is 'DRAFT', must be 'APPROVED'");
    });

    it('rejects conversion of already converted quotation (idempotency & state lock)', async () => {
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 5, requestedDiscountPercentage: 2 }],
        },
        mockSalesRepUser
      );

      // First conversion succeeds
      await quotationSvc.convertToSalesOrder(quotation.id, mockSalesRepUser);

      // Second conversion must be rejected
      await expect(
        quotationSvc.convertToSalesOrder(quotation.id, mockSalesRepUser)
      ).rejects.toThrow("Quotation status is 'CONVERTED', must be 'APPROVED'");
    });

    it('rejects conversion of expired approved quotation and marks it EXPIRED', async () => {
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 5, requestedDiscountPercentage: 2 }],
          validUntil: '2020-01-01', // Expired
        },
        mockSalesRepUser
      );

      await expect(
        quotationSvc.convertToSalesOrder(quotation.id, mockSalesRepUser)
      ).rejects.toThrow('Quotation expired on 2020-01-01');

      // Verify repo status was updated to EXPIRED
      const updated = await quotationSvc.getQuotationById(quotation.id);
      expect(updated?.status).toBe('EXPIRED');
    });

    it('prevents sales rep from converting quotations outside their assigned territory', async () => {
      // Created by Kasun (usr-106)
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 2, requestedDiscountPercentage: 3 }],
        },
        mockSalesRepUser
      );

      const otherRep: User = {
        id: 'usr-108',
        name: 'Nuwan Pradeep',
        email: 'nuwan@dnserp.com',
        role: 'SALES_REP',
        isActive: true,
      };

      await expect(
        quotationSvc.convertToSalesOrder(quotation.id, otherRep)
      ).rejects.toThrow('Permission Denied: You can only convert quotations assigned to your territory.');
    });

    it('marks entire quotation PENDING_APPROVAL when only one item out of several has excess discount', async () => {
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            { productId: 'prod-001', quantity: 10, requestedDiscountPercentage: 2 }, // Standard (<= 5%)
            { productId: 'prod-004', quantity: 5, requestedDiscountPercentage: 8 },  // Excess (> 5%)
            { productId: 'prod-003', quantity: 20, requestedDiscountPercentage: 0 }, // None
          ],
        },
        mockSalesRepUser
      );

      expect(quotation.status).toBe('PENDING_APPROVAL');
      expect(quotation.requiresApproval).toBe(true);
      expect(quotation.items[0].requiresApproval).toBe(false);
      expect(quotation.items[1].requiresApproval).toBe(true);
      expect(quotation.items[2].requiresApproval).toBe(false);
      expect(quotation.approvalRequestId).toBeDefined();
    });

    it('allows sales rep to directly issue a standard draft quotation via issueQuotation', async () => {
      const draft = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 4, requestedDiscountPercentage: 3 }],
          saveAsDraft: true,
        },
        mockSalesRepUser
      );

      expect(draft.status).toBe('DRAFT');
      expect(draft.requiresApproval).toBe(false);

      const issued = await quotationSvc.issueQuotation(draft.id, mockSalesRepUser);
      expect(issued.status).toBe('APPROVED');
      expect(issued.approvedById).toBe(mockSalesRepUser.id);
    });

    it('blocks sales rep from directly issuing a draft quotation that requires special approval', async () => {
      const draft = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [{ productId: 'prod-001', quantity: 4, requestedDiscountPercentage: 9 }],
          saveAsDraft: true,
        },
        mockSalesRepUser
      );

      expect(draft.status).toBe('DRAFT');
      expect(draft.requiresApproval).toBe(true);

      await expect(
        quotationSvc.issueQuotation(draft.id, mockSalesRepUser)
      ).rejects.toThrow('Manager approval is required');
    });
  });
});
