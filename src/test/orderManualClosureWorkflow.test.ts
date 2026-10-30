import { describe, it, expect, beforeEach } from 'vitest';
import { orderService } from '../services/OrderService';
import { invoiceService } from '../services/InvoiceService';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { orderActivityService } from '../services/OrderActivityService';
import { SalesOrder } from '../types/order';
import { User } from '../types/auth';

describe('Manual Order Closure Workflow', () => {
  const salesManagerUser: User = {
    id: 'usr-101',
    email: 'kamal.sales@dns.lk',
    name: 'Kamal Perera',
    role: 'SALES_MANAGER',
    assignedTerritories: ['Western Province'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const salesRepUser: User = {
    id: 'usr-106',
    email: 'kasun.rep@dns.lk',
    name: 'Kasun Wickramasinghe',
    role: 'SALES_REP',
    assignedTerritories: ['Colombo North'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const stockKeeperUser: User = {
    id: 'usr-104',
    email: 'amal.stock@dns.lk',
    name: 'Amal Perera',
    role: 'STOCK_KEEPER',
    assignedTerritories: ['Main Logistics Warehouse'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  let testOrder: SalesOrder;

  beforeEach(async () => {
    // Create an approved sales order for testing
    const created = await orderService.createOrder(
      {
        customerId: 'cust-001',
        items: [
          {
            productId: 'prod-001',
            orderedQuantity: 10,
            unitPrice: 1500,
          },
          {
            productId: 'prod-002',
            orderedQuantity: 5,
            unitPrice: 3200,
          },
        ],
        notes: 'Partial delivery order test for manual closure',
      },
      salesRepUser
    );

    // Approve the order
    testOrder = await orderService.approveOrder(
      created.id,
      salesManagerUser,
      'Approved for partial fulfillment.'
    );
  });

  it('1. Allows Sales Manager to manually close an eligible approved order with a mandatory closing reason', async () => {
    const closedOrder = await orderService.closeOrder(testOrder.id, salesManagerUser, {
      closureType: 'PARTIAL',
      reasonCode: 'REMAINING_ITEMS_RETURNED',
      reasonNotes: 'Remaining 5 units returned damaged by customer and manufacturer cannot supply replacements.',
    });

    expect(closedOrder.status).toBe('CLOSED');
    expect(closedOrder.closureType).toBe('PARTIAL');
    expect(closedOrder.closureReasonCode).toBe('REMAINING_ITEMS_RETURNED');
    expect(closedOrder.closureReason).toBe(
      'Remaining 5 units returned damaged by customer and manufacturer cannot supply replacements.'
    );
    expect(closedOrder.closedById).toBe(salesManagerUser.id);
    expect(closedOrder.closedByName).toBe(salesManagerUser.name);
    expect(closedOrder.closedAt).toBeDefined();

    // Verify approval history has CLOSE action
    const closeHistory = closedOrder.approvalHistory.find((h) => h.action === 'CLOSE');
    expect(closeHistory).toBeDefined();
    expect(closeHistory?.actorName).toBe(salesManagerUser.name);
    expect(closeHistory?.actorRole).toBe('SALES_MANAGER');
  });

  it('2. Enforces role permission: Rejects order closure attempt by unauthorized roles like SALES_REP', async () => {
    await expect(
      orderService.closeOrder(testOrder.id, salesRepUser, {
        closureType: 'FULL',
        reasonCode: 'CUSTOMER_CANCELLED',
        reasonNotes: 'Customer no longer wants these items.',
      })
    ).rejects.toThrow(/Permission Denied.*SALES_REP is not authorized/);
  });

  it('3. Requires a documented closing reason with at least 5 characters', async () => {
    await expect(
      orderService.closeOrder(testOrder.id, salesManagerUser, {
        closureType: 'PARTIAL',
        reasonCode: 'OTHER',
        reasonNotes: '   ', // empty
      })
    ).rejects.toThrow(/documented reason note of at least 5 characters is required/);

    await expect(
      orderService.closeOrder(testOrder.id, salesManagerUser, {
        closureType: 'PARTIAL',
        reasonCode: 'OTHER',
        reasonNotes: 'nope', // 4 characters
      })
    ).rejects.toThrow(/documented reason note of at least 5 characters is required/);
  });

  it("4. Records closing user's name, date, time and reason in the order activity log", async () => {
    const reasonText = 'Customer cancelled remaining balance after initial delivery.';
    const closed = await orderService.closeOrder(testOrder.id, salesManagerUser, {
      closureType: 'PARTIAL',
      reasonCode: 'CUSTOMER_CANCELLED',
      reasonNotes: reasonText,
    });

    const timeline = orderActivityService.getOrderActivityTimeline(closed);
    const closedEvent = timeline.find((e) => e.type === 'ORDER_CLOSED');

    expect(closedEvent).toBeDefined();
    expect(closedEvent?.actorName).toBe(salesManagerUser.name);
    expect(closedEvent?.actorRole).toBe('SALES_MANAGER');
    expect(closedEvent?.actorId).toBe(salesManagerUser.id);
    expect(closedEvent?.timestamp).toBe(closed.closedAt);
    expect(closedEvent?.comment).toContain(reasonText);
    expect(closedEvent?.title).toContain('Order Manually Closed');
  });

  it('5. Prevents further invoicing against a closed order', async () => {
    await orderService.closeOrder(testOrder.id, salesManagerUser, {
      closureType: 'FULL',
      reasonCode: 'OUT_OF_STOCK',
      reasonNotes: 'Factory out of stock permanently.',
    });

    await expect(
      invoiceService.createInvoiceFromOrder(testOrder.id, salesManagerUser)
    ).rejects.toThrow(/Cannot generate invoice: Order.*is closed/i);
  });

  it('6. Prevents further deliveries against a closed order', async () => {
    await orderService.closeOrder(testOrder.id, salesManagerUser, {
      closureType: 'PARTIAL',
      reasonCode: 'REMAINING_ITEMS_RETURNED',
      reasonNotes: 'Remaining items returned. No further deliveries allowed.',
    });

    await expect(
      deliveryNoteService.createDeliveryNote(
        {
          orderId: testOrder.id,
          orderNumber: testOrder.orderNumber,
          driverName: 'Kamal Silva',
          driverPhone: '+94 77 123 4567',
          vehicleNumber: 'WP-CAB-1234',
          deliveryRoute: 'Colombo Express Route',
          items: [
            {
              productId: 'prod-001',
              productName: 'Sample Tool',
              sku: 'TOOL-001',
              unitBarcodes: ['DNS-TOOL001-001'],
            },
          ],
        },
        stockKeeperUser
      )
    ).rejects.toThrow(/Cannot create delivery note: Sales Order.*is closed/i);
  });

  it('7. Preserves existing invoices and delivery history when order is closed', async () => {
    // 1. Create a delivery note prior to closure
    const initialDn = await deliveryNoteService.createDeliveryNote(
      {
        orderId: testOrder.id,
        orderNumber: testOrder.orderNumber,
        driverName: 'Kamal Silva',
        driverPhone: '+94 77 123 4567',
        vehicleNumber: 'WP-CAB-1234',
        deliveryRoute: 'Colombo Express Route',
        items: [
          {
            productId: 'prod-001',
            productName: 'Sample Tool',
            sku: 'TOOL-001',
            unitBarcodes: ['DNS-TOOL001-001'],
          },
        ],
      },
      stockKeeperUser
    );

    expect(initialDn.deliveryNoteNumber).toBeDefined();

    // 2. Now close the order
    await orderService.closeOrder(testOrder.id, salesManagerUser, {
      closureType: 'PARTIAL',
      reasonCode: 'REMAINING_ITEMS_RETURNED',
      reasonNotes: 'Items delivered partially, remainder returned.',
    });

    // 3. Verify delivery history is completely preserved
    const deliveryNotesForOrder = await deliveryNoteService.getByOrderId(testOrder.id);
    expect(deliveryNotesForOrder.length).toBeGreaterThanOrEqual(1);
    expect(deliveryNotesForOrder.some((dn) => dn.id === initialDn.id)).toBe(true);
  });
});
