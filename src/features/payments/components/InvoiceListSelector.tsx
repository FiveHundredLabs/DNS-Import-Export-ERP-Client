import React from 'react';
import { Invoice } from '../../../types/invoice';
import { AmountDisplay } from '../../../components/common/AmountDisplay';
import { formatDate } from '../../../utils/formatters';
import { isPastDueDate } from '../../../rules/invoiceRules';
import { getDaysOverdue } from '../../../rules/customerPaymentRules';
import { InvoiceStatusBadge } from '../../invoices/InvoiceStatusBadge';
import { Checkbox } from '../../../components/ui/checkbox';
import { Calendar, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface InvoiceListSelectorProps {
  invoices: Invoice[];
  selectedInvoiceIds: string[];
  onToggleInvoice: (invoiceId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  className?: string;
}

export function InvoiceListSelector({
  invoices,
  selectedInvoiceIds,
  onToggleInvoice,
  onSelectAll,
  onClearAll,
  className,
}: InvoiceListSelectorProps) {
  // Only show invoices with balance > 0 and not cancelled/draft
  const activeInvoices = invoices.filter((i) => {
    if (i.status === 'CANCELLED' || i.status === 'DRAFT' || i.status === 'PAID') {
      return false;
    }
    const uncollected = Math.max(0, i.balanceAmount - (i.collectedAmount || 0));
    return uncollected > 0;
  });

  const allSelected =
    activeInvoices.length > 0 &&
    activeInvoices.every((inv) => selectedInvoiceIds.includes(inv.id));
  const someSelected =
    selectedInvoiceIds.length > 0 && !allSelected;

  if (activeInvoices.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
        <h4 className="text-sm font-bold text-emerald-950 mt-2">No Outstanding Invoices</h4>
        <p className="text-xs text-emerald-700 mt-0.5">
          All invoices for this customer have been fully settled or cleared.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header bar with Select All toggle and Counter */}
      <div className="flex items-center justify-between pb-1 px-1">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={() => (allSelected ? onClearAll() : onSelectAll())}
              className="h-4 w-4 rounded text-primary focus:ring-primary border-slate-300"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Outstanding Invoices ({activeInvoices.length})
            </span>
          </label>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          {selectedInvoiceIds.length > 0 ? (
            <span className="text-primary font-bold">
              {selectedInvoiceIds.length} Selected for Payment
            </span>
          ) : (
            <span>All eligible for FIFO auto-allocation</span>
          )}
        </div>
      </div>

      {/* Invoices List (Mobile Cards) */}
      <div className="space-y-2">
        {activeInvoices.map((inv) => {
          const isSelected = selectedInvoiceIds.includes(inv.id);
          const pastDue = isPastDueDate(inv.dueDate);
          const daysOverdue = pastDue ? getDaysOverdue(inv.dueDate) : 0;
          const uncollectedBalance = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));

          return (
            <div
              key={inv.id}
              onClick={() => onToggleInvoice(inv.id)}
              className={cn(
                'rounded-2xl border p-3.5 sm:p-4 transition-all duration-150 cursor-pointer select-none relative overflow-hidden',
                isSelected
                  ? 'border-primary bg-primary-light/30 shadow-xs ring-1 ring-primary/40'
                  : pastDue
                  ? 'border-rose-200/90 bg-rose-50/20 hover:border-rose-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Selection Checkbox */}
                <div className="pt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleInvoice(inv.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded text-primary focus:ring-primary border-slate-300"
                  />
                </div>

                {/* Main Invoice Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        {inv.invoiceNumber}
                      </span>
                      {inv.orderNumber && (
                        <span className="text-[10.5px] text-slate-400 font-mono hidden sm:inline">
                          ({inv.orderNumber})
                        </span>
                      )}
                    </div>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>

                  {/* Dates & Overdue Indicator */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      Issued: {formatDate(inv.issueDate)}
                    </span>
                    <span
                      className={cn(
                        'flex items-center gap-1 text-[11px] font-semibold',
                        pastDue ? 'text-rose-600' : 'text-slate-600'
                      )}
                    >
                      {pastDue && <AlertCircle className="h-3 w-3 text-rose-500" />}
                      Due: {formatDate(inv.dueDate)}
                      {pastDue && ` (${daysOverdue}d overdue)`}
                    </span>
                  </div>

                  {/* Amounts breakdown */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Original Amount
                      </span>
                      <div className="font-semibold text-slate-700 mt-0.5">
                        <AmountDisplay amount={inv.totalAmount} size="sm" />
                      </div>
                    </div>

                    {inv.collectedAmount && inv.collectedAmount > 0 ? (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 block">
                          Pending Collection
                        </span>
                        <div className="font-bold text-amber-700 mt-0.5">
                          <AmountDisplay amount={inv.collectedAmount} size="sm" />
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Remaining Balance
                      </span>
                      <div className="font-extrabold text-slate-900 mt-0.5">
                        <AmountDisplay
                          amount={uncollectedBalance}
                          size="sm"
                          className={pastDue ? 'text-rose-600 font-extrabold' : 'text-slate-900 font-extrabold'}
                        />
                      </div>
                    </div>
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
