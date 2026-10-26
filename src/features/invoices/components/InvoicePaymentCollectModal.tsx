import React, { useState } from 'react';
import { Invoice } from '../../../types/invoice';
import { Payment, PaymentMethod } from '../../../types/payment';
import { paymentService } from '../../../services/PaymentService';
import { invoiceService } from '../../../services/InvoiceService';
import { useAuth } from '../../../hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AmountDisplay } from '../../../components/common/AmountDisplay';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  CreditCard,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building,
  Calendar,
  Lock,
  ArrowRight,
  DollarSign,
  Info,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface InvoicePaymentCollectModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPaymentSuccess: (payment: Payment, updatedInvoice: Invoice) => void;
}

export function InvoicePaymentCollectModal({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess,
}: InvoicePaymentCollectModalProps) {
  const { currentUser } = useAuth();

  // Current balance requiring field collection
  const previouslyCollected = invoice.collectedAmount || 0;
  const currentUncollected = Math.max(0, invoice.balanceAmount - previouslyCollected);

  const [amount, setAmount] = useState<number>(currentUncollected);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankName, setBankName] = useState('Commercial Bank');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate amount
  const validAmount = Number(amount) || 0;
  const isFullPayment = validAmount >= currentUncollected - 0.001;
  const isPartialPayment = validAmount > 0 && validAmount < currentUncollected - 0.001;
  const resultingBalance = Math.max(0, currentUncollected - validAmount);

  // Status transitions
  const resultingStatus = isFullPayment
    ? 'COLLECTED'
    : isPartialPayment
    ? 'PARTIALLY_COLLECTED'
    : invoice.status;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (validAmount <= 0) {
      setError('Payment collection amount must be greater than zero.');
      return;
    }

    if (validAmount > currentUncollected + 0.01) {
      setError(
        `Collection amount cannot exceed this invoice's uncollected balance of ${formatCurrency(currentUncollected)}.`
      );
      return;
    }

    if (paymentMethod === 'CHEQUE') {
      if (!chequeNumber.trim()) {
        setError('Cheque number is mandatory for cheque payment collections.');
        return;
      }
      if (!bankName.trim()) {
        setError('Bank name is mandatory for cheque payment collections.');
        return;
      }
    }

    try {
      setSubmitting(true);

      // Record collection strictly against this single invoice (Isolated Invoice-Wise Collection)
      const payment = await paymentService.recordPayment(
        {
          customerId: invoice.customerId,
          amount: validAmount,
          paymentMethod,
          chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber.trim() : undefined,
          chequeDate: paymentMethod === 'CHEQUE' ? chequeDate : undefined,
          bankName: paymentMethod === 'CHEQUE' ? bankName.trim() : undefined,
          notes: notes.trim()
            ? `Invoice-wise collection: ${notes.trim()}`
            : `Single-invoice payment collection against ${invoice.invoiceNumber}`,
          invoiceAllocations: [
            {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              allocatedAmount: validAmount,
            },
          ],
        },
        currentUser
      );

      // Fetch the updated invoice from repository
      const updated = await invoiceService.getInvoiceById(invoice.id);
      onPaymentSuccess(payment, updated || { ...invoice, collectedAmount: previouslyCollected + validAmount, status: resultingStatus });
      onClose();
    } catch (err: any) {
      console.error('Failed to record single-invoice payment:', err);
      setError(err?.message || 'Failed to record payment collection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] rounded-3xl p-5 sm:p-6 bg-white space-y-4 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                Invoice Payment Collection
              </DialogTitle>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Targeted collection against <strong>{invoice.invoiceNumber}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Targeted Scope Guarantee Banner */}
          <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-3.5 text-xs text-blue-900 flex items-start gap-2.5 shadow-2xs">
            <Lock className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold block text-blue-950">Targeted Invoice-Wise Collection:</span>
              <span>
                This payment will be applied <strong>strictly to this invoice only</strong>. Other customer invoices or accounts will NOT be touched or settled.
              </span>
            </div>
          </div>

          {/* Invoice Summary Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Customer
                </span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {invoice.customerName}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {invoice.customerCode}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Due Date
                </span>
                <span className="font-semibold text-slate-800 block mt-0.5">
                  {formatDate(invoice.dueDate)}
                </span>
                <span className="text-[10.5px] text-slate-500">
                  Terms: {invoice.paymentTerms || '30 Days'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center">
              <div className="p-2 rounded-xl bg-white border border-slate-100">
                <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Original</span>
                <span className="font-bold text-slate-800 tabular-nums font-mono text-xs block mt-0.5">
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-100">
                <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Collected</span>
                <span className="font-bold text-blue-700 tabular-nums font-mono text-xs block mt-0.5">
                  {formatCurrency(previouslyCollected)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[9.5px] uppercase font-bold text-emerald-800 block">Balance Due</span>
                <span className="font-extrabold text-emerald-950 tabular-nums font-mono text-xs block mt-0.5">
                  {formatCurrency(currentUncollected)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Amount Input & Touch Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Collection Amount (LKR)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Max: {formatCurrency(currentUncollected)}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                LKR
              </span>
              <Input
                type="number"
                min="1"
                max={currentUncollected}
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="pl-14 pr-4 h-12 text-lg font-bold font-mono rounded-2xl border-slate-300 focus:border-primary"
              />
            </div>

            {/* Quick Fill Preset Buttons */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(currentUncollected)}
                className="h-8 rounded-xl text-xs font-bold border-emerald-300 text-emerald-900 bg-emerald-50/60 hover:bg-emerald-100"
              >
                Full (LKR {Math.round(currentUncollected).toLocaleString()})
              </Button>
              {currentUncollected > 2000 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(Math.round(currentUncollected / 2))}
                  className="h-8 rounded-xl text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  50% (LKR {Math.round(currentUncollected / 2).toLocaleString()})
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAmount(0)}
                className="h-8 rounded-xl text-xs text-slate-400 hover:text-slate-600 ml-auto"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Real-Time Outcome & Status Preview */}
          <div className="rounded-2xl border border-slate-200 p-3.5 bg-slate-50/90 space-y-2 text-xs">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
              Live Collection Outcome Preview
            </span>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Resulting Invoice Status:</span>
              {isFullPayment ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Collected (Full Settlement)
                </span>
              ) : isPartialPayment ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Clock className="h-3.5 w-3.5 text-amber-700" />
                  Partially Collected
                </span>
              ) : (
                <span className="text-slate-400 font-medium">Enter amount</span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
              <span className="text-slate-600">Remaining Balance:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(resultingBalance)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['CASH', 'CHEQUE', 'BANK_TRANSFER'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    'h-11 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5',
                    paymentMethod === method
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {method === 'CASH' && '💵 Cash'}
                  {method === 'CHEQUE' && '🏦 Cheque'}
                  {method === 'BANK_TRANSFER' && '📲 Transfer'}
                </button>
              ))}
            </div>

            {/* Conditional Cheque Details */}
            {paymentMethod === 'CHEQUE' && (
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2.5 pt-3 mt-2 text-xs">
                <span className="font-bold text-amber-950 block text-[11px] uppercase tracking-wider">
                  Cheque Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-semibold text-slate-600 block mb-1">
                      Cheque Number *
                    </label>
                    <Input
                      required
                      placeholder="e.g. CHQ-882910"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-slate-600 block mb-1">
                      Cheque Realization Date *
                    </label>
                    <Input
                      type="date"
                      required
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-slate-600 block mb-1">
                    Drawee Bank Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Commercial Bank / Sampath Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Collection Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Collection Remarks (Optional)
            </label>
            <Input
              placeholder="e.g. Handed over cash at customer retail counter"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs rounded-xl bg-white"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Governance Notice */}
          <div className="rounded-xl bg-slate-100 p-2.5 text-[11px] text-slate-600 flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Sales Reps record field collections in <strong>PENDING_APPROVAL</strong>. Once confirmed by the Finance Department, the invoice will officially transition to <strong>Paid</strong> or <strong>Partially Paid</strong>.
            </p>
          </div>

          {/* Actions */}
          <DialogFooter className="p-0 pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
              className="h-11 rounded-xl text-xs font-semibold w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || validAmount <= 0}
              className="h-11 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 flex-1"
            >
              {submitting ? (
                'Recording Collection...'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Confirm Collection ({formatCurrency(validAmount)})
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
