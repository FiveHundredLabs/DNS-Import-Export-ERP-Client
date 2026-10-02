import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          className={cn(
            'flex h-9 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-sm font-normal text-slate-900 shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 leading-normal',
            error && 'border-rose-500 focus-visible:ring-rose-500',
            className
          )}
          ref={ref}
          {...props}
        >

          {children}
        </select>
        {error && <p className="mt-1 text-[12.5px] font-medium text-rose-600 leading-normal">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
