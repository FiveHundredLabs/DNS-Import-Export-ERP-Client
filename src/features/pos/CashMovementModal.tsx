import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatCurrency } from '../../utils/formatters';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecord: (type: 'CASH_IN' | 'CASH_OUT', amount: number, reason: string) => Promise<void>;
  currentFloat?: number;
}

export function CashMovementModal({
  isOpen,
  onClose,
  onRecord,
  currentFloat = 0,
}: CashMovementModalProps) {
  const [type, setType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!reason.trim()) {
      setError('A descriptive reason is mandatory for cash management movements.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onRecord(type, parsedAmount, reason.trim());
      setAmount('');
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record cash movement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <DollarSign className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Float Cash Management</h3>
              <p className="text-xs text-slate-500">Record Cash In or Cash Drop</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Movement Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('CASH_IN')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold transition-all border ${
                  type === 'CASH_IN'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                Cash In (Add Float)
              </button>
              <button
                type="button"
                onClick={() => setType('CASH_OUT')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold transition-all border ${
                  type === 'CASH_OUT'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-amber-600" />
                Cash Out (Safe Drop)
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">Amount (LKR)</label>
              {type === 'CASH_OUT' && (
                <span className="text-[11px] text-slate-500">
                  Current Float: <span className="font-semibold">{formatCurrency(currentFloat)}</span>
                </span>
              )}
            </div>
            <Input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-sm font-semibold"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Reason / Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              placeholder={
                type === 'CASH_IN'
                  ? 'e.g. Additional float replenishment from Finance Vault'
                  : 'e.g. Mid-shift excess cash drop to central safe'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={
                type === 'CASH_IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }
            >
              {isSubmitting
                ? 'Recording...'
                : type === 'CASH_IN'
                ? 'Confirm Cash In'
                : 'Confirm Cash Drop'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
