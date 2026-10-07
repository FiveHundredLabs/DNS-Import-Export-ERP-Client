import { GRN } from '../../../types/inventory';
import { MOCK_GRNS } from '../../../mock/mockInventory';
import { financeRepository } from '../api';
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
  createdAt: string;
}

const AP_BILLS_STORAGE_KEY = 'dns_finance_ap_vendor_bills';
const GRN_STATUS_STORAGE_KEY = 'dns_finance_grn_status_map';

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
      } else {
        this.bills = JSON.parse(JSON.stringify(INITIAL_BILLS));
      }
    } catch {
      this.bills = JSON.parse(JSON.stringify(INITIAL_BILLS));
    }
  }

  private save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(AP_BILLS_STORAGE_KEY, JSON.stringify(this.bills));
        localStorage.setItem(GRN_STATUS_STORAGE_KEY, JSON.stringify(this.grnStatuses));
      }
    } catch {
      // fallback
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
   * Dr Inventory (1030) [Items Net + Freight + Other Costs]
   * Dr VAT Receivable / Input VAT (1020 or 2020 offset)
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
    const inventoryAcc = accounts.find((a) => a.code === '1030') || accounts.find((a) => a.name.includes('Inventory'));
    const apAcc = accounts.find((a) => a.code === '2010') || accounts.find((a) => a.name.includes('Payable'));
    // VAT account (VAT Payable / Input VAT)
    const vatAcc = accounts.find((a) => a.code === '2020') || accounts.find((a) => a.name.includes('VAT'));

    if (!inventoryAcc || !apAcc) {
      throw new Error('Required General Ledger control accounts (1030 Inventory, 2010 Accounts Payable) not found.');
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
              description: `VAT Receivable (18%) on Vendor Invoice ${params.vendorInvoiceNumber}`,
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
      createdAt: new Date().toISOString(),
    };

    this.bills.unshift(newBill);
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
    this.save();
  }
}

export const apService = new AccountsPayableService();
