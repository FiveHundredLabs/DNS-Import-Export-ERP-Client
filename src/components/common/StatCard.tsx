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
  selected?: boolean;
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
    container: 'border-slate-200/90 bg-white hover:border-slate-300',
    iconBg: 'bg-emerald-50 text-emerald-600',
    titleText: 'text-slate-500',
    trendPositive: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    trendNegative: 'text-rose-800 bg-rose-50 border-rose-200',
    badge: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    progressBar: 'bg-emerald-500',
    progressText: 'text-emerald-600',
    borderDivider: 'border-slate-100',
    valueColor: 'text-slate-900',
  },
  blue: {
    container: 'border-slate-200/90 bg-white hover:border-slate-300',
    iconBg: 'bg-sky-50 text-sky-600',
    titleText: 'text-slate-500',
    trendPositive: 'text-sky-800 bg-sky-50 border-sky-200',
    trendNegative: 'text-rose-800 bg-rose-50 border-rose-200',
    badge: 'text-sky-800 bg-sky-50 border-sky-200',
    progressBar: 'bg-sky-500',
    progressText: 'text-sky-600',
    borderDivider: 'border-slate-100',
    valueColor: 'text-slate-900',
  },
  indigo: {
    container: 'border-slate-200/90 bg-white hover:border-slate-300',
    iconBg: 'bg-primary/10 text-primary',
    titleText: 'text-slate-500',
    trendPositive: 'text-primary bg-primary/10 border-primary/20',
    trendNegative: 'text-rose-800 bg-rose-50 border-rose-200',
    badge: 'text-primary bg-primary/10 border-primary/20',
    progressBar: 'bg-primary',
    progressText: 'text-primary',
    borderDivider: 'border-slate-100',
    valueColor: 'text-slate-900',
  },
  amber: {
    container: 'border-slate-200/90 bg-white hover:border-slate-300',
    iconBg: 'bg-amber-50 text-amber-600',
    titleText: 'text-slate-500',
    trendPositive: 'text-amber-800 bg-amber-50 border-amber-200',
    trendNegative: 'text-rose-800 bg-rose-50 border-rose-200',
    badge: 'text-amber-800 bg-amber-50 border-amber-200',
    progressBar: 'bg-amber-500',
    progressText: 'text-amber-600',
    borderDivider: 'border-slate-100',
    valueColor: 'text-slate-900',
  },
  rose: {
    container: 'border-slate-200/90 bg-white hover:border-slate-300',
    iconBg: 'bg-rose-50 text-rose-600',
    titleText: 'text-slate-500',
    trendPositive: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    trendNegative: 'text-rose-800 bg-rose-50 border-rose-200',
    badge: 'text-rose-800 bg-rose-50 border-rose-200',
    progressBar: 'bg-rose-500',
    progressText: 'text-rose-600',
    borderDivider: 'border-slate-100',
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
  selected = false,
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
        'rounded-xl border p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between min-w-0',
        theme.container,
        onClick && 'cursor-pointer active:scale-[0.99]',
        selected && 'ring-2 ring-primary/40 border-primary bg-primary/[0.02]',
        className
      )}
    >
      {/* Top Header: Uppercase Bold Title + Squircle Icon Container */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider truncate',
            theme.titleText
          )}
        >
          {title}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {trend ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                trend.isPositive ? theme.trendPositive : theme.trendNegative
              )}
            >
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}
            </span>
          ) : badge ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0',
                theme.badge
              )}
            >
              {badge}
            </span>
          ) : null}

          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs',
              theme.iconBg
            )}
          >
            <EffectiveIcon className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Main KPI Value */}
      <div className="mt-2 min-w-0">
        {isCurrency ? (
          <AmountDisplay amount={value} className="text-slate-900 font-bold font-mono text-2xl tabular-nums" />
        ) : (
          <div
            className={cn(
              'text-2xl font-bold font-mono tracking-tight tabular-nums leading-tight truncate',
              theme.valueColor
            )}
          >
            {value}
          </div>
        )}
      </div>

      {/* Progress Bar (if provided) */}
      {typeof progress === 'number' ? (
        <div className="mt-2.5 space-y-1">
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
            'mt-1 text-[11px] text-slate-500 truncate flex items-center justify-between',
            theme.borderDivider
          )}
        >
          <span className="truncate">{subtitle || period}</span>
        </div>
      ) : null}
    </div>
  );
}

export const SummaryCard = StatCard;
