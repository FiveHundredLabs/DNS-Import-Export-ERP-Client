import { describe, it, expect, beforeEach, vi } from 'vitest';
import { orderService } from '../services/OrderService';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { paymentService } from '../services/PaymentService';
import { handoverService } from '../services/HandoverService';
import { pdcVaultService } from '../features/finance/services/pdcVaultService';
import { customerService } from '../services/CustomerService';
import { invoiceService } from '../services/InvoiceService';
import { inventoryService } from '../services/InventoryService';
import { productService } from '../services/ProductService';
import { MOCK_CUSTOMERS } from '../mock/mockCustomers';
import { MOCK_PRODUCTS } from '../mock/mockProducts';
import { User } from '../types/auth';

const salesRep: User = {
  id: 'usr-106',
  name: 'Kasun Wickramasinghe',
  email: 'rep.colombo@dnserp.com',
  role: 'SALES_REP',
  areaId: 'area-001',
  status: 'ACTIVE',
};

const areaManager: User = {
  id: 'usr-105',
  name: 'Nimal Bandara',
  email: 'am.western@dnserp.com',
  role: 'AREA_MANAGER',
  areaId: 'area-001',
  status: 'ACTIVE',
};

const financeManager: User = {
  id: 'usr-104',
  name: 'Dilani Fernando',
  email: 'finance.manager@dnserp.com',
  role: 'FINANCE_MANAGER',
  status: 'ACTIVE',
};

const stockKeeper: User = {
  id: 'usr-107',
  name: 'Sunil Perera',
  email: 'wh.colombo@dnserp.com',
  role: 'STOCK_KEEPER',
  status: 'ACTIVE',
};

describe('Comprehensive Verification of User Requirements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Sales Order Pending Approval Editing, Remarks & Save-and-Approve (/orders/ord-003)', () => {
    it('permits editing an order pending approval with change remarks, updating activity log and approval history', async () => {
      const orderBefore = await orderService.getOrderById('ord-003');
      expect(orderBefore).toBeDefined();
      expect(orderBefore?.status).toBe('PENDING_APPROVAL');

      const originalQty = orderBefore!.items[0].orderedQuantity;
      const originalHistoryCount = orderBefore!.approvalHistory.length;
      const originalActivityCount = orderBefore!.activityLog?.length || 0;

      const changeRemark = 'Customer requested 10 additional units over telephone.';

      const updated = await orderService.updateOrder(
        'ord-003',
        {
          items: [
            {
              productId: orderBefore!.items[0].productId,
              orderedQuantity: originalQty + 10,
              requestedDiscountPercentage: orderBefore!.items[0].discountPercentage,
            },
          ],
          changeRemarks: changeRemark,
        },
        areaManager
      );

      expect(updated.items[0].orderedQuantity).toBe(originalQty + 10);
      expect(updated.approvalHistory.length).toBe(originalHistoryCount + 1);
      const latestHistory = updated.approvalHistory[updated.approvalHistory.length - 1];
      expect(latestHistory.comment).toContain(changeRemark);

      // Verify activity log received PRODUCT_MODIFIED event with remarks
      const modEvent = updated.activityLog?.find((e) => e.type === 'PRODUCT_MODIFIED');
      expect(modEvent).toBeDefined();
      expect(modEvent?.comment).toBe(changeRemark);
      expect(modEvent?.statusBadge?.variant).toBe('amber');
    });

    it('approver can save changes and approve in one complete workflow', async () => {
      const order = await orderService.getOrderById('ord-003');
      expect(order).toBeDefined();

      const remark = 'Special pricing reviewed, modified, and approved directly.';
      const updated = await orderService.updateOrder(
        order!.id,
        {
          items: [
            {
              productId: order!.items[0].productId,
              orderedQuantity: 30,
              requestedDiscountPercentage: 5,
            },
          ],
          changeRemarks: remark,
        },
        areaManager
      );

      const approved = await orderService.approveOrder(updated.id, areaManager, remark);
      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedByName).toBe(areaManager.name);

      // Verify activity log contains both PRODUCT_MODIFIED and ORDER_APPROVED
      const hasModified = approved.activityLog?.some((e) => e.type === 'PRODUCT_MODIFIED');
      const hasApproved = approved.activityLog?.some((e) => e.type === 'ORDER_APPROVED');
      expect(hasModified).toBe(true);
      expect(hasApproved).toBe(true);
    });
  });

  describe('2. Delivery Notes Customer Rejections: Damaged vs Customer Refused (/inventory/delivery-notes)', () => {
    it('routes DAMAGED customer rejection units to quarantine damaged stock in both inventory and product master', async () => {
      const note = await deliveryNoteService.getDeliveryNoteById('dn-001');
      expect(note).toBeDefined();

      const testProductId = note!.items[0].productId;
      const productBefore = await productService.getProduct(testProductId);
      const damagedBefore = productBefore?.damagedStock || 0;

      // Submit rejection with DAMAGED reason
      const updatedNote = await deliveryNoteService.submitRejection(
        note!.id,
        {
          deliveryNoteId: note!.id,
          rejectedItems: [
            {
              productId: testProductId,
              rejectedBarcodes: ['DNS-MCB32A2P-001-001', 'DNS-MCB32A2P-001-002'],
              reason: 'DAMAGED',
              notes: 'Broken casing upon unloading',
            },
          ],
          notes: 'Driver reported transit damage',
          submittedBy: 'Sunil Perera (Stock Keeper)',
        },
        stockKeeper
      );

      expect(updatedNote.status).toBe('REJECTION_PENDING_APPROVAL');
      expect(updatedNote.totalRejectedUnits).toBe(2);

      // Warehouse Manager approves the rejection
      const approvedNote = await deliveryNoteService.approveRejection(
        updatedNote.id,
        areaManager,
        'Damaged units received into quarantine bay Q-01.'
      );
      expect(approvedNote.status).toBe('REJECTION_APPROVED');

      // Verify product master damagedStock increased
      const productAfter = await productService.getProduct(testProductId);
      expect(productAfter?.damagedStock).toBe(damagedBefore + 2);

      // Verify MOCK_PRODUCTS is updated
      const mockP = MOCK_PRODUCTS.find((p) => p.id === testProductId);
      expect(mockP?.damagedStock).toBe(damagedBefore + 2);
    });

    it('routes CUSTOMER_REFUSED units to available sellable stock upon approval', async () => {
      const note = await deliveryNoteService.getDeliveryNoteById('dn-001');
      expect(note).toBeDefined();

      const testProductId = note!.items[0].productId;
      const productBefore = await productService.getProduct(testProductId);
      const stockOnHandBefore = productBefore?.stockOnHand || 0;
      const damagedBefore = productBefore?.damagedStock || 0;

      // Submit rejection with CUSTOMER_REFUSED reason
      const updatedNote = await deliveryNoteService.submitRejection(
        note!.id,
        {
          deliveryNoteId: note!.id,
          rejectedItems: [
            {
              productId: testProductId,
              rejectedBarcodes: ['DNS-MCB32A2P-001-003'],
              reason: 'CUSTOMER_REFUSED',
              notes: 'Customer ordered too many, returned intact',
            },
          ],
          notes: 'Intact sellable return',
          submittedBy: 'Sunil Perera',
        },
        stockKeeper
      );

      const approvedNote = await deliveryNoteService.approveRejection(
        updatedNote.id,
        areaManager,
        'Intact stock restocked into warehouse main racks.'
      );
      expect(approvedNote.status).toBe('REJECTION_APPROVED');

      // Product stockOnHand increases, damagedStock stays the same
      const productAfter = await productService.getProduct(testProductId);
      expect(productAfter?.stockOnHand).toBe(stockOnHandBefore + 1);
      expect(productAfter?.damagedStock).toBe(damagedBefore);
    });
  });

  describe('3. Cash vs Cheque Handover, PDC Vault Auto-Registration & Dishonour Reversal', () => {
    it('sets handoverStatus to PENDING_HANDOVER for collected CHEQUE payments and records in handover items', async () => {
      // Record a cheque payment collection
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 150000,
          paymentMethod: 'CHEQUE',
          chequeNumber: 'CHQ-991122',
          chequeDate: '2026-11-20',
          bankName: 'Hatton National Bank',
          notes: 'November advance payment',
        },
        salesRep
      );

      expect(payment.status).toBe('PENDING_APPROVAL');
      expect(payment.handoverStatus).toBe('PENDING_HANDOVER');

      // Create handover including this cheque payment
      const handover = await handoverService.createHandover(
        {
          recipientUserId: financeManager.id,
          paymentIds: [payment.id],
          notes: 'Daily collection with cheque',
        },
        salesRep
      );

      expect(handover.items.length).toBe(1);
      const chqItem = handover.items[0];
      expect(chqItem.paymentMethod).toBe('CHEQUE');
      expect(chqItem.chequeNumber).toBe('CHQ-991122');
      expect(chqItem.bankName).toBe('Hatton National Bank');

      // Approve handover by Finance Manager
      const approvedHandover = await handoverService.approveHandover(
        handover.id,
        financeManager,
        'Cheque physically inspected and confirmed.'
      );
      expect(approvedHandover.status).toBe('APPROVED');

      // Verify cheque was automatically registered into PDC Vault
      const pdcs = pdcVaultService.getPDCs();
      const vaultPdc = pdcs.find((p) => p.chequeNumber === 'CHQ-991122');
      expect(vaultPdc).toBeDefined();
      expect(vaultPdc?.amount).toBe(150000);
      expect(vaultPdc?.drawerBank).toBe('Hatton National Bank');
      expect(vaultPdc?.status).toBe('IN_HAND');
    });

    it('bouncing a cheque reverses GL entry, reinstates customer debt, reduces available credit, reopens invoices and marks payment BOUNCED', async () => {
      // 1. Setup cheque payment and approve it
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 80000,
          paymentMethod: 'CHEQUE',
          chequeNumber: 'CHQ-BOUNCE-01',
          chequeDate: '2026-11-15',
          bankName: 'Sampath Bank',
        },
        salesRep
      );

      await paymentService.approvePayment(payment.id, financeManager, 'Initial approval');

      const custBefore = await customerService.getCustomer('cust-001');
      const debtBefore = custBefore!.financials.totalOutstanding;
      const creditBefore = custBefore!.financials.availableCredit;

      // Cheque is in PDC vault
      const vaultCheque = pdcVaultService.getPDCs().find((c) => c.chequeNumber === 'CHQ-BOUNCE-01');
      expect(vaultCheque).toBeDefined();

      // 2. Cheque bounces / is dishonoured
      const bouncedCheque = await pdcVaultService.bounceCheque(
        vaultCheque!.id,
        'Insufficient funds in drawer account'
      );

      expect(bouncedCheque.status).toBe('BOUNCED');
      expect(bouncedCheque.bounceReason).toBe('Insufficient funds in drawer account');

      // 3. Verify CustomerService debt reinstated and available credit reduced
      const custAfter = await customerService.getCustomer('cust-001');
      expect(custAfter!.financials.totalOutstanding).toBe(debtBefore + 80000);
      expect(custAfter!.financials.availableCredit).toBe(Math.max(0, creditBefore - 80000));

      // 4. Verify MOCK_CUSTOMERS is also synchronized
      const mockCust = MOCK_CUSTOMERS.find((c) => c.id === 'cust-001')!;
      expect(mockCust.financials.totalOutstanding).toBe(debtBefore + 80000);

      // 5. Verify payment status is marked as BOUNCED
      const updatedPayment = await paymentService.getPaymentById(payment.id);
      expect(updatedPayment?.status).toBe('BOUNCED');
      expect(updatedPayment?.rejectionReason).toContain('Insufficient funds');
    });
  });
});
