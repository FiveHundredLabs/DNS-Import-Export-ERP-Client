import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Scale } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

export interface DoubleEntryLine {
  accountCode: string;
  accountName: string;
  type: 'DEBIT' | 'CREDIT';
  amount?: number | string;
  note?: string;
}

export interface DoubleEntryHoverBadgeProps {
  title?: string;
  description?: string;
  lines?: DoubleEntryLine[];
  entries?: DoubleEntryLine[];
  className?: string;
  size?: 'xs' | 'sm';
  align?: 'left' | 'center' | 'right';
}

export function DoubleEntryHoverBadge({
  title = 'Automated Double-Entry Impact',
  description = 'This transaction commits balancing General Ledger postings:',
  lines,
  entries,
  className,
  size = 'xs',
  align = 'center',
}: DoubleEntryHoverBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLines = lines || entries || [];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const sizeClasses = size === 'xs'
    ? 'h-4 w-4 text-[10px]'
    : 'h-5 w-5 text-xs';

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center shrink-0', className)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Exclamation badge trigger */}
      <button
        type="button"
        aria-label={title}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-bold transition-all shadow-2xs select-none',
          'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 hover:scale-105 active:scale-95',
          'focus:outline-none focus:ring-1 focus:ring-amber-400',
          sizeClasses
        )}
      >
        !
      </button>

      {/* Popover on hover / focus */}
      {isOpen && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 bottom-full mb-2 w-72 sm:w-80 rounded-lg bg-slate-900 text-slate-100 p-3 shadow-xl border border-slate-700/80 animate-in fade-in-50 zoom-in-95 pointer-events-none',
            align === 'right'
              ? 'right-0 left-auto translate-x-0'
              : align === 'left'
              ? 'left-0 right-auto translate-x-0'
              : 'left-1/2 -translate-x-1/2'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-800">
            <Scale className="h-3.5 w-3.5 text-primary-light shrink-0" />
            <span className="font-bold text-xs text-white truncate">{title}</span>
          </div>

          {description && (
            <p className="text-[10px] text-slate-300 mt-1 leading-snug">
              {description}
            </p>
          )}

          {/* Ledger table */}
          <div className="mt-2 space-y-1 font-mono text-[11px]">
            {activeLines.map((line, idx) => {
              const isDr = line.type === 'DEBIT';
              const amtStr = typeof line.amount === 'number'
                ? formatCurrency(line.amount)
                : line.amount;

              return (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center justify-between py-0.5 px-1.5 rounded text-[10.5px]',
                    isDr ? 'bg-indigo-950/60 text-indigo-200' : 'bg-emerald-950/60 text-emerald-200'
                  )}
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span className={cn('font-bold shrink-0', isDr ? 'text-indigo-400' : 'text-emerald-400')}>
                      {isDr ? 'Dr.' : 'Cr.'}
                    </span>
                    <span className="font-semibold text-slate-200 shrink-0">{line.accountCode}</span>
                    <span className="truncate text-slate-300 text-[10px]">{line.accountName}</span>
                  </div>
                  {amtStr && (
                    <span className="font-semibold tabular-nums text-white shrink-0 ml-1.5">
                      {amtStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Balanced footer */}
          <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
              Balanced Entry (Dr = Cr)
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">General Ledger Core</span>
          </div>

          {/* Tooltip pointer arrow */}
          <div
            className={cn(
              'absolute top-full -mt-1 border-4 border-transparent border-t-slate-900',
              align === 'right'
                ? 'right-3'
                : align === 'left'
                ? 'left-3'
                : 'left-1/2 -translate-x-1/2'
            )}
          />
        </div>
      )}
    </div>
  );
}
