import * as React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info' | 'purple';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider leading-normal tabular-nums whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        variant === 'default' && 'bg-slate-50 text-slate-800 border border-slate-300',
        variant === 'primary' && 'bg-primary-light text-primary-text border border-primary-border',
        variant === 'secondary' && 'bg-slate-50 text-slate-700 border border-slate-300',
        variant === 'success' && 'bg-emerald-50 text-emerald-700 border border-emerald-300',
        variant === 'warning' && 'bg-amber-50 text-amber-800 border border-amber-300',
        variant === 'destructive' && 'bg-rose-50 text-rose-800 border border-rose-300',
        variant === 'info' && 'bg-sky-50 text-sky-800 border border-sky-300',
        variant === 'purple' && 'bg-purple-50 text-purple-800 border border-purple-300',
        variant === 'outline' && 'bg-white text-slate-700 border border-slate-300',
        className
      )}
      {...props}
    />
  );
}
