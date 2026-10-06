import { financeRepository } from '../api';
import { periodLockService } from './periodLockService';
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
   * 1. Confirms bank clearing
   * 2. Triggers GL entry: Dr Bank (1010), Cr A/R (1020)
   * 3. Automatically restores customer's available credit limit
   * 4. Updates status to APPROVED
   */
  async approveReceipt(receiptId: string, depositAccountId?: string): Promise<ARReceiptItem> {
    const idx = this.receipts.findIndex((r) => r.id === receiptId);
    if (idx === -1) throw new Error('Receipt not found');
    const receipt = this.receipts[idx];

    const accounts = await financeRepository.getAccounts();
    const bankAcc =
      (depositAccountId && accounts.find((a) => a.id === depositAccountId)) ||
      accounts.find((a) => a.code === '1010');
    const arAcc = accounts.find((a) => a.code === '1020');

    if (!bankAcc || !arAcc) {
      throw new Error('Required GL Accounts (1010 Bank Account, 1020 Accounts Receivable) not found.');
    }

    // Trigger GL entry (Dr Bank / Cr A/R)
    const journal = await financeRepository.createJournalEntry({
      date: new Date().toISOString().slice(0, 10),
      description: `AR Receipt Approval: ${receipt.receiptNumber} (${receipt.customerName})`,
      reference: receipt.receiptNumber,
      source: 'PAYMENT',
      lines: [
        {
          accountId: bankAcc.id,
          debit: receipt.amount,
          credit: 0,
          description: `Bank deposit via ${receipt.paymentMethod} from ${receipt.customerName}`,
        },
        {
          accountId: arAcc.id,
          debit: 0,
          credit: receipt.amount,
          description: `Clear customer Accounts Receivable for ${receipt.customerName}`,
        },
      ],
    });

    receipt.status = 'APPROVED';
    receipt.approvedAt = new Date().toISOString();
    receipt.glJournalId = journal.id;
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

    receipt.status = 'VOIDED';
    this.receipts[idx] = receipt;
    this.save();
    return receipt;
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
