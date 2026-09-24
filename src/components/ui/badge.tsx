import * as React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        variant === 'default' && 'bg-slate-900 text-white',
        variant === 'secondary' && 'bg-slate-100 text-slate-800 border border-slate-200',
        variant === 'success' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        variant === 'warning' && 'bg-amber-50 text-amber-700 border border-amber-200',
        variant === 'destructive' && 'bg-rose-50 text-rose-700 border border-rose-200',
        variant === 'info' && 'bg-sky-50 text-sky-700 border border-sky-200',
        variant === 'outline' && 'text-slate-700 border border-slate-300',
        className
      )}
      {...props}
    />
  );
}
