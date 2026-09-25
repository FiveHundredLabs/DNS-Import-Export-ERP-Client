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
          'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none shadow-xs',
          variant === 'default' && 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm shadow-sky-500/20 active:bg-sky-700',
          variant === 'destructive' && 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
          variant === 'outline' && 'border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
          variant === 'secondary' && 'bg-slate-100 text-slate-800 hover:bg-slate-200/80',
          variant === 'ghost' && 'hover:bg-slate-100 hover:text-slate-900 shadow-none',
          variant === 'link' && 'text-sky-600 underline-offset-4 hover:underline shadow-none',
          size === 'default' && 'h-9 px-4 py-2',
          size === 'sm' && 'h-8 rounded-lg px-3 text-xs',
          size === 'lg' && 'h-11 rounded-xl px-8 text-base',
          size === 'icon' && 'h-9 w-9 rounded-xl',

          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
