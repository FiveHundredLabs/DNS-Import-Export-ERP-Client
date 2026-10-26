import React, { useState, useEffect, forwardRef } from 'react';
import Decimal from 'decimal.js';
import { cn } from '../../../utils/cn';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange?: (val: number, rawString: string) => void;
  prefix?: string;
  allowNegative?: boolean;
}

/**
 * Masked fixed-point currency input component bound to decimal.js under the hood.
 * Enforces maximum 2 decimal places and provides right-aligned numerical styling.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onChange,
      prefix = 'LKR',
      allowNegative = false,
      className,
      disabled,
      readOnly,
      placeholder = '0.00',
      ...rest
    },
    ref
  ) => {
    // Internal display string
    const formatInitial = (val: number | string): string => {
      if (val === undefined || val === null || val === '') return '';
      try {
        const d = new Decimal(val);
        if (d.isNaN()) return '';
        // format with up to 2 decimal places if non-zero, or empty if 0 and not typing
        return d.toString();
      } catch {
        return String(val);
      }
    };

    const [displayVal, setDisplayVal] = useState<string>(() => formatInitial(value));

    useEffect(() => {
      // Sync from outside if parsed Decimal value differs
      if (value === undefined || value === null || value === '') {
        if (displayVal !== '') setDisplayVal('');
        return;
      }
      try {
        const currentD = displayVal ? new Decimal(displayVal) : new Decimal(0);
        const propD = new Decimal(value);
        if (!currentD.equals(propD) && !displayVal.endsWith('.')) {
          setDisplayVal(propD.toString());
        }
      } catch {
        setDisplayVal(String(value));
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value;

      // Allow empty
      if (input === '') {
        setDisplayVal('');
        onChange?.(0, '0.00');
        return;
      }

      // Pattern: optional negative (if allowed), digits, optional dot with up to 2 digits
      const regex = allowNegative ? /^-?\d*(\.\d{0,2})?$/ : /^\d*(\.\d{0,2})?$/;

      if (!regex.test(input)) {
        // Reject invalid character or more than 2 decimal places
        return;
      }

      setDisplayVal(input);

      // Convert to Decimal string / number
      try {
        if (input === '-' || input === '.') {
          onChange?.(0, '0');
          return;
        }
        const decimalVal = new Decimal(input);
        const numVal = decimalVal.toNumber();
        onChange?.(numVal, decimalVal.toFixed(2));
      } catch {
        onChange?.(0, '0.00');
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (displayVal && !displayVal.endsWith('.')) {
        try {
          const d = new Decimal(displayVal);
          setDisplayVal(d.toFixed(2));
          onChange?.(d.toNumber(), d.toFixed(2));
        } catch {
          // ignore
        }
      }
      rest.onBlur?.(e);
    };

    return (
      <div className="relative inline-flex items-center w-full">
        {prefix && (
          <span className="absolute left-2.5 text-[11px] font-semibold text-slate-400 select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayVal}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            'flex h-9 w-full rounded-md border border-slate-200 bg-white py-1 text-xs text-right font-mono tabular-nums shadow-2xs transition-colors placeholder:text-slate-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
            readOnly && 'bg-slate-50 cursor-default focus-visible:ring-0 focus-visible:border-slate-200',
            prefix ? 'pl-11 pr-2.5' : 'px-2.5',
            className
          )}
          {...rest}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
