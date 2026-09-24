import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  title?: string;
}

export function Alert({
  className,
  variant = 'default',
  title,
  children,
  ...props
}: AlertProps) {
  const Icon = {
    default: Info,
    destructive: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
  }[variant];

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
        variant === 'default' && 'bg-slate-50 border-slate-200 text-slate-800 [&>svg]:text-slate-600',
        variant === 'destructive' && 'bg-rose-50 border-rose-200 text-rose-800 [&>svg]:text-rose-600',
        variant === 'warning' && 'bg-amber-50 border-amber-200 text-amber-800 [&>svg]:text-amber-600',
        variant === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800 [&>svg]:text-emerald-600',
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
      <div>
        {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
        <div className="text-xs [&_p]:leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
