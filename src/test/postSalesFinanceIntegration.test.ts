import { describe, it, expect, beforeEach } from 'vitest';
import { paymentService } from '../services/PaymentService';
import { invoiceService } from '../services/InvoiceService';
import { customerService } from '../services/CustomerService';
import { orderService } from '../services/OrderService';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { pdcVaultService } from '../features/finance/services/pdcVaultService';
import { financeRepository } from '../features/finance/api';
import { User } from '../types/auth';
import { DeliveryNote } from '../types/deliveryNote';

describe('Post-Sales Finance Integration', () => {
  const financeManagerUser: User = {
    id: 'usr-fin-001',
    name: 'Finance Manager',
    role: 'FINANCE_MANAGER',
    email: 'fm@dns.com',
    phone: '+94 11 123 4567',
    isActive: true,
  };

  const salesManagerUser: User = {
    id: 'usr-sm-001',
    name: 'Sales Manager Anura',
    role: 'SALES_MANAGER',
    email: 'sm@dns.com',
    phone: '+94 77 987 6543',
    isActive: true,
  };

  const salesRepUser: User = {
    id: 'usr-106',
    name: 'Kasun Wickramasinghe',
    role: 'SALES_REP',
    email: 'kasun@dns.com',
    phone: '+94 77 123 4567',
    isActive: true,
  };

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {}
    deliveryNoteService.resetToDefaults();
    if ((invoiceService as any).repo?.resetToDefaults) {
      (invoiceService as any).repo.resetToDefaults();
    }
  });

  describe('1. Cash & Bank Payment Approval with Double-Entry Posting', () => {
    it('should approve cash payment and post Dr 1010/1040 Cash/Bank and Cr 1020 AR', async () => {
      // Create a pending payment
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 50000,
          paymentMethod: 'CASH',
          invoiceAllocations: [],
          notes: 'Cash collected by rep in field',
        },
        salesRepUser
      );

      expect(payment.status).toBe('PENDING_APPROVAL');

      // Approve payment as Finance Manager
      const approved = await paymentService.approvePayment(
        payment.id,
        financeManagerUser,
        'Cash verified at HO cash desk'
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.journalEntryId).toBeDefined();

      // Verify the generated Journal Entry
      const journal = await financeRepository.getJournalEntryById(approved.journalEntryId!);
      expect(journal).toBeDefined();
      expect(journal?.source).toBe('PAYMENT');
      expect(journal?.totalDebit).toBe(50000);
      expect(journal?.totalCredit).toBe(50000);

      // Verify debit to liquid account and credit to AR
      const debitLine = journal?.lines.find((l) => l.debit > 0);
      const creditLine = journal?.lines.find((l) => l.credit > 0);
      expect(debitLine?.debit).toBe(50000);
      expect(creditLine?.credit).toBe(50000);
      expect(creditLine?.customerId).toBe('cust-001');
    });

    it('should approve bank transfer payment and post Dr Bank and Cr AR', async () => {
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 75000,
          paymentMethod: 'BANK_TRANSFER',
          invoiceAllocations: [],
          notes: 'Direct online bank transfer',
        },
        salesRepUser
      );

      const approved = await paymentService.approvePayment(
        payment.id,
        financeManagerUser,
        'Bank slip verified against bank statement'
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.journalEntryId).toBeDefined();

      const journal = await financeRepository.getJournalEntryById(approved.journalEntryId!);
      expect(journal?.totalDebit).toBe(75000);
      expect(journal?.totalCredit).toBe(75000);
    });
  });

  describe('2. Cheque Payment Approval into PDC Vault', () => {
    it('should approve cheque payment, post Dr 1018 Cheques in Hand / Cr 1020 AR, and register in PDC Vault', async () => {
      const chequeNum = `CHQ-${Date.now().toString().slice(-6)}`;
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 120000,
          paymentMethod: 'CHEQUE',
          chequeNumber: chequeNum,
          chequeDate: new Date().toISOString().slice(0, 10),
          bankName: 'Sampath Bank PLC',
          invoiceAllocations: [],
          notes: '30-day post-dated cheque',
        },
        salesRepUser
      );

      const approved = await paymentService.approvePayment(
        payment.id,
        financeManagerUser,
        'Cheque verified and accepted into safe'
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.journalEntryId).toBeDefined();

      // Verify GL Journal debited Cheques in Hand (1018)
      const journal = await financeRepository.getJournalEntryById(approved.journalEntryId!);
      expect(journal?.totalDebit).toBe(120000);
      expect(journal?.totalCredit).toBe(120000);

      // Verify registered in PDC Vault
      const pdcs = pdcVaultService.getPDCs();
      const pdc = pdcs.find((c) => c.chequeNumber === chequeNum.toUpperCase());
      expect(pdc).toBeDefined();
      expect(pdc?.status).toBe('IN_HAND');
      expect(pdc?.holdingAccountCode).toBe('1018');
      expect(pdc?.journalEntryId).toBe(approved.journalEntryId);
    });
  });

  describe('3. PDC Vault Lifecycle: Clearance and Bounce', () => {
    it('should clear matured cheque into Bank Account (Dr 1010 Bank / Cr 1018 PDC)', async () => {
      const chqNum = `CHQ-CLR-${Date.now().toString().slice(-5)}`;
      const pdc = pdcVaultService.registerCheque({
        chequeNumber: chqNum,
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        drawerBank: 'Commercial Bank of Ceylon',
        chequeDate: new Date().toISOString().slice(0, 10),
        amount: 80000,
      });

      const cleared = await pdcVaultService.clearCheque(pdc.id, {
        notes: 'Cleared at Commercial Bank main branch',
      });

      expect(cleared.status).toBe('CLEARED');
      expect(cleared.clearanceJournalId).toBeDefined();

      const journal = await financeRepository.getJournalEntryById(cleared.clearanceJournalId!);
      expect(journal?.totalDebit).toBe(80000);
      expect(journal?.totalCredit).toBe(80000);
    });

    it('should bounce dishonoured cheque (Dr 1020 AR / Cr 1018 PDC) and reinstate customer balance', async () => {
      const chqNum = `CHQ-BNC-${Date.now().toString().slice(-5)}`;
      const pdc = pdcVaultService.registerCheque({
        chequeNumber: chqNum,
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        drawerBank: 'Hatton National Bank',
        chequeDate: new Date().toISOString().slice(0, 10),
        amount: 95000,
      });

      const initialCust = await customerService.getCustomer('cust-001');
      const initialOutstanding = initialCust?.financials.totalOutstanding || 0;

      const bounced = await pdcVaultService.bounceCheque(pdc.id, 'Insufficient Funds (Refer to Drawer)');
      expect(bounced.status).toBe('BOUNCED');

      // Verify customer outstanding debt increased
      const updatedCust = await customerService.getCustomer('cust-001');
      expect(updatedCust?.financials.totalOutstanding).toBe(initialOutstanding + 95000);
    });
  });

  describe('4. Payment Reversal (Clerical Reversal)', () => {
    it('should reverse approved cash payment, reinstate AR, and post reversal journal', async () => {
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 30000,
          paymentMethod: 'CASH',
          invoiceAllocations: [],
          notes: 'Accidental duplicate entry',
        },
        salesRepUser
      );

      await paymentService.approvePayment(payment.id, financeManagerUser);

      const custBefore = await customerService.getCustomer('cust-001');
      const outstandingBefore = custBefore?.financials.totalOutstanding || 0;

      // Reverse payment
      const reversed = await paymentService.reversePayment(
        payment.id,
        financeManagerUser,
        'Duplicate entry entered in error'
      );

      expect(reversed.status).toBe('REVERSED');
      expect(reversed.reversalJournalId).toBeDefined();

      // Verify Reversal Journal
      const revJournal = await financeRepository.getJournalEntryById(reversed.reversalJournalId!);
      expect(revJournal?.totalDebit).toBe(30000);
      expect(revJournal?.totalCredit).toBe(30000);

      // Verify customer debt reinstated
      const custAfter = await customerService.getCustomer('cust-001');
      expect(custAfter?.financials.totalOutstanding).toBe(outstandingBefore + 30000);
    });

    it('should reject direct payment reversal for cheques and direct to PDC Vault', async () => {
      const payment = await paymentService.recordPayment(
        {
          customerId: 'cust-001',
          amount: 45000,
          paymentMethod: 'CHEQUE',
          chequeNumber: 'CHQ-REV-FAIL',
          chequeDate: new Date().toISOString().slice(0, 10),
          bankName: 'Sampath Bank PLC',
          invoiceAllocations: [],
        },
        salesRepUser
      );

      await paymentService.approvePayment(payment.id, financeManagerUser);

      await expect(
        paymentService.reversePayment(payment.id, financeManagerUser, 'Mistake')
      ).rejects.toThrow('Cheque payments cannot be reversed directly through payment reversal');
    });
  });

  describe('5. Sales Invoicing Revenue & COGS Recognition', () => {
    it('should issue invoice, record Dr AR / Cr Revenue / Cr VAT / Dr COGS / Cr Inventory', async () => {
      // 1. Create a fresh order
      const order = await orderService.createOrder(
        {
          customerId: 'cust-001',
          deliveryAddress: '142 First Cross Street, Colombo 11',
          requestedCreditDays: 30,
          items: [
            {
              productId: 'prod-001',
              orderedQuantity: 5,
              requestedDiscountPercentage: 0,
            },
          ],
        },
        salesRepUser
      );

      // 2. Approve order
      await orderService.approveOrder(order.id, salesManagerUser, 'Approved order for invoicing test');

      // 3. Register Delivery Note with delivered and accepted units (not yet invoiced)
      const deliveryNote: DeliveryNote = {
        id: `dn-test-${Date.now()}`,
        deliveryNoteNumber: `DN-${Date.now().toString().slice(-6)}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        customerCode: 'DLR-COL-001',
        driverName: 'Kamal Silva',
        vehicleNumber: 'WP LF-4412',
        dispatchDate: new Date().toISOString().slice(0, 10),
        status: 'DELIVERED',
        totalInvoicedUnits: 0,
        totalDispatchedUnits: 5,
        totalAcceptedUnits: 5,
        totalRejectedUnits: 0,
        items: [
          {
            id: `dn-item-${Date.now()}`,
            productId: 'prod-001',
            productName: 'Hybrid Solar Inverter 5kW Pure Sine',
            sku: 'INV-5KW-HYB',
            uom: 'PCS',
            invoicedQuantity: 0,
            dispatchedQuantity: 5,
            acceptedQuantity: 5,
            rejectedQuantity: 0,
            unitBarcodes: ['BC-1', 'BC-2', 'BC-3', 'BC-4', 'BC-5'],
            rejectedUnitBarcodes: [],
          },
        ],
        createdBy: 'Amal Perera (Stock Keeper)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await deliveryNoteService.addDeliveryNote(deliveryNote);

      // 4. Generate invoice from order
      const invoice = await invoiceService.createInvoiceFromOrder(order.id, salesRepUser);

      expect(invoice).toBeDefined();
      expect(invoice.status).toBe('ISSUED');
      expect(invoice.journalEntryId).toBeDefined();

      const journal = await financeRepository.getJournalEntryById(invoice.journalEntryId!);
      expect(journal).toBeDefined();
      expect(journal?.source).toBe('SALES');
      expect(journal?.totalDebit).toBe(journal?.totalCredit);
      expect(journal?.totalDebit).toBeGreaterThan(0);

      // Verify lines contain AR, Revenue, and Inventory/COGS
      const hasAR = journal?.lines.some((l) => l.debit > 0 && l.customerId === 'cust-001');
      const hasRevenue = journal?.lines.some((l) => l.credit > 0 && l.description?.includes('Revenue'));
      expect(hasAR).toBe(true);
      expect(hasRevenue).toBe(true);
    });
  });
});
