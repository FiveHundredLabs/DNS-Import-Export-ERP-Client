import * as React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none shadow-sm',
          variant === 'default' && 'bg-indigo-600 text-white hover:bg-indigo-700 shadow',
          variant === 'destructive' && 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
          variant === 'outline' && 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
          variant === 'secondary' && 'bg-slate-100 text-slate-900 hover:bg-slate-200',
          variant === 'ghost' && 'hover:bg-slate-100 hover:text-slate-900 shadow-none',
          variant === 'link' && 'text-indigo-600 underline-offset-4 hover:underline shadow-none',
          size === 'default' && 'h-9 px-4 py-2',
          size === 'sm' && 'h-8 rounded-md px-3 text-xs',
          size === 'lg' && 'h-11 rounded-md px-8 text-base',
          size === 'icon' && 'h-9 w-9',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
