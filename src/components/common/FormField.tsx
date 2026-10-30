import React from 'react';
import { cn } from '../../utils/cn';

export interface FormFieldProps {
  /** Label text or node rendered above the input */
  label?: React.ReactNode;
  /** Whether this field is mandatory (renders red asterisk) */
  required?: boolean;
  /** Optional secondary hint rendered on the right side of the label row */
  hint?: React.ReactNode;
  /** Optional validation error message */
  error?: string;
  /** Optional HTML for attribute linking label to input id */
  htmlFor?: string;
  /** Field input element */
  children: React.ReactNode;
  /** Additional container CSS classes */
  className?: string;
}

/**
 * Standardized FormField container for form inputs.
 * Enforces unified label typography, required indicators, hint alignment,
 * and error messages across all ERP forms.
 */
export function FormField({
  label,
  required = false,
  hint,
  error,
  htmlFor,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <label htmlFor={htmlFor} className="flex items-center gap-1 cursor-pointer">
            <span>{label}</span>
            {required && <span className="text-rose-500 font-bold" aria-hidden="true">*</span>}
          </label>
          {hint && (
            <span className="text-[11px] font-normal text-slate-400">
              {hint}
            </span>
          )}
        </div>
      )}

      {children}

      {error && (
        <p className="text-[11.5px] font-medium text-rose-600 mt-1 leading-normal" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
