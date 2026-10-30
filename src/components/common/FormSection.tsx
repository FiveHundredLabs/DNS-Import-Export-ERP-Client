import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '../../utils/cn';

export interface FormSectionProps {
  /** Main section heading */
  title: React.ReactNode;
  /** Optional secondary descriptive text */
  description?: React.ReactNode;
  /** Optional leading icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional action controls rendered on the right side of the section header */
  actions?: React.ReactNode;
  /** Section content (form fields, grid, or tables) */
  children: React.ReactNode;
  /** Container CSS classes */
  className?: string;
  /** Content wrapper CSS classes */
  contentClassName?: string;
  /** Whether to strip default content padding (e.g. for full-width line-item tables) */
  noPadding?: boolean;
  /** Whether the container allows overflowing floating dropdowns/popovers */
  overflowVisible?: boolean;
}

/**
 * Standardized FormSection wrapper for DNS ERP forms.
 * Enforces unified card border, header typography, icon placement,
 * and content spacing across all modules.
 */
export function FormSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  contentClassName,
  noPadding = false,
  overflowVisible = false,
}: FormSectionProps) {
  return (
    <Card className={cn('border-slate-200 shadow-2xs', overflowVisible ? 'overflow-visible' : 'overflow-hidden', className)}>
      <CardHeader className="p-4 border-b border-slate-100 bg-white flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold text-slate-900 truncate">
              {title}
            </CardTitle>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </CardHeader>

      <CardContent className={cn(noPadding ? 'p-0' : 'p-5', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
