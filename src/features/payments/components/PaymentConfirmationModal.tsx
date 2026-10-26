import React from 'react';
import { Customer } from '../../../types/customer';
import { PaymentMethod } from '../../../types/payment';
import { FifoAllocationBreakdown } from '../../../rules/customerPaymentRules';
import { AmountDisplay } from '../../../components/common/AmountDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { ShieldCheck, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface PaymentConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  amount: number;
  paymentMethod: PaymentMethod;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  notes?: string;
  breakdown: FifoAllocationBreakdown;
  onConfirm: () => void;
  submitting: boolean;
}

export function PaymentConfirmationModal({
  open,
  onOpenChange,
  customer,
  amount,
  paymentMethod,
  chequeNumber,
  chequeDate,
  bankName,
  notes,
  breakdown,
  onConfirm,
  submitting,
}: PaymentConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="md" className="p-4 sm:p-5 max-w-md w-full">
      <DialogContent className="space-y-3.5">
        <DialogHeader className="p-0 mb-2">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span>Confirm Payment Collection</span>
          </DialogTitle>
        </DialogHeader>

        {/* Customer & Amount Summary */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-3.5 space-y-2.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Customer Account
            </span>
            <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">{customer.name}</div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-slate-600">{customer.code}</span>
              <span>•</span>
              <span className="text-primary font-semibold whitespace-nowrap">{customer.phone}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-baseline justify-between gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-600 shrink-0">Collection Amount:</span>
            <div className="flex items-baseline gap-1 whitespace-nowrap min-w-0">
              <span className="text-xs font-bold text-slate-400 uppercase">LKR</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">
                {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 flex items-center justify-between gap-2">
            <span>Payment Method:</span>
            <span className="font-bold text-slate-900 uppercase tracking-wide text-xs">{paymentMethod}</span>
          </div>

          {paymentMethod === 'CHEQUE' && (
            <div className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/80 flex flex-wrap gap-1">
              <span>Cheque: <strong className="text-slate-800">{chequeNumber}</strong></span>
              <span>•</span>
              <span>Due: {chequeDate}</span>
              <span>•</span>
              <span>Bank: {bankName}</span>
            </div>
          )}
        </div>

        {/* Allocation Breakdown Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
              FIFO Allocation ({breakdown.items.length} Invoices)
            </span>
            <span className="text-[10.5px] font-semibold text-emerald-700 whitespace-nowrap">
              {breakdown.fullySettledCount} Settled{breakdown.partiallySettledCount > 0 ? ` • ${breakdown.partiallySettledCount} Partial` : ''}
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-slate-200/90 p-1.5 bg-slate-50/50 text-xs">
            {breakdown.items.map((item) => (
              <div
                key={item.invoiceId}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 text-xs shadow-2xs gap-2 min-w-0"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="font-bold text-slate-900 font-mono text-[11px] truncate">{item.invoiceNumber}</span>
                  {item.resultingStatus === 'FULLY_COLLECTED' ? (
                    <span className="text-[9.5px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 shrink-0">Settled</span>
                  ) : item.resultingStatus === 'PARTIALLY_COLLECTED' ? (
                    <span className="text-[9.5px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100 shrink-0">Partial</span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400 shrink-0">Untouched</span>
                  )}
                </div>
                <div className="flex items-baseline gap-0.5 text-slate-900 font-bold tabular-nums shrink-0 whitespace-nowrap text-xs">
                  <span className="text-[10px] text-emerald-600 font-extrabold">+</span>
                  <span className="text-[10px] text-slate-400 font-medium">LKR</span>
                  <span>{item.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ERP Governance Alert: Sales Rep Boundary */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-[11px] text-blue-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Recorded in <strong>PENDING_APPROVAL</strong>. Balances remain protected in ERP ledger until authorized by Finance.
          </p>
        </div>

        <DialogFooter className="p-0 pt-1 flex flex-col sm:flex-row gap-2 mt-0 border-t-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full sm:w-auto h-10 text-xs font-semibold rounded-xl"
          >
            Cancel / Edit
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="w-full sm:flex-1 h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs gap-1.5"
          >
            {submitting ? (
              'Recording Collection...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Confirm & Record Collection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  );
}
