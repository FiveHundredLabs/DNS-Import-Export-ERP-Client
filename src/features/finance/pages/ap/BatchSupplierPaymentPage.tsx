import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apService, VendorBill } from '../../services/apService';
import { MOCK_GRNS } from '../../../../mock/mockInventory';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { useAuth } from '../../../../hooks/useAuth';
import { CurrencyInput } from '../../components/CurrencyInput';
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
import { PurchaseOrderSelector } from '../../../../components/selectors/PurchaseOrderSelector';
import { PaymentVouchersRegistry } from '../../components/PaymentVouchersRegistry';
import { Button } from '../../../../components/ui/button';
import { ConfirmButton } from '../../../../components/ui/confirm-button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import { cn } from '../../../../utils/cn';
import Decimal from 'decimal.js';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck,
  Coins,
  ArrowRight,
  ArrowLeft,
  Landmark,
  Plus,
  Wallet,
  Printer,
  FileText,
  Trash2,
  Calendar,
  Building2,
  Search,
  ShoppingCart,
  Check,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { PrintablePaymentVoucher } from '../../components/PrintablePaymentVoucher';
import { PaymentVoucher, CashVoucherCategory } from '../../../../types/cashbook';
import { purchaseOrderService } from '../../../../services/PurchaseOrderService';
import { PurchaseOrder } from '../../../../types/purchasing';
import { financeRepository } from '../../api';
import { JournalEntry } from '../../api/types';
import { cashBookService } from '../../../../services/CashBookService';

export type PaymentDeskMode =
  | 'SETTLE_BILLS'
  | 'ADVANCE_PREPAYMENT'
  | 'OTHER_PAYMENTS'
  | 'REGISTRY';

export interface BatchSupplierPaymentPageProps {
  hideTopNav?: boolean;
  initialMode?: PaymentDeskMode;
  onViewRegistry?: () => void;
  voucherNumber?: string;
}

export function BatchSupplierPaymentPage({
  hideTopNav,
  initialMode,
  onViewRegistry,
  voucherNumber,
}: BatchSupplierPaymentPageProps = {}) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { suppliers, accounts } = useFinanceLedger();

  const [currentVoucherNum, setCurrentVoucherNum] = useState<string>(
    () => voucherNumber || `PV-2026-${String(Math.floor(80 + Math.random() * 20)).padStart(4, '0')}`
  );
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<PaymentVoucher | null>(null);

  // Active desk mode
  const [deskMode, setDeskMode] = useState<PaymentDeskMode>(
    initialMode || 'SETTLE_BILLS'
  );

  // Filter bank and cash accounts (1010 / 1015 / 1040)
  const bankAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.accountClass === 'ASSET' &&
        (a.code.startsWith('1010') ||
          a.code.startsWith('1015') ||
          a.name.toLowerCase().includes('bank') ||
          a.code === '1040')
    );
  }, [accounts]);

  // Filter general expense & liability accounts for Other Payments
  const expenseAndLiabilityAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.accountClass === 'EXPENSE' ||
        a.accountClass === 'LIABILITY' ||
        a.code === '1510' ||
        a.code === '1060'
    );
  }, [accounts]);

  // =========================================================================
  // Shared / Invoice Settlement State
  // =========================================================================
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [debitAccountId, setDebitAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE'>('BANK');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [totalPaymentAmount, setTotalPaymentAmount] = useState<number>(0);
  const [openBills, setOpenBills] = useState<VendorBill[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // =========================================================================
  // Supplier Advance State
  // =========================================================================
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceNotes, setAdvanceNotes] = useState<string>('');
  const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // =========================================================================
  // Other Payments State
  // =========================================================================
  const [otherDebitAccountId, setOtherDebitAccountId] = useState<string>('');
  const [otherBankAccountId, setOtherBankAccountId] = useState<string>('');
  const [otherPaymentDate, setOtherPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [otherPayee, setOtherPayee] = useState<string>('');
  const [otherPaymentMethod, setOtherPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE'>('BANK');
  const [otherPaymentRef, setOtherPaymentRef] = useState<string>('');
  const [otherAmount, setOtherAmount] = useState<number>(0);
  const [otherCategory, setOtherCategory] = useState<CashVoucherCategory>('UTILITIES');
  const [otherNarration, setOtherNarration] = useState<string>('');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);

  // Default finance user fallback
  const effectiveUser = useMemo(() => {
    return (
      currentUser || {
        id: 'usr-fin',
        name: 'Finance Desk',
        email: 'finance@dns.lk',
        role: 'FINANCE_MANAGER',
      }
    );
  }, [currentUser]);

  // Load Purchase Orders
  useEffect(() => {
    purchaseOrderService
      .getAll()
      .then((pos) => setAllPurchaseOrders(pos || []))
      .catch(() => setAllPurchaseOrders([]));
  }, []);

  // Load Journal Entries for Other Payments quick-settle
  useEffect(() => {
    financeRepository
      .getJournalEntries()
      .then((entries) => {
        // Filter relevant journal entries (expenses, accruals, standard entries)
        const relevant = (entries || []).filter(
          (j) => j.status === 'POSTED' && j.source !== 'PAYMENT'
        );
        setJournalEntries(relevant);
      })
      .catch(() => setJournalEntries([]));
  }, []);

  // Auto-select bank accounts
  useEffect(() => {
    if (bankAccounts.length > 0) {
      if (!bankAccountId) setBankAccountId(bankAccounts[0].id);
      if (!otherBankAccountId) setOtherBankAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, bankAccountId, otherBankAccountId]);

  // Auto-select initial debit accounts
  useEffect(() => {
    if (accounts.length > 0) {
      const ap = accounts.find((a) => a.code === '2010');
      if (ap && !debitAccountId) setDebitAccountId(ap.id);

      const rentOrUtil = accounts.find(
        (a) => a.code === '6030' || a.code === '5020' || a.accountClass === 'EXPENSE'
      );
      if (rentOrUtil && !otherDebitAccountId) setOtherDebitAccountId(rentOrUtil.id);
    }
  }, [accounts, debitAccountId, otherDebitAccountId]);

  // Auto-select first supplier
  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  // Load open bills when supplier changes
  useEffect(() => {
    if (selectedSupplierId) {
      const selectedSup = suppliers.find((s) => s.id === selectedSupplierId);
      const bills = apService.getOpenBillsForSupplier(
        selectedSup ? selectedSup.name : selectedSupplierId
      );
      setOpenBills(bills);
      setAllocations({});
    } else {
      setOpenBills([]);
      setAllocations({});
    }
  }, [selectedSupplierId, suppliers]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );

  const selectedBank = useMemo(
    () => accounts.find((a) => a.id === bankAccountId),
    [accounts, bankAccountId]
  );

  const otherSelectedBank = useMemo(
    () => accounts.find((a) => a.id === otherBankAccountId),
    [accounts, otherBankAccountId]
  );

  const otherSelectedDebitAccount = useMemo(
    () => accounts.find((a) => a.id === otherDebitAccountId),
    [accounts, otherDebitAccountId]
  );

  // Supplier advances available for offset
  const unappliedAdvances = useMemo(() => {
    if (!selectedSupplierId) return [];
    return apService.getUnappliedAdvancesForSupplier(
      selectedSupplier?.name || selectedSupplierId
    );
  }, [selectedSupplierId, selectedSupplier]);

  const totalUnappliedAdvance = useMemo(() => {
    return unappliedAdvances.reduce((acc, a) => acc + (a.unappliedBalance || 0), 0);
  }, [unappliedAdvances]);

  // POs for selected supplier
  const supplierPurchaseOrders = useMemo(() => {
    if (!selectedSupplierId) return [];
    const supName = selectedSupplier?.name?.toLowerCase() || '';
    const allAdvances = apService.getSupplierAdvances();

    return allPurchaseOrders
      .filter((po) => {
        return (
          po.supplierId === selectedSupplierId ||
          po.supplierName?.toLowerCase() === supName ||
          po.supplierCode === selectedSupplier?.code
        );
      })
      .map((po) => {
        const poAdvances = allAdvances.filter(
          (adv) => adv.purchaseOrderNumber === po.poNumber
        );
        const advancePaid = poAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
        const balanceDue = Math.max(0, new Decimal(po.grandTotal).minus(advancePaid).toNumber());
        return {
          ...po,
          advancePaid,
          balanceDue,
        };
      });
  }, [allPurchaseOrders, selectedSupplierId, selectedSupplier]);

  const getBillPoRef = (bill: VendorBill): string => {
    const matchingGrn = MOCK_GRNS.find(
      (g) => g.id === bill.grnId || g.grnNumber === bill.grnNumber
    );
    return (
      (bill as any).purchaseOrderNumber ||
      matchingGrn?.purchaseOrderNumber ||
      (bill.grnNumber ? `PO-${bill.grnNumber.slice(-4)}` : 'PO-DIRECT')
    );
  };

  // 1-Click Apply Advance Deductions across open bills
  const handleApplyAdvanceDeductions = async () => {
    if (unappliedAdvances.length === 0 || openBills.length === 0) {
      toast.info('No unapplied advances or open bills to offset.');
      return;
    }

    try {
      let appliedTotal = 0;
      for (const bill of openBills) {
        if (bill.balanceDue <= 0) continue;
        const availableAdvs = apService.getUnappliedAdvancesForSupplier(
          selectedSupplier?.name || selectedSupplierId
        );
        const poRef = getBillPoRef(bill);
        const adv =
          availableAdvs.find((a) => a.purchaseOrderNumber === poRef && a.unappliedBalance > 0) ||
          availableAdvs.find((a) => a.unappliedBalance > 0);
        if (!adv) break;

        const deductAmt = Math.min(adv.unappliedBalance, bill.balanceDue);
        if (deductAmt <= 0) continue;

        await apService.applyAdvanceToGRNOrBill({
          advanceId: adv.id,
          billId: bill.id,
          amountToApply: deductAmt,
        });
        appliedTotal += deductAmt;
      }

      if (appliedTotal > 0) {
        toast.success(
          `Successfully applied ${formatCurrency(appliedTotal)} in advance deductions! Net batch payment updated.`
        );
        const updated = apService.getOpenBillsForSupplier(
          selectedSupplier ? selectedSupplier.name : selectedSupplierId
        );
        setOpenBills(updated);

        const newAlloc: Record<string, number> = {};
        let netPayable = 0;
        updated.forEach((b) => {
          newAlloc[b.id] = b.balanceDue;
          netPayable += b.balanceDue;
        });
        setAllocations(newAlloc);
        setTotalPaymentAmount(netPayable);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply advance deduction');
    }
  };

  const handleApplyAdvanceToSingleBill = async (bill: VendorBill) => {
    const availableAdvs = apService.getUnappliedAdvancesForSupplier(
      selectedSupplier?.name || selectedSupplierId
    );
    const poRef = getBillPoRef(bill);
    const adv =
      availableAdvs.find((a) => a.purchaseOrderNumber === poRef && a.unappliedBalance > 0) ||
      availableAdvs.find((a) => a.unappliedBalance > 0);
    if (!adv) {
      toast.error('No unapplied advances available.');
      return;
    }

    const deductAmt = Math.min(adv.unappliedBalance, bill.balanceDue);
    if (deductAmt <= 0) return;

    try {
      await apService.applyAdvanceToGRNOrBill({
        advanceId: adv.id,
        billId: bill.id,
        amountToApply: deductAmt,
      });

      toast.success(
        `Applied ${formatCurrency(deductAmt)} from ${adv.advanceNumber} (${poRef ? `PO: ${poRef}` : 'Advance'}) to Bill ${bill.billNumber}!`
      );

      const updated = apService.getOpenBillsForSupplier(
        selectedSupplier ? selectedSupplier.name : selectedSupplierId
      );
      setOpenBills(updated);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply advance');
    }
  };

  // Allocation change on a bill row
  const handleAllocationChange = (billId: string, val: number) => {
    const currentAlloc = allocations[billId] || 0;
    const diff = new Decimal(val || 0).minus(new Decimal(currentAlloc)).toNumber();

    setAllocations((prev) => ({
      ...prev,
      [billId]: val,
    }));

    if (totalPaymentAmount === 0 || totalPaymentAmount === totalApplied) {
      setTotalPaymentAmount((prev) =>
        Math.max(0, new Decimal(prev || 0).plus(new Decimal(diff)).toNumber())
      );
    }
  };

  // Pay Full on open bill: sets allocation AND adds amount to total payment amount
  const handleApplyFull = (bill: VendorBill) => {
    const currentAlloc = allocations[bill.id] || 0;
    const diff = new Decimal(bill.balanceDue).minus(new Decimal(currentAlloc)).toNumber();

    setAllocations((prev) => ({
      ...prev,
      [bill.id]: bill.balanceDue,
    }));

    setTotalPaymentAmount((prev) => {
      const updated = new Decimal(prev || 0).plus(new Decimal(diff)).toNumber();
      return Math.max(0, updated);
    });
  };

  // Total applied across all bills
  const totalApplied = useMemo(() => {
    let sum = new Decimal(0);
    for (const val of Object.values(allocations)) {
      if (val > 0) sum = sum.plus(new Decimal(val));
    }
    return sum.toNumber();
  }, [allocations]);

  const difference = useMemo(() => {
    const total = new Decimal(totalPaymentAmount || 0);
    const applied = new Decimal(totalApplied || 0);
    return total.minus(applied).toNumber();
  }, [totalPaymentAmount, totalApplied]);

  const isAllocationBalanced = useMemo(() => {
    if (totalPaymentAmount <= 0) return false;
    return Math.abs(difference) <= 0.01;
  }, [totalPaymentAmount, difference]);

  const isFormValid = useMemo(() => {
    if (!selectedSupplierId) return false;
    if (!bankAccountId) return false;
    if (!paymentReference.trim()) return false;
    if (totalPaymentAmount <= 0) return false;
    return isAllocationBalanced;
  }, [
    selectedSupplierId,
    bankAccountId,
    paymentReference,
    totalPaymentAmount,
    isAllocationBalanced,
  ]);

  // =========================================================================
  // POST HANDLERS
  // =========================================================================

  // Post Invoice Settlement (Batch Supplier Payment)
  const handlePostPayment = async () => {
    if (!isFormValid) {
      toast.error('Validation failed: Total allocations must match Total Payment Amount.');
      return;
    }

    const selectedSup = suppliers.find((s) => s.id === selectedSupplierId);
    const bankAcc = accounts.find((a) => a.id === bankAccountId);

    try {
      setSubmitting(true);
      await apService.postBatchSupplierPayment({
        supplierId: selectedSupplierId,
        supplierName: selectedSup?.name || 'Selected Supplier',
        paymentDate,
        bankAccountId,
        bankAccountCode: bankAcc?.code || '1010',
        paymentReference: paymentReference.trim(),
        totalPaymentAmount,
        allocations: Object.entries(allocations).map(([billId, amountToApply]) => ({
          billId,
          amountToApply,
        })),
      });

      // Create Payment Voucher in CashBook
      await cashBookService.createVoucher(
        {
          voucherType: 'PAYMENT',
          category: 'SUPPLIER_PAYMENT',
          payeeOrPayer: selectedSup?.name || 'Selected Supplier',
          amount: totalPaymentAmount,
          cashAccountCode: (bankAcc?.code === '1040' ? '1040' : '1010') as '1010' | '1040',
          offsetAccountCode: '2010',
          offsetAccountName: 'Accounts Payable',
          description: `Batch Payment to ${selectedSup?.name || 'Supplier'} - Ref: ${paymentReference.trim()}`,
          paymentMethod: paymentMethod === 'CHEQUE' ? 'CHEQUE' : paymentMethod === 'CASH' ? 'CASH' : 'BANK_TRANSFER',
          chequeNumber: paymentMethod === 'CHEQUE' ? paymentReference : undefined,
          date: paymentDate,
          autoApprove: true,
        },
        effectiveUser as any
      );

      toast.success(
        `Batch Supplier Payment #${currentVoucherNum} of ${formatCurrency(
          totalPaymentAmount
        )} successfully posted and allocated to bills!`
      );

      // Prompt printable voucher
      handleTriggerPrint();

      // Reset form
      setAllocations({});
      setPaymentReference('');
      setTotalPaymentAmount(0);
      setCurrentVoucherNum(`PV-2026-${String(Math.floor(80 + Math.random() * 20)).padStart(4, '0')}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post batch payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Post Supplier Advance Prepayment
  const handlePostAdvance = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (!bankAccountId) {
      toast.error('Please select a disbursement bank account');
      return;
    }
    if (!paymentReference.trim()) {
      toast.error('Payment reference is required (e.g., Wire Ref / Cheque #)');
      return;
    }
    if (advanceAmount <= 0) {
      toast.error('Advance amount must be greater than zero');
      return;
    }

    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    const bank = accounts.find((a) => a.id === bankAccountId);

    try {
      setSubmitting(true);
      const adv = await apService.postSupplierAdvance({
        supplierId: selectedSupplierId,
        supplierName: sup?.name || 'Selected Supplier',
        paymentDate,
        bankAccountId,
        bankAccountCode: bank?.code || '1010',
        reference: paymentReference.trim(),
        amount: advanceAmount,
        notes: advanceNotes.trim() || undefined,
        purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
      });

      // Record in CashBook
      await cashBookService.createVoucher(
        {
          voucherType: 'PAYMENT',
          category: 'SUPPLIER_PAYMENT',
          payeeOrPayer: sup?.name || 'Selected Supplier',
          amount: advanceAmount,
          cashAccountCode: (bank?.code === '1040' ? '1040' : '1010') as '1010' | '1040',
          offsetAccountCode: '1050',
          offsetAccountName: 'Advance Payments to Suppliers',
          description: advanceNotes.trim() || (purchaseOrderNumber ? `Advance prepayment for PO ${purchaseOrderNumber}` : `Advance deposit to ${sup?.name}`),
          paymentMethod: paymentMethod === 'CHEQUE' ? 'CHEQUE' : paymentMethod === 'CASH' ? 'CASH' : 'BANK_TRANSFER',
          chequeNumber: paymentMethod === 'CHEQUE' ? paymentReference : undefined,
          date: paymentDate,
          autoApprove: true,
        },
        effectiveUser as any
      );

      toast.success(
        `Supplier Advance Payment ${adv.advanceNumber} of ${formatCurrency(
          advanceAmount
        )} recorded! GL Entry: Dr 1050 Advance to Suppliers, Cr Bank Account.`
      );

      handleTriggerPrint();

      setAdvanceAmount(0);
      setPaymentReference('');
      setAdvanceNotes('');
      setPurchaseOrderNumber('');
      setCurrentVoucherNum(`PV-2026-${String(Math.floor(80 + Math.random() * 20)).padStart(4, '0')}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post advance prepayment');
    } finally {
      setSubmitting(false);
    }
  };

  // Post Other / General Expense Payment Voucher
  const handlePostOtherPayment = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!otherDebitAccountId) {
      toast.error('Please select an Expense or Liability debit account');
      return;
    }
    if (!otherBankAccountId) {
      toast.error('Please select a payment bank or cash account');
      return;
    }
    if (!otherPayee.trim()) {
      toast.error('Payee / Beneficiary name is required');
      return;
    }
    if (!otherPaymentRef.trim()) {
      toast.error('Payment reference is required (e.g. Cheque # or Transaction Ref)');
      return;
    }
    if (otherAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    try {
      setSubmitting(true);
      const debitAcc = accounts.find((a) => a.id === otherDebitAccountId);
      const bankAcc = accounts.find((a) => a.id === otherBankAccountId);

      if (!debitAcc || !bankAcc) {
        throw new Error('Selected accounts not found');
      }

      // Create GL Journal Entry
      await financeRepository.createJournalEntry({
        date: otherPaymentDate,
        description: `Direct Payment to ${otherPayee.trim()} - ${otherNarration.trim() || debitAcc.name}`,
        reference: otherPaymentRef.trim(),
        source: 'PAYMENT',
        lines: [
          {
            accountId: debitAcc.id,
            debit: otherAmount,
            credit: 0,
            description: otherNarration.trim() || `Payment to ${otherPayee.trim()}`,
          },
          {
            accountId: bankAcc.id,
            debit: 0,
            credit: otherAmount,
            description: `Disbursement from ${bankAcc.name} (${bankAcc.code})`,
          },
        ],
      });

      // Create Voucher in CashBook
      const createdVoucher = await cashBookService.createVoucher(
        {
          voucherType: 'PAYMENT',
          category: otherCategory,
          payeeOrPayer: otherPayee.trim(),
          amount: otherAmount,
          cashAccountCode: (bankAcc.code === '1040' ? '1040' : '1010') as '1010' | '1040',
          offsetAccountCode: debitAcc.code,
          offsetAccountName: debitAcc.name,
          description: otherNarration.trim() || `Direct payment to ${otherPayee.trim()} - Ref: ${otherPaymentRef.trim()}`,
          paymentMethod: otherPaymentMethod === 'CHEQUE' ? 'CHEQUE' : otherPaymentMethod === 'CASH' ? 'CASH' : 'BANK_TRANSFER',
          chequeNumber: otherPaymentMethod === 'CHEQUE' ? otherPaymentRef : undefined,
          date: otherPaymentDate,
          autoApprove: true,
        },
        effectiveUser as any
      );

      toast.success(
        `Payment Voucher ${createdVoucher.voucherNumber} of ${formatCurrency(
          otherAmount
        )} generated and posted successfully! Dr ${debitAcc.code} ${debitAcc.name} / Cr ${bankAcc.code} ${bankAcc.name}`
      );

      setSelectedVoucherForPrint(createdVoucher);

      // Reset other payment form
      setOtherAmount(0);
      setOtherPaymentRef('');
      setOtherNarration('');
      setOtherPayee('');
      setSelectedJournalId(null);
      setCurrentVoucherNum(`PV-2026-${String(Math.floor(80 + Math.random() * 20)).padStart(4, '0')}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post payment voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectJournalEntry = (je: JournalEntry) => {
    setSelectedJournalId(je.id);
    setOtherPaymentDate(je.date);
    setOtherPaymentRef(`PV-${je.entryNumber}`);
    setOtherNarration(`Settlement of ${je.entryNumber}: ${je.description}`);

    // If there is a debit line in the journal, pick its account
    const debitLine = je.lines.find((l) => (l.debit || 0) > 0);
    if (debitLine) {
      const matchAcc = accounts.find(
        (a) => a.id === debitLine.accountId || a.code === debitLine.accountCode
      );
      if (matchAcc) {
        setOtherDebitAccountId(matchAcc.id);
      }
      setOtherAmount(debitLine.debit || je.totalDebit || 0);
    } else {
      setOtherAmount(je.totalDebit || 0);
    }

    if (je.description) {
      setOtherPayee(je.description.split('-')[0].trim());
    }

    toast.info(`Journal Entry #${je.entryNumber} selected and payment details auto-populated!`);
  };

  const handleTriggerPrint = () => {
    const selectedSup = suppliers.find((s) => s.id === selectedSupplierId);
    const bankAcc = accounts.find((a) => a.id === bankAccountId);
    const debitAcc = accounts.find((a) => a.id === debitAccountId);

    const voucher: PaymentVoucher = {
      id: currentVoucherNum,
      voucherNumber: currentVoucherNum,
      date: paymentDate,
      voucherType: 'PAYMENT',
      category: 'SUPPLIER_PAYMENT',
      payeeOrPayer: selectedSup?.name || 'Selected Supplier',
      amount: totalPaymentAmount > 0 ? totalPaymentAmount : advanceAmount,
      cashAccountCode: (bankAcc?.code === '1040' ? '1040' : '1010') as '1010' | '1040',
      cashAccountName: bankAcc?.name || 'Operating Bank Account',
      offsetAccountId: debitAcc?.id || 'acc-2010',
      offsetAccountCode: debitAcc?.code || '2010',
      offsetAccountName: debitAcc?.name || 'Accounts Payable (A/P Control)',
      description: paymentReference ? `Ref: ${paymentReference}` : 'Supplier payment voucher',
      status: 'APPROVED',
      createdBy: 'usr-fin',
      createdByName: 'Finance Manager',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedVoucherForPrint(voucher);
  };

  const handleSaveDraft = () => {
    toast.success(`Payment Voucher #${currentVoucherNum} saved as Draft!`);
  };

  const handleDeleteDraft = () => {
    setTotalPaymentAmount(0);
    setAllocations({});
    setPaymentReference('');
    setAdvanceAmount(0);
    setAdvanceNotes('');
    setPurchaseOrderNumber('');
    setOtherAmount(0);
    setOtherPaymentRef('');
    setOtherNarration('');
    toast.info(`Payment Voucher draft #${currentVoucherNum} reset.`);
  };

  // If REGISTRY mode is selected, render the Payment Vouchers Registry view
  if (deskMode === 'REGISTRY') {
    return (
      <div className="space-y-4">
        <PaymentVouchersRegistry
          onNewVoucher={() => setDeskMode('SETTLE_BILLS')}
          onSelectVoucher={(v) => {
            if (v.rawVoucher) setSelectedVoucherForPrint(v.rawVoucher);
          }}
        />
        <PrintablePaymentVoucher
          voucher={selectedVoucherForPrint}
          open={Boolean(selectedVoucherForPrint)}
          onOpenChange={(open) => !open && setSelectedVoucherForPrint(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Document Action Bar matching Image 1 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setDeskMode('REGISTRY')}
            className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Vouchers</span>
          </Button>

          <div className="h-5 w-px bg-border/60" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                Finance / Expense / Payment Voucher
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                #{currentVoucherNum}
              </span>
              <span className="sr-only">Batch Supplier Payment Desk</span>
              <Badge variant="outline" className="text-[10px] font-mono font-semibold py-0">
                DRAFT
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setDeskMode('REGISTRY')}
            className="text-xs h-8 gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>All Vouchers</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleTriggerPrint}
            className="text-xs h-8 gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleDeleteDraft}
            className="text-xs h-8 gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleSaveDraft}
            className="text-xs h-8 gap-1.5"
          >
            <FileCheck className="h-3.5 w-3.5 text-primary" />
            <span>Save</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            type="button"
            onClick={
              deskMode === 'SETTLE_BILLS'
                ? handlePostPayment
                : deskMode === 'ADVANCE_PREPAYMENT'
                ? handlePostAdvance
                : handlePostOtherPayment
            }
            disabled={
              deskMode === 'SETTLE_BILLS'
                ? !isFormValid || submitting
                : deskMode === 'ADVANCE_PREPAYMENT'
                ? advanceAmount <= 0 || !paymentReference.trim() || submitting
                : otherAmount <= 0 || !otherPayee.trim() || submitting
            }
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{submitting ? 'Posting...' : 'Complete Payment'}</span>
          </Button>
        </div>
      </div>

      {/* Industrial Multi-Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/80">
          <button
            type="button"
            onClick={() => setDeskMode('SETTLE_BILLS')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              deskMode === 'SETTLE_BILLS'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Receipt className="h-3.5 w-3.5 text-primary" />
            <span>Invoice settlement (Settle Inbound GRN / Bill)</span>
          </button>

          <button
            type="button"
            onClick={() => setDeskMode('ADVANCE_PREPAYMENT')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              deskMode === 'ADVANCE_PREPAYMENT'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Coins className="h-3.5 w-3.5 text-emerald-600" />
            <span>Supplier advance (Supplier Advance Prepayment)</span>
          </button>

          <button
            type="button"
            onClick={() => setDeskMode('OTHER_PAYMENTS')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              deskMode === 'OTHER_PAYMENTS'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Wallet className="h-3.5 w-3.5 text-indigo-600" />
            <span>Other payments (Direct / Journal Expense Voucher)</span>
          </button>

          <button
            type="button"
            onClick={() => setDeskMode('REGISTRY')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" />
            <span>All Vouchers History</span>
          </button>
        </div>

        <div className="text-xs text-muted-foreground hidden xl:flex items-center gap-1.5 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>
            {deskMode === 'SETTLE_BILLS' && 'Disburse vendor bill payments with advance deduction'}
            {deskMode === 'ADVANCE_PREPAYMENT' && 'Issue advance supplier prepayments with PO linkage'}
            {deskMode === 'OTHER_PAYMENTS' && 'Pay utilities, rent, services, or settle journal entries'}
          </span>
        </div>
      </div>

      {/* Auto-detected Advance Notice on Settle Bills Desk */}
      {deskMode === 'SETTLE_BILLS' && totalUnappliedAdvance > 0 && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold block">
                Supplier Advance Prepayment Detected
              </span>
              <span className="text-emerald-800">
                {selectedSupplier?.name} has <strong className="font-mono">{formatCurrency(totalUnappliedAdvance)}</strong> in unapplied advance deposits ready to offset against bills.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={handleApplyAdvanceDeductions}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1.5 shrink-0 font-semibold shadow-2xs"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>1-Click Apply Advance Deduction</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate('/finance/ap/advances')}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 h-8 gap-1.5 shrink-0 font-semibold"
            >
              <span>Advances Desk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 1: INVOICE SETTLEMENT (SETTLE INBOUND BILLS)                     */}
      {/* ===================================================================== */}
      {deskMode === 'SETTLE_BILLS' && (
        <div className="space-y-4">
          {/* LEDGER ACCOUNTS & PAYMENT DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEDGER ACCOUNTS */}
            <Card className="p-4 border-border shadow-xs bg-card space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  LEDGER ACCOUNTS
                </h3>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Debit Account (A/P / Expense) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={debitAccountId}
                    onChange={(e) => setDebitAccountId(e.target.value)}
                    className="h-9 text-xs"
                  >
                    {accounts
                      .filter((a) => a.accountClass === 'LIABILITY' || a.accountClass === 'EXPENSE')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name} ({a.accountClass})
                        </option>
                      ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Credit Account (Asset: Bank/Cash) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="h-9 text-xs font-medium"
                  >
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            {/* PAYMENT DETAILS */}
            <Card className="p-4 border-border shadow-xs bg-card space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                <Receipt className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PAYMENT DETAILS (PAYMENT HEADER SPECIFICATIONS)
                </h3>
              </div>

              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Supplier <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="h-9 text-xs font-semibold"
                      required
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Payment Method <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="h-9 text-xs"
                    >
                      <option value="BANK">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Payment Ref / Cheque # <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. CHQ-20491 or TT-0042"
                      className="h-9 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Total Payment Amount <span className="text-rose-500">*</span>
                    </label>
                    <CurrencyInput
                      value={totalPaymentAmount}
                      onChange={(val) => setTotalPaymentAmount(val)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Open Bills Table */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Open Bills for Selected Supplier ({openBills.length})
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                Allocate payment portions to clear balances.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Bill Number</th>
                    <th className="px-3.5 py-2.5">PO Ref</th>
                    <th className="px-3.5 py-2.5">Vendor Inv #</th>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5 text-right">Original Amount</th>
                    <th className="px-3.5 py-2.5 text-right">Balance Due</th>
                    <th className="px-3.5 py-2.5 text-right w-44">Amount to Apply (LKR)</th>
                    <th className="px-3.5 py-2.5 text-center w-28">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {openBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                        No outstanding open bills found for this supplier.
                      </td>
                    </tr>
                  ) : (
                    openBills.map((bill) => {
                      const poRef = getBillPoRef(bill);
                      const currentAlloc = allocations[bill.id] || 0;
                      return (
                        <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-primary">
                            {bill.billNumber}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-muted-foreground">
                            {poRef}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground">
                            {bill.vendorInvoiceNumber || '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            {formatDate(bill.invoiceDate)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono">
                            {formatCurrency(bill.totalAmount)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-rose-600">
                            {formatCurrency(bill.balanceDue)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <CurrencyInput
                              value={currentAlloc}
                              onChange={(val) => handleAllocationChange(bill.id, val)}
                              className="h-8 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {totalUnappliedAdvance > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => handleApplyAdvanceToSingleBill(bill)}
                                  className="h-7 text-[11px] text-emerald-700 hover:text-emerald-800 border-emerald-300 hover:bg-emerald-50 px-2"
                                  title="Offset advance deposit against this bill"
                                >
                                  Apply Adv
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => handleApplyFull(bill)}
                                className="h-7 text-[11px] text-primary hover:text-primary hover:bg-primary-light px-2 font-semibold"
                              >
                                Pay Full
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bottom Status & Validation Bar */}
          <div className="sticky bottom-4 z-20 rounded-xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Total Payment Header
                  </span>
                  <span className="text-base font-bold font-mono text-foreground tabular-nums">
                    {formatCurrency(totalPaymentAmount)}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Allocated to Bills
                  </span>
                  <span className="text-base font-bold font-mono text-primary tabular-nums">
                    {formatCurrency(totalApplied)}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Unallocated Difference
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isAllocationBalanced ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 className="h-4 w-4" /> Exactly Matched (0.00)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold tabular-nums font-mono">
                        <AlertTriangle className="h-4 w-4" /> Difference:{' '}
                        {formatCurrency(Math.abs(difference))}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ConfirmButton
                  confirmVariant="success"
                  confirmTitle="Post Batch Supplier Payment"
                  confirmMessage={`Are you sure you want to post supplier payment of ${formatCurrency(
                    totalPaymentAmount
                  )} to ${selectedSupplier?.name}? This will settle allocated bills and credit Cash/Bank.`}
                  confirmText="Post Payment"
                  onConfirm={handlePostPayment}
                  disabled={!isFormValid || submitting}
                  className="bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold gap-1.5"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>{submitting ? 'Posting Payment...' : 'Post Payment'}</span>
                </ConfirmButton>

                <DoubleEntryHoverBadge
                  title="AP Payment Double-Entry Impact"
                  description="Posting this supplier payment commits balancing GL lines:"
                  lines={[
                    {
                      accountCode: '2010',
                      accountName: `Accounts Payable (${selectedSupplier?.name || 'Selected Supplier'})`,
                      type: 'DEBIT',
                      amount: totalPaymentAmount > 0 ? totalPaymentAmount : 'Payment Total',
                    },
                    {
                      accountCode: selectedBank?.code || '1010',
                      accountName: selectedBank?.name || 'Operating Bank Account',
                      type: 'CREDIT',
                      amount: totalPaymentAmount > 0 ? totalPaymentAmount : 'Payment Total',
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: SUPPLIER ADVANCE PAYMENT VOUCHER (Industrial ERP Layout)      */}
      {/* ===================================================================== */}
      {deskMode === 'ADVANCE_PREPAYMENT' && (
        <div className="space-y-4">
          {/* Top 2 Cards: LEDGER ACCOUNTS & PAYMENT DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEDGER ACCOUNTS */}
            <Card className="p-4 border-border shadow-xs bg-card space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    LEDGER ACCOUNTS
                  </h3>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] font-mono">
                  Dr 1050 / Cr Bank
                </Badge>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Debit Account (Advance / Prepayment Asset) <span className="text-rose-500">*</span>
                  </label>
                  <Select value="1050" disabled className="h-9 text-xs bg-muted/40 font-mono">
                    <option value="1050">1050 - Advance to Suppliers (CURRENT ASSET)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Credit Account (Asset: Bank/Cash) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="h-9 text-xs font-medium"
                    required
                  >
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            {/* PAYMENT DETAILS */}
            <Card className="p-4 border-border shadow-xs bg-card space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                <Coins className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PAYMENT DETAILS (ADVANCE SPECIFICATIONS)
                </h3>
              </div>

              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Disbursement Date <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Supplier Beneficiary <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={selectedSupplierId}
                      onChange={(e) => {
                        setSelectedSupplierId(e.target.value);
                        setPurchaseOrderNumber('');
                      }}
                      className="h-9 text-xs font-semibold"
                      required
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Payment Method <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="h-9 text-xs"
                    >
                      <option value="BANK">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Payment Ref / Cheque # <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. TT-ADV-8841"
                      className="h-9 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Advance Prepayment (LKR) <span className="text-rose-500">*</span>
                    </label>
                    <CurrencyInput
                      value={advanceAmount}
                      onChange={(val) => setAdvanceAmount(val)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Linked Purchase Order (Optional)
                    </label>
                    <Input
                      value={purchaseOrderNumber}
                      onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                      placeholder="e.g. PO-2026-0001 (or select from table below)"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Voucher Notes / Terms
                    </label>
                    <Input
                      value={advanceNotes}
                      onChange={(e) => setAdvanceNotes(e.target.value)}
                      placeholder="e.g. 30% upfront manufacturing deposit..."
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Open Purchase Orders for Selected Supplier (Table) */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">
                  Open Purchase Orders for Selected Supplier ({supplierPurchaseOrders.length})
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                Click quick actions to link PO and allocate advance percentage.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">PO Number</th>
                    <th className="px-3.5 py-2.5">PO Date</th>
                    <th className="px-3.5 py-2.5">Expected Delivery</th>
                    <th className="px-3.5 py-2.5 text-right">PO Total Value</th>
                    <th className="px-3.5 py-2.5 text-right">Prior Advances Paid</th>
                    <th className="px-3.5 py-2.5 text-right">Remaining Balance</th>
                    <th className="px-3.5 py-2.5 text-center">Status</th>
                    <th className="px-3.5 py-2.5 text-right w-64">Quick Advance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {supplierPurchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                        No purchase orders on file for {selectedSupplier?.name}. You can record a General Unlinked Advance Prepayment.
                      </td>
                    </tr>
                  ) : (
                    supplierPurchaseOrders.map((po) => {
                      const isLinked = purchaseOrderNumber === po.poNumber;
                      return (
                        <tr
                          key={po.id}
                          className={cn(
                            'hover:bg-muted/30 transition-colors',
                            isLinked && 'bg-emerald-50/50'
                          )}
                        >
                          <td className="px-3.5 py-2.5 font-mono font-bold text-primary flex items-center gap-1.5">
                            {isLinked && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                            <span>{po.poNumber}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            {formatDate(po.orderDate)}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            {po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-semibold">
                            {formatCurrency(po.grandTotal)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-emerald-700">
                            {formatCurrency(po.advancePaid)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-foreground">
                            {formatCurrency(po.balanceDue)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {po.status}
                            </Badge>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => {
                                  setPurchaseOrderNumber(po.poNumber);
                                  const thirtyPct = Math.round(po.grandTotal * 0.3);
                                  setAdvanceAmount(thirtyPct);
                                  setAdvanceNotes(`30% upfront manufacturing deposit for PO #${po.poNumber}`);
                                }}
                                className="h-7 text-[11px] px-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                              >
                                30% Adv
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => {
                                  setPurchaseOrderNumber(po.poNumber);
                                  const fiftyPct = Math.round(po.grandTotal * 0.5);
                                  setAdvanceAmount(fiftyPct);
                                  setAdvanceNotes(`50% advance deposit for PO #${po.poNumber}`);
                                }}
                                className="h-7 text-[11px] px-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                              >
                                50% Adv
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => {
                                  setPurchaseOrderNumber(po.poNumber);
                                  setAdvanceAmount(po.balanceDue);
                                  setAdvanceNotes(`Full prepayment settlement for PO #${po.poNumber}`);
                                }}
                                className="h-7 text-[11px] px-2 text-primary hover:bg-primary-light font-semibold"
                              >
                                Pay Full
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bottom Status & Validation Bar */}
          <div className="sticky bottom-4 z-20 rounded-xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Total Advance Prepayment
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(advanceAmount)}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Linked Purchase Order
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {purchaseOrderNumber || 'General Advance Deposit (Unlinked)'}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Double-Entry Impact
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    Dr 1050 Advance to Suppliers / Cr {selectedBank?.code || '1010'} Bank
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ConfirmButton
                  confirmVariant="success"
                  confirmTitle="Record Supplier Advance Payment"
                  confirmMessage={`Are you sure you want to record supplier advance of ${formatCurrency(
                    advanceAmount
                  )} to ${selectedSupplier?.name}? This will debit 1050 Advance to Suppliers and credit Cash/Bank.`}
                  confirmText="Record Advance"
                  onConfirm={handlePostAdvance}
                  disabled={submitting || advanceAmount <= 0 || !paymentReference.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{submitting ? 'Recording Advance...' : 'Record Advance Payment'}</span>
                </ConfirmButton>

                <DoubleEntryHoverBadge
                  title="Supplier Advance Prepayment"
                  description="Posting advance dispatches funds to supplier asset holding:"
                  lines={[
                    {
                      accountCode: '1050',
                      accountName: `Advance to Suppliers (${selectedSupplier?.name || 'Supplier'})`,
                      type: 'DEBIT',
                      amount: advanceAmount > 0 ? advanceAmount : 'Advance Total',
                    },
                    {
                      accountCode: selectedBank?.code || '1010',
                      accountName: selectedBank?.name || 'Bank Account',
                      type: 'CREDIT',
                      amount: advanceAmount > 0 ? advanceAmount : 'Advance Total',
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: OTHER PAYMENTS (DIRECT EXPENSE / JOURNAL VOUCHER)             */}
      {/* ===================================================================== */}
      {deskMode === 'OTHER_PAYMENTS' && (
        <div className="space-y-4">
          {/* Top 2 Cards: LEDGER ACCOUNTS & PAYMENT DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEDGER ACCOUNTS */}
            <Card className="p-4 border-border shadow-xs bg-card space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    LEDGER ACCOUNTS
                  </h3>
                </div>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-300 text-[11px] font-mono">
                  Dr Expense / Cr Bank
                </Badge>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Debit Account (Expense / Accrual / Asset) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={otherDebitAccountId}
                    onChange={(e) => setOtherDebitAccountId(e.target.value)}
                    className="h-9 text-xs font-medium"
                    required
                  >
                    <optgroup label="Operating Expenses (5000 - 6999)">
                      {expenseAndLiabilityAccounts
                        .filter((a) => a.accountClass === 'EXPENSE')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Liabilities & Accruals (2000 - 2999)">
                      {expenseAndLiabilityAccounts
                        .filter((a) => a.accountClass === 'LIABILITY')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Other Assets & Equipment (1000 - 1999)">
                      {accounts
                        .filter((a) => a.code === '1510' || a.code === '1060')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                    </optgroup>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Credit Account (Asset: Bank/Cash) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={otherBankAccountId}
                    onChange={(e) => setOtherBankAccountId(e.target.value)}
                    className="h-9 text-xs font-medium"
                    required
                  >
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            {/* PAYMENT DETAILS */}
            <Card className="p-4 border-border shadow-xs bg-card space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                <Wallet className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PAYMENT DETAILS (DIRECT EXPENSE SPECIFICATIONS)
                </h3>
              </div>

              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Payment Date <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={otherPaymentDate}
                      onChange={(e) => setOtherPaymentDate(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Payee / Organization <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={otherPayee}
                      onChange={(e) => setOtherPayee(e.target.value)}
                      placeholder="e.g. Ceylon Electricity Board or Colombo Port Authority"
                      className="h-9 text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Payment Method <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={otherPaymentMethod}
                      onChange={(e) => setOtherPaymentMethod(e.target.value as any)}
                      className="h-9 text-xs"
                    >
                      <option value="BANK">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Payment Ref / Cheque # <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={otherPaymentRef}
                      onChange={(e) => setOtherPaymentRef(e.target.value)}
                      placeholder="e.g. CHQ-88219 or WIRE-REF"
                      className="h-9 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Payment Amount (LKR) <span className="text-rose-500">*</span>
                    </label>
                    <CurrencyInput
                      value={otherAmount}
                      onChange={(val) => setOtherAmount(val)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Category
                    </label>
                    <Select
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value as any)}
                      className="h-9 text-xs"
                    >
                      <option value="UTILITIES">Utilities (Electricity, Water, Phone)</option>
                      <option value="OFFICE_EXPENSE">Office Rent & Overhead</option>
                      <option value="TRAVEL_TRANSPORT">Freight & Vehicle Transport</option>
                      <option value="PETTY_CASH">Petty Cash & Amenities</option>
                      <option value="OTHER">Other / Taxes / Statutory</option>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Narration / Expense Description <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={otherNarration}
                      onChange={(e) => setOtherNarration(e.target.value)}
                      placeholder="e.g. October warehouse power consumption bill payment"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Journal Entry / Accrual Settle Table */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-foreground">
                  Select from Open Journal Entries / Accruals for Quick Settlement ({journalEntries.length})
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                Click Select to automatically populate account, reference, and amount.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Entry #</th>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Reference</th>
                    <th className="px-3.5 py-2.5">Account Code</th>
                    <th className="px-3.5 py-2.5">Description / Narration</th>
                    <th className="px-3.5 py-2.5 text-right">Amount (LKR)</th>
                    <th className="px-3.5 py-2.5 text-right w-32">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {journalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                        No unsettled journal entries found. You can enter direct payment details above.
                      </td>
                    </tr>
                  ) : (
                    journalEntries.map((je) => {
                      const isSelected = selectedJournalId === je.id;
                      const line = je.lines.find((l) => (l.debit || 0) > 0) || je.lines[0];
                      return (
                        <tr
                          key={je.id}
                          className={cn(
                            'hover:bg-muted/30 transition-colors',
                            isSelected && 'bg-indigo-50/50'
                          )}
                        >
                          <td className="px-3.5 py-2.5 font-mono font-bold text-primary flex items-center gap-1.5">
                            {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                            <span>{je.entryNumber}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            {formatDate(je.date)}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground">
                            {je.reference || '-'}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-700">
                            {line?.accountCode || '-'} {line?.accountName ? `(${line.accountName})` : ''}
                          </td>
                          <td className="px-3.5 py-2.5 text-foreground max-w-xs truncate" title={je.description}>
                            {je.description}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-foreground">
                            {formatCurrency(je.totalDebit || 0)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <Button
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              type="button"
                              onClick={() => handleSelectJournalEntry(je)}
                              className={cn(
                                'h-7 text-[11px] px-2.5 font-semibold gap-1',
                                isSelected ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border-indigo-300 text-indigo-800 hover:bg-indigo-50'
                              )}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{isSelected ? 'Selected' : 'Select & Pay'}</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bottom Status & Validation Bar */}
          <div className="sticky bottom-4 z-20 rounded-xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Total Payment Amount
                  </span>
                  <span className="text-base font-bold font-mono text-indigo-700 tabular-nums">
                    {formatCurrency(otherAmount)}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Debit Account
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {otherSelectedDebitAccount?.code || 'Expense'} - {otherSelectedDebitAccount?.name || 'Selected Account'}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Credit Account
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {otherSelectedBank?.code || '1010'} - {otherSelectedBank?.name || 'Bank Account'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ConfirmButton
                  confirmVariant="success"
                  confirmTitle="Generate & Post Payment Voucher"
                  confirmMessage={`Are you sure you want to post payment voucher of ${formatCurrency(
                    otherAmount
                  )} to ${otherPayee}? This will debit ${otherSelectedDebitAccount?.name} and credit Cash/Bank.`}
                  confirmText="Post Voucher"
                  onConfirm={handlePostOtherPayment}
                  disabled={submitting || otherAmount <= 0 || !otherPayee.trim() || !otherPaymentRef.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{submitting ? 'Generating...' : 'Generate Payment Voucher'}</span>
                </ConfirmButton>

                <DoubleEntryHoverBadge
                  title="Direct Expense Double-Entry Impact"
                  description="Posting this payment commits balancing GL lines:"
                  lines={[
                    {
                      accountCode: otherSelectedDebitAccount?.code || '5000',
                      accountName: otherSelectedDebitAccount?.name || 'Expense Account',
                      type: 'DEBIT',
                      amount: otherAmount > 0 ? otherAmount : 'Payment Total',
                    },
                    {
                      accountCode: otherSelectedBank?.code || '1010',
                      accountName: otherSelectedBank?.name || 'Bank Account',
                      type: 'CREDIT',
                      amount: otherAmount > 0 ? otherAmount : 'Payment Total',
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Payment Voucher Modal */}
      <PrintablePaymentVoucher
        voucher={selectedVoucherForPrint}
        open={Boolean(selectedVoucherForPrint)}
        onOpenChange={(open) => !open && setSelectedVoucherForPrint(null)}
      />
    </div>
  );
}
