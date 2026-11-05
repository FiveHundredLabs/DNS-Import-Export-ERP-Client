import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apService, VendorBill } from '../../services/apService';
import { MOCK_GRNS } from '../../../../mock/mockInventory';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { CurrencyInput } from '../../components/CurrencyInput';
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
import { PurchaseOrderSelector } from '../../../../components/selectors/PurchaseOrderSelector';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { PrintablePaymentVoucher } from '../../components/PrintablePaymentVoucher';
import { PaymentVoucher } from '../../../../types/cashbook';

export interface BatchSupplierPaymentPageProps {
  hideTopNav?: boolean;
  initialMode?: 'SETTLE_BILLS' | 'ADVANCE_PREPAYMENT';
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
  const { suppliers, accounts } = useFinanceLedger();
  const [currentVoucherNum, setCurrentVoucherNum] = useState<string>(() => voucherNumber || 'PV-2026-0081');
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<PaymentVoucher | null>(null);
  const [debitAccountId, setDebitAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE'>('BANK');

  useEffect(() => {
    if (voucherNumber && voucherNumber !== currentVoucherNum) {
      setCurrentVoucherNum(voucherNumber);
    }
  }, [voucherNumber]);

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
    toast.info(`Payment Voucher draft #${currentVoucherNum} reset.`);
  };

  // 2-in-1 Segmented Switcher: Settle Bills vs Supplier Advance Prepayment
  const [deskMode, setDeskMode] = useState<'SETTLE_BILLS' | 'ADVANCE_PREPAYMENT'>(
    initialMode || 'SETTLE_BILLS'
  );

  // Filter bank accounts (1010 / 1015)
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

  const debitAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.accountClass === 'LIABILITY' || a.accountClass === 'EXPENSE' || a.code === '2010'
    );
  }, [accounts]);

  // Header Inputs
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [totalPaymentAmount, setTotalPaymentAmount] = useState<number>(0);

  // Advance Prepayment Form Inputs
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceNotes, setAdvanceNotes] = useState<string>('');

  // Open bills for chosen supplier
  const [openBills, setOpenBills] = useState<VendorBill[]>([]);
  // Map of billId -> amountToApply
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Auto-select first bank account when loaded
  useEffect(() => {
    if (bankAccounts.length > 0 && !bankAccountId) {
      setBankAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, bankAccountId]);

  // Auto-select first debit account (prefer 2010 Accounts Payable)
  useEffect(() => {
    if (debitAccounts.length > 0 && !debitAccountId) {
      const ap = debitAccounts.find((a) => a.code === '2010');
      setDebitAccountId(ap ? ap.id : debitAccounts[0].id);
    }
  }, [debitAccounts, debitAccountId]);

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

  // Auto-select first supplier if available
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

  // Auto-detect unapplied advances for selected supplier
  const unappliedAdvances = useMemo(() => {
    if (!selectedSupplierId) return [];
    return apService.getUnappliedAdvancesForSupplier(
      selectedSupplier?.name || selectedSupplierId
    );
  }, [selectedSupplierId, selectedSupplier]);

  const totalUnappliedAdvance = useMemo(() => {
    return unappliedAdvances.reduce((acc, a) => acc + (a.unappliedBalance || 0), 0);
  }, [unappliedAdvances]);

  const getBillPoRef = (bill: VendorBill): string => {
    const matchingGrn = MOCK_GRNS.find((g) => g.id === bill.grnId || g.grnNumber === bill.grnNumber);
    return (bill as any).purchaseOrderNumber || matchingGrn?.purchaseOrderNumber || (bill.grnNumber ? `PO-${bill.grnNumber.slice(-4)}` : 'PO-DIRECT');
  };

  // 1-Click Apply Advance Deductions across all open bills prioritizing PO-linked advances
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
          `Successfully applied ${formatCurrency(
            appliedTotal
          )} in advance deductions! Net batch payment updated.`
        );
        // Refresh open bills
        const selectedSup = suppliers.find((s) => s.id === selectedSupplierId);
        const updated = apService.getOpenBillsForSupplier(
          selectedSup ? selectedSup.name : selectedSupplierId
        );
        setOpenBills(updated);

        // Auto-allocate remaining balance
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

      const selectedSup = suppliers.find((s) => s.id === selectedSupplierId);
      const updated = apService.getOpenBillsForSupplier(
        selectedSup ? selectedSup.name : selectedSupplierId
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply advance');
    }
  };

  const handleAllocationChange = (billId: string, val: number) => {
    setAllocations((prev) => ({
      ...prev,
      [billId]: val,
    }));
  };

  const handleApplyFull = (bill: VendorBill) => {
    setAllocations((prev) => ({
      ...prev,
      [bill.id]: bill.balanceDue,
    }));
  };

  // Compute total applied using decimal.js
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

      toast.success(
        `Batch Supplier Payment of ${formatCurrency(
          totalPaymentAmount
        )} successfully posted and allocated to bills!`
      );
      // Reset form to ready state
      setSelectedSupplierId('');
      setAllocations({});
      setPaymentReference('');
      setTotalPaymentAmount(0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post batch payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Recording Supplier Advance Prepayment
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

      toast.success(
        `Supplier Advance Payment ${adv.advanceNumber} of ${formatCurrency(
          advanceAmount
        )} recorded! GL Entry: Dr 1050 Advance to Suppliers, Cr Bank Account.`
      );
      setAdvanceAmount(0);
      setPaymentReference('');
      setAdvanceNotes('');
      setPurchaseOrderNumber('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post advance prepayment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Section matching Image 3 */}
      {onViewRegistry && (
        <div className="flex items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onViewRegistry}
            className="text-xs h-8 gap-1.5 font-medium border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Vouchers</span>
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Finance</span>
            <span>/</span>
            <span>Expense</span>
            <span>/</span>
            <span className="font-semibold text-foreground font-mono">
              Payment Voucher #{currentVoucherNum}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Payment Voucher <span className="font-mono text-primary font-bold">#{currentVoucherNum}</span>
            </h1>
            <span className="sr-only">Batch Supplier Payment Desk</span>
            <Badge variant="outline" className="bg-muted text-foreground border-border text-xs">
              Draft
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onViewRegistry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onViewRegistry}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>All Vouchers</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTriggerPrint}
            className="text-xs h-8 gap-1.5 font-medium"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeleteDraft}
            className="text-xs h-8 gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            className="text-xs h-8 gap-1.5 font-medium"
          >
            <FileCheck className="h-3.5 w-3.5 text-primary" />
            <span>Save</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={deskMode === 'SETTLE_BILLS' ? handlePostPayment : handlePostAdvance}
            disabled={deskMode === 'SETTLE_BILLS' ? (!isFormValid || submitting) : (advanceAmount <= 0 || submitting)}
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{submitting ? 'Posting...' : 'Complete Payment'}</span>
          </Button>
        </div>
      </div>

      {/* Al Akleel-Style 2-in-1 Segmented Switcher matching Image 3 */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/80">
          <button
            type="button"
            onClick={() => setDeskMode('SETTLE_BILLS')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
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
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              deskMode === 'ADVANCE_PREPAYMENT'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Coins className="h-3.5 w-3.5 text-emerald-600" />
            <span>Supplier advance (Supplier Advance Prepayment)</span>
          </button>
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
              onClick={() => navigate('/finance/ap/advances')}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 h-8 gap-1.5 shrink-0 font-semibold"
            >
              <span>Advances Desk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* VIEW 1: SETTLE INBOUND BILLS */}
      {deskMode === 'SETTLE_BILLS' && (
        <div className="space-y-4">
          {/* LEDGER ACCOUNTS & PAYMENT DETAILS (Two Distinct Cards matching Image 3) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEDGER ACCOUNTS */}
            <Card className="p-4 border-border shadow-xs bg-card space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <Landmark className="h-4 w-4 text-primary" />
                <span>Ledger Accounts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Debit Account (A/P / Expense) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={debitAccountId || accounts.find((a) => a.code === '2010')?.id || ''}
                    onChange={(e) => setDebitAccountId(e.target.value)}
                    className="h-9 text-xs"
                  >
                    {debitAccounts.map((a) => (
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
                    className="h-9 text-xs"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            {/* PAYMENT DETAILS */}
            <Card className="p-4 border-border shadow-xs bg-card space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Payment Details (Payment Header Specifications)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    className="h-9 text-xs"
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
                    onChange={(e) => {
                      const m = e.target.value as any;
                      setPaymentMethod(m);
                      if (m === 'CASH') {
                        const cash = accounts.find((a) => a.code === '1040');
                        if (cash) setBankAccountId(cash.id);
                      } else if (m === 'BANK') {
                        const bank = accounts.find((a) => a.code.startsWith('1010') || a.name.toLowerCase().includes('bank'));
                        if (bank) setBankAccountId(bank.id);
                      }
                    }}
                    className="h-9 text-xs"
                  >
                    <option value="BANK">Bank Transfer</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="CHEQUE">Cheque</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
            </Card>
          </div>

          {/* Allocation Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-bold text-foreground">
                  Open Bills for Selected Supplier ({openBills.length})
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Allocate payment portions to clear balances.
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-border bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Bill Number</th>
                      <th className="px-4 py-2.5">PO Ref</th>
                      <th className="px-4 py-2.5">Vendor Inv #</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5 text-right">Original Amount</th>
                      <th className="px-4 py-2.5 text-right">Balance Due</th>
                      <th className="px-4 py-2.5 text-right w-52">Amount to Apply (LKR)</th>
                      <th className="px-4 py-2.5 text-center w-36">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {openBills.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-xs text-muted-foreground">
                          No open outstanding bills found for this supplier.
                        </td>
                      </tr>
                    ) : (
                      openBills.map((bill) => {
                        const currentApplied = allocations[bill.id] || 0;
                        const poRef = getBillPoRef(bill);
                        const linkedAdv = unappliedAdvances.find(
                          (a) => a.purchaseOrderNumber === poRef && a.unappliedBalance > 0
                        );

                        return (
                          <tr key={bill.id} className="hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-primary">
                              {bill.billNumber}
                            </td>
                            <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">
                              <div className="font-semibold text-foreground">{poRef}</div>
                              {linkedAdv && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 border-emerald-300 text-emerald-800 bg-emerald-50 mt-0.5"
                                  title={`Advance ${linkedAdv.advanceNumber} linked to ${poRef}`}
                                >
                                  Adv Linked ({formatCurrency(linkedAdv.unappliedBalance)})
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-foreground">
                              {bill.vendorInvoiceNumber}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatDate(bill.invoiceDate)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                              {formatCurrency(bill.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-rose-600">
                              {formatCurrency(bill.balanceDue)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <CurrencyInput
                                value={currentApplied || ''}
                                onChange={(val) => handleAllocationChange(bill.id, val)}
                                placeholder="0.00"
                                disabled={submitting}
                              />
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                {totalUnappliedAdvance > 0 && bill.balanceDue > 0 && (
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
                                  className="h-7 text-[11px] text-primary hover:text-primary hover:bg-primary-light px-2"
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
          </div>

          {/* Sticky Bottom Status & Validation Bar */}
          <div className="sticky bottom-4 z-20 rounded-xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
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
                  confirmMessage={`Are you sure you want to post supplier payment of ${formatCurrency(totalPaymentAmount)} to ${selectedSupplier?.name}? This will settle allocated bills and credit Cash/Bank.`}
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

      {/* VIEW 2: SUPPLIER ADVANCE PREPAYMENT VOUCHER */}
      {deskMode === 'ADVANCE_PREPAYMENT' && (
        <Card className="p-6 border-border max-w-2xl mx-auto bg-card shadow-xs">
          <form onSubmit={handlePostAdvance} className="space-y-4">
            <div className="border-b border-border/60 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Supplier Advance Payment Voucher</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Prepay supplier before goods arrival or against open purchase orders.
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs">
                Dr 1050 / Cr Bank
              </Badge>
            </div>

            <div className="space-y-3.5">
              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Supplier Beneficiary <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="h-9 text-xs"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Purchase Order Link (Auto-detecting & selecting) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Purchase Order Link (Optional)
                </label>
                <PurchaseOrderSelector
                  supplierId={selectedSupplierId}
                  selectedPoNumber={purchaseOrderNumber}
                  onSelect={(po) => setPurchaseOrderNumber(po.poNumber)}
                  placeholder="Link to Purchase Order (e.g. PO-2026-001)..."
                  className="w-full text-xs"
                />
              </div>

              {/* Date & Bank Account in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Disbursement Bank (1010/1015) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="h-9 text-xs"
                    required
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Reference & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payment Reference / Cheque # <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. TT-ADV-8841 or Wire-Ref"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Advance Prepayment Amount <span className="text-rose-500">*</span>
                  </label>
                  <CurrencyInput
                    value={advanceAmount}
                    onChange={(val) => setAdvanceAmount(val)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Voucher Notes / Terms
                </label>
                <Input
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="e.g. 30% upfront manufacturing deposit per contract..."
                  className="h-9 text-xs"
                />
              </div>

              {/* Double-entry preview */}
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground block">
                    Accounting Double-Entry Preview
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    Debit 1050 Advance to Suppliers (Asset) | Credit {selectedBank?.code || '1010'} {selectedBank?.name || 'Bank'}
                  </span>
                </div>
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

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeskMode('SETTLE_BILLS')}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || advanceAmount <= 0 || !paymentReference.trim()}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Recording Advance...' : 'Record Advance Payment'}</span>
                </Button>
              </div>
            </div>
          </form>
        </Card>
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
