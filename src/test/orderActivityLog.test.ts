import { describe, it, expect, beforeEach } from 'vitest';
import { orderActivityService } from '../services/OrderActivityService';
import { orderService } from '../services/OrderService';
import { MOCK_ORDERS } from '../mock/mockOrders';
import { MOCK_USERS } from '../mock/mockUsers';
import { User } from '../types/auth';

describe('Order Activity Log & Multi-Role Lifecycle Workflow', () => {
  const salesRep: User = MOCK_USERS.find((u) => u.role === 'SALES_REP')!;
  const areaManager: User = MOCK_USERS.find((u) => u.role === 'AREA_MANAGER')!;
  const stockKeeper: User = MOCK_USERS.find((u) => u.role === 'STOCK_KEEPER')!;
  const financeManager: User = MOCK_USERS.find((u) => u.role === 'FINANCE_MANAGER')!;

  it('correctly loads full chronological timeline for order SO-DLR-COL-001-1001', async () => {
    const order = await orderService.getOrderById('ord-001');
    expect(order).toBeDefined();

    const timeline = orderActivityService.getOrderActivityTimeline(order!);
    expect(timeline.length).toBeGreaterThanOrEqual(10);

    // Verify key chronological milestones
    expect(timeline[0].type).toBe('ORDER_CREATED');
    expect(timeline[0].actorRole).toBe('SALES_REP');

    // Submission and Area Manager assignment
    const submitEvt = timeline.find((e) => e.type === 'SUBMITTED_FOR_APPROVAL');
    expect(submitEvt).toBeDefined();
    expect(submitEvt?.currentApproverRole).toBe('AREA_MANAGER');

    // Pre-approval product modification with diff
    const modEvt = timeline.find((e) => e.type === 'PRODUCT_MODIFIED');
    expect(modEvt).toBeDefined();
    expect(modEvt?.productChanges?.modified).toBeDefined();
    expect(modEvt?.productChanges?.modified![0].delta).toBe(5);
    expect(modEvt?.productChanges?.reason).toContain('Contacted customer');

    // Automatic Stock Reservation immediately after approval
    const approveIdx = timeline.findIndex((e) => e.type === 'ORDER_APPROVED');
    const reserveIdx = timeline.findIndex((e) => e.type === 'STOCK_RESERVED');
    expect(approveIdx).toBeGreaterThan(-1);
    expect(reserveIdx).toBe(approveIdx + 1);
    expect(timeline[reserveIdx].stockReservations?.length).toBeGreaterThan(0);

    // Delivery Note & Dispatch
    const dnEvt = timeline.find((e) => e.type === 'DELIVERY_NOTE_CREATED');
    expect(dnEvt).toBeDefined();
    expect(dnEvt?.deliveryNote?.deliveryNoteNumber).toBe('DN-2025-00412');
    expect(dnEvt?.actorRole).toBe('STOCK_KEEPER');

    // Customer Refusal / Return with reason
    const returnEvt = timeline.find((e) => e.type === 'PRODUCT_RETURNED');
    expect(returnEvt).toBeDefined();
    expect(returnEvt?.returnDetails?.returnedQuantity).toBe(1);
    expect(returnEvt?.returnDetails?.reason).toContain('Outer packaging');

    // Replacement dispatch
    const replaceEvt = timeline.find((e) => e.type === 'REPLACEMENT_DISPATCHED');
    expect(replaceEvt).toBeDefined();
    expect(replaceEvt?.replacementDetails?.replacementDeliveryNoteNumber).toBe('DN-2025-00418-R');

    // Delivery completed & Invoice Issued
    const deliverEvt = timeline.find((e) => e.type === 'DELIVERED');
    expect(deliverEvt).toBeDefined();

    const invoiceEvt = timeline.find((e) => e.type === 'INVOICE_ISSUED');
    expect(invoiceEvt).toBeDefined();
    expect(invoiceEvt?.invoiceDetails?.invoiceNumber).toBe('INV-DLR-COL-001-1001');
  });

  it('allows Area Manager to modify quantities before approval and logs before/after diff', async () => {
    const order = await orderService.getOrderById('ord-003');
    expect(order).toBeDefined();
    expect(order?.status).toBe('PENDING_APPROVAL');

    const originalQty = order!.items[0].orderedQuantity;

    const updated = await orderActivityService.recordProductModification(
      order!.id,
      {
        items: [
          {
            productId: order!.items[0].productId,
            orderedQuantity: originalQty + 5,
            requestedDiscountPercentage: order!.items[0].discountPercentage,
          },
        ],
        customerContactNotes: 'Spoke with customer over phone, increased quantity by 5 units.',
      },
      areaManager
    );

    const timeline = orderActivityService.getOrderActivityTimeline(updated);
    const modEvt = timeline.find((e) => e.type === 'PRODUCT_MODIFIED');
    expect(modEvt).toBeDefined();
    expect(modEvt?.actorName).toBe(areaManager.name);
    expect(modEvt?.productChanges?.modified![0].previousQuantity).toBe(originalQty);
    expect(modEvt?.productChanges?.modified![0].newQuantity).toBe(originalQty + 5);
    expect(modEvt?.productChanges?.modified![0].delta).toBe(5);
  });

  it('triggers automatic stock reservation immediately upon approval', async () => {
    const order = await orderService.getOrderById('ord-003');
    expect(order).toBeDefined();

    const approved = await orderActivityService.approveOrderAndReserveStock(
      order!.id,
      areaManager,
      'Approved after credit verification.'
    );

    expect(approved.status).toBe('APPROVED');
    const timeline = orderActivityService.getOrderActivityTimeline(approved);

    const approveIdx = timeline.findIndex((e) => e.type === 'ORDER_APPROVED');
    const reserveIdx = timeline.findIndex((e) => e.type === 'STOCK_RESERVED');

    expect(approveIdx).toBeGreaterThan(-1);
    expect(reserveIdx).toBe(approveIdx + 1);
    expect(timeline[reserveIdx].stockReservations?.length).toBeGreaterThan(0);
  });

  it('records customer return and subsequent replacement as separate events without overwriting history', async () => {
    const order = await orderService.getOrderById('ord-003');
    expect(order).toBeDefined();

    // 1. Record return
    const afterReturn = await orderActivityService.recordProductReturn(
      order!.id,
      {
        productId: order!.items[0].productId,
        productName: order!.items[0].productNameSnapshot,
        sku: order!.items[0].skuSnapshot,
        returnedQuantity: 2,
        reason: 'Customer refused 2 units due to transit scratch.',
      },
      salesRep
    );

    // 2. Dispatch replacement
    const afterReplacement = await orderActivityService.recordReplacementDispatch(
      afterReturn.id,
      {
        replacementDeliveryNoteNumber: 'DN-TEST-REPLACE-01',
        productId: order!.items[0].productId,
        productName: order!.items[0].productNameSnapshot,
        sku: order!.items[0].skuSnapshot,
        quantity: 2,
        notes: 'Dispatched 2 replacement units via express courier.',
      },
      stockKeeper
    );

    const timeline = orderActivityService.getOrderActivityTimeline(afterReplacement);

    const returnEvt = timeline.find((e) => e.type === 'PRODUCT_RETURNED');
    const replaceEvt = timeline.find((e) => e.type === 'REPLACEMENT_DISPATCHED');

    expect(returnEvt).toBeDefined();
    expect(replaceEvt).toBeDefined();
    expect(returnEvt?.id).not.toBe(replaceEvt?.id);
    expect(timeline.indexOf(returnEvt!)).toBeLessThan(timeline.indexOf(replaceEvt!));
  });
});
