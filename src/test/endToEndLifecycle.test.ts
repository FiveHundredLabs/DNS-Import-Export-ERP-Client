import { describe, it, expect, beforeEach } from 'vitest';
import { CustomerService } from '../services/CustomerService';
import { ProductService } from '../services/ProductService';
import { QuotationService } from '../services/QuotationService';
import { OrderService } from '../services/OrderService';
import { InvoiceService } from '../services/InvoiceService';
import { PaymentService } from '../services/PaymentService';
import { InventoryService } from '../services/InventoryService';
import { WarrantyService } from '../services/WarrantyService';
import { CommissionService } from '../services/CommissionService';
import { POSService } from '../services/POSService';
import { ApprovalService } from '../services/ApprovalService';

import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { MockQuotationRepository } from '../repositories/mock/MockQuotationRepository';
import { MockSalesOrderRepository } from '../repositories/mock/MockSalesOrderRepository';
import { MockInvoiceRepository } from '../repositories/mock/MockInvoiceRepository';
import { MockPaymentRepository } from '../repositories/mock/MockPaymentRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { MockWarrantyRepository } from '../repositories/mock/MockWarrantyRepository';
import { MockCommissionRepository } from '../repositories/mock/MockCommissionRepository';
import { MockPOSRepository } from '../repositories/mock/MockPOSRepository';
import { MockApprovalRepository } from '../repositories/mock/MockApprovalRepository';

import { MOCK_USERS } from '../mock/mockUsers';

describe('Phase 12 — Full Cross-Module End-to-End Workflow Testing (Section 82, 101, 104)', () => {
  let customerRepo: MockCustomerRepository;
  let customerSvc: CustomerService;
  let productRepo: MockProductRepository;
  let productSvc: ProductService;
  let quotationRepo: MockQuotationRepository;
  let quotationSvc: QuotationService;
  let orderRepo: MockSalesOrderRepository;
  let orderSvc: OrderService;
  let invoiceRepo: MockInvoiceRepository;
  let invoiceSvc: InvoiceService;
  let paymentRepo: MockPaymentRepository;
  let paymentSvc: PaymentService;
  let invRepo: MockInventoryRepository;
  let invSvc: InventoryService;
  let warrantyRepo: MockWarrantyRepository;
  let warrantySvc: WarrantyService;
  let commissionRepo: MockCommissionRepository;
  let commissionSvc: CommissionService;
  let posRepo: MockPOSRepository;
  let posSvc: POSService;
  let approvalRepo: MockApprovalRepository;
  let approvalSvc: ApprovalService;

  const areaManagerUser = MOCK_USERS.find((u) => u.role === 'AREA_MANAGER')!; // usr-105
  const salesManagerUser = MOCK_USERS.find((u) => u.role === 'SALES_MANAGER')!; // usr-103
  const managerUser = MOCK_USERS.find((u) => u.role === 'MANAGER')!; // usr-102
  const directorUser = MOCK_USERS.find((u) => u.role === 'DIRECTOR')!; // usr-101
  const salesRepUser = MOCK_USERS.find((u) => u.role === 'SALES_REP')!; // usr-106
  const stockKeeperUser = MOCK_USERS.find((u) => u.role === 'STOCK_KEEPER')!; // usr-107
  const financeManagerUser = MOCK_USERS.find((u) => u.role === 'FINANCE_MANAGER')!; // usr-104
  const cashierUser = MOCK_USERS.find((u) => u.role === 'CASHIER')!; // usr-108

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
    invoiceRepo = new MockInvoiceRepository();
    invoiceSvc = new InvoiceService(invoiceRepo, orderSvc, customerSvc);
    paymentRepo = new MockPaymentRepository();
    paymentSvc = new PaymentService(paymentRepo, customerSvc, invoiceSvc, approvalSvc);
    invRepo = new MockInventoryRepository();
    invSvc = new InventoryService(invRepo);
    warrantyRepo = new MockWarrantyRepository();
    warrantySvc = new WarrantyService(warrantyRepo, customerRepo, productRepo);
    commissionRepo = new MockCommissionRepository();
    commissionSvc = new CommissionService(commissionRepo);
    posRepo = new MockPOSRepository();
    posSvc = new POSService(posRepo, invRepo, productRepo);
  });

  it(
    'executes the complete operational lifecycle seamlessly from customer setup to commission settlement',
    async () => {
    // -------------------------------------------------------------------------
    // STEP 1: Customer Creation (Area Manager) -> Terms (Sales Manager) -> Approval (Manager)
    // -------------------------------------------------------------------------
    const createdCustomer = await customerSvc.createCustomer({
      code: 'CUST-E2E-999',
      name: 'Lanka Electrics & Automation Ltd',
      type: 'DEALER',
      areaId: areaManagerUser.areaId || 'area-01',
      areaName: areaManagerUser.areaName || 'Western Province Central',
      assignedRepId: salesRepUser.id,
      assignedRepName: salesRepUser.name,
      contactPerson: 'Sunil Weerasinghe',
      phone: '+94 77 987 6543',
      email: 'sunil@lankaelectrics.lk',
      address: 'No 45, High Level Road, Maharagama',
      commercialTerms: {
        creditLimit: 500000,
        creditDays: 30,
        defaultDiscountPercentage: 5,
        maxDiscountPercentage: 10,
      },
      approvalStage: 'PENDING_SALES_REVIEW',
      status: 'INACTIVE',
      warrantyNotesExpected: 0,
      warrantyNotesReceived: 0,
    });

    expect(createdCustomer.id).toBeDefined();
    expect(createdCustomer.approvalStage).toBe('PENDING_SALES_REVIEW');

    // Sales Manager sets agreed commercial terms (Standard <= 30 days)
    const termsResult = await customerSvc.setCommercialTerms(createdCustomer.id, {
      creditLimit: 600000,
      creditDays: 30,
      defaultDiscountPercentage: 5,
      maxDiscountPercentage: 12,
    });

    expect(termsResult.targetApprovalRole).toBe('MANAGER');
    expect(termsResult.isExceptional).toBe(false);
    expect(termsResult.customer.approvalStage).toBe('PENDING_MANAGER_APPROVAL');

    // Manager approves customer setup
    const approvedCustomer = await customerSvc.finalizeApproval(createdCustomer.id, true);
    expect(approvedCustomer.approvalStage).toBe('APPROVED');

    // -------------------------------------------------------------------------
    // STEP 2: Quotation Created for Customer (Sales Rep) from Canonical Product Master
    // -------------------------------------------------------------------------
    const product = await productSvc.createProduct({
      sku: 'DNS-MCB-E2E-32A',
      name: 'DNS Premium MCB 32A Double Pole',
      description: 'Industrial grade circuit breaker',
      categoryId: 'cat-01',
      categoryName: 'Switchgear & Breakers',
      uomId: 'uom-01',
      uomCode: 'PCS',
      barcode: '8901234999888',
      pricing: {
        costPrice: 800,
        currentSellingPrice: 1200,
        minimumSellingPrice: 1000,
        maxDiscountPercentage: 15,
        taxRatePercentage: 18,
      },
      isPromotional: false,
      warrantyPeriodMonths: 24,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      stockOnHand: 200,
      damagedStock: 0,
    });

    expect(product.id).toBeDefined();

    // Sales rep creates quotation with requested discount of 8% (> 5% limit -> requires approval)
    const quotation = await quotationSvc.createQuotation(
      {
        customerId: approvedCustomer.id,
        items: [
          {
            productId: product.id,
            quantity: 50,
            requestedDiscountPercentage: 8,
          },
        ],
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notes: 'Wholesale tender quotation for Lanka Electrics',
      },
      salesRepUser
    );

    expect(quotation.status).toBe('PENDING_APPROVAL');
    expect(quotation.requiresApproval).toBe(true);

    // -------------------------------------------------------------------------
    // STEP 3: Discount Validated -> Quotation Approved
    // -------------------------------------------------------------------------
    const approvedQuotation = await quotationSvc.approveQuotation(
      quotation.id,
      salesManagerUser,
      'Approved 8% project discount for volume tender.'
    );

    expect(approvedQuotation.status).toBe('APPROVED');
    expect(approvedQuotation.approvedById).toBe(salesManagerUser.id);

    // -------------------------------------------------------------------------
    // STEP 4: Quotation Converted to Sales Order -> Preserves Snapshots and Linkage
    // -------------------------------------------------------------------------
    const order = await orderSvc.createFromQuotation(approvedQuotation.id, salesRepUser, {
      deliveryAddress: 'No 45, High Level Road, Maharagama',
      requestedCreditDays: 30,
    });

    expect(order.quotationId).toBe(approvedQuotation.id);
    expect(order.quotationNumber).toBe(approvedQuotation.quotationNumber);
    expect(order.items.length).toBe(1);
    expect(order.items[0].productId).toBe(product.id);
    expect(order.items[0].unitPriceSnapshot).toBe(1200);
    expect(order.items[0].discountPercentage).toBe(8);
    expect(order.items[0].orderedQuantity).toBe(50);
    expect(order.subtotal).toBe(60000); // 1200 * 50

    // -------------------------------------------------------------------------
    // STEP 5: Order Evaluated (Standard vs Special) -> Routed to Sales Manager -> Approved
    // -------------------------------------------------------------------------
    expect(order.targetApproverRole).toBe('SALES_MANAGER');

    const approvedOrder = await orderSvc.approveOrder(
      order.id,
      salesManagerUser,
      'Sales Order approved by Sales Manager.'
    );

    expect(approvedOrder.status).toBe('APPROVED');
    expect(approvedOrder.approvedById).toBe(salesManagerUser.id);

    // -------------------------------------------------------------------------
    // STEP 6: Warehouse Picking -> Stock Checked -> Issued (SALES_ISSUE Movement, Deducts Stock)
    // -------------------------------------------------------------------------
    // Set initial warehouse stock
    await invRepo.saveBalance({
      id: 'bal-wh-e2e',
      productId: product.id,
      locationId: 'wh-main',
      locationType: 'WAREHOUSE',
      availableQuantity: 200,
      reservedQuantity: 0,
      damagedQuantity: 0,
      returnedQuantity: 0,
      lastUpdated: new Date().toISOString(),
    });

    // Advance to PICKING
    const pickingOrder = await orderSvc.updateFulfillmentStatus(
      approvedOrder.id,
      'PICKING',
      stockKeeperUser,
      { comment: 'Picking items from aisle B-04' }
    );
    expect(pickingOrder.status).toBe('PICKING');

    // Boundary check: Attempting to issue in excess of available warehouse stock is blocked
    await expect(
      invSvc.executeSalesIssue(product.id, 'wh-main', 500, approvedOrder.orderNumber, stockKeeperUser)
    ).rejects.toThrow(/Insufficient stock to issue/i);

    // Issue stock and record SALES_ISSUE movement
    await invSvc.executeSalesIssue(
      product.id,
      'wh-main',
      50,
      approvedOrder.orderNumber,
      stockKeeperUser
    );

    const issuedOrder = await orderSvc.updateFulfillmentStatus(
      pickingOrder.id,
      'ISSUED',
      stockKeeperUser,
      {
        issuedQuantities: { [pickingOrder.items[0].id]: 50 },
        comment: 'All 50 units issued to delivery staging.',
      }
    );
    expect(issuedOrder.status).toBe('ISSUED');
    expect(issuedOrder.items[0].issuedQuantity).toBe(50);

    // Verify stock decreased in warehouse
    const warehouseBal = await invRepo.getBalance(product.id, 'wh-main');
    expect(warehouseBal?.availableQuantity).toBe(150);

    // Verify SALES_ISSUE audit movement
    const movements = await invRepo.getMovements();
    const issueMov = movements.find(
      (m) => m.productId === product.id && m.movementType === 'SALES_ISSUE' && m.referenceDocumentId === approvedOrder.orderNumber
    );
    expect(issueMov).toBeDefined();
    expect(issueMov?.quantity).toBe(50);

    // -------------------------------------------------------------------------
    // STEP 7: Invoice Generated from Order -> Preserves Snapshots -> Order Status Updated to INVOICED
    // -------------------------------------------------------------------------
    const invoice = await invoiceSvc.createInvoiceFromOrder(issuedOrder.id, salesManagerUser);
    expect(invoice.id).toBeDefined();
    expect(invoice.orderId).toBe(issuedOrder.id);
    expect(invoice.orderNumber).toBe(issuedOrder.orderNumber);
    expect(invoice.items[0].unitPriceSnapshot).toBe(1200);
    expect(invoice.items[0].quantity).toBe(50);
    expect(invoice.balanceAmount).toBe(invoice.totalAmount);
    expect(invoice.paidAmount).toBe(0);

    // Verify Order state advanced to INVOICED
    const invoicedOrder = await orderSvc.getOrder(issuedOrder.id);
    expect(invoicedOrder?.status).toBe('INVOICED');

    // Customer Master financials updated (totalOutstanding increases)
    const customerWithDebt = await customerSvc.getCustomer(approvedCustomer.id);
    expect(customerWithDebt?.financials.totalOutstanding).toBe(invoice.totalAmount);

    // -------------------------------------------------------------------------
    // STEP 8: Order Dispatched -> Delivered (DISPATCHED -> DELIVERED)
    // -------------------------------------------------------------------------
    const dispatchedOrder = await orderSvc.updateFulfillmentStatus(
      invoicedOrder!.id,
      'DISPATCHED',
      stockKeeperUser,
      { comment: 'Loaded on delivery lorry WP-NB-1234.' }
    );
    expect(dispatchedOrder.status).toBe('DISPATCHED');

    const deliveredOrder = await orderSvc.updateFulfillmentStatus(
      dispatchedOrder.id,
      'DELIVERED',
      salesRepUser,
      { comment: 'Delivered and acknowledged by customer storekeeper.' }
    );
    expect(deliveredOrder.status).toBe('DELIVERED');

    // -------------------------------------------------------------------------
    // STEP 9: Payment Collected by Sales Rep -> Status PENDING_APPROVAL (Balances UNTOUCHED)
    // -------------------------------------------------------------------------
    const payment = await paymentSvc.recordPayment(
      {
        customerId: approvedCustomer.id,
        amount: invoice.totalAmount,
        paymentMethod: 'CHEQUE',
        chequeNumber: 'CHQ-778899',
        chequeDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        bankName: 'Sampath Bank PLC',
        invoiceAllocations: [
          {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            allocatedAmount: invoice.totalAmount,
          },
        ],
        notes: 'PDC cheque collected by Kasun.',
      },
      salesRepUser
    );

    expect(payment.status).toBe('PENDING_APPROVAL');

    // Safeguard verification: Balances MUST NOT be reduced yet!
    const customerBeforeApproval = await customerSvc.getCustomer(approvedCustomer.id);
    expect(customerBeforeApproval?.financials.totalOutstanding).toBe(invoice.totalAmount);
    expect(customerBeforeApproval?.financials.availableCredit).toBe(
      approvedCustomer.commercialTerms.creditLimit - invoice.totalAmount
    );

    const invoiceBeforeApproval = await invoiceSvc.getInvoiceById(invoice.id);
    expect(invoiceBeforeApproval?.balanceAmount).toBe(invoice.totalAmount);

    // -------------------------------------------------------------------------
    // STEP 10: Finance Manager Approves Payment -> Invoice Marked PAID, Credit Restored
    // -------------------------------------------------------------------------
    const approvedPayment = await paymentSvc.approvePayment(
      payment.id,
      financeManagerUser,
      'Cheque cleared and realized in corporate bank account.'
    );
    expect(approvedPayment.status).toBe('APPROVED');

    // Invoice status is now PAID
    const paidInvoice = await invoiceSvc.getInvoiceById(invoice.id);
    expect(paidInvoice?.status).toBe('PAID');
    expect(paidInvoice?.balanceAmount).toBe(0);
    expect(paidInvoice?.paidAmount).toBe(invoice.totalAmount);

    // Customer available credit restored and total outstanding cleared
    const customerSettled = await customerSvc.getCustomer(approvedCustomer.id);
    expect(customerSettled?.financials.totalOutstanding).toBe(0);
    expect(customerSettled?.financials.availableCredit).toBe(customerSettled?.commercialTerms.creditLimit);

    // -------------------------------------------------------------------------
    // STEP 11: Warranty Registered from Invoice -> Claim Filed -> Inspected -> Approved -> Resolved
    // -------------------------------------------------------------------------
    const warrantyRecord = await warrantySvc.registerWarranty(
      paidInvoice!,
      paidInvoice!.items[0],
      'DEALER',
      new Date().toISOString().split('T')[0],
      'SN-MCB-2026-9901'
    );

    expect(warrantyRecord.status).toBe('ACTIVE');
    expect(warrantyRecord.invoiceId).toBe(paidInvoice!.id);
    expect(warrantyRecord.productId).toBe(product.id);

    // Claim filed
    const claim = await warrantySvc.createClaim(
      {
        warrantyRecordId: warrantyRecord.id,
        complaintDate: new Date().toISOString().split('T')[0],
        complaintReason: 'Terminal screw stripped upon installation.',
        serialNumber: 'SN-MCB-2026-9901',
      },
      salesRepUser
    );
    expect(claim.status).toBe('SUBMITTED');

    // Claim inspected
    const inspectedClaim = await warrantySvc.inspectClaim(
      claim.id,
      managerUser,
      'Workshop verified defective brass threading.'
    );
    expect(inspectedClaim.status).toBe('IN_INSPECTION');

    // Claim approved
    const approvedClaim = await warrantySvc.approveClaim(
      inspectedClaim.id,
      managerUser,
      'Approved manufacturer defect warranty replacement.'
    );
    expect(approvedClaim.status).toBe('APPROVED');

    // Claim resolved
    const resolvedClaim = await warrantySvc.resolveClaim(
      approvedClaim.id,
      'REPLACE',
      'Issued new replacement unit to customer.',
      managerUser
    );
    expect(resolvedClaim.status).toBe('REPLACED');
    expect(resolvedClaim.resolutionType).toBe('REPLACE');

    // -------------------------------------------------------------------------
    // STEP 12: Sales Rep Commission Updated Based on Sales Achievement
    // -------------------------------------------------------------------------
    await commissionSvc.setSalesTarget(
      {
        salesRepId: salesRepUser.id,
        salesRepName: salesRepUser.name,
        periodType: 'MONTHLY',
        startDate: new Date().toISOString().slice(0, 7) + '-01',
        endDate: new Date().toISOString().slice(0, 7) + '-28',
        targetAmount: 50000,
      },
      salesManagerUser
    );

    // Record achievement from the fulfilled invoice subtotal
    await commissionSvc.recordAchievement(salesRepUser.id, invoice.subtotal);

    const commissionSummary = await commissionSvc.getRepCommissionSummary(salesRepUser.id);
    expect(commissionSummary.achievedAmount).toBe(invoice.subtotal);
    expect(commissionSummary.achievementPercentage).toBeGreaterThanOrEqual(100);
    expect(commissionSummary.earnedCommission).toBeGreaterThan(0);
  }, 30000);

  describe('Master Data Immutability Guarantees Across Transactions', () => {
    it('Product Master price update does NOT alter completed quotation, order, invoice, or POS transaction', async () => {
      // 1. Setup Product
      const product = await productSvc.createProduct({
        sku: 'DNS-IMMUTABLE-PROD',
        name: 'Immutable Circuit Breaker',
        description: 'Test product for snapshot verification',
        categoryId: 'cat-01',
        categoryName: 'Switchgear',
        uomId: 'uom-01',
        uomCode: 'PCS',
        barcode: '8901234777111',
        pricing: {
          costPrice: 500,
          currentSellingPrice: 1000,
          minimumSellingPrice: 800,
          maxDiscountPercentage: 10,
          taxRatePercentage: 18,
        },
        isPromotional: false,
        warrantyPeriodMonths: 12,
        status: 'ACTIVE',
        approvalStatus: 'APPROVED',
        stockOnHand: 100,
        damagedStock: 0,
      });

      // 2. Complete Quotation
      const quotation = await quotationSvc.createQuotation(
        {
          customerId: 'cust-001',
          items: [{ productId: product.id, quantity: 5, requestedDiscountPercentage: 0 }],
        },
        salesRepUser
      );

      // 3. Complete Sales Order
      const order = await orderSvc.createOrder(
        {
          customerId: 'cust-001',
          items: [{ productId: product.id, quantity: 5, discountPercentage: 0 }],
        },
        salesRepUser
      );
      await orderSvc.approveOrder(order.id, salesManagerUser, 'Approved');

      // 4. Complete Invoice
      const invoice = await invoiceSvc.createInvoiceFromOrder(order.id, salesManagerUser);

      // 5. Complete POS Sale
      await invRepo.saveBalance({
        id: 'bal-showroom-imm',
        productId: product.id,
        locationId: 'SHOWROOM',
        locationType: 'SHOWROOM',
        availableQuantity: 50,
        reservedQuantity: 0,
        damagedQuantity: 0,
        returnedQuantity: 0,
        lastUpdated: new Date().toISOString(),
      });

      let posSession = await posRepo.getActiveSession(cashierUser.id);
      if (!posSession) {
        posSession = await posSvc.openSession(cashierUser, 5000);
      }
      const posTx = await posSvc.processCheckout(
        posSession.id,
        {
          items: [{ productId: product.id, quantity: 2, discountPercentage: 0 }],
          paymentMethod: 'CASH',
          cashTendered: 3000,
        },
        cashierUser
      );

      // Verify baseline prices across all 4 documents
      expect(quotation.items[0].unitPriceSnapshot).toBe(1000);
      expect(order.items[0].unitPriceSnapshot).toBe(1000);
      expect(invoice.items[0].unitPriceSnapshot).toBe(1000);
      expect(posTx.items[0].unitPriceSnapshot).toBe(1000);

      // Mutate Product Master Price by +150% (1000 -> 2500)
      await productSvc.updateProduct(product.id, {
        pricing: {
          ...product.pricing,
          currentSellingPrice: 2500,
        },
      });

      // Refetch and verify all 4 transaction documents remain completely immutable!
      const refreshedQuotation = await quotationSvc.getQuotationById(quotation.id);
      expect(refreshedQuotation?.items[0].unitPriceSnapshot).toBe(1000);

      const refreshedOrder = await orderSvc.getOrder(order.id);
      expect(refreshedOrder?.items[0].unitPriceSnapshot).toBe(1000);

      const refreshedInvoice = await invoiceSvc.getInvoiceById(invoice.id);
      expect(refreshedInvoice?.items[0].unitPriceSnapshot).toBe(1000);

      const refreshedPosTx = await posRepo.getTransactionById(posTx.id);
      expect(refreshedPosTx?.items[0].unitPriceSnapshot).toBe(1000);
    });

    it('Customer credit days update does NOT mutate historical invoices or orders', async () => {
      // 1. Create Customer with 30 credit days
      const customer = await customerRepo.create({
        code: 'CUST-IMM-DAYS',
        name: 'Terms Immutability Dealer',
        type: 'DEALER',
        areaId: 'area-01',
        assignedRepId: salesRepUser.id,
        contactPerson: 'Perera',
        phone: '+94 77 123 0000',
        email: 'terms@test.lk',
        address: 'Colombo',
        commercialTerms: { creditLimit: 500000, creditDays: 30, defaultDiscountPercentage: 5, maxDiscountPercentage: 10 },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
      });

      // 2. Create Order & Invoice
      const order = await orderSvc.createOrder(
        {
          customerId: customer.id,
          items: [{ productId: 'prod-001', quantity: 2, discountPercentage: 0 }],
          requestedCreditDays: 30,
        },
        salesRepUser
      );
      await orderSvc.approveOrder(order.id, salesManagerUser, 'Approved');

      const invoice = await invoiceSvc.createInvoiceFromOrder(order.id, salesManagerUser);
      const originalDueDate = invoice.dueDate;
      const originalOrderDays = order.requestedCreditDays;

      // 3. Mutate Customer Master credit days from 30 -> 60
      await customerSvc.setCommercialTerms(customer.id, {
        ...customer.commercialTerms,
        creditDays: 60,
      });

      // 4. Verify historical invoice and order retain original snapshot terms
      const refreshedOrder = await orderSvc.getOrder(order.id);
      expect(refreshedOrder?.requestedCreditDays).toBe(originalOrderDays);
      expect(refreshedOrder?.customerCreditDaysSnapshot).toBe(30);

      const refreshedInvoice = await invoiceSvc.getInvoiceById(invoice.id);
      expect(refreshedInvoice?.dueDate).toBe(originalDueDate);
      expect(refreshedInvoice?.paymentTerms).toMatch(/30 Days/i);
    });
  });
});
