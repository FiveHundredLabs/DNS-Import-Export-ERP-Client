import React from 'react';
import { cn } from '../../utils/cn';

export interface DocumentActionBarProps {
  /** Optional status badge or indicator (e.g. Draft, Unsaved changes) */
  status?: React.ReactNode;
  /** Summary slot (e.g. Total Amount, Item count, Tax breakdown) */
  summary?: React.ReactNode;
  /** Secondary or destructive actions aligned to the left */
  leftActions?: React.ReactNode;
  /** Primary transactional actions aligned to the right (e.g. Save, Submit) */
  rightActions?: React.ReactNode;
  /** Whether the action bar is fixed to the bottom of the viewport. Defaults to true. */
  sticky?: boolean;
  /** Additional container CSS classes */
  className?: string;
}

/**
 * Standardized DocumentActionBar component for transactional create and edit pages.
 * Stays pinned to the bottom of the viewport with a clean glassmorphism background,
 * separating discard/secondary actions from primary save/submit buttons.
 */
export function DocumentActionBar({
  status,
  summary,
  leftActions,
  rightActions,
  sticky = true,
  className,
}: DocumentActionBarProps) {
  return (
    <div
      className={cn(
        'w-full bg-white/95 backdrop-blur-xs border-t border-slate-200 py-3 px-4 sm:px-6 shadow-md transition-all',
        sticky && 'sticky bottom-0 z-20 -mx-3.5 sm:-mx-5 lg:-mx-6 -mb-6 mt-6',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        {/* Left: Status & Left Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
          {status && <div className="shrink-0">{status}</div>}
          {leftActions && <div className="flex items-center gap-2">{leftActions}</div>}
        </div>

        {/* Center / Summary (if any) */}
        {summary && (
          <div className="text-xs text-slate-600 font-medium text-center order-first sm:order-none">
            {summary}
          </div>
        )}

        {/* Right: Primary & Secondary Transaction Actions */}
        {rightActions && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {rightActions}
          </div>
        )}
      </div>
    </div>
  );
}
