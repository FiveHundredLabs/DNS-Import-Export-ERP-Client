import { describe, it, expect, beforeEach } from 'vitest';
import { canAccessRoute, hasPermission, ROLE_PERMISSIONS } from '../rules/permissions';
import { canApproveCustomerStage, determinePriceApprovalRoute } from '../rules/approvalRules';
import { evaluateDiscount } from '../rules/discountRules';
import { canApproveOrder, evaluateOrderApproval } from '../rules/orderRules';
import { canIssueFromStock } from '../rules/inventoryRules';
import { validateCashierSession } from '../rules/posRules';
import { CustomerService } from '../services/CustomerService';
import { QuotationService } from '../services/QuotationService';
import { OrderService } from '../services/OrderService';
import { PaymentService } from '../services/PaymentService';
import { InventoryService } from '../services/InventoryService';
import { ProductService } from '../services/ProductService';
import { ApprovalService } from '../services/ApprovalService';
import { GRNService } from '../services/GRNService';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { MockQuotationRepository } from '../repositories/mock/MockQuotationRepository';
import { MockSalesOrderRepository } from '../repositories/mock/MockSalesOrderRepository';
import { MockPaymentRepository } from '../repositories/mock/MockPaymentRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { MockApprovalRepository } from '../repositories/mock/MockApprovalRepository';
import { MockGRNRepository } from '../repositories/mock/MockGRNRepository';
import { User, UserRole } from '../types/auth';
import { MOCK_USERS } from '../mock/mockUsers';

describe('Phase 12 — Role Security & Permission Boundary Testing (Section 83)', () => {
  let customerRepo: MockCustomerRepository;
  let customerSvc: CustomerService;
  let quotationRepo: MockQuotationRepository;
  let quotationSvc: QuotationService;
  let orderRepo: MockSalesOrderRepository;
  let orderSvc: OrderService;
  let paymentRepo: MockPaymentRepository;
  let paymentSvc: PaymentService;
  let invRepo: MockInventoryRepository;
  let invSvc: InventoryService;
  let productRepo: MockProductRepository;
  let productSvc: ProductService;
  let approvalRepo: MockApprovalRepository;
  let approvalSvc: ApprovalService;
  let grnRepo: MockGRNRepository;
  let grnSvc: GRNService;

  const salesRepUser = MOCK_USERS.find((u) => u.role === 'SALES_REP')!; // usr-106 (area-01)
  const stockKeeperUser = MOCK_USERS.find((u) => u.role === 'STOCK_KEEPER')!; // usr-107
  const cashierUser = MOCK_USERS.find((u) => u.role === 'CASHIER')!; // usr-108
  const areaManagerUser = MOCK_USERS.find((u) => u.role === 'AREA_MANAGER')!; // usr-105 (area-01)
  const salesManagerUser = MOCK_USERS.find((u) => u.role === 'SALES_MANAGER')!; // usr-103
  const managerUser = MOCK_USERS.find((u) => u.role === 'MANAGER')!; // usr-102
  const directorUser = MOCK_USERS.find((u) => u.role === 'DIRECTOR')!; // usr-101
  const financeManagerUser = MOCK_USERS.find((u) => u.role === 'FINANCE_MANAGER')!; // usr-104

  beforeEach(() => {
    customerRepo = new MockCustomerRepository();
    customerSvc = new CustomerService(customerRepo);
    productRepo = new MockProductRepository();
    productSvc = new ProductService(productRepo);
    approvalRepo = new MockApprovalRepository();
    approvalSvc = new ApprovalService(approvalRepo);
    quotationRepo = new MockQuotationRepository();
    quotationSvc = new QuotationService(quotationRepo, productSvc, customerSvc, approvalSvc);
    orderRepo = new MockSalesOrderRepository();
    orderSvc = new OrderService(orderRepo, productSvc, customerSvc, approvalSvc, quotationSvc);
    paymentRepo = new MockPaymentRepository();
    paymentSvc = new PaymentService(paymentRepo, customerSvc, undefined as any, approvalSvc);
    invRepo = new MockInventoryRepository();
    invSvc = new InventoryService(invRepo);
    grnRepo = new MockGRNRepository();
    grnSvc = new GRNService(grnRepo, invRepo);
  });

  describe('1. SALES_REP Role Boundaries', () => {
    it('cannot access restricted modules (/approvals, /inventory, /finance, /pos, /settings)', () => {
      const restrictedRoutes = ['/approvals', '/inventory', '/finance', '/pos', '/settings'];
      for (const route of restrictedRoutes) {
        expect(canAccessRoute('SALES_REP', route)).toBe(false);
      }

      // Conversely, permitted routes work
      expect(canAccessRoute('SALES_REP', '/')).toBe(true);
      expect(canAccessRoute('SALES_REP', '/customers')).toBe(true);
      expect(canAccessRoute('SALES_REP', '/quotations')).toBe(true);
      expect(canAccessRoute('SALES_REP', '/orders')).toBe(true);
      expect(canAccessRoute('SALES_REP', '/warranty')).toBe(true);
      expect(canAccessRoute('SALES_REP', '/commissions')).toBe(true);
    });

    it('cannot view customers outside assigned portfolio (assignedRepId filtering)', async () => {
      // Create customers assigned to different reps
      await customerRepo.create({
        code: 'CUST-REP-01',
        name: 'Kasun Dealer Alpha',
        type: 'DEALER',
        areaId: 'area-01',
        areaName: 'Western Province',
        assignedRepId: salesRepUser.id, // usr-106
        assignedRepName: salesRepUser.name,
        contactPerson: 'Perera',
        phone: '+94 77 111 2222',
        email: 'alpha@dealer.lk',
        address: 'Colombo',
        commercialTerms: { creditLimit: 200000, creditDays: 14, defaultDiscountPercentage: 5, maxDiscountPercentage: 10 },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
      });

      await customerRepo.create({
        code: 'CUST-REP-02',
        name: 'Other Rep Dealer Beta',
        type: 'DEALER',
        areaId: 'area-02',
        areaName: 'Southern Province',
        assignedRepId: 'usr-999-other',
        assignedRepName: 'Other Sales Rep',
        contactPerson: 'Silva',
        phone: '+94 77 333 4444',
        email: 'beta@dealer.lk',
        address: 'Galle',
        commercialTerms: { creditLimit: 200000, creditDays: 14, defaultDiscountPercentage: 5, maxDiscountPercentage: 10 },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
      });

      const portfolioResult = await customerSvc.listCustomers({ assignedRepId: salesRepUser.id });
      expect(portfolioResult.data.length).toBeGreaterThan(0);
      for (const cust of portfolioResult.data) {
        expect(cust.assignedRepId).toBe(salesRepUser.id);
      }
      expect(portfolioResult.data.some((c) => c.code === 'CUST-REP-02')).toBe(false);
    });

    it('cannot create quotations for unassigned customers', async () => {
      const otherRepCustomer = await customerRepo.create({
        code: 'CUST-UNASSIGNED-Q',
        name: 'Unassigned Territory Dealer',
        type: 'DEALER',
        areaId: 'area-02',
        areaName: 'Southern Province',
        assignedRepId: 'usr-999-other',
        contactPerson: 'Silva',
        phone: '+94 77 999 8888',
        email: 'unassigned@dealer.lk',
        address: 'Galle',
        commercialTerms: { creditLimit: 100000, creditDays: 14, defaultDiscountPercentage: 5, maxDiscountPercentage: 10 },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
      });

      await expect(
        quotationSvc.createQuotation(
          {
            customerId: otherRepCustomer.id,
            items: [{ productId: 'prod-001', quantity: 5, requestedDiscountPercentage: 2 }],
          },
          salesRepUser
        )
      ).rejects.toThrow(/not assigned to your territory/i);
    });

    it('cannot create sales orders for unassigned customers', async () => {
      const otherRepCustomer = await customerRepo.create({
        code: 'CUST-UNASSIGNED-O',
        name: 'Unassigned Territory Dealer Order',
        type: 'DEALER',
        areaId: 'area-02',
        areaName: 'Southern Province',
        assignedRepId: 'usr-999-other',
        contactPerson: 'Silva',
        phone: '+94 77 999 8889',
        email: 'unassigned-order@dealer.lk',
        address: 'Galle',
        commercialTerms: { creditLimit: 100000, creditDays: 14, defaultDiscountPercentage: 5, maxDiscountPercentage: 10 },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
      });

      await expect(
        orderSvc.createOrder(
          {
            customerId: otherRepCustomer.id,
            items: [{ productId: 'prod-001', quantity: 5, discountPercentage: 2 }],
          },
          salesRepUser
        )
      ).rejects.toThrow(/assigned to another sales representative/i);
    });

    it('cannot approve own orders or quotations', async () => {
      // 1. Quotation approval attempt by Sales Rep
      const myCustomer = await customerRepo.create({
        code: 'CUST-MY-REP-01',
        name: 'My Assigned Dealer',
        type: 'DEALER',
        areaId: 'area-01',
        assignedRepId: salesRepUser.id,
        contactPerson: 'Kamal',
        phone: '+94 77 222 3333',
        email: 'mydealer@dealer.lk',
        address: 'Colombo',
        commercialTerms: { creditLimit: 500000, creditDays: 30, defaultDiscountPercentage: 5, maxDiscountPercentage: 15 },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
      });

      const quotation = await quotationSvc.createQuotation(
        {
          customerId: myCustomer.id,
          items: [{ productId: 'prod-001', quantity: 10, requestedDiscountPercentage: 8 }], // > 5% triggers PENDING_APPROVAL
        },
        salesRepUser
      );

      expect(quotation.status).toBe('PENDING_APPROVAL');

      await expect(
        quotationSvc.approveQuotation(quotation.id, salesRepUser, 'Rep trying to self-approve')
      ).rejects.toThrow(/Role SALES_REP is not authorized to approve quotations/i);

      // 2. Sales Order approval attempt by Sales Rep
      const order = await orderSvc.createOrder(
        {
          customerId: myCustomer.id,
          items: [{ productId: 'prod-001', quantity: 10, discountPercentage: 2 }],
        },
        salesRepUser
      );

      expect(order.status).toBe('PENDING_APPROVAL');

      await expect(
        orderSvc.approveOrder(order.id, salesRepUser, 'Rep trying to self-approve order')
      ).rejects.toThrow(/Role 'SALES_REP' is not authorized to approve this order/i);
    });

    it('cannot exceed permitted discount (5%) without triggering special approval', () => {
      // 5% or less is standard
      const standardDiscount = evaluateDiscount({
        requestedDiscountPercentage: 5,
        repMaxDiscountPercentage: 5,
        customerMaxDiscountPercentage: 15,
        productMaxDiscountPercentage: 20,
      });
      expect(standardDiscount.isValid).toBe(true);
      expect(standardDiscount.requiresSpecialApproval).toBe(false);

      // > 5% strictly triggers special approval
      const excessDiscount = evaluateDiscount({
        requestedDiscountPercentage: 7,
        repMaxDiscountPercentage: 5,
        customerMaxDiscountPercentage: 15,
        productMaxDiscountPercentage: 20,
      });
      expect(excessDiscount.isValid).toBe(true);
      expect(excessDiscount.requiresSpecialApproval).toBe(true);
      expect(excessDiscount.reason).toMatch(/exceeds standard limit/i);
    });
  });

  describe('2. STOCK_KEEPER Role Boundaries', () => {
    it('cannot approve financial transactions or payments', async () => {
      expect(hasPermission('STOCK_KEEPER', 'payments:approve')).toBe(false);
      expect(hasPermission('STOCK_KEEPER', 'payments:view')).toBe(false);
      expect(hasPermission('STOCK_KEEPER', 'payments:create')).toBe(false);

      // Create a pending payment
      const payment = await paymentRepo.create({
        receiptNumber: 'REC-SK-TEST-01',
        customerId: 'cust-001',
        customerName: 'Test Customer',
        customerCode: 'CUST-001',
        salesRepId: salesRepUser.id,
        salesRepName: salesRepUser.name,
        amount: 25000,
        paymentMethod: 'CASH',
        status: 'PENDING_APPROVAL',
        invoiceAllocations: [],
        collectedAt: new Date().toISOString(),
      });

      await expect(
        paymentSvc.approvePayment(payment.id, stockKeeperUser, 'Stock keeper trying to approve cash receipt')
      ).rejects.toThrow(/Role STOCK_KEEPER is not authorized to approve payments/i);
    });

    it('cannot access restricted modules (/customers, /finance, /pos, /approvals, /commissions, /settings)', () => {
      const restrictedRoutes = ['/customers', '/finance', '/pos', '/approvals', '/commissions', '/settings'];
      for (const route of restrictedRoutes) {
        expect(canAccessRoute('STOCK_KEEPER', route)).toBe(false);
      }
      expect(canAccessRoute('STOCK_KEEPER', '/inventory')).toBe(true);
    });

    it('cannot modify customer credit or discount terms', async () => {
      expect(hasPermission('STOCK_KEEPER', 'customers:edit')).toBe(false);
      expect(hasPermission('STOCK_KEEPER', 'customers:commercial_approval')).toBe(false);
      expect(canApproveCustomerStage('STOCK_KEEPER', 'PENDING_SALES_REVIEW')).toBe(false);
      expect(canApproveCustomerStage('STOCK_KEEPER', 'PENDING_MANAGER_APPROVAL')).toBe(false);
      expect(canApproveCustomerStage('STOCK_KEEPER', 'PENDING_DIRECTOR_APPROVAL')).toBe(false);

      // Calling setCommercialTerms with Stock Keeper user throws authorization error
      await expect(
        customerSvc.setCommercialTerms(
          'cust-001',
          { creditLimit: 500000, creditDays: 30, defaultDiscountPercentage: 5, maxDiscountPercentage: 10 },
          stockKeeperUser
        )
      ).rejects.toThrow(/Role STOCK_KEEPER is not authorized to configure commercial terms/i);
    });

    it('cannot approve GRNs (only Manager or Director can approve)', async () => {
      expect(hasPermission('STOCK_KEEPER', 'inventory:grn_create')).toBe(true);
      expect(hasPermission('STOCK_KEEPER', 'inventory:grn_approve')).toBe(false);
      expect(hasPermission('MANAGER', 'inventory:grn_approve')).toBe(true);
      expect(hasPermission('DIRECTOR', 'inventory:grn_approve')).toBe(true);

      // Create a test submitted GRN
      const grn = {
        id: 'grn-test-sec-01',
        grnNumber: 'GRN-2026-001',
        supplierId: 'sup-01',
        supplierName: 'Siemens Lanka',
        warehouseId: 'wh-main',
        items: [
          {
            productId: 'prod-001',
            productNameSnapshot: 'DNS MCB',
            skuSnapshot: 'DNS-01',
            expectedQuantity: 50,
            receivedQuantity: 50,
            damagedQuantity: 0,
            unitCost: 800,
            lineValue: 40000,
          },
        ],
        status: 'SUBMITTED' as const,
        submittedById: stockKeeperUser.id,
        submittedByName: stockKeeperUser.name,
        submittedAt: new Date().toISOString(),
      };
      await grnRepo.save(grn);

      // Stock keeper attempting to approve GRN is rejected
      await expect(
        grnSvc.approveGRN(grn.id, stockKeeperUser.id, stockKeeperUser.name, stockKeeperUser.role)
      ).rejects.toThrow(/Role STOCK_KEEPER is not authorized to approve GRNs/i);

      // Approvals engine also blocks STOCK_KEEPER from acting on approvals
      const approvalReq = await approvalRepo.create({
        documentType: 'GRN_ACCEPTANCE',
        documentId: grn.id,
        documentReferenceNumber: grn.grnNumber,
        title: 'GRN Inward Acceptance',
        description: 'GRN approval',
        initiatorId: stockKeeperUser.id,
        initiatorName: stockKeeperUser.name,
        initiatorRole: 'STOCK_KEEPER',
        currentApproverRole: 'MANAGER',
        targetApproverRole: 'MANAGER',
        isSpecialScenario: false,
        status: 'PENDING',
        history: [],
      });

      await expect(
        approvalSvc.processAction(
          approvalReq.id,
          'APPROVE',
          stockKeeperUser.id,
          stockKeeperUser.name,
          stockKeeperUser.role,
          'Stock keeper attempting unauthorized approval'
        )
      ).rejects.toThrow(/Role 'STOCK_KEEPER' is not authorized to act on approval requests/i);
    });

    it('cannot issue stock in excess of approved quantity', () => {
      const stockBalance = {
        id: 'bal-01',
        productId: 'prod-001',
        locationId: 'wh-01',
        locationType: 'WAREHOUSE' as const,
        availableQuantity: 50,
        reservedQuantity: 10,
        damagedQuantity: 0,
        returnedQuantity: 0,
        lastUpdated: new Date().toISOString(),
      };

      // Available for sale = 50 - 10 = 40
      expect(canIssueFromStock('prod-001', 'wh-01', 40, stockBalance)).toBe(true);
      expect(canIssueFromStock('prod-001', 'wh-01', 41, stockBalance)).toBe(false);
      expect(canIssueFromStock('prod-001', 'wh-01', 100, stockBalance)).toBe(false);

      // Cannot issue from DAMAGED stock location under any circumstance
      const damagedBalance = {
        ...stockBalance,
        locationType: 'DAMAGED' as const,
      };
      expect(canIssueFromStock('prod-001', 'wh-01', 5, damagedBalance)).toBe(false);
    });
  });

  describe('3. CASHIER Role Boundaries', () => {
    it('cannot access restricted modules (/inventory, /finance, /approvals, /commissions, /settings)', () => {
      const restrictedRoutes = ['/inventory', '/finance', '/approvals', '/commissions', '/settings'];
      for (const route of restrictedRoutes) {
        expect(canAccessRoute('CASHIER', route)).toBe(false);
      }
      expect(canAccessRoute('CASHIER', '/pos')).toBe(true);
    });

    it('cannot modify inventory master data or product prices', () => {
      expect(hasPermission('CASHIER', 'products:create')).toBe(false);
      expect(hasPermission('CASHIER', 'products:edit')).toBe(false);
      expect(hasPermission('CASHIER', 'products:price_approval')).toBe(false);
      expect(hasPermission('CASHIER', 'inventory:view')).toBe(false);
      expect(hasPermission('CASHIER', 'inventory:grn_create')).toBe(false);
      expect(hasPermission('CASHIER', 'inventory:grn_approve')).toBe(false);
      expect(hasPermission('CASHIER', 'inventory:pick_issue')).toBe(false);
    });

    it('cannot approve orders or payments, and cannot act on approval engine requests', async () => {
      expect(hasPermission('CASHIER', 'orders:approve_standard')).toBe(false);
      expect(hasPermission('CASHIER', 'orders:approve_special')).toBe(false);
      expect(hasPermission('CASHIER', 'payments:approve')).toBe(false);

      expect(canApproveOrder('CASHIER', 'SALES_MANAGER', false)).toBe(false);
      expect(canApproveOrder('CASHIER', 'DIRECTOR', true)).toBe(false);

      const payment = await paymentRepo.create({
        receiptNumber: 'REC-CSH-TEST-01',
        customerId: 'cust-001',
        customerName: 'Test Customer',
        customerCode: 'CUST-001',
        salesRepId: salesRepUser.id,
        salesRepName: salesRepUser.name,
        amount: 10000,
        paymentMethod: 'CASH',
        status: 'PENDING_APPROVAL',
        invoiceAllocations: [],
        collectedAt: new Date().toISOString(),
      });

      await expect(
        paymentSvc.approvePayment(payment.id, cashierUser, 'Cashier attempting unauthorized payment sign-off')
      ).rejects.toThrow(/Role CASHIER is not authorized to approve payments/i);

      // Approvals engine rejection
      const approvalReq = await approvalRepo.create({
        documentType: 'PAYMENT_RECEIPT',
        documentId: payment.id,
        documentReferenceNumber: payment.receiptNumber,
        title: 'Payment Sign-off',
        description: 'Payment',
        initiatorId: cashierUser.id,
        initiatorName: cashierUser.name,
        initiatorRole: 'CASHIER',
        currentApproverRole: 'FINANCE_MANAGER',
        targetApproverRole: 'FINANCE_MANAGER',
        isSpecialScenario: false,
        status: 'PENDING',
        history: [],
      });

      await expect(
        approvalSvc.processAction(
          approvalReq.id,
          'APPROVE',
          cashierUser.id,
          cashierUser.name,
          cashierUser.role,
          'Cashier trying to approve payment'
        )
      ).rejects.toThrow(/Role 'CASHIER' is not authorized to act on approval requests/i);
    });

    it('cannot conduct POS transactions when shift session is closed', () => {
      // Null session check
      expect(() => validateCashierSession(null)).toThrow(/No active open POS session found/i);
      expect(() => validateCashierSession(undefined)).toThrow(/No active open POS session found/i);

      // Closed session check
      const closedSession = {
        id: 'ses-closed',
        sessionNumber: 'POS-SES-2026-001',
        cashierId: cashierUser.id,
        cashierName: cashierUser.name,
        terminalId: 'TERM-01',
        openedAt: new Date(Date.now() - 3600000).toISOString(),
        closedAt: new Date().toISOString(),
        openingBalance: 10000,
        status: 'CLOSED' as const,
        cashSalesTotal: 15000,
        cardSalesTotal: 5000,
        cashInTotal: 0,
        cashOutTotal: 0,
        actualCash: 25000,
        difference: 0,
        isReconciled: true,
      };

      expect(() => validateCashierSession(closedSession)).toThrow(/is CLOSED\. Transactions are only permitted in an OPEN session/i);

      // Open session succeeds
      const openSession = { ...closedSession, status: 'OPEN' as const, closedAt: undefined };
      expect(validateCashierSession(openSession)).toBe(true);
    });
  });

  describe('4. AREA_MANAGER Role Boundaries', () => {
    it('cannot access data or customers outside assigned area (areaId scoping)', async () => {
      expect(hasPermission('AREA_MANAGER', 'reports:all')).toBe(false);
      expect(hasPermission('AREA_MANAGER', 'reports:area_only')).toBe(true);
      expect(canAccessRoute('AREA_MANAGER', '/finance')).toBe(false);
      expect(canAccessRoute('AREA_MANAGER', '/inventory')).toBe(false);
      expect(canAccessRoute('AREA_MANAGER', '/approvals')).toBe(false);

      // Querying customers strictly scoped by assigned areaId
      const areaCustomers = await customerSvc.listCustomers({ areaId: areaManagerUser.areaId });
      expect(areaCustomers.data.length).toBeGreaterThan(0);
      for (const c of areaCustomers.data) {
        expect(c.areaId).toBe(areaManagerUser.areaId);
      }
    });

    it('cannot approve special orders requiring Director authorization', () => {
      expect(canApproveOrder('AREA_MANAGER', 'DIRECTOR', true)).toBe(false);
      expect(canApproveOrder('AREA_MANAGER', 'MANAGER', true)).toBe(false);
      expect(canApproveOrder('AREA_MANAGER', 'SALES_MANAGER', false)).toBe(false);
      expect(hasPermission('AREA_MANAGER', 'orders:approve_special')).toBe(false);
      expect(hasPermission('AREA_MANAGER', 'orders:approve_standard')).toBe(false);
    });
  });

  describe('5. SALES_MANAGER Role Boundaries', () => {
    it('cannot approve special orders requiring Director approval (e.g. credit days > 30)', async () => {
      // Standard order routing to Sales Manager is permitted
      expect(canApproveOrder('SALES_MANAGER', 'SALES_MANAGER', false)).toBe(true);

      // Special order routed to Director cannot be approved by Sales Manager
      expect(canApproveOrder('SALES_MANAGER', 'DIRECTOR', true)).toBe(false);
      expect(canApproveOrder('SALES_MANAGER', 'MANAGER', true)).toBe(false);

      // Verification via evaluateOrderApproval: credit days > 30 forces targetApproverRole = DIRECTOR
      const customer = {
        id: 'cust-test-sm',
        code: 'CUST-SM-01',
        name: 'Evaluation Dealer',
        type: 'DEALER' as const,
        areaId: 'area-01',
        contactPerson: 'Perera',
        phone: '+94 77 123 4567',
        email: 'dealer@test.lk',
        address: 'Colombo',
        commercialTerms: { creditLimit: 1000000, creditDays: 30, defaultDiscountPercentage: 5, maxDiscountPercentage: 10 },
        financials: { totalOutstanding: 0, currentDue: 0, nearDue: 0, overdue: 0, availableCredit: 1000000 },
        approvalStage: 'APPROVED' as const,
        status: 'ACTIVE' as const,
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const evalResult = evaluateOrderApproval({
        customer,
        items: [
          {
            productId: 'prod-001',
            unitPriceSnapshot: 1500,
            orderedQuantity: 10,
            discountPercentage: 5,
          },
        ],
        requestedCreditDays: 45, // Breaches 30-day ceiling!
      });

      expect(evalResult.isSpecialApproval).toBe(true);
      expect(evalResult.targetApproverRole).toBe('DIRECTOR');
      expect(canApproveOrder('SALES_MANAGER', evalResult.targetApproverRole, evalResult.isSpecialApproval)).toBe(false);

      // Approvals engine also rejects Sales Manager approving Director-level requests
      const approvalReq = await approvalRepo.create({
        documentType: 'SPECIAL_ORDER',
        documentId: 'ord-sec-test-01',
        documentReferenceNumber: 'ORD-2026-999',
        title: 'Special Order Approval: Breached credit limit',
        description: 'Requires Director approval',
        initiatorId: salesRepUser.id,
        initiatorName: salesRepUser.name,
        initiatorRole: 'SALES_REP',
        currentApproverRole: 'DIRECTOR',
        targetApproverRole: 'DIRECTOR',
        isSpecialScenario: true,
        status: 'PENDING',
        history: [],
      });

      await expect(
        approvalSvc.processAction(
          approvalReq.id,
          'APPROVE',
          salesManagerUser.id,
          salesManagerUser.name,
          salesManagerUser.role,
          'Sales Manager attempting unauthorized sign-off on Director request'
        )
      ).rejects.toThrow(/Role 'SALES_MANAGER' is not authorized to approve this request\. Required role is 'DIRECTOR'\./i);
    });
  });

  describe('6. MANAGER Role Boundaries', () => {
    it('cannot approve price changes below cost or margin breach without Director approval', () => {
      const costPrice = 1000;
      const currentPrice = 1500;

      // Case 1: Proposed price below cost (e.g. 950 < 1000)
      const belowCostRoute = determinePriceApprovalRoute(costPrice, currentPrice, 950);
      expect(belowCostRoute.requiresDirectorApproval).toBe(true);
      expect(belowCostRoute.reason).toMatch(/below the minimum required 15%/i);

      // Case 2: Proposed price zero or negative
      const zeroPriceRoute = determinePriceApprovalRoute(costPrice, currentPrice, 0);
      expect(zeroPriceRoute.requiresDirectorApproval).toBe(true);

      // Case 3: Margin below 15% (e.g. 1100 -> margin = (1100 - 1000) / 1100 = 9.1%)
      const lowMarginRoute = determinePriceApprovalRoute(costPrice, currentPrice, 1100);
      expect(lowMarginRoute.requiresDirectorApproval).toBe(true);
      expect(lowMarginRoute.marginPercentage).toBeLessThan(15);

      // Case 4: Price reduction > 10% tolerance (1500 -> 1300 = 13.3% cut)
      const highCutRoute = determinePriceApprovalRoute(costPrice, currentPrice, 1300);
      expect(highCutRoute.requiresDirectorApproval).toBe(true);
      expect(highCutRoute.reason).toMatch(/exceeds 10% tolerance/i);

      // Case 5: Healthy price proposal (1500 -> 1450 = 3.3% cut, margin = 31% > 15%)
      const normalRoute = determinePriceApprovalRoute(costPrice, currentPrice, 1450);
      expect(normalRoute.requiresDirectorApproval).toBe(false);
      expect(normalRoute.reason).toMatch(/Manager approval sufficient/i);
    });
  });

  describe('7. FINANCE_MANAGER Role Boundaries', () => {
    it('cannot access operational modules outside finance domain (/inventory, /pos, /settings)', () => {
      expect(canAccessRoute('FINANCE_MANAGER', '/inventory')).toBe(false);
      expect(canAccessRoute('FINANCE_MANAGER', '/pos')).toBe(false);
      expect(canAccessRoute('FINANCE_MANAGER', '/settings')).toBe(false);

      // Financial and billing modules permitted
      expect(canAccessRoute('FINANCE_MANAGER', '/finance')).toBe(true);
      expect(canAccessRoute('FINANCE_MANAGER', '/invoices')).toBe(true);
      expect(canAccessRoute('FINANCE_MANAGER', '/payments')).toBe(true);
      expect(canAccessRoute('FINANCE_MANAGER', '/approvals')).toBe(true);
    });

    it('cannot modify product catalog or approve product price changes', () => {
      expect(hasPermission('FINANCE_MANAGER', 'products:create')).toBe(false);
      expect(hasPermission('FINANCE_MANAGER', 'products:edit')).toBe(false);
      expect(hasPermission('FINANCE_MANAGER', 'products:price_approval')).toBe(false);
    });

    it('cannot approve sales orders or perform warehouse picking/issue', () => {
      expect(hasPermission('FINANCE_MANAGER', 'orders:approve_standard')).toBe(false);
      expect(hasPermission('FINANCE_MANAGER', 'orders:approve_special')).toBe(false);
      expect(hasPermission('FINANCE_MANAGER', 'inventory:pick_issue')).toBe(false);
      expect(hasPermission('FINANCE_MANAGER', 'inventory:grn_create')).toBe(false);
      expect(hasPermission('FINANCE_MANAGER', 'inventory:grn_approve')).toBe(false);

      expect(canApproveOrder('FINANCE_MANAGER', 'SALES_MANAGER', false)).toBe(false);
      expect(canApproveOrder('FINANCE_MANAGER', 'DIRECTOR', true)).toBe(false);
    });

    it('holds exclusive operational authority to approve customer payments', () => {
      expect(hasPermission('FINANCE_MANAGER', 'payments:approve')).toBe(true);
      expect(hasPermission('MANAGER', 'payments:approve')).toBe(false);
      expect(hasPermission('SALES_MANAGER', 'payments:approve')).toBe(false);
      expect(hasPermission('SALES_REP', 'payments:approve')).toBe(false);
      expect(hasPermission('STOCK_KEEPER', 'payments:approve')).toBe(false);
      expect(hasPermission('CASHIER', 'payments:approve')).toBe(false);
    });
  });

  describe('8. DIRECTOR Role Boundaries & Supreme Overrides', () => {
    it('has unrestricted access across all system routes', () => {
      const allRoutes = [
        '/',
        '/products',
        '/customers',
        '/approvals',
        '/quotations',
        '/orders',
        '/inventory',
        '/pos',
        '/invoices',
        '/payments',
        '/finance',
        '/warranty',
        '/commissions',
        '/reports',
        '/audit',
        '/settings',
      ];
      for (const route of allRoutes) {
        expect(canAccessRoute('DIRECTOR', route)).toBe(true);
      }
    });

    it('holds override authority for special orders, pricing breaches, and exceptional terms', () => {
      // Special orders
      expect(canApproveOrder('DIRECTOR', 'DIRECTOR', true)).toBe(true);
      expect(canApproveOrder('DIRECTOR', 'MANAGER', true)).toBe(true);
      expect(canApproveOrder('DIRECTOR', 'SALES_MANAGER', false)).toBe(true);

      // Customer commercial terms
      expect(canApproveCustomerStage('DIRECTOR', 'PENDING_DIRECTOR_APPROVAL')).toBe(true);
      expect(canApproveCustomerStage('DIRECTOR', 'PENDING_MANAGER_APPROVAL')).toBe(true);
      expect(canApproveCustomerStage('DIRECTOR', 'PENDING_SALES_REVIEW')).toBe(true);

      // Payments
      expect(hasPermission('DIRECTOR', 'payments:approve')).toBe(true);

      // GRNs
      expect(hasPermission('DIRECTOR', 'inventory:grn_approve')).toBe(true);
    });
  });

  describe('9. Comprehensive RBAC Matrix Integrity Across All 8 Roles', () => {
    it('ensures distinct permissions and no unauthorized elevation', () => {
      const allRoles: UserRole[] = [
        'DIRECTOR',
        'MANAGER',
        'SALES_MANAGER',
        'FINANCE_MANAGER',
        'AREA_MANAGER',
        'SALES_REP',
        'STOCK_KEEPER',
        'CASHIER',
      ];

      for (const role of allRoles) {
        const perms = ROLE_PERMISSIONS[role];
        expect(perms).toBeDefined();
        expect(perms.length).toBeGreaterThan(0);
      }

      // Director has the widest authority
      expect(ROLE_PERMISSIONS.DIRECTOR.length).toBeGreaterThan(ROLE_PERMISSIONS.MANAGER.length);
      expect(ROLE_PERMISSIONS.MANAGER.length).toBeGreaterThan(ROLE_PERMISSIONS.SALES_REP.length);

      // Only Finance Manager, Manager, and Director have payments:approve
      expect(hasPermission('DIRECTOR', 'payments:approve')).toBe(true);
      expect(hasPermission('MANAGER', 'payments:approve')).toBe(false);
      expect(hasPermission('FINANCE_MANAGER', 'payments:approve')).toBe(true);
      expect(hasPermission('SALES_REP', 'payments:approve')).toBe(false);
      expect(hasPermission('STOCK_KEEPER', 'payments:approve')).toBe(false);
      expect(hasPermission('CASHIER', 'payments:approve')).toBe(false);
      expect(hasPermission('AREA_MANAGER', 'payments:approve')).toBe(false);
    });
  });
});
