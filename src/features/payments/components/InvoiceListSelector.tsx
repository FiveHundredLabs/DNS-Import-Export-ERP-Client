import React from 'react';
import { Invoice } from '../../../types/invoice';
import { AmountDisplay } from '../../../components/common/AmountDisplay';
import { formatDate } from '../../../utils/formatters';
import { isPastDueDate } from '../../../rules/invoiceRules';
import { getDaysOverdue } from '../../../rules/customerPaymentRules';
import { InvoiceStatusBadge } from '../../invoices/InvoiceStatusBadge';
import { Calendar, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface InvoiceListSelectorProps {
  invoices: Invoice[];
  selectedInvoiceIds: string[];
  onToggleInvoice: (invoiceId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onCollectSingleFull?: (invoice: Invoice) => void;
  onCollectSinglePartial?: (invoice: Invoice, partialAmount: number) => void;
  partialAmounts?: Record<string, number>;
  onPartialAmountChange?: (invoiceId: string, amount: number) => void;
  className?: string;
}

export function InvoiceListSelector({
  invoices,
  selectedInvoiceIds,
  onToggleInvoice,
  onSelectAll,
  onClearAll,
  onCollectSingleFull,
  onCollectSinglePartial,
  partialAmounts = {},
  onPartialAmountChange,
  className,
}: InvoiceListSelectorProps) {
  const [activePartialInvoiceId, setActivePartialInvoiceId] = React.useState<string | null>(null);
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

                    <div className="flex flex-col justify-between">
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
                      {uncollectedBalance > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {onCollectSingleFull && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePartialInvoiceId(null);
                                onCollectSingleFull(inv);
                              }}
                              className="text-[10.5px] font-bold text-primary hover:bg-primary-light/80 bg-primary-light px-2 py-0.5 rounded border border-primary-border transition-all active:scale-95"
                              title={`Collect full remaining balance of ${inv.invoiceNumber}`}
                            >
                              Collect Full
                            </button>
                          )}
                          {onCollectSinglePartial && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePartialInvoiceId(inv.id);
                                const defaultHalf = Math.round(uncollectedBalance / 2);
                                onCollectSinglePartial(inv, partialAmounts[inv.id] || defaultHalf);
                              }}
                              className={cn(
                                "text-[10.5px] font-bold px-2 py-0.5 rounded border transition-all active:scale-95",
                                isSelected && activePartialInvoiceId === inv.id
                                  ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                              )}
                              title={`Collect a partial amount against ${inv.invoiceNumber}`}
                            >
                              Pay Partial
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Inline Partial Payment Control */}
                  {isSelected && (activePartialInvoiceId === inv.id || (partialAmounts[inv.id] && partialAmounts[inv.id] < uncollectedBalance)) && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-2 animate-in fade-in slide-in-from-top-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-900 text-[11px] flex items-center gap-1">
                          <span>Partial Amount to Collect (Max: LKR {uncollectedBalance.toLocaleString()})</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-700 bg-white px-1.5 py-0.5 rounded border border-amber-200">
                          Invoice: {inv.invoiceNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 select-none">
                            LKR
                          </span>
                          <input
                            type="number"
                            min="1"
                            max={uncollectedBalance}
                            step="any"
                            value={partialAmounts[inv.id] !== undefined ? partialAmounts[inv.id] : ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val)) {
                                onPartialAmountChange?.(inv.id, 0);
                                return;
                              }
                              const clamped = Math.min(uncollectedBalance, Math.max(0, val));
                              onPartialAmountChange?.(inv.id, clamped);
                              onCollectSinglePartial?.(inv, clamped);
                            }}
                            placeholder="0.00"
                            className="w-full h-8 pl-10 pr-2 rounded-lg bg-white border border-amber-300 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        {/* Quick Percentage Presets */}
                        <div className="flex items-center gap-1">
                          {[
                            { label: '25%', factor: 0.25 },
                            { label: '50%', factor: 0.5 },
                            { label: '75%', factor: 0.75 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                const presetVal = Math.round(uncollectedBalance * preset.factor);
                                onPartialAmountChange?.(inv.id, presetVal);
                                onCollectSinglePartial?.(inv, presetVal);
                              }}
                              className="h-8 px-2 rounded-lg text-[10.5px] font-bold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {partialAmounts[inv.id] !== undefined && partialAmounts[inv.id] > 0 && (
                        <div className="flex items-center justify-between text-[10.5px] text-amber-800 pt-1 border-t border-amber-200/60">
                          <span>
                            Remaining after payment:{' '}
                            <strong className="font-mono font-bold">
                              LKR {Math.max(0, uncollectedBalance - (partialAmounts[inv.id] || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </span>
                          <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            PARTIALLY_COLLECTED
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
