import React, { useState } from 'react';
import { POSPaymentMethod, ChequeDetails } from '../../types/pos';
import { formatCurrency } from '../../utils/formatters';
import { X, Banknote, CreditCard, Building2, CheckCircle2, Split, Landmark } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface POSPaymentModalProps {
  isOpen: boolean;
  totalAmount: number;
  customerName?: string;
  customerCode?: string;
  onClose: () => void;
  onConfirmPayment: (paymentDetails: {
    paymentMethod: POSPaymentMethod;
    cashTendered?: number;
    chequeDetails?: ChequeDetails;
  }) => Promise<void>;
}

export function POSPaymentModal({
  isOpen,
  totalAmount,
  customerName,
  customerCode,
  onClose,
  onConfirmPayment,
}: POSPaymentModalProps) {
  const [method, setMethod] = useState<POSPaymentMethod>('CASH');
  const [cashTenderedStr, setCashTenderedStr] = useState<string>(totalAmount.toString());
  const [splitCashStr, setSplitCashStr] = useState<string>(Math.round(totalAmount / 2).toString());
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('Commercial Bank');
  const [chequeDate, setChequeDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bankReference, setBankReference] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const cashTendered = parseFloat(cashTenderedStr) || 0;
  const changeGiven = Number(Math.max(0, cashTendered - totalAmount).toFixed(2));
  const isCashInsufficient = method === 'CASH' && cashTendered < totalAmount;

  const splitCash = parseFloat(splitCashStr) || 0;
  const splitCard = Number(Math.max(0, totalAmount - splitCash).toFixed(2));

  const handleQuickCash = (amount: number) => {
    setCashTenderedStr(amount.toString());
  };

  const handleAddCash = (increment: number) => {
    const current = parseFloat(cashTenderedStr) || 0;
    setCashTenderedStr((current + increment).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (method === 'CASH') {
      if (cashTendered < totalAmount) {
        setError(`Tendered cash (LKR ${cashTendered}) cannot be less than total payable (LKR ${totalAmount}).`);
        return;
      }
    } else if (method === 'SPLIT') {
      if (splitCash <= 0 || splitCash >= totalAmount) {
        setError('Split cash must be greater than 0 and less than total payable amount.');
        return;
      }
    } else if (method === 'CHEQUE') {
      if (!chequeNumber.trim()) {
        setError('Cheque number is required.');
        return;
      }
      if (!bankName.trim()) {
        setError('Bank name is required.');
        return;
      }
    } else if (method === 'BANK_TRANSFER') {
      if (!bankReference.trim()) {
        setError('Bank transfer reference number is required.');
        return;
      }
    }

    try {
      setIsProcessing(true);
      await onConfirmPayment({
        paymentMethod: method,
        cashTendered: method === 'CASH' ? cashTendered : method === 'SPLIT' ? splitCash : undefined,
        chequeDetails:
          method === 'CHEQUE'
            ? {
                chequeNumber: chequeNumber.trim(),
                bankName: bankName.trim(),
                chequeDate,
              }
            : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Showroom Checkout Tender</h3>
            <p className="text-xs text-slate-500">
              Customer: <span className="font-semibold">{customerName || 'Walk-in Retail Customer'}</span>
              {customerCode && ` (${customerCode})`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Total Payable Banner */}
        <div className="mt-4 rounded-xl bg-slate-900 p-4 text-center text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Payable Amount
          </div>
          <div className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight mt-0.5">
            {formatCurrency(totalAmount)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Select Payment Method
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark },
                { id: 'SPLIT', label: 'Split (Cash+Card)', icon: Split },
                { id: 'CHEQUE', label: 'Cheque', icon: Building2 },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id as POSPaymentMethod)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-[11px] font-bold border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method: CASH Details */}
          {method === 'CASH' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cash Received / Tendered (LKR)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={cashTenderedStr}
                  onChange={(e) => setCashTenderedStr(e.target.value)}
                  className="text-lg font-bold text-slate-900"
                  autoFocus
                  required
                />
              </div>

              {/* Quick Cash Buttons */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Quick Tender Presets
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickCash(totalAmount)}
                    className="rounded-lg bg-white border border-slate-200 py-1.5 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(Math.ceil(totalAmount / 1000) * 1000 || 1000)}
                    className="rounded-lg bg-white border border-slate-200 py-1.5 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Round 1K
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCash(1000)}
                    className="rounded-lg bg-white border border-slate-200 py-1.5 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    +1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCash(5000)}
                    className="rounded-lg bg-white border border-slate-200 py-1.5 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    +5,000
                  </button>
                </div>
              </div>

              {/* Change Calculation Box */}
              <div
                className={`rounded-lg p-3 border flex items-center justify-between text-xs ${
                  isCashInsufficient
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <span className="font-semibold">
                  {isCashInsufficient ? 'Insufficient Tender:' : 'Change to Return to Customer:'}
                </span>
                <span className="text-base font-semibold tabular-nums">
                  {isCashInsufficient
                    ? `- ${formatCurrency(totalAmount - cashTendered)}`
                    : formatCurrency(changeGiven)}
                </span>
              </div>
            </div>
          )}

          {/* Method: SPLIT (Cash + Card) */}
          {method === 'SPLIT' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Cash Portion (LKR)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={totalAmount - 1}
                    value={splitCashStr}
                    onChange={(e) => setSplitCashStr(e.target.value)}
                    className="font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Card Portion (Auto-Balanced)
                  </label>
                  <div className="h-9 px-3 bg-white border border-slate-200 rounded-md flex items-center font-bold text-blue-700">
                    {formatCurrency(splitCard)}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                Collect {formatCurrency(splitCash)} into cash drawer, swipe {formatCurrency(splitCard)} on card terminal.
              </div>
            </div>
          )}

          {/* Method: BANK_TRANSFER */}
          {method === 'BANK_TRANSFER' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Bank Transfer Reference / Slip # <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g. CEFT-9948271"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  className="font-mono font-semibold"
                  required
                />
              </div>
              <div className="text-[11px] text-slate-500">
                Showroom Account: Commercial Bank DNS Trading (A/C: 10008892110)
              </div>
            </div>
          )}

          {/* Method: CHEQUE Details */}
          {method === 'CHEQUE' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Cheque Number <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g. CHQ-889921"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className="font-mono"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Commercial Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cheque Date</label>
                  <Input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Method: CARD Details */}
          {method === 'CARD' && (
            <div className="rounded-xl border border-sky-200 bg-blue-50/50 p-4 text-xs text-sky-800 flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-blue-600 shrink-0" />
              <div>
                <div className="font-semibold">Tap or Swipe on POS Card Terminal</div>
                <div>
                  Charge amount <span className="font-semibold tabular-nums">{formatCurrency(totalAmount)}</span> to merchant terminal. Once approved, proceed.
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || isCashInsufficient}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isProcessing ? 'Processing Sale...' : 'Complete Sale & Print Receipt'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
