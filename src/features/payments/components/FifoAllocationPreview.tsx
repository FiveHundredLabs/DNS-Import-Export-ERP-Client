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
  onToggleInvoice?: (invoiceId: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function FifoAllocationPreview({
  paymentAmount,
  invoices,
  selectedInvoiceIds = [],
  onToggleInvoice,
  onSelectAll,
  onClearAll,
  className,
  defaultExpanded = true,
}: FifoAllocationPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const breakdown: FifoAllocationBreakdown = calculateFifoAllocation(
    paymentAmount || 0,
    invoices,
    selectedInvoiceIds
  );

  const selectedCount = selectedInvoiceIds.length;

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
                <span
                  className="text-xs font-bold uppercase tracking-wider text-slate-900"
                  title="Payment Allocation Breakdown"
                >
                  {selectedCount > 0 ? 'Priority & FIFO Allocation' : 'Automatic FIFO Allocation'}
                </span>
                {selectedCount > 0 && (
                  <span className="text-[10.5px] font-bold text-primary bg-primary/10 px-2 py-0.2 rounded-full border border-primary/20">
                    {selectedCount} Prioritized
                  </span>
                )}
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
                {selectedCount > 0
                  ? `${selectedCount} invoice${selectedCount > 1 ? 's' : ''} prioritized first, then oldest settled`
                  : 'Oldest invoice settled first · Check cards to prioritize'}
              </span>
            </div>
          </div>

          {/* Right Action Stack: Reset button and Expand/Collapse Toggle Button */}
          <div className="flex items-center gap-2">
            {selectedCount > 0 && onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
                title="Reset manual priority to pure FIFO"
              >
                Reset FIFO
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-primary hover:bg-primary-light active:scale-95 transition-all cursor-pointer"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? 'Hide List' : 'View Invoices'}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
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

      {/* Itemized Allocation List with Priority Checkboxes (Progressive Disclosure) */}
      {isExpanded && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
          {breakdown.items.map((item, index) => {
            const isFull = item.resultingStatus === 'FULLY_COLLECTED';
            const isPartial = item.resultingStatus === 'PARTIALLY_COLLECTED';
            const isSelected = selectedInvoiceIds.includes(item.invoiceId);

            return (
              <div
                key={item.invoiceId}
                onClick={onToggleInvoice ? () => onToggleInvoice(item.invoiceId) : undefined}
                className={cn(
                  'rounded-xl border p-2.5 sm:p-3 transition-all text-xs select-none',
                  onToggleInvoice && 'cursor-pointer hover:border-slate-300',
                  isSelected
                    ? 'border-primary ring-1 ring-primary/40 bg-primary/[0.03]'
                    : isFull
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : isPartial
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200/90 bg-white shadow-2xs'
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Priority Checkbox */}
                  {onToggleInvoice && (
                    <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleInvoice(item.invoiceId)}
                        title={isSelected ? 'Prioritized for payment first' : 'Check to prioritize this invoice for payment first'}
                        aria-label={`Prioritize invoice ${item.invoiceNumber}`}
                        className="h-4 w-4 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                        <span className="font-bold text-slate-900 font-mono truncate">{item.invoiceNumber}</span>
                        {isSelected && (
                          <span className="text-[9.5px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded font-sans border border-primary/20">
                            Priority
                          </span>
                        )}
                        {item.isOverdue && (
                          <span className="text-[9.5px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-sans">
                            {item.daysOverdue}d overdue
                          </span>
                        )}
                      </div>

                      <div className="shrink-0">
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
