import { describe, it, expect } from 'vitest';
import { MOCK_APPROVALS } from '../mock/mockApprovals';
import { MOCK_ORDERS } from '../mock/mockOrders';
import { MOCK_QUOTATIONS } from '../mock/mockQuotations';
import { MOCK_CUSTOMERS } from '../mock/mockCustomers';
import { orderService } from '../services/OrderService';
import { quotationService } from '../services/QuotationService';
import { User } from '../types/auth';

const mockSalesManagerUser: User = {
  id: 'usr-103',
  name: 'Kamal Perera',
  email: 'kamal@example.com',
  role: 'SALES_MANAGER',
};

describe('Approvals and Quotation Enhancements Verification', () => {
  it('ensures all approval requests point to existing records that are in pending approval status', () => {
    for (const app of MOCK_APPROVALS) {
      if (app.status !== 'PENDING') continue;

      if (app.documentType === 'SALES_ORDER' || app.documentType === 'SPECIAL_SALES_ORDER') {
        const order = MOCK_ORDERS.find((o) => o.id === app.documentId || o.orderNumber === app.documentReferenceNumber);
        expect(order).toBeDefined();
        expect(order!.status).not.toBe('DRAFT');
        expect(order!.status).not.toBe('APPROVED');
        expect(['PENDING_APPROVAL', 'SPECIAL_APPROVAL']).toContain(order!.status);
      }

      if (app.documentType === 'QUOTATION_DISCOUNT') {
        const quotation = MOCK_QUOTATIONS.find((q) => q.id === app.documentId || q.quotationNumber === app.documentReferenceNumber);
        expect(quotation).toBeDefined();
        expect(quotation!.status).not.toBe('DRAFT');
        expect(quotation!.status).not.toBe('APPROVED');
        expect(quotation!.status).toBe('PENDING_APPROVAL');
      }

      if (app.documentType === 'CUSTOMER_CREATION') {
        const customer = MOCK_CUSTOMERS.find((c) => c.id === app.documentId || c.code === app.documentReferenceNumber);
        expect(customer).toBeDefined();
        expect(customer!.approvalStage).toBe('PENDING_SALES_REVIEW');
      }
    }
  });

  it('converts an approved quotation to a real sales order and links it correctly', async () => {
    // qt-001 is APPROVED
    const qt = await quotationService.getQuotationById('qt-001');
    expect(qt).toBeDefined();
    expect(qt!.status).toBe('APPROVED');

    // Convert quotation to sales order via orderService.convertQuotationToOrder
    const convertedOrder = await orderService.convertQuotationToOrder('qt-001', mockSalesManagerUser, {
      deliveryAddress: '142 First Cross Street, Colombo 11',
      deliveryDate: '2026-11-20',
    });

    expect(convertedOrder).toBeDefined();
    expect(convertedOrder.id).toBeTruthy();
    expect(convertedOrder.orderNumber).toBeTruthy();
    expect(convertedOrder.quotationId).toBe('qt-001');

    // The order must be fetchable by getOrderById without returning not found
    const fetchedOrder = await orderService.getOrderById(convertedOrder.id, {
      userId: mockSalesManagerUser.id,
      role: mockSalesManagerUser.role,
    });
    expect(fetchedOrder).not.toBeNull();
    expect(fetchedOrder!.id).toBe(convertedOrder.id);
    expect(fetchedOrder!.orderNumber).toBe(convertedOrder.orderNumber);

    // Also fetchable by orderNumber
    const fetchedByNumber = await orderService.getOrderById(convertedOrder.orderNumber, {
      userId: mockSalesManagerUser.id,
      role: mockSalesManagerUser.role,
    });
    expect(fetchedByNumber).not.toBeNull();
    expect(fetchedByNumber!.id).toBe(convertedOrder.id);

    // Check that the quotation now reflects the converted order
    const updatedQt = await quotationService.getQuotationById('qt-001');
    expect(updatedQt!.status).toBe('CONVERTED');
    expect(updatedQt!.convertedToOrderId).toBe(convertedOrder.id);
  });

  it('guarantees that every pending approval request can be inspected without returning not-found or draft', async () => {
    for (const app of MOCK_APPROVALS) {
      if (app.status !== 'PENDING') continue;

      if (app.documentType === 'SALES_ORDER' || app.documentType === 'SPECIAL_SALES_ORDER') {
        const order = await orderService.getOrderById(app.documentId, {
          userId: mockSalesManagerUser.id,
          role: 'SALES_MANAGER',
        });
        expect(order).not.toBeNull();
        expect(order!.status).not.toBe('DRAFT');
        expect(order!.status).not.toBe('APPROVED');
        expect(['PENDING_APPROVAL', 'SPECIAL_APPROVAL']).toContain(order!.status);
      }

      if (app.documentType === 'QUOTATION_DISCOUNT') {
        const quotation = await quotationService.getQuotationById(app.documentId);
        expect(quotation).not.toBeNull();
        expect(quotation!.status).not.toBe('DRAFT');
        expect(quotation!.status).not.toBe('APPROVED');
        expect(quotation!.status).toBe('PENDING_APPROVAL');
      }
    }
  });
});
