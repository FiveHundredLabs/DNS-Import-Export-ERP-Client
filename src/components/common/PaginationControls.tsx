import React from 'react';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  label?: string;
  className?: string;
  compact?: boolean;
}

export function PaginationControls({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48, 96],
  label = 'items',
  className,
  compact = false,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = compact ? 3 : 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);

      if (start > 2) {
        pages.push('...');
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 select-none py-2',
        className
      )}
    >
      {/* Left: Summary text */}
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
          <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalItems}</span> {label}
        </span>

        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="text-[11px] text-slate-500">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 text-xs rounded-md border border-slate-200 bg-white px-2 py-0 font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation controls */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          className="h-7 w-7 p-0 shadow-2xs"
          title="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Previous page */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="h-7 px-2 gap-1 text-xs shadow-2xs"
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {!compact && <span>Prev</span>}
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-0.5">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-slate-400">
                  ...
                </span>
              );
            }
            const isCurrent = p === safeCurrentPage;
            return (
              <Button
                key={`page-${p}`}
                type="button"
                variant={isCurrent ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(Number(p))}
                className={cn(
                  'h-7 min-w-7 px-2 text-xs font-mono tabular-nums shadow-2xs',
                  isCurrent
                    ? 'bg-primary text-primary-foreground font-bold hover:bg-primary-hover'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                {p}
              </Button>
            );
          })}
        </div>

        {/* Next page */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="h-7 px-2 gap-1 text-xs shadow-2xs"
          title="Next page"
          aria-label="Next page"
        >
          {!compact && <span>Next</span>}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {/* Last page */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          className="h-7 w-7 p-0 shadow-2xs"
          title="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
