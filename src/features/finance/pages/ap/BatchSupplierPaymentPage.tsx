import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apService, VendorBill } from '../../services/apService';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { CurrencyInput } from '../../components/CurrencyInput';
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import Decimal from 'decimal.js';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export function BatchSupplierPaymentPage() {
  const navigate = useNavigate();
  const { suppliers, accounts } = useFinanceLedger();

  // Filter bank accounts (1010 / 1015)
  const bankAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.accountClass === 'ASSET' &&
        (a.code.startsWith('1010') ||
          a.code.startsWith('1015') ||
          a.name.toLowerCase().includes('bank'))
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

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );
  const selectedBank = useMemo(
    () => accounts.find((a) => a.id === bankAccountId),
    [accounts, bankAccountId]
  );

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
      // Reset form to ready state for next payment instead of directing to journal entry
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Batch Supplier Payment Desk
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Accounts Payable Settlement
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Record a single disbursement against multiple outstanding vendor invoices with exact mathematical allocation.
          </p>
        </div>
      </div>

      {/* Header Inputs Card */}
      <Card className="p-5 border-slate-200 shadow-xs bg-white space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <CreditCard className="h-4 w-4 text-primary" />
          <span>Payment Header Specifications</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Supplier dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Bank Account dropdown filtering only 1010/1015 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Account (1010/1015) <span className="text-rose-500">*</span>
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

          {/* Payment Reference / Cheque No */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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

          {/* Total Payment Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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

      {/* Allocation Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Open Bills for Selected Supplier ({openBills.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Allocate exact payment portions to clear balances.
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Bill Number</th>
                  <th className="px-4 py-3">Vendor Inv #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Original Amount</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-right w-52">Amount to Apply (LKR)</th>
                  <th className="px-4 py-3 text-center w-28">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {openBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-slate-400">
                      No open outstanding bills found for this supplier.
                    </td>
                  </tr>
                ) : (
                  openBills.map((bill) => {
                    const currentApplied = allocations[bill.id] || 0;

                    return (
                      <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          {bill.billNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {bill.vendorInvoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(bill.invoiceDate)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
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
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => handleApplyFull(bill)}
                            className="h-7 text-[11px] text-primary hover:text-primary hover:bg-primary-light"
                          >
                            Pay Full
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
      </div>

      {/* Sticky Bottom Status & Validation Bar */}
      <div className="sticky bottom-4 z-20 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold uppercase">
                Total Payment Header
              </span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(totalPaymentAmount)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold uppercase">
                Allocated to Bills
              </span>
              <span className="text-base font-bold font-mono text-primary tabular-nums">
                {formatCurrency(totalApplied)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold uppercase">
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
            <Button
              onClick={handlePostPayment}
              disabled={!isFormValid || submitting}
              className="bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold gap-1.5"
            >
              <FileCheck className="h-4 w-4" />
              <span>{submitting ? 'Posting Payment...' : 'Post Payment'}</span>
            </Button>

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
  );
}
