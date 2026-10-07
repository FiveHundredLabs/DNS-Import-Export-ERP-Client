import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Calculator as CalcIcon,
  Delete,
  RotateCcw,
  Equal,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface CalculatorPopoverProps {
  className?: string;
}

export function CalculatorPopover({ className }: CalculatorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const clearAll = useCallback(() => {
    setDisplayValue('0');
    setPreviousValue(null);
    setOperation(null);
    setEquation('');
    setWaitingForOperand(false);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplayValue('0');
  }, []);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplayValue(digit);
      setWaitingForOperand(false);
    } else {
      setDisplayValue((prev) => (prev === '0' ? digit : prev + digit));
    }
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplayValue('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue((prev) => prev + '.');
    }
  }, [waitingForOperand, displayValue]);

  const backspace = useCallback(() => {
    if (waitingForOperand) return;
    setDisplayValue((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  }, [waitingForOperand]);

  const performOperation = useCallback((nextOp: string) => {
    const inputValue = parseFloat(displayValue);

    if (previousValue === null) {
      setPreviousValue(inputValue);
      setEquation(`${inputValue} ${nextOp}`);
    } else if (operation) {
      const currentValue = previousValue || 0;
      let newValue = currentValue;

      if (operation === '+') newValue = currentValue + inputValue;
      else if (operation === '-') newValue = currentValue - inputValue;
      else if (operation === '×' || operation === '*') newValue = currentValue * inputValue;
      else if (operation === '÷' || operation === '/') {
        newValue = inputValue !== 0 ? currentValue / inputValue : 0;
      }

      // Round to 8 decimal places to avoid floating point anomalies
      newValue = Math.round(newValue * 1e8) / 1e8;

      setPreviousValue(newValue);
      setDisplayValue(String(newValue));
      setEquation(nextOp === '=' ? `${currentValue} ${operation} ${inputValue} =` : `${newValue} ${nextOp}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOp === '=' ? null : nextOp);
  }, [displayValue, previousValue, operation]);

  const handlePercent = useCallback(() => {
    const value = parseFloat(displayValue);
    const newValue = value / 100;
    setDisplayValue(String(newValue));
  }, [displayValue]);

  // Keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    function handleCalculatorKeys(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        performOperation(e.key);
      } else if (e.key === '*') {
        e.preventDefault();
        performOperation('×');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        performOperation('=');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        clearAll();
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercent();
      }
    }

    window.addEventListener('keydown', handleCalculatorKeys);
    return () => window.removeEventListener('keydown', handleCalculatorKeys);
  }, [isOpen, inputDigit, inputDecimal, performOperation, backspace, clearAll, handlePercent]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={cn('relative', className)} ref={popoverRef}>
      {/* Header Toolbar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary-foreground shrink-0 cursor-pointer',
          isOpen && 'bg-primary-foreground/20 text-primary-foreground'
        )}
        title="Calculator"
        aria-label="Calculator"
        aria-expanded={isOpen}
      >
        <CalcIcon className="h-4.5 w-4.5 transition-transform duration-150 hover:scale-110" />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xl shadow-slate-900/15 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalcIcon className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                ERP Utility Calculator
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[10px] font-mono font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200 transition-colors"
              title="Copy value to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Calculator Display Screen */}
          <div className="mt-2.5 mb-3 p-3 rounded-xl bg-slate-900 text-white text-right">
            <div className="h-4 text-[11px] font-mono text-slate-400 overflow-hidden text-ellipsis">
              {equation || '\u00A0'}
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-white overflow-x-auto whitespace-nowrap mt-0.5 scrollbar-none">
              {parseFloat(displayValue).toLocaleString('en-US', {
                maximumFractionDigits: 8,
              }) || displayValue}
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1 */}
            <button
              type="button"
              onClick={clearAll}
              className="h-10 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200 transition-colors"
            >
              C
            </button>
            <button
              type="button"
              onClick={backspace}
              title="Backspace"
              className="h-10 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-colors flex items-center justify-center"
            >
              <Delete className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handlePercent}
              className="h-10 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-colors"
            >
              %
            </button>
            <button
              type="button"
              onClick={() => performOperation('÷')}
              className={cn(
                'h-10 rounded-lg text-sm font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 transition-colors',
                operation === '÷' && 'bg-primary text-primary-foreground'
              )}
            >
              ÷
            </button>

            {/* Row 2 */}
            <button
              type="button"
              onClick={() => inputDigit('7')}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => inputDigit('8')}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => inputDigit('9')}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              9
            </button>
            <button
              type="button"
              onClick={() => performOperation('×')}
              className={cn(
                'h-10 rounded-lg text-sm font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 transition-colors',
                operation === '×' && 'bg-primary text-primary-foreground'
              )}
            >
              ×
            </button>

            {/* Row 3 */}
            <button
              type="button"
              onClick={() => inputDigit('4')}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => inputDigit('5')}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => inputDigit('6')}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              6
            </button>
            <button
              type="button"
              onClick={() => performOperation('-')}
              className={cn(
                'h-10 rounded-lg text-sm font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 transition-colors',
                operation === '-' && 'bg-primary text-primary-foreground'
              )}
            >
              −
            </button>

            {/* Row 4 */}
            <button
              type="button"
              onClick={() => inputDigit('1')}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => inputDigit('2')}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => inputDigit('3')}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              3
            </button>
            <button
              type="button"
              onClick={() => performOperation('+')}
              className={cn(
                'h-10 rounded-lg text-sm font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 transition-colors',
                operation === '+' && 'bg-primary text-primary-foreground'
              )}
            >
              +
            </button>

            {/* Row 5 */}
            <button
              type="button"
              onClick={() => inputDigit('0')}
              className="h-10 col-span-2 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              0
            </button>
            <button
              type="button"
              onClick={inputDecimal}
              className="h-10 rounded-lg text-sm font-bold bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              .
            </button>
            <button
              type="button"
              onClick={() => performOperation('=')}
              aria-label="="
              title="="
              className="h-10 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
            >
              <Equal className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
