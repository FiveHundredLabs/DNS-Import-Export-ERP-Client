import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { arService, AROpenInvoice } from '../../services/arService';
import { CurrencyInput } from '../../components/CurrencyInput';
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
import { Button } from '../../../../components/ui/button';
import { Select } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import Decimal from 'decimal.js';
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  FileCheck,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

export function ARCollectionAllocationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialReceiptId = searchParams.get('receiptId') || '';

  const receipts = useMemo(() => arService.getReceipts(), []);

  // Selected Receipt state
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>(
    initialReceiptId || receipts[0]?.id || ''
  );
  const selectedReceipt = useMemo(() => {
    return receipts.find((r) => r.id === selectedReceiptId) || receipts[0] || null;
  }, [receipts, selectedReceiptId]);

  // Allocation Mode Toggle: 'FIFO' vs 'MANUAL'
  const [allocationMode, setAllocationMode] = useState<'FIFO' | 'MANUAL'>('FIFO');

  // Open invoices for selected customer
  const [invoices, setInvoices] = useState<AROpenInvoice[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load customer open invoices when selected receipt changes
  useEffect(() => {
    if (selectedReceipt) {
      const openInvs = arService.getOpenInvoicesForCustomer(selectedReceipt.customerId);
      setInvoices(openInvs);

      // Auto-FIFO default calculation if in FIFO mode
      if (allocationMode === 'FIFO') {
        const fifoResult = arService.calculateAutoFIFO(
          selectedReceipt.customerId,
          selectedReceipt.amount
        );
        setAllocations(fifoResult);
      } else {
        setAllocations({});
      }
    } else {
      setInvoices([]);
      setAllocations({});
    }
  }, [selectedReceipt, allocationMode]);

  // When toggle switches to FIFO, recompute FIFO
  const handleToggleMode = (newMode: 'FIFO' | 'MANUAL') => {
    setAllocationMode(newMode);
    if (newMode === 'FIFO' && selectedReceipt) {
      const fifoResult = arService.calculateAutoFIFO(
        selectedReceipt.customerId,
        selectedReceipt.amount
      );
      setAllocations(fifoResult);
      toast.info('Applied Auto-FIFO: oldest invoices allocated first.');
    }
  };

  const handleManualAllocationChange = (invoiceId: string, val: number) => {
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: val,
    }));
  };

  // Calculations using decimal.js
  const totalApplied = useMemo(() => {
    let sum = new Decimal(0);
    for (const val of Object.values(allocations)) {
      if (val > 0) sum = sum.plus(new Decimal(val));
    }
    return sum.toNumber();
  }, [allocations]);

  const receiptAmount = selectedReceipt ? selectedReceipt.amount : 0;
  const difference = useMemo(() => {
    const total = new Decimal(receiptAmount || 0);
    const applied = new Decimal(totalApplied || 0);
    return total.minus(applied).toNumber();
  }, [receiptAmount, totalApplied]);

  const isBalanced = useMemo(() => {
    if (receiptAmount <= 0) return false;
    return Math.abs(difference) <= 0.01;
  }, [receiptAmount, difference]);

  const handleApplyAllocation = () => {
    if (!selectedReceipt) return;
    if (totalApplied <= 0) {
      toast.error('Please enter at least one allocation amount.');
      return;
    }

    try {
      setSubmitting(true);
      arService.applyCollectionAllocation(selectedReceipt.id, allocations);
      toast.success(
        `Allocated ${formatCurrency(totalApplied)} across customer invoices successfully!`
      );
      navigate('/finance/ar/approvals');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply allocation');
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/ar/approvals')}
              className="gap-1.5 text-xs mr-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Approvals</span>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              AR Batch Collection Allocation
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Sub-Ledger Invoices
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Detailed invoice allocation desk: Distribute customer collection receipts across unpaid sales invoices (Defaults to Auto-FIFO, or customize manually).
          </p>
        </div>

        {/* Selected Customer Payment Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Select Receipt to Allocate:
          </label>
          <Select
            value={selectedReceiptId}
            onChange={(e) => setSelectedReceiptId(e.target.value)}
            className="text-xs h-9 min-w-64"
          >
            {receipts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.receiptNumber} - {r.customerName} ({formatCurrency(r.amount)})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Selected Payment Context Card */}
      {selectedReceipt && (
        <Card className="p-4 border-slate-200 bg-slate-50/70 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">Customer</span>
              <span className="font-bold text-slate-900 text-sm">{selectedReceipt.customerName}</span>
              <span className="text-slate-500 block font-mono">{selectedReceipt.customerCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">Receipt Amount</span>
              <span className="text-base font-bold font-mono text-primary tabular-nums">
                {formatCurrency(selectedReceipt.amount)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">Payment Method & Rep</span>
              <span className="font-semibold text-slate-800">{selectedReceipt.paymentMethod}</span>
              <span className="text-slate-500 block">{selectedReceipt.collectorName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">Collection Date</span>
              <span className="font-semibold text-slate-800">{formatDate(selectedReceipt.collectedAt)}</span>
              <span className="text-slate-500 block font-mono">{selectedReceipt.receiptNumber}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Allocation Toggle: Auto-FIFO vs Manual */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-slate-800">Allocation Strategy:</span>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => handleToggleMode('FIFO')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              allocationMode === 'FIFO'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Auto-FIFO (Oldest Invoices First)
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode('MANUAL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              allocationMode === 'MANUAL'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manual Custom Distribution
          </button>
        </div>
      </div>

      {/* Allocation Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Open Customer Invoices ({invoices.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {allocationMode === 'FIFO'
              ? 'Computed via Auto-FIFO order'
              : 'Enter customized application amounts'}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3 text-right">Original Amount</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-right w-52">Amount to Apply (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs text-slate-400">
                      No open invoices for this customer.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const currentVal = allocations[inv.id] || 0;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(inv.date)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                          {formatCurrency(inv.originalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-rose-600">
                          {formatCurrency(inv.balanceDue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CurrencyInput
                            value={currentVal || ''}
                            onChange={(val) => handleManualAllocationChange(inv.id, val)}
                            placeholder="0.00"
                            disabled={submitting || allocationMode === 'FIFO'}
                            className={allocationMode === 'FIFO' ? 'bg-slate-50' : ''}
                          />
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
                Customer Receipt Total
              </span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(receiptAmount)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold uppercase">
                Applied to Invoices
              </span>
              <span className="text-base font-bold font-mono text-primary tabular-nums">
                {formatCurrency(totalApplied)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold uppercase">
                Remaining Unapplied
              </span>
              <div className="flex items-center gap-1.5">
                {isBalanced ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="h-4 w-4" /> Fully Allocated (0.00)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-bold tabular-nums font-mono">
                    <AlertTriangle className="h-4 w-4" /> Unapplied: {formatCurrency(Math.abs(difference))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleApplyAllocation}
              disabled={totalApplied <= 0 || submitting}
              className="bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold gap-1.5"
            >
              <FileCheck className="h-4 w-4" />
              <span>{submitting ? 'Applying...' : 'Commit Allocation'}</span>
            </Button>

            {selectedReceipt && (
              <DoubleEntryHoverBadge
                title="Invoice Allocation Settlement Impact"
                description="Committing this invoice allocation marks specific invoices as paid/settled in AR sub-ledger:"
                lines={[
                  {
                    accountCode: '1020',
                    accountName: `AR Sub-Ledger (${selectedReceipt.customerName})`,
                    type: 'CREDIT',
                    amount: totalApplied,
                    note: 'Applied to selected invoice balances',
                  },
                  {
                    accountCode: '1020',
                    accountName: `Unapplied Customer Cash Balance`,
                    type: 'DEBIT',
                    amount: totalApplied,
                    note: 'Deducted from customer unallocated receipt buffer',
                  },
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
