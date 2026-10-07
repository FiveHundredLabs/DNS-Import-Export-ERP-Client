import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Coins,
  ArrowUpDown,
  RefreshCw,
  TrendingUp,
  Info,
  Check,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// Enterprise reference exchange rates (relative to USD = 1.0)
export const EXCHANGE_RATES: Record<string, { name: string; symbol: string; rateAgainstUSD: number }> = {
  USD: { name: 'US Dollar', symbol: '$', rateAgainstUSD: 1.0 },
  LKR: { name: 'Sri Lankan Rupee', symbol: 'Rs', rateAgainstUSD: 302.5 },
  EUR: { name: 'Euro', symbol: '€', rateAgainstUSD: 0.92 },
  GBP: { name: 'British Pound', symbol: '£', rateAgainstUSD: 0.78 },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', rateAgainstUSD: 3.67 },
  INR: { name: 'Indian Rupee', symbol: '₹', rateAgainstUSD: 84.3 },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', rateAgainstUSD: 1.34 },
  CNY: { name: 'Chinese Yuan', symbol: '¥', rateAgainstUSD: 7.24 },
  JPY: { name: 'Japanese Yen', symbol: '¥', rateAgainstUSD: 154.2 },
  AUD: { name: 'Australian Dollar', symbol: 'A$', rateAgainstUSD: 1.53 },
};

interface CurrencyConverterPopoverProps {
  className?: string;
}

export function CurrencyConverterPopover({ className }: CurrencyConverterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('LKR');
  const [copied, setCopied] = useState(false);

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

  const numAmount = parseFloat(amountStr) || 0;

  // Calculate rate and result
  const { rate, convertedValue, inverseRate } = useMemo(() => {
    const fromRate = EXCHANGE_RATES[fromCurrency]?.rateAgainstUSD || 1.0;
    const toRate = EXCHANGE_RATES[toCurrency]?.rateAgainstUSD || 1.0;
    const directRate = toRate / fromRate;
    const invRate = fromRate / toRate;
    return {
      rate: directRate,
      convertedValue: numAmount * directRate,
      inverseRate: invRate,
    };
  }, [numAmount, fromCurrency, toCurrency]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleCopyResult = () => {
    const formatted = `${convertedValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${toCurrency}`;
    navigator.clipboard?.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={cn('relative', className)} ref={popoverRef}>
      {/* Header Compact Toolbar Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary-foreground shrink-0 cursor-pointer',
          isOpen && 'bg-primary-foreground/20 text-primary-foreground'
        )}
        title="Currency Converter"
        aria-label="Currency Converter"
        aria-expanded={isOpen}
      >
        <Coins className="h-4.5 w-4.5 transition-transform duration-150 hover:scale-110" />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl shadow-slate-900/15 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Coins className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                Currency Converter
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-medium">
              Live Rates
            </span>
          </div>

          <div className="mt-3.5 space-y-3">
            {/* Amount Input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {EXCHANGE_RATES[fromCurrency]?.symbol}
                </span>
              </div>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {[100, 1000, 5000, 10000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmountStr(v.toString())}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  +{v.toLocaleString()}
                </button>
              ))}
            </div>

            {/* From & To Selectors with Swap Button */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  From
                </label>
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  {Object.keys(EXCHANGE_RATES).map((code) => (
                    <option key={code} value={code}>
                      {code} - {EXCHANGE_RATES[code].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="pt-4 shrink-0">
                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap currencies"
                  aria-label="Swap currencies"
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  To
                </label>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  {Object.keys(EXCHANGE_RATES).map((code) => (
                    <option key={code} value={code}>
                      {code} - {EXCHANGE_RATES[code].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Converted Output Display */}
            <div className="mt-3 p-3 rounded-xl bg-slate-900 text-white shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                <span>Calculated Result</span>
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <span>Copy</span>
                  )}
                </button>
              </div>
              <div className="text-lg font-bold font-mono tracking-tight text-emerald-400">
                {convertedValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="text-xs font-sans text-white font-medium">{toCurrency}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800 flex justify-between">
                <span>1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}</span>
                <span>1 {toCurrency} = {inverseRate.toFixed(4)} {fromCurrency}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400">
              <Info className="h-3 w-3 shrink-0" />
              <span>Indicative rate for quotes & ledger conversions.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
