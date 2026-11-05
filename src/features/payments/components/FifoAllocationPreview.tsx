import React from 'react';
import { Invoice } from '../../../types/invoice';
import {
  calculateFifoAllocation,
  FifoAllocationBreakdown,
} from '../../../rules/customerPaymentRules';
import { CheckCircle2, Clock } from 'lucide-react';
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
  className,
}: FifoAllocationPreviewProps) {
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
    <div className={cn('space-y-1.5', className)}>
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
  );
}
