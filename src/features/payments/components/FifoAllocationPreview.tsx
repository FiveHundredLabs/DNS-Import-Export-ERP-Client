import React from 'react';
import { Invoice } from '../../../types/invoice';
import {
  calculateFifoAllocation,
  FifoAllocationBreakdown,
} from '../../../rules/customerPaymentRules';
import { AmountDisplay } from '../../../components/common/AmountDisplay';
import { formatDate } from '../../../utils/formatters';
import { Sparkles, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface FifoAllocationPreviewProps {
  paymentAmount: number;
  invoices: Invoice[];
  selectedInvoiceIds?: string[];
  className?: string;
}

export function FifoAllocationPreview({
  paymentAmount,
  invoices,
  selectedInvoiceIds,
  className,
}: FifoAllocationPreviewProps) {
  const breakdown: FifoAllocationBreakdown = calculateFifoAllocation(
    paymentAmount,
    invoices,
    selectedInvoiceIds
  );

  if (!paymentAmount || paymentAmount <= 0) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-slate-300 p-5 text-center bg-slate-50/50', className)}>
        <Sparkles className="h-6 w-6 text-slate-400 mx-auto" />
        <h4 className="text-xs font-bold text-slate-700 mt-1.5 uppercase tracking-wider">
          Enter an Amount to Preview FIFO Allocation
        </h4>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Payments automatically prioritize the oldest due invoices first without requiring manual distribution.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Top Banner: FIFO Explanation & Total Metrics */}
      <div className="rounded-2xl sm:rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] via-primary-light/40 to-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                Automatic FIFO Allocation Breakdown
              </span>
              <span className="text-[10.5px] text-slate-500 font-medium">
                Distributed oldest due date first (First-In, First-Out)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {breakdown.fullySettledCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                {breakdown.fullySettledCount} Fully Settled
              </span>
            )}
            {breakdown.partiallySettledCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200">
                <Clock className="h-3 w-3" />
                {breakdown.partiallySettledCount} Partial
              </span>
            )}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="mt-3 pt-3 border-t border-primary/20 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block">
              Payment Amount
            </span>
            <div className="mt-0.5">
              <AmountDisplay amount={breakdown.totalPaymentAmount} size="sm" className="font-extrabold text-slate-900" />
            </div>
          </div>

          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block">
              Total Allocated
            </span>
            <div className="mt-0.5">
              <AmountDisplay amount={breakdown.totalAllocated} size="sm" className="font-extrabold text-emerald-700" />
            </div>
          </div>

          {breakdown.unallocatedAmount > 0 && (
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-600 block">
                Unallocated / Advance
              </span>
              <div className="mt-0.5">
                <AmountDisplay amount={breakdown.unallocatedAmount} size="sm" className="font-extrabold text-blue-700" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Itemized Allocation List */}
      <div className="space-y-2">
        {breakdown.items.map((item, index) => {
          const isFull = item.resultingStatus === 'FULLY_COLLECTED';
          const isPartial = item.resultingStatus === 'PARTIALLY_COLLECTED';
          const isUntouched = item.resultingStatus === 'UNTOUCHED';

          return (
            <div
              key={item.invoiceId}
              className={cn(
                'rounded-2xl border p-3.5 transition-all duration-150',
                isFull
                  ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-emerald-50/20 to-white'
                  : isPartial
                  ? 'border-amber-200 bg-gradient-to-r from-amber-50/70 via-amber-50/20 to-white'
                  : 'border-slate-200/80 bg-slate-50/40 opacity-70'
              )}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {item.invoiceNumber}
                    </span>
                    {item.isOverdue && (
                      <span className="text-[10.5px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.2 rounded-full border border-rose-200">
                        {item.daysOverdue ? `${item.daysOverdue}d Overdue` : 'Overdue'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Due: {formatDate(item.dueDate)} • Original: LKR {item.originalAmount.toLocaleString()}
                  </div>
                </div>

                {/* Status Result Pill */}
                <div>
                  {isFull ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Fully Settled
                    </span>
                  ) : isPartial ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Clock className="h-3 w-3 text-amber-600" /> Partially Collected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                      Outstanding (No Allocation)
                    </span>
                  )}
                </div>
              </div>

              {/* Allocation Numbers Row */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                    Previous Balance
                  </span>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    LKR {item.currentBalance.toLocaleString()}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                    Allocated Amount
                  </span>
                  <div
                    className={cn(
                      'font-extrabold mt-0.5',
                      item.allocatedAmount > 0 ? 'text-emerald-700' : 'text-slate-400'
                    )}
                  >
                    {item.allocatedAmount > 0
                      ? `+ LKR ${item.allocatedAmount.toLocaleString()}`
                      : 'LKR 0.00'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                    New Balance
                  </span>
                  <div
                    className={cn(
                      'font-extrabold mt-0.5',
                      item.remainingBalance === 0 ? 'text-emerald-600' : 'text-slate-900'
                    )}
                  >
                    LKR {item.remainingBalance.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
