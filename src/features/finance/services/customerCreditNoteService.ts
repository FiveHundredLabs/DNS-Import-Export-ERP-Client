import Decimal from 'decimal.js';
import { CustomerCreditNote, CustomerCreditNoteLineItem } from '../api/types';
import { financeRepository } from '../api';
import { periodLockService } from './periodLockService';

const CREDIT_NOTES_STORAGE_KEY = 'dns_finance_ar_credit_notes';

const INITIAL_CREDIT_NOTES: CustomerCreditNote[] = [
  {
    id: 'cn-001',
    creditNoteNumber: 'CN-2026-001',
    customerId: 'cust-001',
    customerName: 'Lanka Electrical & Hardware Superstore',
    customerCode: 'DLR-COL-001',
    invoiceId: 'inv-002',
    invoiceNumber: 'INV-2026-0039',
    date: '2026-09-20',
    reason: 'Customer return: 2 units of 5kW Solar Inverter due to customer site capacity change',
    lineItems: [
      {
        id: 'cn-li-1',
        productId: 'prod-001',
        productName: 'Hybrid Solar Inverter 5kW Pure Sine',
        sku: 'INV-5KW-HYB',
        returnedQuantity: 2,
        unitPrice: 60000.0,
        unitCost: 42000.0,
        taxRate: 0.18,
        subtotal: 120000.0,
        vatAmount: 21600.0,
        lineTotal: 141600.0,
        costTotal: 84000.0,
        condition: 'GOOD_RETURN_TO_STOCK',
        reason: 'Surplus specification returned in factory sealed box',
      },
    ],
    subtotal: 120000.0,
    vatAmount: 21600.0,
    totalAmount: 141600.0,
    totalCostAmount: 84000.0,
    status: 'ISSUED',
    returnToInventory: true,
    journalEntryId: 'JE-1012',
    createdAt: '2026-09-20T11:30:00.000Z',
  },
  {
    id: 'cn-002',
    creditNoteNumber: 'CN-2026-002',
    customerId: 'cust-003',
    customerName: 'Southern Solar & Electric Centre',
    customerCode: 'DLR-GAL-003',
    invoiceId: 'inv-005',
    invoiceNumber: 'INV-2026-0048',
    date: '2026-09-26',
    reason: 'Commercial credit for returned MPPT Charge Controller',
    lineItems: [
      {
        id: 'cn-li-2',
        productId: 'prod-002',
        productName: 'MPPT Solar Charge Controller 60A',
        sku: 'MPPT-60A-150V',
        returnedQuantity: 1,
        unitPrice: 38000.0,
        unitCost: 26500.0,
        taxRate: 0.18,
        subtotal: 38000.0,
        vatAmount: 6840.0,
        lineTotal: 44840.0,
        costTotal: 26500.0,
        condition: 'GOOD_RETURN_TO_STOCK',
        reason: 'Customer return',
      },
    ],
    subtotal: 38000.0,
    vatAmount: 6840.0,
    totalAmount: 44840.0,
    totalCostAmount: 26500.0,
    status: 'ISSUED',
    returnToInventory: true,
    journalEntryId: 'JE-1013',
    createdAt: '2026-09-26T14:15:00.000Z',
  },
];

class CustomerCreditNoteService {
  private creditNotes: CustomerCreditNote[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(CREDIT_NOTES_STORAGE_KEY);
        this.creditNotes = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(INITIAL_CREDIT_NOTES));
      } else {
        this.creditNotes = JSON.parse(JSON.stringify(INITIAL_CREDIT_NOTES));
      }
    } catch {
      this.creditNotes = JSON.parse(JSON.stringify(INITIAL_CREDIT_NOTES));
    }
  }

  private save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(CREDIT_NOTES_STORAGE_KEY, JSON.stringify(this.creditNotes));
      }
    } catch {}
  }

  getCreditNotes(customerId?: string): CustomerCreditNote[] {
    if (!customerId) return [...this.creditNotes];
    return this.creditNotes.filter((cn) => cn.customerId === customerId);
  }

  getCreditNoteById(id: string): CustomerCreditNote | null {
    return this.creditNotes.find((cn) => cn.id === id) || null;
  }

  /**
   * Post Customer Credit Note (Sales Returns):
   * Reverses revenue and tax:
   *   Dr 4010 Sales Revenue (subtotal)
   *   Dr 2020 VAT Payable 18% (vatAmount)
   *   Cr 1020 Accounts Receivable (totalAmount)
   * Returns item to physical stock:
   *   Dr 1100 Inventory (or 1030) (totalCostAmount)
   *   Cr 5010 COGS (totalCostAmount)
   */
  async postCustomerCreditNote(params: {
    customerId: string;
    customerName: string;
    customerCode?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    date: string;
    reason: string;
    lineItems: CustomerCreditNoteLineItem[];
    returnToInventory?: boolean;
  }): Promise<CustomerCreditNote> {
    if (!params.customerId) throw new Error('Customer selection is required');
    if (!params.reason.trim()) throw new Error('Return reason is required');
    if (!params.lineItems || params.lineItems.length === 0) {
      throw new Error('At least one return item line is required');
    }

    // Enforce financial period closing lock
    periodLockService.assertNotLocked(params.date);

    // Calculate totals using Decimal
    let subtotalDec = new Decimal(0);
    let vatDec = new Decimal(0);
    let costDec = new Decimal(0);

    const calculatedLineItems = params.lineItems.map((item, idx) => {
      const qty = new Decimal(item.returnedQuantity || 1);
      if (qty.lessThanOrEqualTo(0)) {
        throw new Error(`Quantity for line ${idx + 1} must be greater than zero`);
      }
      const price = new Decimal(item.unitPrice || 0);
      const cost = new Decimal(item.unitCost || 0);
      const taxRate = new Decimal(item.taxRate !== undefined ? item.taxRate : 0.18);

      const lineSubtotal = qty.times(price);
      const lineVat = lineSubtotal.times(taxRate).toDecimalPlaces(2);
      const lineTotal = lineSubtotal.plus(lineVat);
      const lineCostTotal = qty.times(cost);

      subtotalDec = subtotalDec.plus(lineSubtotal);
      vatDec = vatDec.plus(lineVat);
      costDec = costDec.plus(lineCostTotal);

      return {
        ...item,
        id: item.id || `cn-li-${Date.now()}-${idx}`,
        unitPrice: price.toNumber(),
        unitCost: cost.toNumber(),
        subtotal: lineSubtotal.toNumber(),
        vatAmount: lineVat.toNumber(),
        lineTotal: lineTotal.toNumber(),
        costTotal: lineCostTotal.toNumber(),
        taxRate: taxRate.toNumber(),
      };
    });

    const subtotal = subtotalDec.toNumber();
    const vatAmount = vatDec.toNumber();
    const totalAmount = subtotalDec.plus(vatDec).toNumber();
    const totalCostAmount = costDec.toNumber();
    const returnToStock = params.returnToInventory !== false;

    // Look up GL Accounts
    const accounts = await financeRepository.getAccounts();
    const salesRevAcc = accounts.find((a) => a.code === '4010');
    const vatPayableAcc = accounts.find((a) => a.code === '2020');
    const arAcc = accounts.find((a) => a.code === '1020');
    const inventoryAcc =
      accounts.find((a) => a.code === '1100' || a.code === '1030') ||
      accounts.find((a) => a.name.toLowerCase().includes('inventory'));
    const cogsAcc = accounts.find((a) => a.code === '5010');

    if (!salesRevAcc || !arAcc) {
      throw new Error('Required General Ledger accounts (4010 Sales Revenue, 1020 Accounts Receivable) not found.');
    }
    if (returnToStock && (!inventoryAcc || !cogsAcc)) {
      throw new Error('Required General Ledger accounts (1100/1030 Inventory, 5010 COGS) not found for stock return.');
    }

    const creditNoteNumber = `CN-2026-${Math.floor(100 + Math.random() * 900)}`;

    // Build compound balanced journal entry lines
    const journalLines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
      customerId?: string;
      customerName?: string;
    }> = [
      // 1. Debit 4010 Sales Revenue (Reverses revenue)
      {
        accountId: salesRevAcc.id,
        debit: subtotal,
        credit: 0,
        description: `Revenue reversal for return note ${creditNoteNumber} (${params.customerName})`,
      },
    ];

    // 2. Debit 2020 VAT Payable (Reverses output tax liability)
    if (vatAmount > 0 && vatPayableAcc) {
      journalLines.push({
        accountId: vatPayableAcc.id,
        debit: vatAmount,
        credit: 0,
        description: `Reversal of output VAT for customer return note ${creditNoteNumber}`,
      });
    }

    // 3. Credit 1020 Accounts Receivable (Reduces customer AR)
    journalLines.push({
      accountId: arAcc.id,
      debit: 0,
      credit: totalAmount,
      customerId: params.customerId,
      customerName: params.customerName,
      description: `Customer A/R credit adjustment: ${creditNoteNumber}`,
    });

    // 4 & 5. Return merchandise to physical stock (Debit 1100 Inventory, Credit 5010 COGS)
    if (returnToStock && totalCostAmount > 0 && inventoryAcc && cogsAcc) {
      journalLines.push({
        accountId: inventoryAcc.id,
        debit: totalCostAmount,
        credit: 0,
        description: `Physical stock restoration for return ${creditNoteNumber}`,
      });
      journalLines.push({
        accountId: cogsAcc.id,
        debit: 0,
        credit: totalCostAmount,
        description: `COGS reversal for returned stock ${creditNoteNumber}`,
      });
    }

    // Commit Journal Entry to Universal Ledger
    const journal = await financeRepository.createJournalEntry({
      date: params.date,
      description: `Customer Credit Note ${creditNoteNumber} - Sales Return (${params.customerName})`,
      reference: creditNoteNumber,
      source: 'SALES',
      lines: journalLines,
    });

    const newCreditNote: CustomerCreditNote = {
      id: `cn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      creditNoteNumber,
      customerId: params.customerId,
      customerName: params.customerName,
      customerCode: params.customerCode,
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
      date: params.date,
      reason: params.reason.trim(),
      lineItems: calculatedLineItems,
      subtotal,
      vatAmount,
      totalAmount,
      totalCostAmount,
      status: 'ISSUED',
      returnToInventory: returnToStock,
      journalEntryId: journal.id,
      createdAt: new Date().toISOString(),
    };

    this.creditNotes.unshift(newCreditNote);
    this.save();
    return newCreditNote;
  }

  getMetrics() {
    const totalCount = this.creditNotes.length;
    const totalGross = this.creditNotes.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalRevenueReversed = this.creditNotes.reduce((sum, c) => sum + c.subtotal, 0);
    const totalVatReversed = this.creditNotes.reduce((sum, c) => sum + c.vatAmount, 0);
    const totalInventoryRestored = this.creditNotes.reduce((sum, c) => sum + (c.returnToInventory ? c.totalCostAmount : 0), 0);

    return {
      totalCount,
      totalGross,
      totalRevenueReversed,
      totalVatReversed,
      totalInventoryRestored,
    };
  }

  reset() {
    this.creditNotes = JSON.parse(JSON.stringify(INITIAL_CREDIT_NOTES));
    this.save();
  }
}

export const customerCreditNoteService = new CustomerCreditNoteService();
