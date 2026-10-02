import React from 'react';
import { Card, CardContent } from '../ui/card';
import { LucideIcon, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  period?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  period = 'This month',
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const iconBg = {
    default: 'bg-primary-light text-primary border-primary-border',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    danger: 'bg-rose-50 text-rose-600 border-rose-100',
  }[variant];

  return (
    <Card className={cn('bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-slate-600">{title}</span>
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={cn('p-1.5 rounded-lg border', iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 transition-colors cursor-pointer" />
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-2xl sm:text-[26px] font-semibold tracking-tight tabular-nums text-slate-900 leading-tight">{value}</div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-normal">{subtitle || period}</span>
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11.5px] font-medium tabular-nums px-2 py-0.5 rounded-full border',
                trend.isPositive
                  ? 'text-emerald-700 bg-emerald-50/80 border-emerald-200/60'
                  : 'text-rose-700 bg-rose-50/80 border-rose-200/60'
              )}
            >
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

