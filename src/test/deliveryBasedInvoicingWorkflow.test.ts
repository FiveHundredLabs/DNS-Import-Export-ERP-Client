import { describe, it, expect, beforeEach } from 'vitest';
import { InvoiceService } from '../services/InvoiceService';
import { OrderService, orderService } from '../services/OrderService';
import { DeliveryNoteService } from '../services/DeliveryNoteService';
import { OrderActivityService, orderActivityService } from '../services/OrderActivityService';
import { MockInvoiceRepository } from '../repositories/mock/MockInvoiceRepository';
import { MockSalesOrderRepository } from '../repositories/mock/MockSalesOrderRepository';
import { CustomerService, customerService } from '../services/CustomerService';
import { TaxService } from '../services/TaxService';
import { SalesOrder } from '../types/order';
import { DeliveryNote } from '../types/deliveryNote';
import { User } from '../types/auth';

describe('Delivery-Based Invoicing & Chronological Activity Timeline Workflow', () => {
  let invoiceRepo: MockInvoiceRepository;
  let orderRepo: MockSalesOrderRepository;
  let orderSvc: OrderService;
  let customerSvc: CustomerService;
  let taxSvc: TaxService;
  let deliveryNoteSvc: DeliveryNoteService;
  let invoiceSvc: InvoiceService;
  let orderActivitySvc: OrderActivityService;

  const salesManagerUser: User = {
    id: 'usr-sm-01',
    name: 'Kamal Perera',
    email: 'kamal.perera@dns.lk',
    role: 'SALES_MANAGER',
    permissions: [],
  };

  const stockKeeperUser: User = {
    id: 'usr-sk-01',
    name: 'Amal Perera',
    email: 'amal.perera@dns.lk',
    role: 'STOCK_KEEPER',
    permissions: [],
  };

  const salesRepUser: User = {
    id: 'usr-rep-01',
    name: 'Kasun Wickramasinghe',
    email: 'kasun.w@dns.lk',
    role: 'SALES_REP',
    permissions: [],
  };

  beforeEach(() => {
    invoiceRepo = new MockInvoiceRepository();
    orderSvc = orderService;
    orderRepo = (orderService as any).repo;
    customerSvc = customerService;
    taxSvc = new TaxService();
    deliveryNoteSvc = new DeliveryNoteService();
    deliveryNoteSvc.resetToDefaults();
    orderActivitySvc = orderActivityService;

    invoiceSvc = new InvoiceService(
      invoiceRepo,
      orderSvc,
      customerSvc,
      taxSvc,
      deliveryNoteSvc
    );
  });

  it('Requirement 1: Enforces that only APPROVED sales orders can be invoiced', async () => {
    // 1. Create a draft order
    const draftOrder: SalesOrder = {
      id: 'ord-test-draft',
      orderNumber: 'SO-TEST-DRAFT-01',
      customerId: 'cust-001',
      customerNameSnapshot: 'Lanka Electrical Mart',
      customerCodeSnapshot: 'DLR-COL-001',
      salesRepId: salesRepUser.id,
      salesRepNameSnapshot: salesRepUser.name,
      items: [
        {
          id: 'item-d1',
          productId: 'prod-001',
          productNameSnapshot: 'Schneider MCB 32A',
          skuSnapshot: 'DNS-MCB-32A',
          unitPriceSnapshot: 1000,
          discountPercentage: 0,
          orderedQuantity: 10,
          approvedQuantity: 0,
          lineTotal: 10000,
          taxPercentage: 0,
        },
      ],
      subtotal: 10000,
      totalAmount: 10000,
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const createdDraft = await orderRepo.create(draftOrder);

    // Attempting to generate invoice for unapproved order must throw an error
    await expect(
      invoiceSvc.createInvoiceFromOrder(createdDraft.id, salesManagerUser)
    ).rejects.toThrow(/Only APPROVED/i);
  });

  it('Scenario A – Full Delivery: Generates one single invoice covering all delivered items when 100% delivered with 0 returns/damages', async () => {
    // 1. Create Approved Order with 10 units of product A and 5 units of product B
    const orderNumber = 'SO-SCENARIO-A-1001';

    const order: SalesOrder = {
      id: 'ord-temp-a',
      orderNumber,
      customerId: 'cust-001',
      customerNameSnapshot: 'Lanka Hardware Superstore',
      customerCodeSnapshot: 'DLR-COL-001',
      salesRepId: salesRepUser.id,
      salesRepNameSnapshot: salesRepUser.name,
      status: 'APPROVED',
      items: [
        {
          id: 'item-a1',
          productId: 'prod-001',
          productNameSnapshot: 'Schneider Acti9 32A Double Pole MCB',
          skuSnapshot: 'DNS-MCB-32A-2P',
          unitPriceSnapshot: 3000,
          discountPercentage: 10,
          orderedQuantity: 10,
          approvedQuantity: 10,
          taxPercentage: 0,
          lineTotal: 27000,
        },
        {
          id: 'item-a2',
          productId: 'prod-002',
          productNameSnapshot: 'Schneider Acti9 63A Triple Pole MCB',
          skuSnapshot: 'DNS-MCB-63A-3P',
          unitPriceSnapshot: 8000,
          discountPercentage: 5,
          orderedQuantity: 5,
          approvedQuantity: 5,
          taxPercentage: 0,
          lineTotal: 38000,
        },
      ],
      subtotal: 70000,
      totalAmount: 65000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const createdOrderA = await orderRepo.create(order);
    const orderId = createdOrderA.id;

    // 2. Full Delivery Note created and marked DELIVERED (100% accepted, 0 damages, 0 returns)
    const deliveryNote: DeliveryNote = {
      id: 'dn-scenario-a-1',
      deliveryNoteNumber: 'DN-2026-A01',
      orderId,
      orderNumber,
      customerId: 'cust-001',
      customerName: 'Lanka Hardware Superstore',
      customerCode: 'DLR-COL-001',
      driverName: 'Kamal Silva',
      vehicleNumber: 'WP LF-4412',
      dispatchDate: '2026-10-30',
      status: 'DELIVERED',
      totalInvoicedUnits: 15,
      totalDispatchedUnits: 15,
      totalAcceptedUnits: 15,
      totalRejectedUnits: 0,
      items: [
        {
          id: 'dn-item-a1',
          productId: 'prod-001',
          productName: 'Schneider Acti9 32A Double Pole MCB',
          sku: 'DNS-MCB-32A-2P',
          uom: 'PCS',
          invoicedQuantity: 10,
          dispatchedQuantity: 10,
          acceptedQuantity: 10,
          rejectedQuantity: 0,
          unitBarcodes: ['BC-A1', 'BC-A2', 'BC-A3', 'BC-A4', 'BC-A5', 'BC-A6', 'BC-A7', 'BC-A8', 'BC-A9', 'BC-A10'],
          rejectedUnitBarcodes: [],
        },
        {
          id: 'dn-item-a2',
          productId: 'prod-002',
          productName: 'Schneider Acti9 63A Triple Pole MCB',
          sku: 'DNS-MCB-63A-3P',
          uom: 'PCS',
          invoicedQuantity: 5,
          dispatchedQuantity: 5,
          acceptedQuantity: 5,
          rejectedQuantity: 0,
          unitBarcodes: ['BC-B1', 'BC-B2', 'BC-B3', 'BC-B4', 'BC-B5'],
          rejectedUnitBarcodes: [],
        },
      ],
      createdBy: 'Amal Perera (Stock Keeper)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await deliveryNoteSvc.addDeliveryNote(deliveryNote);

    // 3. Inspect Invoicing Status
    const statusBefore = await invoiceSvc.getOrderDeliveryInvoicingStatus(orderId);
    expect(statusBefore.summary.isFullyDelivered).toBe(true);
    expect(statusBefore.summary.hasDamages).toBe(false);
    expect(statusBefore.summary.hasReturns).toBe(false);
    expect(statusBefore.summary.isReadyToInvoice).toBe(true);
    expect(statusBefore.summary.totalUninvoicedDeliveredUnits).toBe(15);

    // 4. Generate Single Invoice covering all delivered quantities
    const invoice = await invoiceSvc.createInvoiceFromOrder(orderId, salesManagerUser);
    expect(invoice).toBeDefined();
    expect(invoice.status).toBe('ISSUED');
    expect(invoice.items.length).toBe(2);
    expect(invoice.items[0].quantity).toBe(10);
    expect(invoice.items[1].quantity).toBe(5);

    // 5. Verify order is now fully invoiced and duplicate invoicing is prevented
    const statusAfter = await invoiceSvc.getOrderDeliveryInvoicingStatus(orderId);
    expect(statusAfter.summary.totalPreviouslyInvoicedUnits).toBe(15);
    expect(statusAfter.summary.totalUninvoicedDeliveredUnits).toBe(0);
    expect(statusAfter.summary.isAlreadyInvoiced).toBe(true);
    expect(statusAfter.summary.isReadyToInvoice).toBe(false);

    // Attempting to duplicate invoice throws error
    await expect(
      invoiceSvc.createInvoiceFromOrder(orderId, salesManagerUser)
    ).rejects.toThrow(/already.*invoiced/i);
  });

  it('Scenario B – Partial Delivery / Returns / Damaged Items & Multi-Invoice Replacement: Excludes damaged/returned units from 1st invoice, and allows 2nd invoice when replacement is delivered', async () => {
    // 1. Order 6 units of industrial contactors
    const orderNumber = 'SO-SCENARIO-B-2002';

    const order: SalesOrder = {
      id: 'ord-temp-b',
      orderNumber,
      customerId: 'cust-003',
      customerNameSnapshot: 'Kandy Industrial Electrical Mart',
      customerCodeSnapshot: 'DLR-CP-003',
      salesRepId: salesRepUser.id,
      salesRepNameSnapshot: salesRepUser.name,
      status: 'APPROVED',
      items: [
        {
          id: 'item-b1',
          productId: 'prod-004',
          productNameSnapshot: 'Siemens Sirius 3RT 18A Contactor 230V',
          skuSnapshot: 'DNS-CON-18A-230V',
          unitPriceSnapshot: 5000,
          discountPercentage: 0,
          orderedQuantity: 6,
          approvedQuantity: 6,
          taxPercentage: 0,
          lineTotal: 30000,
        },
      ],
      subtotal: 30000,
      totalAmount: 30000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const createdOrderB = await orderRepo.create(order);
    const orderId = createdOrderB.id;

    // 2. Initial Delivery: 6 dispatched, but 2 damaged in transit / rejected, so only 4 accepted
    const initialDeliveryNote: DeliveryNote = {
      id: 'dn-scenario-b-1',
      deliveryNoteNumber: 'DN-2026-B01',
      orderId,
      orderNumber,
      customerId: 'cust-003',
      customerName: 'Kandy Industrial Electrical Mart',
      customerCode: 'DLR-CP-003',
      driverName: 'Samantha Perera',
      vehicleNumber: 'CP GA-3321',
      dispatchDate: '2026-10-30',
      status: 'REJECTION_APPROVED',
      totalInvoicedUnits: 6,
      totalDispatchedUnits: 6,
      totalAcceptedUnits: 4,
      totalRejectedUnits: 2,
      items: [
        {
          id: 'dn-item-b1',
          productId: 'prod-004',
          productName: 'Siemens Sirius 3RT 18A Contactor 230V',
          sku: 'DNS-CON-18A-230V',
          uom: 'PCS',
          invoicedQuantity: 6,
          dispatchedQuantity: 6,
          acceptedQuantity: 4,
          rejectedQuantity: 2,
          rejectionReason: 'DAMAGED_IN_TRANSIT',
          rejectionNotes: 'Terminal crushed during mountain transit.',
          unitBarcodes: ['BC-C1', 'BC-C2', 'BC-C3', 'BC-C4', 'BC-C5', 'BC-C6'],
          rejectedUnitBarcodes: ['BC-C5', 'BC-C6'],
        },
      ],
      createdBy: 'Amal Perera (Stock Keeper)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await deliveryNoteSvc.addDeliveryNote(initialDeliveryNote);

    // 3. Inspect delivery invoicing breakdown
    const statusB1 = await invoiceSvc.getOrderDeliveryInvoicingStatus(orderId);
    expect(statusB1.items[0].orderedQuantity).toBe(6);
    expect(statusB1.items[0].deliveredQuantity).toBe(4); // Accepted units only
    expect(statusB1.items[0].damagedQuantity).toBe(2); // Damaged units tracked
    expect(statusB1.items[0].uninvoicedDeliveredQuantity).toBe(4);
    expect(statusB1.summary.hasDamages).toBe(true);
    expect(statusB1.summary.isReadyToInvoice).toBe(true);

    // 4. Generate Invoice 1: Strictly for 4 accepted delivered units. 2 damaged units are excluded!
    const invoice1 = await invoiceSvc.createInvoiceFromOrder(orderId, salesManagerUser);
    expect(invoice1).toBeDefined();
    expect(invoice1.items[0].quantity).toBe(4); // Exactly 4 units invoiced
    expect(invoice1.subtotal).toBe(20000); // 4 * 5000
    expect(invoice1.totalAmount).toBe(23600); // 20000 + 18% VAT

    // 5. At this stage, all 4 delivered units are invoiced. Uninvoiced delivered = 0.
    const statusB2 = await invoiceSvc.getOrderDeliveryInvoicingStatus(orderId);
    expect(statusB2.summary.totalPreviouslyInvoicedUnits).toBe(4);
    expect(statusB2.summary.totalUninvoicedDeliveredUnits).toBe(0);
    expect(statusB2.summary.isAlreadyInvoiced).toBe(true);
    expect(statusB2.summary.isReadyToInvoice).toBe(false);

    // Trying to generate another invoice before replacement delivery fails
    await expect(
      invoiceSvc.createInvoiceFromOrder(orderId, salesManagerUser)
    ).rejects.toThrow(/already.*invoiced/i);

    // 6. Stock Keeper later delivers 2 replacement units (Delivery Note 2)
    const replacementDeliveryNote: DeliveryNote = {
      id: 'dn-scenario-b-2',
      deliveryNoteNumber: 'DN-2026-B02-REPLACEMENT',
      orderId,
      orderNumber,
      customerId: 'cust-003',
      customerName: 'Kandy Industrial Electrical Mart',
      customerCode: 'DLR-CP-003',
      driverName: 'Samantha Perera',
      vehicleNumber: 'CP GA-3321',
      dispatchDate: '2026-10-31',
      status: 'DELIVERED',
      totalInvoicedUnits: 2,
      totalDispatchedUnits: 2,
      totalAcceptedUnits: 2,
      totalRejectedUnits: 0,
      items: [
        {
          id: 'dn-item-b2-rep',
          productId: 'prod-004',
          productName: 'Siemens Sirius 3RT 18A Contactor 230V',
          sku: 'DNS-CON-18A-230V',
          uom: 'PCS',
          invoicedQuantity: 2,
          dispatchedQuantity: 2,
          acceptedQuantity: 2,
          rejectedQuantity: 0,
          unitBarcodes: ['BC-REP-1', 'BC-REP-2'],
          rejectedUnitBarcodes: [],
        },
      ],
      createdBy: 'Amal Perera (Stock Keeper)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await deliveryNoteSvc.addDeliveryNote(replacementDeliveryNote);

    // 7. Verify status updates: Total delivered is now 4 + 2 = 6, previously invoiced is 4, uninvoiced is 2!
    const statusB3 = await invoiceSvc.getOrderDeliveryInvoicingStatus(orderId);
    expect(statusB3.items[0].deliveredQuantity).toBe(6);
    expect(statusB3.items[0].previouslyInvoicedQuantity).toBe(4);
    expect(statusB3.items[0].uninvoicedDeliveredQuantity).toBe(2);
    expect(statusB3.summary.isReadyToInvoice).toBe(true);

    // 8. Generate Invoice 2: Covers the newly delivered replacement units (2 units)
    const invoice2 = await invoiceSvc.createInvoiceFromOrder(orderId, salesManagerUser);
    expect(invoice2).toBeDefined();
    expect(invoice2.id).not.toBe(invoice1.id);
    expect(invoice2.items[0].quantity).toBe(2);
    expect(invoice2.subtotal).toBe(10000); // 2 * 5000
    expect(invoice2.totalAmount).toBe(11800); // 10000 + 18% VAT

    // 9. Now total invoiced across order = 4 + 2 = 6. Order is fully invoiced!
    const existingInvoices = await invoiceSvc.getInvoicesByOrder(orderId);
    expect(existingInvoices.length).toBe(2);

    const finalStatus = await invoiceSvc.getOrderDeliveryInvoicingStatus(orderId);
    expect(finalStatus.summary.totalPreviouslyInvoicedUnits).toBe(6);
    expect(finalStatus.summary.totalUninvoicedDeliveredUnits).toBe(0);
    expect(finalStatus.summary.isAlreadyInvoiced).toBe(true);
    expect(finalStatus.summary.isReadyToInvoice).toBe(false);
  });

  it('Requirement 4: Chronological Order Activity Timeline displays latest events at top and oldest at bottom', async () => {
    const order = await orderSvc.getOrderById('ord-001');
    expect(order).toBeDefined();

    // Query timeline with desc sort (default for UI display)
    const timelineDesc = orderActivitySvc.getOrderActivityTimeline(order!, 'desc');
    expect(timelineDesc.length).toBeGreaterThanOrEqual(2);

    // Verify latest event is at top (index 0) and older event is at bottom
    const firstEventTime = new Date(timelineDesc[0].timestamp).getTime();
    const lastEventTime = new Date(timelineDesc[timelineDesc.length - 1].timestamp).getTime();
    expect(firstEventTime).toBeGreaterThanOrEqual(lastEventTime);

    // Verify key fields present on events
    expect(timelineDesc[0].actorName).toBeDefined();
    expect(timelineDesc[0].timestamp).toBeDefined();
    expect(timelineDesc[0].title).toBeDefined();
  });
});
