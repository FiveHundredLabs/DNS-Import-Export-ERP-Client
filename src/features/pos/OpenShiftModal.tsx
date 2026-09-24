import React, { useState } from 'react';
import { X, Play, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface OpenShiftModalProps {
  isOpen: boolean;
  cashierName: string;
  onClose: () => void;
  onOpenShift: (openingBalance: number, notes?: string) => Promise<void>;
}

export function OpenShiftModal({
  isOpen,
  cashierName,
  onClose,
  onOpenShift,
}: OpenShiftModalProps) {
  const [openingBalance, setOpeningBalance] = useState<string>('10000');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      setError('Please provide a valid non-negative opening float amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onOpenShift(balance, notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to open shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Open Cashier Shift</h3>
              <p className="text-xs text-slate-500">Cashier: {cashierName}</p>
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

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Opening Float Cash (LKR) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 10000"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="text-base font-bold text-slate-900"
              required
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Initial physical currency received in register drawer from the vault.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Shift Remarks / Drawer Location
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Counter 1 Main Showroom Register. Clean register handoff."
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isSubmitting ? 'Starting...' : 'Start Active Shift'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
