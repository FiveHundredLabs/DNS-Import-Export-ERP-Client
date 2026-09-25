import { formatCurrency } from '../../../utils/formatters';
import { CheckCircle2, AlertCircle, Scale, Wand2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Button } from '../../../components/ui/button';

interface BalancingBarProps {
  totalDebit: number;
  totalCredit: number;
  isSubmitting?: boolean;
  onPost: () => void;
  onReset?: () => void;
  onAutoBalance?: () => void;
  className?: string;
}

export function BalancingBar({
  totalDebit,
  totalCredit,
  isSubmitting = false,
  onPost,
  onReset,
  onAutoBalance,
  className,
}: BalancingBarProps) {
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  return (
    <div
      className={cn(
        'flex flex-col lg:flex-row items-center justify-between gap-4 rounded-xl border p-4 shadow-xs transition-all',
        isBalanced
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          : totalDebit === 0 && totalCredit === 0
          ? 'bg-slate-50 border-slate-200 text-slate-700'
          : 'bg-rose-50/70 border-rose-200 text-rose-900',
        className
      )}
    >
      {/* Live Balancing Status */}
      <div className="flex items-center gap-3 w-full lg:w-auto">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-xs',
            isBalanced
              ? 'bg-emerald-600 text-white'
              : totalDebit === 0 && totalCredit === 0
              ? 'bg-slate-200 text-slate-600'
              : 'bg-rose-600 text-white'
          )}
        >
          {isBalanced ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : totalDebit === 0 && totalCredit === 0 ? (
            <Scale className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-6 w-6 animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">
              {isBalanced
                ? 'Entry In Balance (Σ Debits = Σ Credits)'
                : totalDebit === 0 && totalCredit === 0
                ? 'Awaiting Journal Line Items'
                : 'Double-Entry Imbalance Detected'}
            </span>
            {isBalanced && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Invariant Verified
              </span>
            )}
            {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                Difference: {formatCurrency(difference)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBalanced
              ? 'Total debits exactly match total credits to the cent. Ready to post.'
              : totalDebit > 0 || totalCredit > 0
              ? totalDebit > totalCredit
                ? `Voucher needs ${formatCurrency(difference)} in Credits to balance.`
                : `Voucher needs ${formatCurrency(difference)} in Debits to balance.`
              : 'Both debit and credit totals must equal each other before this voucher can be committed.'}
          </p>
        </div>
      </div>

      {/* Totals & Submission Actions */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full lg:w-auto justify-between lg:justify-end">
        {/* Quick Auto-Balance Button */}
        {!isBalanced && (totalDebit > 0 || totalCredit > 0) && onAutoBalance && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutoBalance}
            className="gap-1.5 text-xs text-primary-text border-primary-border bg-white hover:bg-primary-light shadow-xs"
          >
            <Wand2 className="h-3.5 w-3.5 text-primary" />
            <span>Auto-Balance ({formatCurrency(difference)})</span>
          </Button>
        )}

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Total Debits</div>
            <div className="text-sm font-bold text-indigo-900">{formatCurrency(totalDebit)}</div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Total Credits</div>
            <div className="text-sm font-bold text-emerald-900">{formatCurrency(totalCredit)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onReset && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={isSubmitting}
              className="text-xs"
            >
              Clear
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={onPost}
            disabled={!isBalanced || isSubmitting}
            className={cn(
              'min-w-[130px] font-semibold text-xs shadow-xs',
              isBalanced ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Posting...' : 'Post Entry (Commit)'}
          </Button>
        </div>
      </div>
    </div>
  );
}
