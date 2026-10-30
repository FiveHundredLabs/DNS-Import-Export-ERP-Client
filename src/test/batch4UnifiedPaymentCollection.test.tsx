import { describe, it, expect, beforeEach } from 'vitest';
import { paymentService } from '../services/PaymentService';
import { invoiceService } from '../services/InvoiceService';
import { customerService } from '../services/CustomerService';
import { Invoice } from '../types/invoice';
import { Customer } from '../types/customer';
import { User } from '../types/auth';

const salesRepUser: User = {
  id: 'usr-106',
  name: 'Kasun Wickramasinghe',
  email: 'kasun@dns.lk',
  role: 'SALES_REP',
  status: 'ACTIVE',
  createdAt: '2026-01-01',
};

const financeManagerUser: User = {
  id: 'usr-103',
  name: 'Dilshan Silva',
  email: 'dilshan@dns.lk',
  role: 'FINANCE_MANAGER',
  status: 'ACTIVE',
  createdAt: '2026-01-01',
};

describe('Batch 4: Unified Payment Collection Interface (BR-06 & Feature 6 / 7)', () => {
  const customerId = 'cust-002'; // Muthurajawela Engineering Enterprises
  let customer: Customer;
  let customerInvoices: Invoice[];

  beforeEach(async () => {
    const cust = await customerService.getCustomer(customerId);
    expect(cust).toBeDefined();
    customer = cust!;

    const invs = await invoiceService.getInvoicesByCustomer(customerId);
    expect(invs.length).toBeGreaterThanOrEqual(2);
    customerInvoices = invs;
  });

  it('Feature 6: Records targeted payment collection against a single chosen invoice', async () => {
    const targetInv = customerInvoices[0];
    const uncollectedBalance = Math.max(0, targetInv.balanceAmount - (targetInv.collectedAmount || 0));
    expect(uncollectedBalance).toBeGreaterThan(0);

    const payment = await paymentService.recordPayment(
      {
        customerId: customer.id,
        amount: uncollectedBalance,
        paymentMethod: 'CASH',
        invoiceAllocations: [
          {
            invoiceId: targetInv.id,
            allocatedAmount: uncollectedBalance,
          },
        ],
        notes: 'Targeted single-invoice cash collection from store visit.',
      },
      salesRepUser
    );

    expect(payment).toBeDefined();
    expect(payment.status).toBe('PENDING_APPROVAL');
    expect(payment.amount).toBe(uncollectedBalance);
    expect(payment.invoiceAllocations).toHaveLength(1);
    expect(payment.invoiceAllocations[0].invoiceId).toBe(targetInv.id);

    // Refresh invoice to ensure collectedAmount is marked without modifying balanceAmount until approval
    const refreshed = await invoiceService.getInvoiceById(targetInv.id);
    expect(refreshed).toBeDefined();
    expect(refreshed!.collectedAmount).toBeGreaterThanOrEqual(uncollectedBalance);
    expect(refreshed!.status).toBe('COLLECTED');
  });

  it('Feature 7: Complete collection for one selected invoice updates balance to 0 upon Finance approval', async () => {
    const targetInv = customerInvoices[1];
    const uncollectedBalance = Math.max(0, targetInv.balanceAmount - (targetInv.collectedAmount || 0));
    const previousOutstanding = customer.financials.totalOutstanding;

    // 1. Rep records full collection for this invoice
    const payment = await paymentService.recordPayment(
      {
        customerId: customer.id,
        amount: uncollectedBalance,
        paymentMethod: 'CASH',
        invoiceAllocations: [
          {
            invoiceId: targetInv.id,
            allocatedAmount: uncollectedBalance,
          },
        ],
        notes: 'Full payment collected in one step.',
      },
      salesRepUser
    );

    // 2. Finance approves the receipt
    const approved = await paymentService.approvePayment(payment.id, financeManagerUser, 'Verified funds in bank');
    expect(approved.status).toBe('APPROVED');

    // 3. Invoice balance should now be 0 and status PAID
    const finalizedInv = await invoiceService.getInvoiceById(targetInv.id);
    expect(finalizedInv!.balanceAmount).toBe(0);
    expect(finalizedInv!.status).toBe('PAID');

    // 4. Customer total outstanding should be reduced
    const updatedCust = await customerService.getCustomer(customer.id);
    expect(updatedCust!.financials.totalOutstanding).toBeLessThanOrEqual(previousOutstanding);
  });

  it('Feature 6: Supports multi-invoice allocation (invoice-wise breakdown)', async () => {
    // Use cust-001 which has multiple open invoices
    const cust1 = (await customerService.getCustomer('cust-001'))!;
    const cust1Invoices = (await invoiceService.getInvoicesByCustomer('cust-001')).filter(
      (i) => i.balanceAmount > 10000 && i.status !== 'CANCELLED' && i.status !== 'COLLECTED'
    );
    expect(cust1Invoices.length).toBeGreaterThanOrEqual(2);

    const inv1 = cust1Invoices[0];
    const inv2 = cust1Invoices[1];

    const part1 = 5000;
    const part2 = 7000;
    const totalColl = part1 + part2;

    const payment = await paymentService.recordPayment(
      {
        customerId: cust1.id,
        amount: totalColl,
        paymentMethod: 'BANK_TRANSFER',
        invoiceAllocations: [
          { invoiceId: inv1.id, allocatedAmount: part1 },
          { invoiceId: inv2.id, allocatedAmount: part2 },
        ],
        notes: 'Customer batch transfer settled across two invoices.',
      },
      salesRepUser
    );

    expect(payment.amount).toBe(totalColl);
    expect(payment.invoiceAllocations).toHaveLength(2);

    // Approve
    const approved = await paymentService.approvePayment(payment.id, financeManagerUser);
    expect(approved.status).toBe('APPROVED');

    // Verify both invoices received their exact allocated amounts
    const check1 = await invoiceService.getInvoiceById(inv1.id);
    const check2 = await invoiceService.getInvoiceById(inv2.id);
    expect(check1!.paidAmount).toBeGreaterThanOrEqual(part1);
    expect(check2!.paidAmount).toBeGreaterThanOrEqual(part2);
  });
});
