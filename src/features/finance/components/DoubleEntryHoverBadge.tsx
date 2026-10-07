import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Scale } from 'lucide-react';
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
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLines = lines || entries || [];

  const calculatePosition = (): { top: number; left: number; placement: 'top' | 'bottom' } | null => {
    if (!triggerRef.current) return null;
    const triggerRect = triggerRef.current.getBoundingClientRect();

    // If trigger has been scrolled out of visible viewport, signal closed
    if (triggerRect.bottom < 0 || triggerRect.top > window.innerHeight) {
      return null;
    }

    const popoverWidth = popoverRef.current ? popoverRef.current.offsetWidth : Math.min(320, window.innerWidth - 24);
    const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 180;

    const spaceAbove = triggerRect.top;
    const spaceBelow = window.innerHeight - triggerRect.bottom;

    // Prefer bottom if space allows; otherwise top, or whichever side has more room
    const fitsBelow = spaceBelow >= popoverHeight + 8;
    const fitsAbove = spaceAbove >= popoverHeight + 8;
    const placement: 'top' | 'bottom' = fitsBelow || spaceBelow >= spaceAbove ? 'bottom' : 'top';

    let top = placement === 'top'
      ? triggerRect.top - popoverHeight - 8
      : triggerRect.bottom + 8;

    // Vertical boundary guard
    if (top < 8) top = 8;
    if (top + popoverHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - popoverHeight - 8);
    }

    // Horizontal calculation based on align prop
    let left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
    if (align === 'left') {
      left = triggerRect.left;
    } else if (align === 'right') {
      left = triggerRect.right - popoverWidth;
    }

    // Clamp horizontally to always stay within viewport
    const minLeft = 12;
    const maxLeft = Math.max(12, window.innerWidth - popoverWidth - 12);
    left = Math.max(minLeft, Math.min(left, maxLeft));

    return { top, left, placement };
  };

  const updatePosition = () => {
    const pos = calculatePosition();
    if (!pos) {
      setIsOpen(false);
      return;
    }
    setCoords(pos);
  };

  const openPopover = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const initialPos = calculatePosition();
    if (initialPos) {
      setCoords(initialPos);
    }
    setIsOpen(true);
  };

  const closePopover = (delay = 150) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, delay);
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleScrollOrResize() {
      updatePosition();
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(false);
      }
    }

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    openPopover();
  };

  const handleMouseLeave = () => {
    closePopover(150);
  };

  const sizeClasses = size === 'xs'
    ? 'h-4 w-4 text-[10px]'
    : 'h-5 w-5 text-xs';

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center shrink-0', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Exclamation badge trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={title}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setIsOpen(false);
          } else {
            openPopover();
          }
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

      {/* Popover portaled to document.body to prevent clipping by overflow-hidden or z-index */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '320px',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'min(480px, calc(100vh - 24px))',
            overflowY: 'auto',
          }}
          className="z-[9999] rounded-xl bg-white text-slate-900 p-3.5 shadow-xl border border-slate-200 ring-1 ring-slate-900/5 animate-in fade-in-50 zoom-in-95 pointer-events-auto"
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Scale className="h-4 w-4 text-primary shrink-0" />
            <span className="font-bold text-xs text-slate-900 truncate">{title}</span>
          </div>

          {description && (
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              {description}
            </p>
          )}

          {/* Ledger table */}
          <div className="mt-2.5 space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto pr-0.5">
            {activeLines.map((line, idx) => {
              const isDr = line.type === 'DEBIT';
              const amtStr = typeof line.amount === 'number'
                ? formatCurrency(line.amount)
                : line.amount;

              return (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center justify-between py-1 px-2 rounded-md border text-[11px]',
                    isDr
                      ? 'bg-blue-50/70 text-blue-950 border-blue-200/80'
                      : 'bg-emerald-50/70 text-emerald-950 border-emerald-200/80'
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={cn(
                        'font-bold px-1 py-0.5 rounded text-[10px] shrink-0',
                        isDr ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      {isDr ? 'Dr.' : 'Cr.'}
                    </span>
                    <span className="font-semibold text-slate-800 shrink-0">{line.accountCode}</span>
                    <span className="truncate text-slate-600 text-[10px]">{line.accountName}</span>
                  </div>
                  {amtStr && (
                    <span className="font-bold tabular-nums text-slate-900 shrink-0 ml-2">
                      {amtStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Balanced footer */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 inline-block" />
              Balanced Entry (Dr = Cr)
            </span>
            <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">General Ledger Core</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
