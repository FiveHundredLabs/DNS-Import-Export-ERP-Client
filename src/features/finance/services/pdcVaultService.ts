import { PostDatedCheque } from '../api/types';
import { financeRepository } from '../api';
import { periodLockService } from './periodLockService';
import { MOCK_CUSTOMERS } from '../../../mock/mockCustomers';

const PDC_STORAGE_KEY = 'dns_finance_ar_pdc_vault';

const INITIAL_PDCS: PostDatedCheque[] = [
  {
    id: 'pdc-001',
    chequeNumber: 'CHQ-772910',
    receiptId: 'rcpt-403',
    receiptNumber: 'REC-2026-0493',
    customerId: 'cust-003',
    customerName: 'Southern Solar & Electric Centre',
    customerCode: 'DLR-GAL-003',
    drawerBank: 'Commercial Bank of Ceylon',
    chequeDate: new Date().toISOString().slice(0, 10), // Matured today
    receivedDate: '2026-09-25',
    amount: 531000.0,
    status: 'IN_HAND',
    holdingAccountCode: '1018',
    notes: 'PDC collected by Pradeep Alwis for INV-2026-0048',
  },
  {
    id: 'pdc-002',
    chequeNumber: 'CHQ-884021',
    customerId: 'cust-001',
    customerName: 'Lanka Electrical & Hardware Superstore',
    customerCode: 'DLR-COL-001',
    drawerBank: 'Sampath Bank PLC',
    chequeDate: '2026-10-25',
    receivedDate: '2026-09-28',
    amount: 1200000.0,
    status: 'IN_HAND',
    holdingAccountCode: '1018',
    notes: 'Post-dated 30-day settlement cheque',
  },
  {
    id: 'pdc-003',
    chequeNumber: 'CHQ-551980',
    receiptNumber: 'REC-2026-0475',
    customerId: 'cust-002',
    customerName: 'Muthurajawela Engineering Enterprises',
    customerCode: 'DLR-NEG-002',
    drawerBank: 'Hatton National Bank',
    chequeDate: '2026-09-15',
    receivedDate: '2026-09-01',
    amount: 750000.0,
    status: 'CLEARED',
    holdingAccountCode: '1018',
    clearedAccountCode: '1010',
    clearedAt: '2026-09-16T10:00:00.000Z',
    clearanceDate: '2026-09-16',
    clearanceJournalId: 'JE-1015',
    notes: 'Cleared through Commercial Bank main corporate checking account',
  },
];

class PDCVaultService {
  private cheques: PostDatedCheque[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(PDC_STORAGE_KEY);
        this.cheques = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(INITIAL_PDCS));
      } else {
        this.cheques = JSON.parse(JSON.stringify(INITIAL_PDCS));
      }
    } catch {
      this.cheques = JSON.parse(JSON.stringify(INITIAL_PDCS));
    }
  }

  private save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(PDC_STORAGE_KEY, JSON.stringify(this.cheques));
      }
    } catch {}
  }

  getPDCs(filters?: {
    status?: 'IN_HAND' | 'CLEARED' | 'BOUNCED' | 'RETURNED' | 'ALL';
    customerId?: string;
    search?: string;
  }): PostDatedCheque[] {
    return this.cheques.filter((c) => {
      if (filters?.status && filters.status !== 'ALL' && c.status !== filters.status) {
        return false;
      }
      if (filters?.customerId && c.customerId !== filters.customerId) {
        return false;
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          c.chequeNumber.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.drawerBank.toLowerCase().includes(q) ||
          (c.receiptNumber && c.receiptNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }

  getPDCById(id: string): PostDatedCheque | null {
    return this.cheques.find((c) => c.id === id) || null;
  }

  registerCheque(params: {
    chequeNumber: string;
    receiptId?: string;
    receiptNumber?: string;
    customerId: string;
    customerName: string;
    customerCode?: string;
    drawerBank: string;
    chequeDate: string;
    receivedDate?: string;
    amount: number;
    journalEntryId?: string;
    notes?: string;
  }): PostDatedCheque {
    if (!params.chequeNumber.trim()) {
      throw new Error('Cheque number is required');
    }
    if (!params.amount || params.amount <= 0) {
      throw new Error('Valid cheque amount is required');
    }

    const newCheque: PostDatedCheque = {
      id: `pdc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      chequeNumber: params.chequeNumber.trim().toUpperCase(),
      receiptId: params.receiptId,
      receiptNumber: params.receiptNumber,
      customerId: params.customerId,
      customerName: params.customerName,
      customerCode: params.customerCode,
      drawerBank: params.drawerBank || 'Commercial Bank of Ceylon',
      chequeDate: params.chequeDate,
      receivedDate: params.receivedDate || new Date().toISOString().slice(0, 10),
      amount: params.amount,
      status: 'IN_HAND',
      holdingAccountCode: '1018',
      journalEntryId: params.journalEntryId,
      notes: params.notes,
    };

    this.cheques.unshift(newCheque);
    this.save();
    return newCheque;
  }

  /**
   * Clear Cheque on realization date:
   * Triggers double-entry transfer:
   * Debit 1010 Bank Account
   * Credit 1018 Cheques in Hand
   */
  async clearCheque(
    chequeId: string,
    options?: {
      clearingDate?: string;
      bankAccountId?: string;
      notes?: string;
    }
  ): Promise<PostDatedCheque> {
    const idx = this.cheques.findIndex((c) => c.id === chequeId);
    if (idx === -1) throw new Error('Cheque not found in PDC vault');
    const cheque = this.cheques[idx];

    if (cheque.status !== 'IN_HAND') {
      throw new Error(`Cheque ${cheque.chequeNumber} cannot be cleared because it is already ${cheque.status}.`);
    }

    const realizationDate = options?.clearingDate || new Date().toISOString().slice(0, 10);
    // Period lock validation
    periodLockService.assertNotLocked(realizationDate);

    const accounts = await financeRepository.getAccounts();
    const bankAccount =
      (options?.bankAccountId && accounts.find((a) => a.id === options.bankAccountId)) ||
      accounts.find((a) => a.code === '1010');
    const chequesInHandAcc = accounts.find((a) => a.code === '1018');

    if (!bankAccount || !chequesInHandAcc) {
      throw new Error('Required GL Accounts (1010 Bank Account, 1018 Cheques in Hand) not found.');
    }

    // Trigger GL entry: Dr 1010 Bank, Cr 1018 Cheques in Hand
    const journal = await financeRepository.createJournalEntry({
      date: realizationDate,
      description: `PDC Realization / Bank Clearance: Cheque #${cheque.chequeNumber} (${cheque.customerName})`,
      reference: `PDC-${cheque.chequeNumber}`,
      source: 'PAYMENT',
      lines: [
        {
          accountId: bankAccount.id,
          debit: cheque.amount,
          credit: 0,
          description: `Cheque #${cheque.chequeNumber} realized into ${bankAccount.name}`,
        },
        {
          accountId: chequesInHandAcc.id,
          debit: 0,
          credit: cheque.amount,
          description: `Relieve Cheques in Hand vault for realized cheque #${cheque.chequeNumber}`,
        },
      ],
    });

    cheque.status = 'CLEARED';
    cheque.clearedAccountCode = bankAccount.code;
    cheque.clearedAt = new Date().toISOString();
    cheque.clearanceDate = realizationDate;
    cheque.clearanceJournalId = journal.id;
    if (options?.notes) {
      cheque.notes = cheque.notes ? `${cheque.notes} | ${options.notes}` : options.notes;
    }

    this.cheques[idx] = cheque;
    this.save();
    return cheque;
  }

  /**
   * Bounce / Dishonor Cheque:
   * Reverses from 1018 Cheques in Hand back to 1020 A/R, reinstates customer balance,
   * and notifies AR service to reverse any invoice allocations.
   */
  async bounceCheque(chequeId: string, reason: string): Promise<PostDatedCheque> {
    if (!reason.trim()) throw new Error('Reason is required to mark cheque as bounced');
    const idx = this.cheques.findIndex((c) => c.id === chequeId);
    if (idx === -1) throw new Error('Cheque not found in PDC vault');
    const cheque = this.cheques[idx];

    if (cheque.status !== 'IN_HAND') {
      throw new Error(`Cheque ${cheque.chequeNumber} is not in hand`);
    }

    const accounts = await financeRepository.getAccounts();
    const chequesInHandAcc = accounts.find((a) => a.code === '1018');
    const arAcc = accounts.find((a) => a.code === '1020');

    if (chequesInHandAcc && arAcc) {
      await financeRepository.createJournalEntry({
        date: new Date().toISOString().slice(0, 10),
        description: `Dishonored / Bounced Cheque Reversal: #${cheque.chequeNumber} (${cheque.customerName})`,
        reference: `BOUNCE-${cheque.chequeNumber}`,
        source: 'PAYMENT',
        lines: [
          {
            accountId: arAcc.id,
            debit: cheque.amount,
            credit: 0,
            customerId: cheque.customerId,
            customerName: cheque.customerName,
            description: `Reinstate Accounts Receivable for bounced cheque #${cheque.chequeNumber}`,
          },
          {
            accountId: chequesInHandAcc.id,
            debit: 0,
            credit: cheque.amount,
            description: `Relieve Cheques in Hand for bounced cheque #${cheque.chequeNumber}`,
          },
        ],
      });
    }

    // Reinstate customer outstanding & reduce available credit in MOCK_CUSTOMERS
    try {
      const customer = MOCK_CUSTOMERS.find((c) => c.id === cheque.customerId);
      if (customer) {
        const newTotalOutstanding = customer.financials.totalOutstanding + cheque.amount;
        customer.financials.totalOutstanding = newTotalOutstanding;
        customer.financials.availableCredit = Math.max(
          0,
          customer.commercialTerms.creditLimit - newTotalOutstanding
        );
      }
    } catch {}

    // Notify AR Service to reverse receipt status and reopen settled invoices
    if (cheque.receiptId) {
      try {
        const { arService } = await import('./arService');
        arService.handleChequeBounce(cheque.receiptId, reason);
      } catch {}
    }

    cheque.status = 'BOUNCED';
    cheque.bounceReason = reason.trim();
    this.cheques[idx] = cheque;
    this.save();
    return cheque;
  }

  /**
   * Invalidate / Void Cheque when parent AR receipt is voided
   */
  voidCheque(chequeId: string, reason?: string): PostDatedCheque {
    const idx = this.cheques.findIndex((c) => c.id === chequeId);
    if (idx === -1) throw new Error('Cheque not found in PDC vault');
    const cheque = this.cheques[idx];

    if (cheque.status === 'CLEARED') {
      throw new Error(`Cheque ${cheque.chequeNumber} has already been cleared to bank and cannot be voided.`);
    }

    cheque.status = 'VOIDED';
    cheque.notes = reason ? `${cheque.notes || ''} [Voided: ${reason}]`.trim() : `${cheque.notes || ''} [Voided]`.trim();
    this.cheques[idx] = cheque;
    this.save();
    return cheque;
  }

  getMetrics() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const inHand = this.cheques.filter((c) => c.status === 'IN_HAND');
    const cleared = this.cheques.filter((c) => c.status === 'CLEARED');
    const matured = inHand.filter((c) => c.chequeDate <= todayStr);
    const future = inHand.filter((c) => c.chequeDate > todayStr);

    return {
      totalInHandCount: inHand.length,
      totalInHandAmount: inHand.reduce((sum, c) => sum + c.amount, 0),
      maturedCount: matured.length,
      maturedAmount: matured.reduce((sum, c) => sum + c.amount, 0),
      futureCount: future.length,
      futureAmount: future.reduce((sum, c) => sum + c.amount, 0),
      clearedCount: cleared.length,
      clearedAmount: cleared.reduce((sum, c) => sum + c.amount, 0),
    };
  }

  reset() {
    this.cheques = JSON.parse(JSON.stringify(INITIAL_PDCS));
    this.save();
  }
}

export const pdcVaultService = new PDCVaultService();
