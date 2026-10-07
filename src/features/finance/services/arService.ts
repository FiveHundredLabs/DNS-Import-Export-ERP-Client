import { financeRepository } from '../api';
import { periodLockService } from './periodLockService';
import { pdcVaultService } from './pdcVaultService';
import { MOCK_CUSTOMERS } from '../../../mock/mockCustomers';
import Decimal from 'decimal.js';

export interface ARReceiptItem {
  id: string;
  receiptNumber: string;
  customerName: string;
  customerCode: string;
  customerId: string;
  collectorName: string;
  collectedAt: string;
  paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
  amount: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'VOIDED';
  attachmentUrl?: string; // Image of physical deposit slip or cheque
  rejectionReason?: string;
  approvedAt?: string;
  glJournalId?: string;
  depositAccountId?: string;
  depositAccountCode?: string; // e.g. '1010', '1018', '1040'
  // Cheque details for PDC Vault
  chequeNumber?: string;
  drawerBank?: string;
  chequeDate?: string;
  pdcId?: string;
  // Inline settlement & allocation tracking
  isAllocated?: boolean;
  allocatedAmount?: number;
  allocations?: Record<string, number>;
}

export interface AROpenInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  originalAmount: number;
  balanceDue: number;
}

export interface ApproveReceiptOptions {
  depositAccountId?: string;
  autoFIFO?: boolean;
  chequeDetails?: {
    chequeNumber: string;
    drawerBank: string;
    chequeDate: string;
    notes?: string;
  };
}

const AR_RECEIPTS_STORAGE_KEY = 'dns_finance_ar_receipts_queue';

const INITIAL_AR_RECEIPTS: ARReceiptItem[] = [
  {
    id: 'rcpt-401',
    receiptNumber: 'REC-2026-0491',
    customerName: 'Lanka Electrical & Hardware Superstore',
    customerCode: 'DLR-COL-001',
    customerId: 'cust-001',
    collectorName: 'Kasun Wickramasinghe (Sales Rep)',
    collectedAt: '2026-09-24T14:30:00.000Z',
    paymentMethod: 'BANK_TRANSFER',
    amount: 3835000.0,
    status: 'PENDING_APPROVAL',
    attachmentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'rcpt-402',
    receiptNumber: 'REC-2026-0492',
    customerName: 'Muthurajawela Engineering Enterprises',
    customerCode: 'DLR-NEG-002',
    customerId: 'cust-002',
    collectorName: 'Dinesh Rathnayake (Sales Rep)',
    collectedAt: '2026-09-25T09:15:00.000Z',
    paymentMethod: 'CASH',
    amount: 212400.0,
    status: 'PENDING_APPROVAL',
    attachmentUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'rcpt-403',
    receiptNumber: 'REC-2026-0493',
    customerName: 'Southern Solar & Electric Centre',
    customerCode: 'DLR-GAL-003',
    customerId: 'cust-003',
    collectorName: 'Pradeep Alwis (Sales Rep)',
    collectedAt: '2026-09-25T11:00:00.000Z',
    paymentMethod: 'CHEQUE',
    chequeNumber: 'CHQ-772910',
    drawerBank: 'Commercial Bank of Ceylon',
    chequeDate: new Date().toISOString().slice(0, 10),
    amount: 531000.0,
    status: 'PENDING_APPROVAL',
    attachmentUrl: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'rcpt-404',
    receiptNumber: 'REC-2026-0480',
    customerName: 'Kandy Industrial Power Systems',
    customerCode: 'DLR-KND-004',
    customerId: 'cust-004',
    collectorName: 'Chaminda Silva (Sales Rep)',
    collectedAt: '2026-09-22T10:00:00.000Z',
    paymentMethod: 'BANK_TRANSFER',
    amount: 885000.0,
    status: 'APPROVED',
    attachmentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    approvedAt: '2026-09-22T15:30:00.000Z',
  },
  {
    id: 'rcpt-405',
    receiptNumber: 'REC-2026-0494',
    customerName: 'Lanka Electrical & Hardware Superstore',
    customerCode: 'DLR-COL-001',
    customerId: 'cust-001',
    collectorName: 'Kasun Wickramasinghe (Sales Rep)',
    collectedAt: '2026-09-26T16:00:00.000Z',
    paymentMethod: 'CHEQUE',
    chequeNumber: 'CHQ-884021',
    drawerBank: 'Sampath Bank PLC',
    chequeDate: '2026-10-25',
    amount: 1200000.0,
    status: 'PENDING_APPROVAL',
    attachmentUrl: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'rcpt-406',
    receiptNumber: 'REC-2026-0495',
    customerName: 'Southern Solar & Electric Centre',
    customerCode: 'DLR-GAL-003',
    customerId: 'cust-003',
    collectorName: 'Pradeep Alwis (Sales Rep)',
    collectedAt: '2026-09-27T10:30:00.000Z',
    paymentMethod: 'CASH',
    amount: 150000.0,
    status: 'PENDING_APPROVAL',
    attachmentUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
  },
];

const MOCK_OPEN_INVOICES: AROpenInvoice[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2026-0035',
    date: '2026-08-10',
    customerId: 'cust-001',
    customerName: 'Lanka Electrical & Hardware Superstore',
    originalAmount: 1500000.0,
    balanceDue: 1500000.0,
  },
  {
    id: 'inv-002',
    invoiceNumber: 'INV-2026-0039',
    date: '2026-08-25',
    customerId: 'cust-001',
    customerName: 'Lanka Electrical & Hardware Superstore',
    originalAmount: 2000000.0,
    balanceDue: 1800000.0,
  },
  {
    id: 'inv-003',
    invoiceNumber: 'INV-2026-0042',
    date: '2026-09-05',
    customerId: 'cust-001',
    customerName: 'Lanka Electrical & Hardware Superstore',
    originalAmount: 1200000.0,
    balanceDue: 1200000.0,
  },
  {
    id: 'inv-004',
    invoiceNumber: 'INV-2026-0045',
    date: '2026-09-12',
    customerId: 'cust-002',
    customerName: 'Muthurajawela Engineering Enterprises',
    originalAmount: 212400.0,
    balanceDue: 212400.0,
  },
  {
    id: 'inv-005',
    invoiceNumber: 'INV-2026-0048',
    date: '2026-09-18',
    customerId: 'cust-003',
    customerName: 'Southern Solar & Electric Centre',
    originalAmount: 600000.0,
    balanceDue: 531000.0,
  },
];

class ARCollectionService {
  private receipts: ARReceiptItem[] = [];
  private openInvoices: AROpenInvoice[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(AR_RECEIPTS_STORAGE_KEY);
        this.receipts = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(INITIAL_AR_RECEIPTS));
      } else {
        this.receipts = JSON.parse(JSON.stringify(INITIAL_AR_RECEIPTS));
      }
    } catch {
      this.receipts = JSON.parse(JSON.stringify(INITIAL_AR_RECEIPTS));
    }
    this.openInvoices = JSON.parse(JSON.stringify(MOCK_OPEN_INVOICES));
  }

  private save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(AR_RECEIPTS_STORAGE_KEY, JSON.stringify(this.receipts));
      }
    } catch {}
  }

  getReceipts(): ARReceiptItem[] {
    return [...this.receipts];
  }

  getReceiptById(id: string): ARReceiptItem | null {
    return this.receipts.find((r) => r.id === id) || null;
  }

  getOpenInvoicesForCustomer(customerId: string): AROpenInvoice[] {
    return this.openInvoices.filter((i) => i.customerId === customerId && i.balanceDue > 0);
  }

  /**
   * Auto-FIFO Allocation calculation:
   * Sorts open invoices by date ascending (oldest first).
   * Allocates amounts sequentially until the receipt amount is fully exhausted.
   */
  calculateAutoFIFO(customerId: string, receiptAmount: number): Record<string, number> {
    const invoices = this.getOpenInvoicesForCustomer(customerId)
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let remaining = new Decimal(receiptAmount);
    const allocationResult: Record<string, number> = {};

    for (const inv of invoices) {
      if (remaining.lessThanOrEqualTo(0)) {
        allocationResult[inv.id] = 0;
        continue;
      }

      const bal = new Decimal(inv.balanceDue);
      if (remaining.greaterThanOrEqualTo(bal)) {
        allocationResult[inv.id] = bal.toNumber();
        remaining = remaining.minus(bal);
      } else {
        allocationResult[inv.id] = remaining.toNumber();
        remaining = new Decimal(0);
      }
    }

    return allocationResult;
  }

  /**
   * Approve Receipt:
   * 1. If CHEQUE:
   *    Stop recognizing un-cleared cheques as 1010 Bank cash!
   *    Route collected cheques to 1018 Cheques in Hand asset account.
   *    Registers cheque in PDC Vault for realization on its due date.
   *    Dr 1018 Cheques in Hand / Cr 1020 A/R
   * 2. If CASH or BANK_TRANSFER:
   *    Dr 1010 Bank (or 1040 Cash in Hand) / Cr 1020 A/R
   * 3. Inline Settlement (Auto-FIFO):
   *    If autoFIFO option is enabled, immediately settles oldest open invoices sequentially.
   * 4. Restores customer's credit limit / available credit.
   */
  async approveReceipt(
    receiptId: string,
    options?: ApproveReceiptOptions | string
  ): Promise<ARReceiptItem> {
    const idx = this.receipts.findIndex((r) => r.id === receiptId);
    if (idx === -1) throw new Error('Receipt not found');
    const receipt = this.receipts[idx];

    if (receipt.amount <= 0) {
      throw new Error('Receipt amount must be greater than zero to approve');
    }

    const opts: ApproveReceiptOptions =
      typeof options === 'string' ? { depositAccountId: options } : options || {};

    const accounts = await financeRepository.getAccounts();
    const arAcc = accounts.find((a) => a.code === '1020');
    if (!arAcc) {
      throw new Error('Required GL Account 1020 Accounts Receivable not found.');
    }

    let depositAcc = accounts.find((a) => a.code === '1010');
    let entryDesc = '';
    let lineDesc = '';

    if (receipt.paymentMethod === 'CHEQUE') {
      // PHASE 3 PDC Vault Rule:
      // Route un-cleared cheque to 1018 Cheques in Hand instead of 1010 Bank cash
      const chequesInHandAcc =
        accounts.find((a) => a.code === '1018') ||
        accounts.find((a) => a.name.toLowerCase().includes('cheques in hand'));

      if (!chequesInHandAcc) {
        throw new Error('Required GL Account 1018 Cheques in Hand not found.');
      }
      depositAcc = chequesInHandAcc;
      entryDesc = `AR Cheque Receipt (PDC Vault): ${receipt.receiptNumber} (${receipt.customerName})`;
      lineDesc = `Custody of un-cleared cheque from ${receipt.customerName} in PDC Vault`;
    } else {
      // CASH or BANK_TRANSFER
      if (opts.depositAccountId) {
        depositAcc = accounts.find((a) => a.id === opts.depositAccountId) || depositAcc;
      } else if (receipt.paymentMethod === 'CASH') {
        const cashAcc = accounts.find((a) => a.code === '1040');
        if (cashAcc) depositAcc = cashAcc;
      }
      if (!depositAcc) {
        throw new Error('Required GL Account 1010 Bank Account not found.');
      }
      entryDesc = `AR Receipt Approval: ${receipt.receiptNumber} (${receipt.customerName})`;
      lineDesc = `Funds received via ${receipt.paymentMethod} from ${receipt.customerName}`;
    }

    // Trigger Double-Entry GL entry (Dr Deposit Account / Cr A/R)
    const journal = await financeRepository.createJournalEntry({
      date: new Date().toISOString().slice(0, 10),
      description: entryDesc,
      reference: receipt.receiptNumber,
      source: 'PAYMENT',
      lines: [
        {
          accountId: depositAcc.id,
          debit: receipt.amount,
          credit: 0,
          description: lineDesc,
        },
        {
          accountId: arAcc.id,
          debit: 0,
          credit: receipt.amount,
          customerId: receipt.customerId,
          customerName: receipt.customerName,
          description: `Clear customer Accounts Receivable for ${receipt.customerName}`,
        },
      ],
    });

    receipt.status = 'APPROVED';
    receipt.approvedAt = new Date().toISOString();
    receipt.glJournalId = journal.id;
    receipt.depositAccountId = depositAcc.id;
    receipt.depositAccountCode = depositAcc.code;

    // Register with PDC Vault if CHEQUE
    if (receipt.paymentMethod === 'CHEQUE') {
      const chqNum =
        opts.chequeDetails?.chequeNumber ||
        receipt.chequeNumber ||
        `CHQ-${Math.floor(100000 + Math.random() * 900000)}`;
      const bankName =
        opts.chequeDetails?.drawerBank ||
        receipt.drawerBank ||
        'Commercial Bank of Ceylon';
      const cDate =
        opts.chequeDetails?.chequeDate ||
        receipt.chequeDate ||
        new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

      receipt.chequeNumber = chqNum;
      receipt.drawerBank = bankName;
      receipt.chequeDate = cDate;

      const pdc = pdcVaultService.registerCheque({
        chequeNumber: chqNum,
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        customerId: receipt.customerId,
        customerName: receipt.customerName,
        customerCode: receipt.customerCode,
        drawerBank: bankName,
        chequeDate: cDate,
        amount: receipt.amount,
        journalEntryId: journal.id,
        notes: opts.chequeDetails?.notes || `Receipt ${receipt.receiptNumber}`,
      });
      receipt.pdcId = pdc.id;
    }

    // Inline Settlement: Apply via Auto-FIFO if requested
    if (opts.autoFIFO) {
      const fifoAllocations = this.calculateAutoFIFO(receipt.customerId, receipt.amount);
      this.applyCollectionAllocation(receipt.id, fifoAllocations);
      const totalAllocated = Object.values(fifoAllocations).reduce((sum, val) => sum + val, 0);

      receipt.isAllocated = true;
      receipt.allocatedAmount = totalAllocated;
      receipt.allocations = fifoAllocations;
    }

    // Restore customer credit limit / update available credit
    try {
      const customer = MOCK_CUSTOMERS.find((c) => c.id === receipt.customerId);
      if (customer) {
        const newTotalOutstanding = Math.max(0, customer.financials.totalOutstanding - receipt.amount);
        customer.financials.totalOutstanding = newTotalOutstanding;
        customer.financials.availableCredit = Math.max(
          0,
          customer.commercialTerms.creditLimit - newTotalOutstanding
        );
      }
    } catch {}

    this.receipts[idx] = receipt;
    this.save();
    return receipt;
  }

  /**
   * Reject Receipt:
   * Requires rejection reason, returns receipt to Sales Rep.
   */
  rejectReceipt(receiptId: string, reason: string): ARReceiptItem {
    if (!reason.trim()) {
      throw new Error('Rejection reason is required');
    }
    const idx = this.receipts.findIndex((r) => r.id === receiptId);
    if (idx === -1) throw new Error('Receipt not found');
    const receipt = this.receipts[idx];

    receipt.status = 'REJECTED';
    receipt.rejectionReason = reason.trim();
    this.receipts[idx] = receipt;
    this.save();
    return receipt;
  }

  /**
   * Void / Reverse an approved AR Receipt
   * 1. Validates period lock: Hard error if transaction date is in closed financial period
   * 2. Reverses the GL double-entry voucher
   * 3. Sets receipt status to VOIDED
   */
  async voidReceipt(receiptId: string, reason?: string): Promise<ARReceiptItem> {
    const idx = this.receipts.findIndex((r) => r.id === receiptId);
    if (idx === -1) throw new Error('Receipt not found');
    const receipt = this.receipts[idx];

    if (receipt.status === 'VOIDED') {
      throw new Error(`Receipt ${receipt.receiptNumber} is already voided.`);
    }

    // Enforce period closing lock
    periodLockService.assertNotLocked(receipt.collectedAt);

    if (receipt.glJournalId) {
      await financeRepository.voidJournalEntry(receipt.glJournalId, reason);
    }

    // Invalidate PDC in Vault if payment was CHEQUE
    if (receipt.pdcId) {
      try {
        pdcVaultService.voidCheque(receipt.pdcId, reason || `Receipt ${receipt.receiptNumber} voided`);
      } catch {}
    }

    // Revert Auto-FIFO allocations to open invoices
    if (receipt.isAllocated && receipt.allocations) {
      for (const [invId, amt] of Object.entries(receipt.allocations)) {
        if (amt > 0) {
          const inv = this.openInvoices.find((i) => i.id === invId);
          if (inv) {
            inv.balanceDue = Number(new Decimal(inv.balanceDue).plus(amt).toFixed(2));
          }
        }
      }
      receipt.isAllocated = false;
      receipt.allocatedAmount = 0;
    }

    // Re-increase customer total outstanding and reduce available credit
    try {
      const customer = MOCK_CUSTOMERS.find((c) => c.id === receipt.customerId);
      if (customer) {
        const newTotalOutstanding = customer.financials.totalOutstanding + receipt.amount;
        customer.financials.totalOutstanding = newTotalOutstanding;
        customer.financials.availableCredit = Math.max(
          0,
          customer.commercialTerms.creditLimit - newTotalOutstanding
        );
      }
    } catch {}

    receipt.status = 'VOIDED';
    this.receipts[idx] = receipt;
    this.save();
    return receipt;
  }

  /**
   * Handle Dishonored / Bounced Cheque from PDC Vault:
   * Sets receipt to REJECTED, notes the bounce, and reopens settled invoices.
   */
  handleChequeBounce(receiptId: string, reason: string): void {
    const idx = this.receipts.findIndex((r) => r.id === receiptId);
    if (idx === -1) return;
    const receipt = this.receipts[idx];

    receipt.status = 'REJECTED';
    receipt.rejectionReason = `Cheque Bounced: ${reason}`;

    if (receipt.isAllocated && receipt.allocations) {
      for (const [invId, amt] of Object.entries(receipt.allocations)) {
        if (amt > 0) {
          const inv = this.openInvoices.find((i) => i.id === invId);
          if (inv) {
            inv.balanceDue = Number(new Decimal(inv.balanceDue).plus(amt).toFixed(2));
          }
        }
      }
      receipt.isAllocated = false;
      receipt.allocatedAmount = 0;
    }

    this.receipts[idx] = receipt;
    this.save();
  }

  /**
   * Apply credit note reduction to open invoice balance
   */
  applyInvoiceCredit(invoiceId: string, creditAmount: number): void {
    const inv = this.openInvoices.find((i) => i.id === invoiceId);
    if (inv) {
      inv.balanceDue = Math.max(0, Number(new Decimal(inv.balanceDue).minus(creditAmount).toFixed(2)));
    }
  }

  /**
   * Revert credit note reduction if credit note is voided
   */
  revertInvoiceCredit(invoiceId: string, creditAmount: number): void {
    const inv = this.openInvoices.find((i) => i.id === invoiceId);
    if (inv) {
      inv.balanceDue = Number(new Decimal(inv.balanceDue).plus(creditAmount).toFixed(2));
    }
  }

  /**
   * Apply Batch Collection Allocation:
   */
  applyCollectionAllocation(_receiptId: string, allocations: Record<string, number>): void {
    for (const [invId, amount] of Object.entries(allocations)) {
      if (amount <= 0) continue;
      const inv = this.openInvoices.find((i) => i.id === invId);
      if (inv) {
        inv.balanceDue = Math.max(0, Number(new Decimal(inv.balanceDue).minus(amount).toFixed(2)));
      }
    }
  }

  reset(): void {
    this.receipts = JSON.parse(JSON.stringify(INITIAL_AR_RECEIPTS));
    this.openInvoices = JSON.parse(JSON.stringify(MOCK_OPEN_INVOICES));
    this.save();
  }
}

export const arService = new ARCollectionService();
