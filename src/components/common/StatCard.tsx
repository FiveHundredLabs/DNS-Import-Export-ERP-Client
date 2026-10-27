import React from 'react';
import {
  LucideIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  FileCheck2,
  Users,
  Target,
  Package,
  AlertCircle,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { AmountDisplay } from './AmountDisplay';

export type StatCardVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'emerald'
  | 'amber'
  | 'rose';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  period?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: StatCardVariant;
  progress?: number;
  targetText?: string;
  badge?: string;
  className?: string;
  onClick?: () => void;
}

// Fallback icon picker based on context
function getDefaultIcon(title: string, variant: StatCardVariant): LucideIcon {
  const lower = title.toLowerCase();
  if (
    lower.includes('sale') ||
    lower.includes('revenue') ||
    lower.includes('liquidity') ||
    lower.includes('profit') ||
    lower.includes('cash')
  ) {
    return DollarSign;
  }
  if (lower.includes('order') || lower.includes('grn') || lower.includes('intake') || lower.includes('pick')) {
    return ShoppingBag;
  }
  if (
    lower.includes('receivable') ||
    lower.includes('collection') ||
    lower.includes('receipt') ||
    lower.includes('bill') ||
    lower.includes('invoice') ||
    lower.includes('payment')
  ) {
    return FileCheck2;
  }
  if (
    lower.includes('rep') ||
    lower.includes('manager') ||
    lower.includes('officer') ||
    lower.includes('fleet') ||
    lower.includes('user') ||
    lower.includes('customer')
  ) {
    return Users;
  }
  if (lower.includes('target') || lower.includes('incentive') || lower.includes('rate') || lower.includes('conversion')) {
    return Target;
  }
  if (lower.includes('stock') || lower.includes('sku') || lower.includes('item') || lower.includes('inventory')) {
    return Package;
  }
  if (
    lower.includes('unpaid') ||
    lower.includes('cancel') ||
    lower.includes('damage') ||
    lower.includes('overdue') ||
    lower.includes('alert') ||
    lower.includes('debt')
  ) {
    return AlertCircle;
  }
  if (lower.includes('register') || lower.includes('variance')) {
    return CheckCircle2;
  }
  if (variant === 'success' || variant === 'emerald') return TrendingUp;
  if (variant === 'warning' || variant === 'amber' || variant === 'danger' || variant === 'rose') return AlertCircle;
  return BarChart3;
}

// Harmonious palette configurations matching Sales Rep Dashboard KPI Cards
interface VariantTheme {
  container: string;
  iconBg: string;
  titleText: string;
  trendPositive: string;
  trendNegative: string;
  badge: string;
  progressBar: string;
  progressText: string;
  borderDivider: string;
  valueColor: string;
}

const VARIANT_THEMES: Record<string, VariantTheme> = {
  emerald: {
    container: 'border-emerald-200/90 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-50/40 to-white hover:border-emerald-300',
    iconBg: 'bg-emerald-100 text-emerald-700',
    titleText: 'text-emerald-950',
    trendPositive: 'text-emerald-800 bg-emerald-100/90 border-emerald-200/80',
    trendNegative: 'text-rose-800 bg-rose-100/90 border-rose-200/80',
    badge: 'text-emerald-800 bg-emerald-100/80 border-emerald-200/70',
    progressBar: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    progressText: 'text-emerald-700',
    borderDivider: 'border-emerald-100/80',
    valueColor: 'text-slate-900',
  },
  blue: {
    container: 'border-blue-200/90 bg-gradient-to-br from-blue-500/[0.08] via-sky-50/40 to-white hover:border-blue-300',
    iconBg: 'bg-blue-100 text-blue-700',
    titleText: 'text-blue-950',
    trendPositive: 'text-blue-800 bg-blue-100/90 border-blue-200/80',
    trendNegative: 'text-rose-800 bg-rose-100/90 border-rose-200/80',
    badge: 'text-blue-800 bg-blue-100/80 border-blue-200/70',
    progressBar: 'bg-gradient-to-r from-blue-500 to-sky-500',
    progressText: 'text-blue-700',
    borderDivider: 'border-blue-100/80',
    valueColor: 'text-slate-900',
  },
  indigo: {
    container: 'border-indigo-200/90 bg-gradient-to-br from-indigo-500/[0.08] via-purple-50/40 to-white hover:border-indigo-300',
    iconBg: 'bg-indigo-100 text-indigo-700',
    titleText: 'text-indigo-950',
    trendPositive: 'text-indigo-800 bg-indigo-100/90 border-indigo-200/80',
    trendNegative: 'text-rose-800 bg-rose-100/90 border-rose-200/80',
    badge: 'text-indigo-800 bg-indigo-100/80 border-indigo-200/70',
    progressBar: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    progressText: 'text-indigo-700',
    borderDivider: 'border-indigo-100/80',
    valueColor: 'text-slate-900',
  },
  amber: {
    container: 'border-amber-200/90 bg-gradient-to-br from-amber-500/[0.08] via-amber-50/40 to-white hover:border-amber-300',
    iconBg: 'bg-amber-100 text-amber-700',
    titleText: 'text-amber-950',
    trendPositive: 'text-amber-800 bg-amber-100/90 border-amber-200/80',
    trendNegative: 'text-rose-800 bg-rose-100/90 border-rose-200/80',
    badge: 'text-amber-800 bg-amber-100/80 border-amber-200/70',
    progressBar: 'bg-gradient-to-r from-amber-500 to-orange-500',
    progressText: 'text-amber-700',
    borderDivider: 'border-amber-100/80',
    valueColor: 'text-slate-900',
  },
  rose: {
    container: 'border-rose-200/90 bg-gradient-to-br from-rose-500/[0.08] via-red-50/40 to-white hover:border-rose-300',
    iconBg: 'bg-rose-100 text-rose-700',
    titleText: 'text-rose-950',
    trendPositive: 'text-emerald-800 bg-emerald-100/90 border-emerald-200/80',
    trendNegative: 'text-rose-800 bg-rose-100/90 border-rose-200/80',
    badge: 'text-rose-800 bg-rose-100/80 border-rose-200/70',
    progressBar: 'bg-gradient-to-r from-rose-500 to-red-500',
    progressText: 'text-rose-700',
    borderDivider: 'border-rose-100/80',
    valueColor: 'text-rose-600',
  },
};

// Aliases
VARIANT_THEMES.success = VARIANT_THEMES.emerald;
VARIANT_THEMES.warning = VARIANT_THEMES.amber;
VARIANT_THEMES.danger = VARIANT_THEMES.rose;
VARIANT_THEMES.info = VARIANT_THEMES.blue;
VARIANT_THEMES.purple = VARIANT_THEMES.indigo;
VARIANT_THEMES.default = VARIANT_THEMES.indigo;

export function StatCard({
  title,
  value,
  subtitle,
  period = 'This month',
  icon: Icon,
  trend,
  variant = 'default',
  progress,
  targetText,
  badge,
  className,
  onClick,
}: StatCardProps) {
  const theme = VARIANT_THEMES[variant] || VARIANT_THEMES.default;
  const EffectiveIcon = Icon || getDefaultIcon(title, variant);

  const isCurrency =
    typeof value === 'string'
      ? /^(LKR|Rs\.?|\$|€|£)\s*[\d,]+(\.\d+)?/i.test(value.trim()) || value.includes('LKR')
      : false;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl sm:rounded-3xl border p-2.5 sm:p-5 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group min-w-0',
        theme.container,
        onClick && 'cursor-pointer active:scale-[0.99]',
        className
      )}
    >
      {/* Top Header: Squircle Icon Badge + Uppercase Bold Title + Trend / Status Pill */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div
            className={cn(
              'h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
              theme.iconBg
            )}
          >
            <EffectiveIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <span
            className={cn(
              'text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate',
              theme.titleText
            )}
          >
            {title}
          </span>
        </div>

        {trend ? (
          <span
            className={cn(
              'hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0',
              trend.isPositive ? theme.trendPositive : theme.trendNegative
            )}
          >
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </span>
        ) : badge ? (
          <span
            className={cn(
              'hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0',
              theme.badge
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>

      {/* Main KPI Value */}
      <div className="mt-1.5 sm:mt-3 min-w-0">
        {isCurrency ? (
          <AmountDisplay amount={value} className="text-slate-900 font-extrabold" />
        ) : (
          <div
            className={cn(
              'text-base sm:text-[22px] font-extrabold tracking-tight tabular-nums leading-tight truncate',
              theme.valueColor
            )}
          >
            {value}
          </div>
        )}
      </div>

      {/* Progress Bar (if provided, desktop only) */}
      {typeof progress === 'number' ? (
        <div className="hidden sm:block mt-2.5 space-y-1">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', theme.progressBar)}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
            <span className="text-[11px] text-slate-500 truncate">{targetText || subtitle || period}</span>
            <span className={cn('font-semibold text-[10.5px]', theme.progressText)}>{progress}%</span>
          </div>
        </div>
      ) : subtitle || period ? (
        <div
          className={cn(
            'hidden sm:flex mt-1.5 sm:mt-2 text-[10.5px] sm:text-xs text-slate-500 truncate items-center justify-between pt-1 border-t',
            theme.borderDivider
          )}
        >
          <span className="truncate">{subtitle || period}</span>
        </div>
      ) : null}
    </div>
  );
}
