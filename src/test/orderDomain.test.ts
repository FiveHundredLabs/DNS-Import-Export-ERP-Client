import { describe, it, expect, beforeEach } from 'vitest';
import { OrderService } from '../services/OrderService';
import { MockSalesOrderRepository } from '../repositories/mock/MockSalesOrderRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { MockApprovalRepository } from '../repositories/mock/MockApprovalRepository';
import { MockQuotationRepository } from '../repositories/mock/MockQuotationRepository';
import { ProductService } from '../services/ProductService';
import { CustomerService } from '../services/CustomerService';
import { ApprovalService } from '../services/ApprovalService';
import { QuotationService } from '../services/QuotationService';
import { User } from '../types/auth';

describe('Phase 5 — Sales Order & Multi-Tier Approval Domain', () => {
  let orderRepo: MockSalesOrderRepository;
  let productRepo: MockProductRepository;
  let customerRepo: MockCustomerRepository;
  let approvalRepo: MockApprovalRepository;
  let quotationRepo: MockQuotationRepository;

  let productSvc: ProductService;
  let customerSvc: CustomerService;
  let approvalSvc: ApprovalService;
  let quotationSvc: QuotationService;
  let orderSvc: OrderService;

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

  const mockManagerUser: User = {
    id: 'usr-102',
    name: 'Ruwan Wijesinghe',
    email: 'manager@dnserp.com',
    role: 'MANAGER',
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
    orderRepo = new MockSalesOrderRepository();

    productSvc = new ProductService(productRepo);
    approvalSvc = new ApprovalService(approvalRepo);
    customerSvc = new CustomerService(customerRepo, approvalSvc);
    quotationSvc = new QuotationService(quotationRepo, productSvc, customerSvc, approvalSvc);
    orderSvc = new OrderService(orderRepo, productSvc, customerSvc, approvalSvc, quotationSvc);
  });

  describe('1. Standard vs Special Order Evaluation Gating', () => {
    it('creates standard order routed to SALES_MANAGER when discount, credit days, and credit limit are within limits', async () => {
      // cust-001: credit limit 3,000,000; total outstanding 1,450,000; credit days 30
      // prod-001: unit price 3250
      // 10 units = 32,500 subtotal, 4% discount = 1300, VAT = 5616, total = 36,816
      // Projected balance = 1,450,000 + 36,816 = 1,486,816 <= 3,000,000
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Main Warehouse, 48 Bloemendhal Road, Colombo 13',
          requestedCreditDays: 30,
          items: [
            {
              productId: 'prod-001',
              orderedQuantity: 10,
              requestedDiscountPercentage: 4, // 4% <= 5% rep limit
            },
          ],
        },
        mockSalesRepUser
      );

      expect(order.id).toBeDefined();
      expect(order.status).toBe('PENDING_APPROVAL');
      expect(order.isSpecialApproval).toBe(false);
      expect(order.specialApprovalReasons).toHaveLength(0);
      expect(order.targetApproverRole).toBe('SALES_MANAGER');
      expect(order.subtotal).toBe(32500);
      expect(order.discountAmount).toBe(1300);
      expect(order.taxAmount).toBe(5616);
      expect(order.totalAmount).toBe(36816);
      expect(order.items[0].approvedQuantity).toBe(10);
      expect(order.items[0].issuedQuantity).toBe(0);
    });

    it('detects SPECIAL_APPROVAL when line item discount exceeds sales rep authority (5%)', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Main Warehouse, 48 Bloemendhal Road, Colombo 13',
          requestedCreditDays: 30,
          items: [
            {
              productId: 'prod-001',
              orderedQuantity: 10,
              requestedDiscountPercentage: 8, // 8% > 5% rep limit
            },
          ],
        },
        mockSalesRepUser
      );

      expect(order.status).toBe('SPECIAL_APPROVAL');
      expect(order.isSpecialApproval).toBe(true);
      expect(order.specialApprovalReasons.length).toBeGreaterThan(0);
      expect(order.specialApprovalReasons[0]).toMatch(/exceeds sales rep authority limit/);
      expect(order.items[0].requiresSpecialApproval).toBe(true);
    });

    it('detects SPECIAL_APPROVAL and routes to DIRECTOR when requested credit days breach standard 30-day ceiling', async () => {
      // Customer allows 30 days, requested is 45 days
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Main Warehouse, 48 Bloemendhal Road, Colombo 13',
          requestedCreditDays: 45, // Breaches 30 days customer limit and > 30 ceiling
          items: [
            {
              productId: 'prod-001',
              orderedQuantity: 5,
              requestedDiscountPercentage: 3,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(order.status).toBe('SPECIAL_APPROVAL');
      expect(order.isSpecialApproval).toBe(true);
      expect(order.targetApproverRole).toBe('DIRECTOR');
      expect(order.specialApprovalReasons.some((r) => r.includes('credit days'))).toBe(true);
    });

    it('detects SPECIAL_APPROVAL when order total breaches customer credit limit', async () => {
      // cust-002: credit limit 1,500,000; total outstanding 1,250,000; remaining limit = 250,000
      // prod-002: price 8,400. 50 units = 420,000 + tax > 250,000 available credit
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-002',
          deliveryAddress: '89 Main Street, Negombo',
          requestedCreditDays: 30,
          items: [
            {
              productId: 'prod-002',
              orderedQuantity: 50,
              requestedDiscountPercentage: 5,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(order.status).toBe('SPECIAL_APPROVAL');
      expect(order.isSpecialApproval).toBe(true);
      expect(order.specialApprovalReasons.some((r) => r.includes('exceeds credit limit'))).toBe(true);
    });

    it('saves order as DRAFT without requiring immediate approval when saveAsDraft is true', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo Warehouse',
          saveAsDraft: true,
          items: [
            {
              productId: 'prod-001',
              orderedQuantity: 5,
              requestedDiscountPercentage: 10,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(order.status).toBe('DRAFT');
      expect(order.approvalHistory[0].action).toBe('CREATE');
    });
  });

  describe('2. Multi-Level Escalation Hierarchy (Sales Manager -> Manager -> Director)', () => {
    it('executes full escalation: Sales Manager escalates to Manager -> Manager escalates to Director -> Director approves', async () => {
      // Create special order (e.g. credit limit breach)
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-002',
          deliveryAddress: '89 Main Street, Negombo',
          requestedCreditDays: 30,
          items: [
            {
              productId: 'prod-002',
              orderedQuantity: 40,
              requestedDiscountPercentage: 8,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(order.status).toBe('SPECIAL_APPROVAL');

      // 1. Sales Manager attempts to approve: blocked if outside authority or escalates
      // Sales Manager escalates to Manager
      const smEscalated = await orderSvc.escalateOrder(
        order.id,
        mockSalesManagerUser,
        'MANAGER',
        'Commercial deviation noted. Escalating to General Manager.'
      );

      expect(smEscalated.currentApproverRole).toBe('MANAGER');
      expect(smEscalated.approvalHistory).toHaveLength(2);
      expect(smEscalated.approvalHistory[1].action).toBe('ESCALATE');
      expect(smEscalated.approvalHistory[1].targetRole).toBe('MANAGER');
      expect(smEscalated.approvalHistory[1].actorRole).toBe('SALES_MANAGER');

      // 2. Manager reviews and escalates to Director
      const mgrEscalated = await orderSvc.escalateOrder(
        order.id,
        mockManagerUser,
        'DIRECTOR',
        'Large project credit exposure exceeds department policy. Escalating for Board / Director sign-off.'
      );

      expect(mgrEscalated.currentApproverRole).toBe('DIRECTOR');
      expect(mgrEscalated.approvalHistory).toHaveLength(3);
      expect(mgrEscalated.approvalHistory[2].action).toBe('ESCALATE');
      expect(mgrEscalated.approvalHistory[2].targetRole).toBe('DIRECTOR');
      expect(mgrEscalated.approvalHistory[2].actorRole).toBe('MANAGER');

      // 3. Director approves the order
      const directorApproved = await orderSvc.approveOrder(
        order.id,
        mockDirectorUser,
        'Executive approval granted based on customer strategic multi-year commitment.'
      );

      expect(directorApproved.status).toBe('APPROVED');
      expect(directorApproved.approvedById).toBe(mockDirectorUser.id);
      expect(directorApproved.approvedByName).toBe(mockDirectorUser.name);
      expect(directorApproved.approvalHistory).toHaveLength(4);

      // Verify complete historical timeline integrity
      const timeline = directorApproved.approvalHistory;
      expect(timeline[0].action).toBe('SUBMIT');
      expect(timeline[0].actorRole).toBe('SALES_REP');

      expect(timeline[1].action).toBe('ESCALATE');
      expect(timeline[1].actorRole).toBe('SALES_MANAGER');
      expect(timeline[1].targetRole).toBe('MANAGER');

      expect(timeline[2].action).toBe('ESCALATE');
      expect(timeline[2].actorRole).toBe('MANAGER');
      expect(timeline[2].targetRole).toBe('DIRECTOR');

      expect(timeline[3].action).toBe('APPROVE');
      expect(timeline[3].actorRole).toBe('DIRECTOR');
    });

    it('prevents Sales Manager from approving when targetApproverRole is DIRECTOR', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Main Warehouse, 48 Bloemendhal Road, Colombo 13',
          requestedCreditDays: 45, // Extreme credit days requiring DIRECTOR
          items: [
            {
              productId: 'prod-001',
              orderedQuantity: 10,
              requestedDiscountPercentage: 0,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(order.targetApproverRole).toBe('DIRECTOR');

      await expect(
        orderSvc.approveOrder(order.id, mockSalesManagerUser, 'Attempted approval')
      ).rejects.toThrow(/not authorized to approve this order/);
    });

    it('allows Director to directly reject with mandatory explanation', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Main Warehouse, 48 Bloemendhal Road, Colombo 13',
          items: [{ productId: 'prod-001', orderedQuantity: 5 }],
        },
        mockSalesRepUser
      );

      const rejected = await orderSvc.rejectOrder(
        order.id,
        mockDirectorUser,
        'Overdue invoices must be settled prior to new order authorization.'
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.rejectedById).toBe(mockDirectorUser.id);
      expect(rejected.rejectionReason).toBe(
        'Overdue invoices must be settled prior to new order authorization.'
      );
    });
  });

  describe('3. State Machine & Transition Rules', () => {
    it('enforces strict lifecycle transitions (APPROVED -> PICKING -> ISSUED -> INVOICED -> DISPATCHED -> DELIVERED)', async () => {
      // Create and approve standard order
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo Warehouse',
          items: [{ productId: 'prod-001', orderedQuantity: 10 }],
        },
        mockSalesRepUser
      );
      await orderSvc.approveOrder(order.id, mockSalesManagerUser, 'Approved');

      // 1. Advance to PICKING
      const picking = await orderSvc.updateFulfillmentStatus(order.id, 'PICKING', mockSalesRepUser);
      expect(picking.status).toBe('PICKING');

      // 2. Advance to ISSUED
      const issued = await orderSvc.updateFulfillmentStatus(order.id, 'ISSUED', mockSalesRepUser, {
        issuedQuantities: { [picking.items[0].id]: 10 },
      });
      expect(issued.status).toBe('ISSUED');
      expect(issued.items[0].issuedQuantity).toBe(10);

      // 3. Advance to INVOICED
      const invoiced = await orderSvc.updateFulfillmentStatus(order.id, 'INVOICED', mockSalesRepUser);
      expect(invoiced.status).toBe('INVOICED');

      // 4. Advance to DISPATCHED
      const dispatched = await orderSvc.updateFulfillmentStatus(order.id, 'DISPATCHED', mockSalesRepUser);
      expect(dispatched.status).toBe('DISPATCHED');

      // 5. Advance to DELIVERED
      const delivered = await orderSvc.updateFulfillmentStatus(order.id, 'DELIVERED', mockSalesRepUser);
      expect(delivered.status).toBe('DELIVERED');
    });

    it('rejects illegal transition directly from PENDING_APPROVAL to DELIVERED', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo Warehouse',
          items: [{ productId: 'prod-001', orderedQuantity: 2 }],
        },
        mockSalesRepUser
      );

      await expect(
        orderSvc.updateFulfillmentStatus(order.id, 'DELIVERED', mockSalesRepUser)
      ).rejects.toThrow(/Invalid state transition/);
    });

    it('allows order cancellation prior to goods issue/invoicing, but blocks cancellation once invoiced', async () => {
      // 1. Can cancel while in PENDING_APPROVAL
      const order1 = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo Warehouse',
          items: [{ productId: 'prod-001', orderedQuantity: 2 }],
        },
        mockSalesRepUser
      );
      const cancelled = await orderSvc.cancelOrder(order1.id, mockSalesRepUser, 'Customer withdrew purchase.');
      expect(cancelled.status).toBe('CANCELLED');

      // 2. Cannot cancel once INVOICED
      const order2 = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo Warehouse',
          items: [{ productId: 'prod-001', orderedQuantity: 2 }],
        },
        mockSalesRepUser
      );
      await orderSvc.approveOrder(order2.id, mockSalesManagerUser, 'Approved');
      await orderSvc.updateFulfillmentStatus(order2.id, 'PICKING', mockSalesRepUser);
      await orderSvc.updateFulfillmentStatus(order2.id, 'ISSUED', mockSalesRepUser);
      await orderSvc.updateFulfillmentStatus(order2.id, 'INVOICED', mockSalesRepUser);

      await expect(
        orderSvc.cancelOrder(order2.id, mockSalesRepUser, 'Late cancellation attempt')
      ).rejects.toThrow(/Cannot cancel order/i);
    });
  });

  describe('4. Historical Snapshot Immutability (Master Data Architecture)', () => {
    it('preserves immutable product price and metadata snapshot on orders even after Product Master update', async () => {
      const product = await productSvc.getProduct('prod-001');
      expect(product).not.toBeNull();
      const originalPrice = product!.pricing.currentSellingPrice; // 3250

      // 1. Create Sales Order
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Main Warehouse, 48 Bloemendhal Road, Colombo 13',
          items: [
            {
              productId: product!.id,
              orderedQuantity: 20,
              requestedDiscountPercentage: 0,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(order.items[0].unitPriceSnapshot).toBe(originalPrice);
      expect(order.items[0].productNameSnapshot).toBe(product!.name);
      expect(order.subtotal).toBe(originalPrice * 20);

      // 2. Mutate Product Master price (+1,000 LKR) and SKU
      await productSvc.updateProduct(product!.id, {
        pricing: {
          ...product!.pricing,
          currentSellingPrice: originalPrice + 1000,
        },
      });

      // 3. Verify Product Master has new price
      const updatedProduct = await productSvc.getProduct(product!.id);
      expect(updatedProduct?.pricing.currentSellingPrice).toBe(originalPrice + 1000);

      // 4. Retrieve original order and verify snapshot is 100% unchanged
      const retrieved = await orderSvc.getOrderById(order.id);
      expect(retrieved?.items[0].unitPriceSnapshot).toBe(originalPrice);
      expect(retrieved?.items[0].productNameSnapshot).toBe(product!.name);
      expect(retrieved?.totalAmount).toBe(order.totalAmount);
    });
  });

  describe('5. Sales Rep Territory Scoping', () => {
    it('blocks Sales Rep from creating orders for customers assigned to other sales reps', async () => {
      const otherRepCustomer = await customerRepo.create({
        code: 'DLR-GAL-005',
        name: 'Southern Marine Supplies',
        type: 'DEALER',
        areaId: 'area-02',
        areaName: 'Southern Province',
        assignedRepId: 'usr-108',
        assignedRepName: 'Priyanka Alwis',
        contactPerson: 'Mr. Rohan',
        phone: '+94 91 224 5566',
        email: 'info@southernmarine.lk',
        address: '52 Matara Road, Galle',
        commercialTerms: {
          creditLimit: 1000000,
          creditDays: 30,
          defaultDiscountPercentage: 5,
          maxDiscountPercentage: 10,
        },
        financials: {
          totalOutstanding: 0,
          currentDue: 0,
          nearDue: 0,
          overdue: 0,
          availableCredit: 1000000,
        },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
        warrantyNotesExpected: 10,
        warrantyNotesReceived: 10,
      });

      await expect(
        orderSvc.createOrder(
          {
            customerId: otherRepCustomer.id,
            deliveryAddress: 'Galle Store',
            items: [{ productId: 'prod-001', orderedQuantity: 5 }],
          },
          mockSalesRepUser
        )
      ).rejects.toThrow(/assigned to another sales representative/);
    });

    it('scopes listOrders so Sales Rep only sees their assigned orders', async () => {
      const repOrders = await orderSvc.listOrders(undefined, {
        userId: mockSalesRepUser.id,
        role: 'SALES_REP',
      });

      // Every returned order must belong to mockSalesRepUser
      expect(repOrders.data.length).toBeGreaterThan(0);
      for (const ord of repOrders.data) {
        expect(ord.salesRepId).toBe(mockSalesRepUser.id);
      }

      // Director sees all orders across all reps
      const directorOrders = await orderSvc.listOrders(undefined, {
        userId: mockDirectorUser.id,
        role: 'DIRECTOR',
      });
      expect(directorOrders.total).toBeGreaterThan(repOrders.total);
    });
  });

  describe('6. Quotation to Sales Order Conversion Flow', () => {
    it('converts an APPROVED quotation into an official Sales Order preserving snapshots and linkage', async () => {
      // 1. Create and approve a quotation
      const quote = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          salesRepId: mockSalesRepUser.id,
          items: [
            {
              productId: 'prod-001',
              quantity: 12,
              requestedDiscountPercentage: 4,
            },
          ],
        },
        mockSalesRepUser
      );

      expect(quote.status).toBe('APPROVED');

      // 2. Convert to Sales Order via OrderService
      const order = await orderSvc.createFromQuotation(quote.id, mockSalesRepUser, {
        deliveryAddress: 'Customer Colombo Site #2',
        customerPoNumber: 'PO-CONV-901',
      });

      expect(order.quotationId).toBe(quote.id);
      expect(order.quotationNumber).toBe(quote.quotationNumber);
      expect(order.orderNumber).toMatch(/^(ODR-[A-Z]{2}-[A-Z]{2}-\d{4}|SO-DLR-COL-001-\d+)$/);
      expect(order.items).toHaveLength(1);
      expect(order.items[0].orderedQuantity).toBe(12);
      expect(order.items[0].unitPriceSnapshot).toBe(quote.items[0].unitPriceSnapshot);
      expect(order.deliveryAddress).toBe('Customer Colombo Site #2');
      expect(order.customerPoNumber).toBe('PO-CONV-901');

      // Verify quotation in repository has been marked CONVERTED
      const updatedQuote = await quotationSvc.getQuotationById(quote.id);
      expect(updatedQuote?.status).toBe('CONVERTED');
      expect(updatedQuote?.convertedOrderNumber).toBe(order.orderNumber);
    });
  });

  describe('7. Approvals Engine Bidirectional Synchronization', () => {
    it('synchronizes APPROVE action from Approvals Engine to Sales Order', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: '48 Bloemendhal Road, Colombo 13',
          items: [{ productId: 'prod-001', orderedQuantity: 5 }],
        },
        mockSalesRepUser
      );

      expect(order.approvalRequestId).toBeDefined();

      // Process approval via global Approvals Engine
      await approvalSvc.processAction(
        order.approvalRequestId!,
        'APPROVE',
        mockSalesManagerUser.id,
        mockSalesManagerUser.name,
        mockSalesManagerUser.role,
        'Approved via Approvals Inbox.'
      );

      const refreshed = await orderSvc.getOrderById(order.id);
      expect(refreshed?.status).toBe('APPROVED');
      expect(refreshed?.approvedByName).toBe('SALES_MANAGER Approval');
      expect(refreshed?.approvalHistory.some((h) => h.action === 'APPROVE')).toBe(true);
    });

    it('synchronizes REJECT action from Approvals Engine to Sales Order', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: '48 Bloemendhal Road, Colombo 13',
          items: [{ productId: 'prod-001', orderedQuantity: 5 }],
        },
        mockSalesRepUser
      );

      expect(order.approvalRequestId).toBeDefined();

      await approvalSvc.processAction(
        order.approvalRequestId!,
        'REJECT',
        mockSalesManagerUser.id,
        mockSalesManagerUser.name,
        mockSalesManagerUser.role,
        'Rejection from executive inbox due to quota.'
      );

      const refreshed = await orderSvc.getOrderById(order.id);
      expect(refreshed?.status).toBe('REJECTED');
      expect(refreshed?.rejectionReason).toBe('Rejection from executive inbox due to quota.');
      expect(refreshed?.approvalHistory.some((h) => h.action === 'REJECT')).toBe(true);
    });

    it('synchronizes ESCALATE action from Approvals Engine to Sales Order', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: '48 Bloemendhal Road, Colombo 13',
          items: [{ productId: 'prod-001', orderedQuantity: 5 }],
        },
        mockSalesRepUser
      );

      await approvalSvc.processAction(
        order.approvalRequestId!,
        'ESCALATE',
        mockSalesManagerUser.id,
        mockSalesManagerUser.name,
        mockSalesManagerUser.role,
        'Escalating to Manager via approval engine.',
        'MANAGER'
      );

      const refreshed = await orderSvc.getOrderById(order.id);
      expect(refreshed?.status).toBe('SPECIAL_APPROVAL');
      expect(refreshed?.currentApproverRole).toBe('MANAGER');
      expect(refreshed?.approvalHistory.some((h) => h.action === 'ESCALATE')).toBe(true);
    });
  });

  describe('8. Draft Submission and Date Filtering Edge Cases', () => {
    it('creates ApprovalRequest when a DRAFT order is updated with saveAsDraft: false', async () => {
      const draft = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo Site',
          saveAsDraft: true,
          items: [{ productId: 'prod-001', orderedQuantity: 5 }],
        },
        mockSalesRepUser
      );

      expect(draft.status).toBe('DRAFT');
      expect(draft.approvalRequestId).toBeUndefined();

      // Submit via updateOrder
      const submitted = await orderSvc.updateOrder(
        draft.id,
        {
          saveAsDraft: false,
        },
        mockSalesRepUser
      );

      expect(submitted.status).toBe('PENDING_APPROVAL');
      expect(submitted.approvalRequestId).toBeDefined();

      const approvalReq = await approvalSvc.getApproval(submitted.approvalRequestId!);
      expect(approvalReq).not.toBeNull();
      expect(approvalReq?.documentId).toBe(draft.id);
    });

    it('correctly filters orders by date range inclusive of start and end date', async () => {
      // Seed orders with known dates
      const res = await orderSvc.listOrders({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });
      expect(res.data.length).toBeGreaterThan(0);

      // Filtering for future date should return empty
      const futureRes = await orderSvc.listOrders({
        startDate: '2099-01-01',
        endDate: '2099-12-31',
      });
      expect(futureRes.data).toHaveLength(0);
    });

    it('preserves creditDaysRequested alias alongside requestedCreditDays', async () => {
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: 'Colombo Site',
          creditDaysRequested: 25,
          items: [{ productId: 'prod-001', orderedQuantity: 5 }],
        },
        mockSalesRepUser
      );

      expect(order.requestedCreditDays).toBe(25);
      expect(order.creditDaysRequested).toBe(25);
    });
  });
});
