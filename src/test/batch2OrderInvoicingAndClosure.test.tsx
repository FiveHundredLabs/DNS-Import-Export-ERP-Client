import { describe, it, expect, beforeEach } from 'vitest';
import { orderService } from '../services/OrderService';
import { invoiceService } from '../services/InvoiceService';
import { SalesOrder } from '../types/order';
import { User } from '../types/auth';

const directorUser: User = {
  id: 'usr-dir-01',
  name: 'Executive Director',
  email: 'director@dns.lk',
  role: 'DIRECTOR',
  status: 'ACTIVE',
  createdAt: '2026-01-01',
};

const salesManagerUser: User = {
  id: 'usr-sm-01',
  name: 'Sales Manager Silva',
  email: 'salesmanager@dns.lk',
  role: 'SALES_MANAGER',
  status: 'ACTIVE',
  createdAt: '2026-01-01',
};

const salesRepUser: User = {
  id: 'usr-106',
  name: 'Kasun Wickramasinghe',
  email: 'salesrep@dns.lk',
  role: 'SALES_REP',
  status: 'ACTIVE',
  createdAt: '2026-01-01',
};

describe('Batch 2: Sales Order Multi-Invoicing & Closure Enforcement (BR-04 & BR-05)', () => {
  let testOrder: SalesOrder;

  beforeEach(async () => {
    // Create a fresh test order with 2 line items (Qty: 10 of item 1, Qty: 20 of item 2)
    testOrder = await orderService.createOrder({
      customerId: 'cust-001',
      salesRepId: salesRepUser.id,
      items: [
        {
          productId: 'prod-001',
          quantity: 10,
          discountPercentage: 0,
        },
        {
          productId: 'prod-002',
          quantity: 20,
          discountPercentage: 5,
        },
      ],
      deliveryAddress: '48 Bloemendhal Road, Colombo 13',
      saveAsDraft: false,
    }, salesRepUser);

    if (testOrder.status === 'PENDING_APPROVAL' || testOrder.status === 'SPECIAL_APPROVAL') {
      testOrder = await orderService.approveOrder(testOrder.id, directorUser, 'Approved for testing');
    }
  });

  it('BR-04: creates first partial invoice against order and updates status to PARTIALLY_INVOICED', async () => {
    // Invoice 4 of item 1 (out of 10) and 10 of item 2 (out of 20)
    const inv1 = await invoiceService.createInvoiceFromOrder(testOrder.id, salesManagerUser, {
      partialItems: [
        { productId: 'prod-001', quantity: 4 },
        { productId: 'prod-002', quantity: 10 },
      ],
    });

    expect(inv1).toBeDefined();
    expect(inv1.orderId).toBe(testOrder.id);
    expect(inv1.items).toHaveLength(2);
    expect(inv1.items[0].quantity).toBe(4);
    expect(inv1.items[1].quantity).toBe(10);

    // Refresh order
    const updatedOrder = await orderService.getOrderById(testOrder.id);
    expect(updatedOrder).toBeDefined();
    expect(updatedOrder!.status).toBe('PARTIALLY_INVOICED');
    expect(updatedOrder!.items[0].invoicedQuantity).toBe(4);
    expect(updatedOrder!.items[0].remainingQuantity).toBe(6);
    expect(updatedOrder!.items[1].invoicedQuantity).toBe(10);
    expect(updatedOrder!.items[1].remainingQuantity).toBe(10);
  });

  it('BR-04: creates second invoice against remaining quantities and transitions status to INVOICED', async () => {
    // First partial invoice: 4 and 10
    await invoiceService.createInvoiceFromOrder(testOrder.id, salesManagerUser, {
      partialItems: [
        { productId: 'prod-001', quantity: 4 },
        { productId: 'prod-002', quantity: 10 },
      ],
    });

    // Check progress
    const progress1 = await invoiceService.getOrderInvoicingProgress(testOrder.id);
    expect(progress1.isFullyInvoiced).toBe(false);
    expect(progress1.existingInvoices).toHaveLength(1);

    // Second invoice fulfilling all remaining quantities: 6 of item 1, 10 of item 2
    const inv2 = await invoiceService.createInvoiceFromOrder(testOrder.id, salesManagerUser, {
      partialItems: [
        { productId: 'prod-001', quantity: 6 },
        { productId: 'prod-002', quantity: 10 },
      ],
    });

    expect(inv2).toBeDefined();
    expect(inv2.items[0].quantity).toBe(6);
    expect(inv2.items[1].quantity).toBe(10);

    // Refresh order - all lines are fully invoiced, should now be INVOICED
    const updatedOrder = await orderService.getOrderById(testOrder.id);
    expect(updatedOrder!.status).toBe('INVOICED');
    expect(updatedOrder!.items[0].invoicedQuantity).toBe(10);
    expect(updatedOrder!.items[0].remainingQuantity).toBe(0);
    expect(updatedOrder!.items[1].invoicedQuantity).toBe(20);
    expect(updatedOrder!.items[1].remainingQuantity).toBe(0);

    const progress2 = await invoiceService.getOrderInvoicingProgress(testOrder.id);
    expect(progress2.isFullyInvoiced).toBe(true);
    expect(progress2.existingInvoices).toHaveLength(2);
  });

  it('BR-04: rejects over-invoicing exceeding remaining quantity', async () => {
    // Attempt to invoice 15 items when only 10 were ordered
    await expect(
      invoiceService.createInvoiceFromOrder(testOrder.id, salesManagerUser, {
        partialItems: [{ productId: 'prod-001', quantity: 15 }],
      })
    ).rejects.toThrow(/maximum remaining billable quantity/i);
  });

  it('BR-05: Sales Manager can close an order with reason code and audit notes', async () => {
    const closedOrder = await orderService.closeOrder(testOrder.id, salesManagerUser, {
      closureType: 'PARTIAL',
      reasonCode: 'CUSTOMER_CANCELLED',
      reasonNotes: 'Customer requested cancellation of remaining bulk lines due to budget freeze.',
    });

    expect(closedOrder.status).toBe('CLOSED');
    expect(closedOrder.closureType).toBe('PARTIAL');
    expect(closedOrder.closureReasonCode).toBe('CUSTOMER_CANCELLED');
    expect(closedOrder.closureReason).toBe(
      'Customer requested cancellation of remaining bulk lines due to budget freeze.'
    );
    expect(closedOrder.closedById).toBe(salesManagerUser.id);
    expect(closedOrder.closedByName).toBe(salesManagerUser.name);
    expect(closedOrder.closedAt).toBeDefined();

    // Confirm that closed order cannot be invoiced
    await expect(
      invoiceService.createInvoiceFromOrder(testOrder.id, salesManagerUser)
    ).rejects.toThrow(/order.*is closed/i);
  });

  it('BR-05: rejects order closure by unauthorized roles (SALES_REP)', async () => {
    await expect(
      orderService.closeOrder(testOrder.id, salesRepUser, {
        closureType: 'FULL',
        reasonCode: 'OTHER',
        reasonNotes: 'Sales rep attempting unauthorized closure.',
      })
    ).rejects.toThrow(/permission denied.*not authorized/i);
  });

  it('BR-05: rejects closure with empty or insufficient reason notes (< 5 characters)', async () => {
    await expect(
      orderService.closeOrder(testOrder.id, directorUser, {
        closureType: 'FULL',
        reasonCode: 'OTHER',
        reasonNotes: 'bad',
      })
    ).rejects.toThrow(/at least 5 characters/i);
  });
});
