import React, { useState } from 'react';
import { POSSession } from '../../types/pos';
import { calculateReconciliation } from '../../rules/posRules';
import { formatCurrency } from '../../utils/formatters';
import { X, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface CloseShiftModalProps {
  session: POSSession;
  cashSalesTotal: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmClose: (actualCash: number, notes?: string) => Promise<void>;
}

export function CloseShiftModal({
  session,
  cashSalesTotal,
  isOpen,
  onClose,
  onConfirmClose,
}: CloseShiftModalProps) {
  const [actualCashStr, setActualCashStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const actualCash = actualCashStr === '' ? 0 : parseFloat(actualCashStr) || 0;
  const reconciliation = calculateReconciliation(
    session.openingBalance,
    session.cashInTotal,
    session.cashOutTotal,
    cashSalesTotal,
    actualCash
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (actualCashStr === '' || isNaN(parseFloat(actualCashStr)) || parseFloat(actualCashStr) < 0) {
      setError('Please enter a valid non-negative counted physical cash amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmClose(actualCash, notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to close shift session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Close Cashier Shift</h3>
              <p className="text-xs text-slate-500">
                Session: <span className="font-mono font-semibold">{session.sessionNumber}</span> ({session.cashierName})
              </p>
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

          {/* Mathematical Reconciliation Table */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
              Shift Cash Reconciliation
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Opening Float:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(session.openingBalance)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Cash In (+) Added Float:</span>
              <span className="font-semibold">+ {formatCurrency(session.cashInTotal)}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span>Cash Out (-) Safe Drops:</span>
              <span className="font-semibold">- {formatCurrency(session.cashOutTotal)}</span>
            </div>
            <div className="flex justify-between text-indigo-600">
              <span>Cash Sales (+) Showroom Sales:</span>
              <span className="font-semibold">+ {formatCurrency(cashSalesTotal)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
              <span>Expected Cash Float:</span>
              <span className="text-indigo-700">{formatCurrency(reconciliation.expectedCash)}</span>
            </div>
          </div>

          {/* Counted Cash Input */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Counted Physical Cash in Drawer (LKR) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="Enter counted actual cash..."
              value={actualCashStr}
              onChange={(e) => setActualCashStr(e.target.value)}
              className="text-base font-bold text-slate-900"
              required
              autoFocus
            />
          </div>

          {/* Real-time Discrepancy Indicator */}
          {actualCashStr !== '' && (
            <div
              className={`rounded-xl p-3 border flex items-center justify-between text-xs transition-colors ${
                reconciliation.isBalanced
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : reconciliation.difference > 0
                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {reconciliation.isBalanced ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="font-semibold">
                  {reconciliation.isBalanced
                    ? 'Perfect Balance — No Discrepancy'
                    : reconciliation.difference > 0
                    ? 'Cash Over (Surplus)'
                    : 'Cash Shortage (Deficit)'}
                </span>
              </div>
              <div className="font-bold text-sm">
                {reconciliation.difference > 0 ? '+' : ''}
                {formatCurrency(reconciliation.difference)}
              </div>
            </div>
          )}

          {/* Closing Shift Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              End-of-Shift Notes / Explanation
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Verified denominations with Finance Officer. Float transferred to safe."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              {isSubmitting ? 'Closing Shift...' : 'Reconcile & Close Shift'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
