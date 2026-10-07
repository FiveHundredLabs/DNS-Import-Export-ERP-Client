import { GRN } from '../../../types/inventory';
import { MOCK_GRNS } from '../../../mock/mockInventory';
import { MOCK_PRODUCTS } from '../../../mock/mockProducts';
import { financeRepository } from '../api';
import { DEFAULT_SUPPLIERS } from '../api/mock/MockFinanceRepository';
import {
  SupplierAdvance,
  SupplierDebitNote,
  SupplierDebitNoteLineItem,
} from '../api/types';
import { periodLockService } from './periodLockService';
import Decimal from 'decimal.js';

export interface VendorBillLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  receivedQuantity: number;
  draftUnitCost: number; // Historical reference
  unitCost: number; // Editable actual cost
  lineDiscount: number; // Editable discount in currency
  vatCode: 'STANDARD_18' | 'EXEMPT';
  vatAmount: number;
  lineTotal: number;
  historicalPurchasePrice?: number;
  apportionedFreight?: number;
  landedUnitCost?: number;
}

export interface VendorBill {
  id: string;
  billNumber: string;
  vendorInvoiceNumber: string;
  grnId: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: VendorBillLineItem[];
  freightCharges: number;
  otherLandingCosts: number;
  subtotal: number;
  vatTotal: number;
  totalAmount: number;
  balanceDue: number;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'POSTED' | 'VOIDED';
  journalEntryId?: string;
  appliedAdvanceId?: string;
  createdAt: string;
}

const AP_BILLS_STORAGE_KEY = 'dns_finance_ap_vendor_bills';
const GRN_STATUS_STORAGE_KEY = 'dns_finance_grn_status_map';
const AP_ADVANCES_STORAGE_KEY = 'dns_finance_ap_supplier_advances';
const AP_DEBIT_NOTES_STORAGE_KEY = 'dns_finance_ap_supplier_debit_notes';

const INITIAL_ADVANCES: SupplierAdvance[] = [
  {
    id: 'adv-2026-001',
    advanceNumber: 'ADV-2026-001',
    supplierId: 'sup-1',
    supplierName: 'DNS Global Logistics & Electronics Ltd',
    paymentDate: '2026-09-05',
    bankAccountId: 'acc-1010',
    bankAccountCode: '1010',
    reference: 'PREPAY-SCH-SEP',
    amount: 250000,
    unappliedBalance: 250000,
    status: 'UNAPPLIED',
    notes: 'Advance deposit for upcoming Q4 switchgear procurement shipment',
    appliedTo: [],
    createdAt: '2026-09-05T08:00:00Z',
  },
];

const INITIAL_DEBIT_NOTES: SupplierDebitNote[] = [
  {
    id: 'dn-2026-001',
    debitNoteNumber: 'DN-2026-001',
    supplierId: 'sup-1',
    supplierName: 'DNS Global Logistics & Electronics Ltd',
    grnId: 'GRN-2025-001',
    grnNumber: 'GRN-2025-001',
    date: '2026-09-12',
    reason: 'Damaged packaging and cracked terminals on 2 units received in shipment',
    lineItems: [
      {
        productId: 'prod-001',
        productName: 'Schneider Acti9 32A Double Pole MCB',
        sku: 'DNS-MCB-32A-2P',
        damagedQuantity: 2,
        unitCost: 2200,
        lineTotal: 4400,
        reason: 'Cracked terminal housing',
      },
    ],
    totalAmount: 4400,
    status: 'ISSUED',
    createdAt: '2026-09-12T11:00:00Z',
  },
];

// Pre-seeded open bills for suppliers so Batch Supplier Payments works right away
const INITIAL_BILLS: VendorBill[] = [
  {
    id: 'bill-101',
    billNumber: 'BILL-2026-001',
    vendorInvoiceNumber: 'INV-SCH-88219',
    grnId: 'GRN-HIST-001',
    grnNumber: 'GRN-HIST-001',
    supplierId: 'sup-1',
    supplierName: 'DNS Global Logistics & Electronics Ltd',
    invoiceDate: '2026-09-10',
    dueDate: '2026-10-10',
    lineItems: [
      {
        id: 'bli-1',
        productId: 'prod-001',
        productName: 'Schneider Acti9 32A Double Pole MCB',
        sku: 'DNS-MCB-32A-2P',
        receivedQuantity: 500,
        draftUnitCost: 2200,
        unitCost: 2200,
        lineDiscount: 0,
        vatCode: 'STANDARD_18',
        vatAmount: 198000,
        lineTotal: 1298000,
      },
    ],
    freightCharges: 15000,
    otherLandingCosts: 5000,
    subtotal: 1100000,
    vatTotal: 198000,
    totalAmount: 1318000,
    balanceDue: 1318000,
    status: 'OPEN',
    createdAt: '2026-09-10T10:00:00Z',
  },
  {
    id: 'bill-102',
    billNumber: 'BILL-2026-002',
    vendorInvoiceNumber: 'INV-SCH-89104',
    grnId: 'GRN-2025-005',
    grnNumber: 'GRN-2025-005',
    supplierId: 'sup-1',
    supplierName: 'DNS Global Logistics & Electronics Ltd',
    invoiceDate: '2026-09-20',
    dueDate: '2026-10-20',
    lineItems: [
      {
        id: 'bli-2',
        productId: 'prod-002',
        productName: 'Schneider Acti9 63A Triple Pole MCB',
        sku: 'DNS-MCB-63A-3P',
        receivedQuantity: 100,
        draftUnitCost: 5800,
        unitCost: 5800,
        lineDiscount: 10000,
        vatCode: 'STANDARD_18',
        vatAmount: 102600,
        lineTotal: 672600,
      },
    ],
    freightCharges: 8000,
    otherLandingCosts: 2000,
    subtotal: 570000,
    vatTotal: 102600,
    totalAmount: 682600,
    balanceDue: 682600,
    status: 'OPEN',
    createdAt: '2026-09-20T14:30:00Z',
  },
  {
    id: 'bill-103',
    billNumber: 'BILL-2026-003',
    vendorInvoiceNumber: 'INV-KEL-40112',
    grnId: 'GRN-2025-002',
    grnNumber: 'GRN-2025-002',
    supplierId: 'sup-2',
    supplierName: 'Apex International Importers',
    invoiceDate: '2026-09-15',
    dueDate: '2026-10-15',
    lineItems: [
      {
        id: 'bli-3',
        productId: 'prod-003',
        productName: 'Kelani 4.0mm² Single Core Copper Cable',
        sku: 'DNS-CAB-4MM-CU',
        receivedQuantity: 85,
        draftUnitCost: 18500,
        unitCost: 18500,
        lineDiscount: 25000,
        vatCode: 'STANDARD_18',
        vatAmount: 278550,
        lineTotal: 1826050,
      },
    ],
    freightCharges: 12000,
    otherLandingCosts: 3000,
    subtotal: 1547500,
    vatTotal: 278550,
    totalAmount: 1841050,
    balanceDue: 1841050,
    status: 'OPEN',
    createdAt: '2026-09-15T09:00:00Z',
  },
];

class AccountsPayableService {
  private bills: VendorBill[] = [];
  private grnStatuses: Record<string, 'COSTED' | 'SUBMITTED' | 'APPROVED'> = {};
  private advances: SupplierAdvance[] = [];
  private debitNotes: SupplierDebitNote[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedBills = localStorage.getItem(AP_BILLS_STORAGE_KEY);
        this.bills = storedBills ? JSON.parse(storedBills) : JSON.parse(JSON.stringify(INITIAL_BILLS));

        const storedStatuses = localStorage.getItem(GRN_STATUS_STORAGE_KEY);
        this.grnStatuses = storedStatuses ? JSON.parse(storedStatuses) : {};

        const storedAdvances = localStorage.getItem(AP_ADVANCES_STORAGE_KEY);
        this.advances = storedAdvances ? JSON.parse(storedAdvances) : JSON.parse(JSON.stringify(INITIAL_ADVANCES));

        const storedDebitNotes = localStorage.getItem(AP_DEBIT_NOTES_STORAGE_KEY);
        this.debitNotes = storedDebitNotes ? JSON.parse(storedDebitNotes) : JSON.parse(JSON.stringify(INITIAL_DEBIT_NOTES));
      } else {
        this.bills = JSON.parse(JSON.stringify(INITIAL_BILLS));
        this.advances = JSON.parse(JSON.stringify(INITIAL_ADVANCES));
        this.debitNotes = JSON.parse(JSON.stringify(INITIAL_DEBIT_NOTES));
      }
    } catch {
      this.bills = JSON.parse(JSON.stringify(INITIAL_BILLS));
      this.advances = JSON.parse(JSON.stringify(INITIAL_ADVANCES));
      this.debitNotes = JSON.parse(JSON.stringify(INITIAL_DEBIT_NOTES));
    }
  }

  private save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(AP_BILLS_STORAGE_KEY, JSON.stringify(this.bills));
        localStorage.setItem(GRN_STATUS_STORAGE_KEY, JSON.stringify(this.grnStatuses));
        localStorage.setItem(AP_ADVANCES_STORAGE_KEY, JSON.stringify(this.advances));
        localStorage.setItem(AP_DEBIT_NOTES_STORAGE_KEY, JSON.stringify(this.debitNotes));
      }
    } catch {
      // fallback
    }
  }

  /**
   * Auto-pull the last known historical purchase price for an item from the Supplier Master.
   * Priority:
   * 1. Supplier Master historicalPrices configuration
   * 2. Historical posted bills for this supplier
   * 3. Catalog cost price fallback
   */
  getHistoricalPurchasePrice(supplierIdOrName: string, productId: string): number {
    const sQuery = (supplierIdOrName || '').toLowerCase().trim();

    // 1. Check Supplier Master
    const supplier = DEFAULT_SUPPLIERS.find(
      (s) =>
        s.id.toLowerCase() === sQuery ||
        s.code.toLowerCase() === sQuery ||
        s.name.toLowerCase().includes(sQuery) ||
        (sQuery.includes('schneider') && s.id === 'sup-1') ||
        (sQuery.includes('kelani') && s.id === 'sup-2')
    );
    if (supplier?.historicalPrices?.[productId]) {
      return supplier.historicalPrices[productId];
    }

    // 2. Check previous posted bills for this supplier
    const previousBills = this.bills.filter(
      (b) =>
        b.supplierId.toLowerCase() === sQuery ||
        b.supplierName.toLowerCase().includes(sQuery) ||
        (supplier && b.supplierId === supplier.id)
    );
    for (const bill of previousBills) {
      const match = bill.lineItems.find((li) => li.productId === productId);
      if (match && match.unitCost > 0) {
        return match.unitCost;
      }
    }

    // 3. Fallback to product catalogue default cost price
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    return product?.pricing.costPrice || 0;
  }

  /**
   * Landed Cost Engine: Apportion bulk freight across line items
   * - BY_VALUE: Proportional to line net value = receivedQuantity * unitCost - lineDiscount
   * - BY_QUANTITY: Proportional to receivedQuantity
   */
  apportionFreight(
    lineItems: VendorBillLineItem[],
    bulkFreight: number,
    method: 'BY_VALUE' | 'BY_QUANTITY' = 'BY_VALUE'
  ): VendorBillLineItem[] {
    const freightDecimal = new Decimal(bulkFreight || 0);
    if (lineItems.length === 0 || freightDecimal.isZero()) {
      return lineItems.map((item) => ({
        ...item,
        apportionedFreight: 0,
        landedUnitCost: item.unitCost,
      }));
    }

    if (method === 'BY_QUANTITY') {
      const totalQty = lineItems.reduce((acc, i) => acc + (i.receivedQuantity || 0), 0);
      if (totalQty === 0) return lineItems;

      let remainingFreight = freightDecimal;
      return lineItems.map((item, idx) => {
        let lineFreight: Decimal;
        if (idx === lineItems.length - 1) {
          lineFreight = remainingFreight;
        } else {
          const ratio = new Decimal(item.receivedQuantity).dividedBy(totalQty);
          lineFreight = freightDecimal.times(ratio).toDecimalPlaces(2);
          remainingFreight = remainingFreight.minus(lineFreight);
        }

        const qty = item.receivedQuantity || 1;
        const lineNet = new Decimal(qty).times(item.unitCost).minus(item.lineDiscount || 0);
        const landedCost = lineNet.plus(lineFreight).dividedBy(qty).toDecimalPlaces(2).toNumber();

        return {
          ...item,
          apportionedFreight: lineFreight.toNumber(),
          landedUnitCost: landedCost,
        };
      });
    } else {
      // BY_VALUE: proportional to line net value
      const totalNetValue = lineItems.reduce((acc, item) => {
        const net = Decimal.max(
          0,
          new Decimal(item.receivedQuantity).times(item.unitCost).minus(item.lineDiscount || 0)
        );
        return acc.plus(net);
      }, new Decimal(0));

      if (totalNetValue.isZero()) {
        return this.apportionFreight(lineItems, bulkFreight, 'BY_QUANTITY');
      }

      let remainingFreight = freightDecimal;
      return lineItems.map((item, idx) => {
        let lineFreight: Decimal;
        if (idx === lineItems.length - 1) {
          lineFreight = remainingFreight;
        } else {
          const net = Decimal.max(
            0,
            new Decimal(item.receivedQuantity).times(item.unitCost).minus(item.lineDiscount || 0)
          );
          const ratio = net.dividedBy(totalNetValue);
          lineFreight = freightDecimal.times(ratio).toDecimalPlaces(2);
          remainingFreight = remainingFreight.minus(lineFreight);
        }

        const qty = item.receivedQuantity || 1;
        const lineNet = new Decimal(qty).times(item.unitCost).minus(item.lineDiscount || 0);
        const landedCost = lineNet.plus(lineFreight).dividedBy(qty).toDecimalPlaces(2).toNumber();

        return {
          ...item,
          apportionedFreight: lineFreight.toNumber(),
          landedUnitCost: landedCost,
        };
      });
    }
  }

  /**
   * Get all GRNs available for costing (status SUBMITTED or APPROVED and not yet COSTED).
   */
  getAvailableGRNs(): GRN[] {
    const list = JSON.parse(JSON.stringify(MOCK_GRNS)) as GRN[];
    return list.map((g) => {
      const overrideStatus = this.grnStatuses[g.id];
      if (overrideStatus) {
        return { ...g, status: overrideStatus };
      }
      return g;
    });
  }

  getGRNById(grnId: string): GRN | null {
    const all = this.getAvailableGRNs();
    return all.find((g) => g.id === grnId || g.grnNumber === grnId) || null;
  }

  /**
   * Get all open bills for a supplier
   */
  getOpenBillsForSupplier(supplierIdOrName: string): VendorBill[] {
    const query = supplierIdOrName.toLowerCase();
    return this.bills.filter((b) => {
      const matchSupplier =
        b.supplierId.toLowerCase() === query ||
        b.supplierName.toLowerCase().includes(query) ||
        (query === 'sup-1' && (b.supplierId === 'sup-001' || b.supplierId === 'sup-1')) ||
        (query === 'sup-001' && (b.supplierId === 'sup-001' || b.supplierId === 'sup-1'));
      return matchSupplier && b.balanceDue > 0 && b.status !== 'PAID';
    });
  }

  getAllBills(): VendorBill[] {
    return [...this.bills];
  }

  /**
   * Post Vendor Bill (GRN Costing):
   * Triggers GL double-entry:
   * Dr Inventory (1030 / 1100) [Items Net + Freight + Other Costs]
   * Dr 1025 Input VAT Receivable (Asset) - Tax separation from output VAT liability
   * Cr Accounts Payable (2010) [Total Bill Amount]
   * Changes GRN status to COSTED
   */
  async postVendorBill(params: {
    grnId: string;
    vendorInvoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    lineItems: VendorBillLineItem[];
    freightCharges: number;
    otherLandingCosts: number;
    applyAdvanceId?: string;
    advanceAmountToApply?: number;
  }): Promise<VendorBill> {
    const grn = this.getGRNById(params.grnId);
    if (!grn) {
      throw new Error(`GRN ${params.grnId} not found`);
    }

    // Calculations with decimal.js
    let itemsNetSubtotal = new Decimal(0);
    let totalVAT = new Decimal(0);

    for (const item of params.lineItems) {
      const gross = new Decimal(item.receivedQuantity).times(new Decimal(item.unitCost));
      const net = gross.minus(new Decimal(item.lineDiscount || 0));
      itemsNetSubtotal = itemsNetSubtotal.plus(net);

      if (item.vatCode === 'STANDARD_18') {
        const vat = net.times(new Decimal(0.18));
        totalVAT = totalVAT.plus(vat);
      }
    }

    const freight = new Decimal(params.freightCharges || 0);
    const otherCosts = new Decimal(params.otherLandingCosts || 0);

    // Total Landed Inventory Value = items net + freight + other costs
    const inventoryDebit = itemsNetSubtotal.plus(freight).plus(otherCosts);
    const vatDebit = totalVAT;
    const totalBillCredit = inventoryDebit.plus(vatDebit);

    // Look up GL Accounts
    const accounts = await financeRepository.getAccounts();
    const inventoryAcc =
      accounts.find((a) => a.code === '1030' || a.code === '1100') ||
      accounts.find((a) => a.name.includes('Inventory'));
    const apAcc =
      accounts.find((a) => a.code === '2010') ||
      accounts.find((a) => a.name.includes('Payable'));

    // Tax Separation: Debit purchases to 1025 Input VAT Receivable (Asset)
    const vatAcc =
      accounts.find((a) => a.code === '1025') ||
      accounts.find((a) => a.name.includes('Input VAT')) ||
      accounts.find((a) => a.code === '2020');

    if (!inventoryAcc || !apAcc) {
      throw new Error(
        'Required General Ledger control accounts (1030/1100 Inventory, 2010 Accounts Payable) not found.'
      );
    }

    const lines = [
      {
        accountId: inventoryAcc.id,
        debit: inventoryDebit.toNumber(),
        credit: 0,
        description: `Landed Inventory Costing for GRN ${grn.grnNumber}`,
      },
      ...(vatDebit.toNumber() > 0 && vatAcc
        ? [
            {
              accountId: vatAcc.id,
              debit: vatDebit.toNumber(),
              credit: 0,
              description: `Input VAT Receivable (18%) on Vendor Invoice ${params.vendorInvoiceNumber}`,
            },
          ]
        : []),
      {
        accountId: apAcc.id,
        debit: 0,
        credit: totalBillCredit.toNumber(),
        description: `Trade Payable to ${grn.supplierName} - Inv #${params.vendorInvoiceNumber}`,
        supplierId: grn.supplierId,
        supplierName: grn.supplierName,
      },
    ];

    // Post to General Ledger
    const journalEntry = await financeRepository.createJournalEntry({
      date: params.invoiceDate,
      description: `Vendor Bill Post: ${grn.supplierName} (GRN ${grn.grnNumber} / Inv ${params.vendorInvoiceNumber})`,
      reference: params.vendorInvoiceNumber,
      source: 'GRN',
      lines,
    });

    // Mark GRN status as COSTED
    this.grnStatuses[grn.id] = 'COSTED';

    const newBill: VendorBill = {
      id: `bill-${Date.now()}`,
      billNumber: `BILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorInvoiceNumber: params.vendorInvoiceNumber.trim(),
      grnId: grn.id,
      grnNumber: grn.grnNumber,
      supplierId: grn.supplierId,
      supplierName: grn.supplierName,
      invoiceDate: params.invoiceDate,
      dueDate: params.dueDate,
      lineItems: params.lineItems,
      freightCharges: freight.toNumber(),
      otherLandingCosts: otherCosts.toNumber(),
      subtotal: itemsNetSubtotal.toNumber(),
      vatTotal: vatDebit.toNumber(),
      totalAmount: totalBillCredit.toNumber(),
      balanceDue: totalBillCredit.toNumber(),
      status: 'POSTED',
      journalEntryId: journalEntry.id,
      appliedAdvanceId: params.applyAdvanceId,
      createdAt: new Date().toISOString(),
    };

    this.bills.unshift(newBill);

    // Record advance application if applied via parameters
    if (params.applyAdvanceId && params.advanceAmountToApply && params.advanceAmountToApply > 0) {
      await this.applyAdvanceToGRNOrBill({
        advanceId: params.applyAdvanceId,
        billId: newBill.id,
        grnId: grn.id,
        grnNumber: grn.grnNumber,
        amountToApply: Math.min(params.advanceAmountToApply, totalBillCredit.toNumber()),
      });
    }

    // Also settle any advances previously mapped to this GRN that were awaiting bill creation
    const pendingAdvances = this.advances.filter((a) =>
      a.appliedTo.some((app) => app.grnId === grn.id && !app.billId)
    );
    for (const adv of pendingAdvances) {
      for (const app of adv.appliedTo) {
        if (app.grnId === grn.id && !app.billId) {
          app.billId = newBill.id;
          app.billNumber = newBill.billNumber;
          const apAcc = accounts.find((a) => a.code === '2010');
          const advanceAcc = accounts.find((a) => a.code === '1050');
          if (apAcc && advanceAcc) {
            const je = await financeRepository.createJournalEntry({
              date: params.invoiceDate,
              description: `Map Advance ${adv.advanceNumber} to Bill ${newBill.billNumber} (GRN ${grn.grnNumber})`,
              reference: adv.advanceNumber,
              source: 'GRN',
              lines: [
                {
                  accountId: apAcc.id,
                  debit: app.appliedAmount,
                  credit: 0,
                  description: `Clear Accounts Payable against prepayment (${grn.supplierName})`,
                  supplierId: grn.supplierId,
                  supplierName: grn.supplierName,
                },
                {
                  accountId: advanceAcc.id,
                  debit: 0,
                  credit: app.appliedAmount,
                  description: `Draw down Advance ${adv.advanceNumber}`,
                  supplierId: grn.supplierId,
                  supplierName: grn.supplierName,
                },
              ],
            });
            app.journalEntryId = je.id;
          }
          const newBal = Math.max(0, Number(new Decimal(newBill.balanceDue).minus(app.appliedAmount).toFixed(2)));
          newBill.balanceDue = newBal;
          newBill.status = newBal === 0 ? 'PAID' : 'PARTIALLY_PAID';
        }
      }
    }

    this.save();
    return newBill;
  }

  /**
   * Post Batch Supplier Payment:
   * Dr Accounts Payable (2010)
   * Cr Bank Account (1010)
   */
  async postBatchSupplierPayment(params: {
    supplierId: string;
    supplierName: string;
    paymentDate: string;
    bankAccountId: string;
    bankAccountCode: string;
    paymentReference: string;
    totalPaymentAmount: number;
    allocations: { billId: string; amountToApply: number }[];
  }): Promise<void> {
    const totalApplied = params.allocations.reduce((sum, a) => sum + (a.amountToApply || 0), 0);

    if (Math.abs(totalApplied - params.totalPaymentAmount) > 0.01) {
      throw new Error(
        `Validation Error: Sum of applied bill allocations (${totalApplied.toFixed(
          2
        )}) must exactly equal Total Payment Amount (${params.totalPaymentAmount.toFixed(2)})`
      );
    }

    const accounts = await financeRepository.getAccounts();
    const apAcc = accounts.find((a) => a.code === '2010');
    const bankAcc = accounts.find((a) => a.id === params.bankAccountId) || accounts.find((a) => a.code === '1010');

    if (!apAcc || !bankAcc) {
      throw new Error('Required General Ledger accounts for supplier settlement not found.');
    }

    // Double-entry GL voucher: Dr Accounts Payable, Cr Bank
    await financeRepository.createJournalEntry({
      date: params.paymentDate,
      description: `Batch Supplier Payment to ${params.supplierName} - Ref: ${params.paymentReference}`,
      reference: params.paymentReference,
      source: 'PAYMENT',
      lines: [
        {
          accountId: apAcc.id,
          debit: params.totalPaymentAmount,
          credit: 0,
          description: `Settle Supplier Payable (${params.supplierName})`,
        },
        {
          accountId: bankAcc.id,
          debit: 0,
          credit: params.totalPaymentAmount,
          description: `Disbursement from ${bankAcc.name} (${bankAcc.code})`,
        },
      ],
    });

    // Update balances on target bills
    for (const alloc of params.allocations) {
      if (alloc.amountToApply <= 0) continue;
      const billIndex = this.bills.findIndex((b) => b.id === alloc.billId);
      if (billIndex >= 0) {
        const b = this.bills[billIndex];
        const newBal = Math.max(0, Number(new Decimal(b.balanceDue).minus(alloc.amountToApply).toFixed(2)));
        b.balanceDue = newBal;
        b.status = newBal === 0 ? 'PAID' : 'PARTIALLY_PAID';
      }
    }

    this.save();
  }

  // ==========================================
  // Supplier Advance Payments (Prepayments)
  // ==========================================

  getSupplierAdvances(supplierId?: string): SupplierAdvance[] {
    if (!supplierId) return [...this.advances];
    const q = supplierId.toLowerCase();
    return this.advances.filter(
      (a) => a.supplierId.toLowerCase() === q || a.supplierName.toLowerCase().includes(q)
    );
  }

  getUnappliedAdvancesForSupplier(supplierId: string): SupplierAdvance[] {
    const q = (supplierId || '').toLowerCase();
    return this.advances.filter(
      (a) =>
        (a.supplierId.toLowerCase() === q || a.supplierName.toLowerCase().includes(q)) &&
        a.unappliedBalance > 0 &&
        a.status !== 'VOIDED'
    );
  }

  /**
   * Record Supplier Advance / Prepayment before bill exists:
   * Dr Advance to Suppliers (1050)
   * Cr Bank Account (1010)
   */
  async postSupplierAdvance(params: {
    supplierId: string;
    supplierName: string;
    paymentDate: string;
    bankAccountId: string;
    bankAccountCode?: string;
    reference: string;
    amount: number;
    notes?: string;
  }): Promise<SupplierAdvance> {
    if (params.amount <= 0) {
      throw new Error('Advance payment amount must be greater than zero.');
    }
    periodLockService.assertNotLocked(params.paymentDate);

    const accounts = await financeRepository.getAccounts();
    const advanceAcc =
      accounts.find((a) => a.code === '1050') ||
      accounts.find((a) => a.name.toLowerCase().includes('advance'));
    const bankAcc =
      accounts.find((a) => a.id === params.bankAccountId) ||
      accounts.find((a) => a.code === '1010');

    if (!advanceAcc || !bankAcc) {
      throw new Error(
        'Required General Ledger accounts (1050 Advance to Suppliers, Bank Account) not found.'
      );
    }

    // Dr Advance to Suppliers (1050), Cr Bank (1010)
    const journalEntry = await financeRepository.createJournalEntry({
      date: params.paymentDate,
      description: `Advance Payment to Supplier: ${params.supplierName} - Ref: ${params.reference}`,
      reference: params.reference,
      source: 'PAYMENT',
      lines: [
        {
          accountId: advanceAcc.id,
          debit: params.amount,
          credit: 0,
          description: `Prepayment deposit to ${params.supplierName}`,
          supplierId: params.supplierId,
          supplierName: params.supplierName,
        },
        {
          accountId: bankAcc.id,
          debit: 0,
          credit: params.amount,
          description: `Disbursement from ${bankAcc.name} (${bankAcc.code})`,
        },
      ],
    });

    const newAdvance: SupplierAdvance = {
      id: `adv-${Date.now()}`,
      advanceNumber: `ADV-2026-${Math.floor(100 + Math.random() * 900)}`,
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      paymentDate: params.paymentDate,
      bankAccountId: bankAcc.id,
      bankAccountCode: bankAcc.code,
      reference: params.reference.trim(),
      amount: params.amount,
      unappliedBalance: params.amount,
      status: 'UNAPPLIED',
      notes: params.notes,
      journalEntryId: journalEntry.id,
      appliedTo: [],
      createdAt: new Date().toISOString(),
    };

    this.advances.unshift(newAdvance);
    this.save();
    return newAdvance;
  }

  /**
   * Map unapplied advance to finalized GRN / Vendor Bill:
   * Dr Accounts Payable (2010)
   * Cr Advance to Suppliers (1050)
   */
  async applyAdvanceToGRNOrBill(params: {
    advanceId: string;
    billId?: string;
    grnId?: string;
    grnNumber?: string;
    amountToApply: number;
  }): Promise<{ advance: SupplierAdvance; bill?: VendorBill }> {
    const advIndex = this.advances.findIndex((a) => a.id === params.advanceId);
    if (advIndex < 0) {
      throw new Error(`Advance ${params.advanceId} not found`);
    }
    const advance = this.advances[advIndex];

    if (params.amountToApply <= 0) {
      throw new Error('Amount to apply must be greater than zero.');
    }
    if (params.amountToApply > advance.unappliedBalance + 0.001) {
      throw new Error(
        `Applied amount (${params.amountToApply}) exceeds available unapplied advance balance (${advance.unappliedBalance})`
      );
    }

    let targetBill: VendorBill | undefined;
    if (params.billId) {
      targetBill = this.bills.find((b) => b.id === params.billId);
    } else if (params.grnId) {
      targetBill = this.bills.find((b) => b.grnId === params.grnId);
    }

    let jeId: string | undefined;

    if (targetBill) {
      const accounts = await financeRepository.getAccounts();
      const apAcc = accounts.find((a) => a.code === '2010');
      const advanceAcc = accounts.find((a) => a.code === '1050');

      if (apAcc && advanceAcc) {
        // Dr 2010 Accounts Payable, Cr 1050 Advance to Suppliers
        const je = await financeRepository.createJournalEntry({
          date: new Date().toISOString().slice(0, 10),
          description: `Map Advance ${advance.advanceNumber} to Bill ${targetBill.billNumber} (GRN ${targetBill.grnNumber})`,
          reference: advance.advanceNumber,
          source: 'GRN',
          lines: [
            {
              accountId: apAcc.id,
              debit: params.amountToApply,
              credit: 0,
              description: `Clear Accounts Payable against prepayment (${targetBill.supplierName})`,
              supplierId: targetBill.supplierId,
              supplierName: targetBill.supplierName,
            },
            {
              accountId: advanceAcc.id,
              debit: 0,
              credit: params.amountToApply,
              description: `Draw down Advance ${advance.advanceNumber}`,
              supplierId: targetBill.supplierId,
              supplierName: targetBill.supplierName,
            },
          ],
        });
        jeId = je.id;
      }

      // Update bill balance
      const newBillBalance = Math.max(
        0,
        Number(new Decimal(targetBill.balanceDue).minus(params.amountToApply).toFixed(2))
      );
      targetBill.balanceDue = newBillBalance;
      targetBill.status = newBillBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';
    }

    // Update advance unapplied balance
    const newUnapplied = Math.max(
      0,
      Number(new Decimal(advance.unappliedBalance).minus(params.amountToApply).toFixed(2))
    );
    advance.unappliedBalance = newUnapplied;
    advance.status = newUnapplied === 0 ? 'APPLIED' : 'PARTIALLY_APPLIED';
    advance.appliedTo = advance.appliedTo || [];
    advance.appliedTo.push({
      id: `app-${Date.now()}`,
      billId: targetBill?.id || params.billId,
      billNumber: targetBill?.billNumber,
      grnId: targetBill?.grnId || params.grnId,
      grnNumber: targetBill?.grnNumber || params.grnNumber,
      appliedAmount: params.amountToApply,
      appliedAt: new Date().toISOString(),
      journalEntryId: jeId,
    });

    this.save();
    return { advance, bill: targetBill };
  }

  // ==========================================
  // Supplier Debit Notes (Damaged Stock Returns)
  // ==========================================

  getDebitNotes(supplierId?: string): SupplierDebitNote[] {
    if (!supplierId) return [...this.debitNotes];
    const q = supplierId.toLowerCase();
    return this.debitNotes.filter(
      (dn) => dn.supplierId.toLowerCase() === q || dn.supplierName.toLowerCase().includes(q)
    );
  }

  /**
   * Post Supplier Debit Note:
   * Dr 2010 Accounts Payable (reduces liability to supplier)
   * Cr 1100 Inventory (reduces merchandise inventory)
   */
  async postSupplierDebitNote(params: {
    supplierId: string;
    supplierName: string;
    grnId?: string;
    grnNumber?: string;
    date: string;
    reason: string;
    lineItems: SupplierDebitNoteLineItem[];
    targetBillId?: string;
  }): Promise<SupplierDebitNote> {
    if (!params.lineItems || params.lineItems.length === 0) {
      throw new Error('At least one damaged item line is required for a Debit Note.');
    }
    periodLockService.assertNotLocked(params.date);

    let totalAmount = new Decimal(0);
    for (const item of params.lineItems) {
      if (item.damagedQuantity <= 0) {
        throw new Error(`Damaged return quantity must be > 0 for ${item.productName}`);
      }
      const lineTotal = new Decimal(item.damagedQuantity).times(item.unitCost);
      totalAmount = totalAmount.plus(lineTotal);
    }

    const accounts = await financeRepository.getAccounts();
    const apAcc = accounts.find((a) => a.code === '2010');
    const inventoryAcc =
      accounts.find((a) => a.code === '1100' || a.code === '1030') ||
      accounts.find((a) => a.name.toLowerCase().includes('inventory'));

    if (!apAcc || !inventoryAcc) {
      throw new Error(
        'Required General Ledger accounts (2010 Accounts Payable, 1100/1030 Inventory) not found.'
      );
    }

    const debitNoteNumber = `DN-2026-${Math.floor(100 + Math.random() * 900)}`;

    // Debit 2010 A/P, Credit 1100 Inventory
    const je = await financeRepository.createJournalEntry({
      date: params.date,
      description: `Supplier Debit Note ${debitNoteNumber} - Damaged Stock Return to ${params.supplierName}`,
      reference: debitNoteNumber,
      source: 'GRN',
      lines: [
        {
          accountId: apAcc.id,
          debit: totalAmount.toNumber(),
          credit: 0,
          description: `Debit Note refund reduction of Accounts Payable (${params.supplierName})`,
          supplierId: params.supplierId,
          supplierName: params.supplierName,
        },
        {
          accountId: inventoryAcc.id,
          debit: 0,
          credit: totalAmount.toNumber(),
          description: `Inventory reduction for returned damaged goods to ${params.supplierName}`,
        },
      ],
    });

    // If target bill specified, reduce balance due
    if (params.targetBillId) {
      const bill = this.bills.find((b) => b.id === params.targetBillId);
      if (bill) {
        const newBal = Math.max(0, Number(new Decimal(bill.balanceDue).minus(totalAmount).toFixed(2)));
        bill.balanceDue = newBal;
        bill.status = newBal === 0 ? 'PAID' : 'PARTIALLY_PAID';
      }
    }

    const newDebitNote: SupplierDebitNote = {
      id: `dn-${Date.now()}`,
      debitNoteNumber,
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      grnId: params.grnId,
      grnNumber: params.grnNumber,
      date: params.date,
      reason: params.reason,
      lineItems: params.lineItems.map((li) => ({
        ...li,
        lineTotal: new Decimal(li.damagedQuantity).times(li.unitCost).toNumber(),
      })),
      totalAmount: totalAmount.toNumber(),
      status: 'ISSUED',
      journalEntryId: je.id,
      createdAt: new Date().toISOString(),
    };

    this.debitNotes.unshift(newDebitNote);
    this.save();
    return newDebitNote;
  }

  getBillByGrnId(grnId: string): VendorBill | undefined {
    return this.bills.find((b) => b.grnId === grnId);
  }

  /**
   * Void / Reverse a posted Vendor Bill
   * 1. Validates period lock: Hard error if transaction date is in closed financial period
   * 2. Reverses the GL double-entry voucher
   * 3. Restores GRN status to APPROVED
   * 4. Updates bill status to VOIDED
   */
  async voidVendorBill(billIdOrGrnId: string, reason?: string): Promise<VendorBill> {
    const bill = this.bills.find((b) => b.id === billIdOrGrnId || b.grnId === billIdOrGrnId);
    if (!bill) {
      throw new Error(`Vendor bill not found: ${billIdOrGrnId}`);
    }

    if (bill.status === 'VOIDED') {
      throw new Error(`Vendor bill ${bill.billNumber} is already voided.`);
    }

    // Hard period closing error check
    periodLockService.assertNotLocked(bill.invoiceDate);

    // Revert GL entry if posted
    if (bill.journalEntryId) {
      await financeRepository.voidJournalEntry(bill.journalEntryId, reason);
    }

    // Restore GRN status back to APPROVED so it can be re-costed or inspected
    if (bill.grnId) {
      this.grnStatuses[bill.grnId] = 'APPROVED';
    }

    bill.status = 'VOIDED';
    this.save();
    return bill;
  }

  reset(): void {
    this.bills = JSON.parse(JSON.stringify(INITIAL_BILLS));
    this.grnStatuses = {};
    this.advances = JSON.parse(JSON.stringify(INITIAL_ADVANCES));
    this.debitNotes = JSON.parse(JSON.stringify(INITIAL_DEBIT_NOTES));
    this.save();
  }
}

export const apService = new AccountsPayableService();
