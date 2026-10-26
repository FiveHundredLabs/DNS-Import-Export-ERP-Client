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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] rounded-3xl p-5 sm:p-6 bg-white space-y-4">
        <DialogHeader className="p-0">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span>Confirm Payment Collection</span>
          </DialogTitle>
        </DialogHeader>

        {/* Customer & Amount Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                Customer Account
              </span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{customer.name}</div>
              <div className="text-[11px] text-slate-500 font-mono">{customer.code} • {customer.phone}</div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-200 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-slate-600">Collection Amount:</span>
            <AmountDisplay amount={amount} className="text-lg font-black text-slate-900" />
          </div>

          <div className="text-xs text-slate-600 flex items-center justify-between">
            <span>Payment Method:</span>
            <span className="font-bold text-slate-800">{paymentMethod}</span>
          </div>

          {paymentMethod === 'CHEQUE' && (
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              Cheque: <strong className="text-slate-700">{chequeNumber}</strong> • Due: {chequeDate} • Bank: {bankName}
            </div>
          )}
        </div>

        {/* Allocation Breakdown Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              FIFO Allocation ({breakdown.items.length} Invoices)
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              {breakdown.fullySettledCount} Settled • {breakdown.partiallySettledCount} Partial
            </span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-slate-200/90 p-2 bg-slate-50/40 text-xs">
            {breakdown.items.map((item) => (
              <div
                key={item.invoiceId}
                className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-100 text-[11.5px]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-slate-900 font-mono truncate">{item.invoiceNumber}</span>
                  {item.resultingStatus === 'FULLY_COLLECTED' ? (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 rounded">Settled</span>
                  ) : item.resultingStatus === 'PARTIALLY_COLLECTED' ? (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 rounded">Partial</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Untouched</span>
                  )}
                </div>
                <div className="font-bold text-slate-800 tabular-nums shrink-0">
                  + LKR {item.allocatedAmount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ERP Governance Alert: Sales Rep Boundary */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-[11px] text-blue-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Collection will be recorded in <strong>PENDING_APPROVAL</strong> and invoices will transition to <strong>COLLECTED</strong>. Balances remain protected in ERP ledger until authorized by Finance.
          </p>
        </div>

        <DialogFooter className="p-0 pt-2 flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full sm:w-auto h-11 text-xs font-semibold rounded-xl"
          >
            Cancel / Edit
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="w-full sm:w-auto h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs gap-1.5 flex-1"
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
