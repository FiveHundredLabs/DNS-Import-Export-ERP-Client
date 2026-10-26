import React, { useState } from 'react';
import { Invoice } from '../../../types/invoice';
import {
  calculateFifoAllocation,
  FifoAllocationBreakdown,
} from '../../../rules/customerPaymentRules';
import { AmountDisplay } from '../../../components/common/AmountDisplay';
import { formatDate } from '../../../utils/formatters';
import { Sparkles, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface FifoAllocationPreviewProps {
  paymentAmount: number;
  invoices: Invoice[];
  selectedInvoiceIds?: string[];
  className?: string;
  defaultExpanded?: boolean;
}

export function FifoAllocationPreview({
  paymentAmount,
  invoices,
  selectedInvoiceIds,
  className,
  defaultExpanded = true,
}: FifoAllocationPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const breakdown: FifoAllocationBreakdown = calculateFifoAllocation(
    paymentAmount || 0,
    invoices,
    selectedInvoiceIds
  );

  // If there are no outstanding invoices for this customer at all
  if (breakdown.items.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-center', className)}>
        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
        <h4 className="text-xs font-bold text-slate-800 mt-1 uppercase tracking-wider">
          All Invoices Fully Settled
        </h4>
        <p className="text-[11px] text-slate-500 mt-0.5">
          This customer has no outstanding open invoices requiring payment collection.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Top Summary Card (Compact & Collapsible) */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-white p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900" title="Automatic FIFO Allocation Breakdown">
                  Automatic FIFO Allocation
                </span>
                {breakdown.fullySettledCount > 0 && (
                  <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.2 rounded-full border border-emerald-200">
                    {breakdown.fullySettledCount} Settled
                  </span>
                )}
                {breakdown.partiallySettledCount > 0 && (
                  <span className="text-[10.5px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.2 rounded-full border border-amber-200">
                    {breakdown.partiallySettledCount} Partial
                  </span>
                )}
                {breakdown.fullySettledCount === 0 && breakdown.partiallySettledCount === 0 && (
                  <span className="text-[10.5px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full border border-slate-200">
                    {breakdown.items.length} Invoices Pending
                  </span>
                )}
              </div>
              <span className="text-[10.5px] text-slate-400 font-medium">
                Oldest invoice settled first
              </span>
            </div>
          </div>

          {/* Expand/Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-primary hover:bg-primary-light active:scale-95 transition-all"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Hide List' : 'View Invoices'}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Compact Totals Row */}
        <div className="mt-2.5 pt-2 border-t border-primary/10 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="min-w-0">
            <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
              Payment
            </span>
            <div className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">LKR</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums truncate">
                {breakdown.totalPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
              Allocated
            </span>
            <div className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-[10px] font-bold text-emerald-500 uppercase shrink-0">LKR</span>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-700 tabular-nums truncate">
                {breakdown.totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {breakdown.unallocatedAmount > 0 && (
            <div className="col-span-2 sm:col-span-1 min-w-0">
              <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-600 block truncate">
                Unallocated
              </span>
              <div className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
                <span className="text-[10px] font-bold text-blue-400 uppercase shrink-0">LKR</span>
                <span className="text-xs sm:text-sm font-extrabold text-blue-700 tabular-nums truncate">
                  {breakdown.unallocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Itemized Allocation List (Progressive Disclosure) */}
      {isExpanded && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
          {breakdown.items.map((item, index) => {
            const isFull = item.resultingStatus === 'FULLY_COLLECTED';
            const isPartial = item.resultingStatus === 'PARTIALLY_COLLECTED';

            return (
              <div
                key={item.invoiceId}
                className={cn(
                  'rounded-xl border p-2.5 transition-all text-xs',
                  isFull
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : isPartial
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200/90 bg-white shadow-2xs'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                    <span className="font-bold text-slate-900 font-mono truncate">{item.invoiceNumber}</span>
                    {item.isOverdue && (
                      <span className="text-[9.5px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-sans">
                        {item.daysOverdue}d overdue
                      </span>
                    )}
                  </div>

                  <div>
                    {isFull ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Settled
                      </span>
                    ) : isPartial ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full">
                        <Clock className="h-2.5 w-2.5 text-amber-600" /> Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/80">
                        No Alloc
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-1.5 pt-1.5 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10.5px] tabular-nums">
                  <div className="min-w-0 truncate">
                    <span className="text-slate-400 text-[10px]">Prev: </span>
                    <span className="font-medium text-slate-700">{item.currentBalance.toLocaleString()}</span>
                  </div>
                  <div className="min-w-0 truncate text-center">
                    <span className="text-slate-400 text-[10px]">Alloc: </span>
                    <span className={cn('font-bold', item.allocatedAmount > 0 ? 'text-emerald-700' : 'text-slate-400')}>
                      {item.allocatedAmount > 0 ? `+${item.allocatedAmount.toLocaleString()}` : '0'}
                    </span>
                  </div>
                  <div className="min-w-0 truncate text-right">
                    <span className="text-slate-400 text-[10px]">Rem: </span>
                    <span className={cn('font-bold', item.remainingBalance === 0 ? 'text-emerald-600' : 'text-slate-900')}>
                      {item.remainingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
