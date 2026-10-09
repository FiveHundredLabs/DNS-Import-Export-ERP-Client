import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export interface AmountDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: number | string;
  currency?: string;
  showCurrency?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'auto';
  prefixClassName?: string;
  numberClassName?: string;
}

/**
 * Responsive monetary amount display that dynamically scales font size to fit
 * within card boundaries without overflowing, overlapping, clipping digits,
 * or using shortened abbreviations (K, M, B).
 *
 * Preserves the full exact amount with thousands separators and 2 decimal places.
 */
export function AmountDisplay({
  amount,
  currency = 'LKR',
  showCurrency = true,
  className,
  size = 'auto',
  prefixClassName,
  numberClassName,
  ...props
}: AmountDisplayProps) {
  // Normalize formatted currency string
  let fullFormatted = '';
  let prefix = currency;
  let numericString = '';

  if (typeof amount === 'number') {
    fullFormatted = formatCurrency(amount);
  } else if (typeof amount === 'string') {
    fullFormatted = amount.replace(/\u00A0/g, ' ').trim();
  } else {
    fullFormatted = '0.00';
  }

  // Parse prefix and number (e.g. "LKR 898,879.75")
  const match = fullFormatted.match(/^([A-Za-z$€£¥]+)\s*(.+)$/);
  if (match) {
    prefix = match[1];
    numericString = match[2];
  } else {
    numericString = fullFormatted;
  }

  const totalLength = fullFormatted.length;

  // Dynamic font sizing based on character length when size is 'auto'
  const getDynamicSizeClass = () => {
    if (size !== 'auto') {
      switch (size) {
        case 'sm':
          return 'text-sm sm:text-base';
        case 'md':
          return 'text-base sm:text-lg';
        case 'lg':
          return 'text-lg sm:text-xl';
        default:
          return 'text-base';
      }
    }

    // Auto-scaling tiers to guarantee zero card overflow across mobile/tablet/desktop
    if (totalLength <= 11) {
      // e.g. "LKR 500.00"
      return 'text-xl sm:text-2xl font-bold';
    } else if (totalLength <= 14) {
      // e.g. "LKR 45,000.00"
      return 'text-lg sm:text-xl font-bold';
    } else if (totalLength <= 17) {
      // e.g. "LKR 898,879.75"
      return 'text-[15px] sm:text-lg font-bold';
    } else if (totalLength <= 21) {
      // e.g. "LKR 12,450,000.00"
      return 'text-sm sm:text-base font-bold';
    } else {
      // Very large amounts e.g. "LKR 123,456,789.00"
      return 'text-xs sm:text-sm font-bold';
    }
  };

  return (
    <div
      className={cn(
        'w-full max-w-full min-w-0 flex items-baseline flex-wrap leading-tight tracking-tight [overflow-wrap:anywhere] break-words',
        getDynamicSizeClass(),
        className
      )}
      {...props}
    >
      {showCurrency && (
        <span
          className={cn(
            'inline-block text-[0.72em] font-semibold tracking-normal uppercase opacity-85 mr-1 select-none shrink-0',
            prefixClassName
          )}
        >
          {prefix}
        </span>
      )}
      <span
        className={cn(
          'tabular-nums tracking-tight font-inherit [overflow-wrap:anywhere]',
          numberClassName
        )}
      >
        {numericString}
      </span>
    </div>
  );
}
