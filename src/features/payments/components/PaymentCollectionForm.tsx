import React from 'react';
import { PaymentMethod } from '../../../types/payment';
import { Input } from '../../../components/ui/input';
import { Banknote, CreditCard, Building2, Check, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { toast } from 'sonner';

interface PaymentCollectionFormProps {
  amount: number | '';
  onAmountChange: (amount: number | '') => void;
  totalOutstanding: number;
  totalOverdue: number;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  chequeNumber: string;
  onChequeNumberChange: (val: string) => void;
  chequeDate: string;
  onChequeDateChange: (val: string) => void;
  bankName: string;
  onBankNameChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  className?: string;
}

export function PaymentCollectionForm({
  amount,
  onAmountChange,
  totalOutstanding,
  totalOverdue,
  paymentMethod,
  onPaymentMethodChange,
  chequeNumber,
  onChequeNumberChange,
  chequeDate,
  onChequeDateChange,
  bankName,
  onBankNameChange,
  notes,
  onNotesChange,
  className,
}: PaymentCollectionFormProps) {
  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'CHEQUE', label: 'Cheque', icon: Building2 },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
    { id: 'CREDIT_CARD', label: 'Card', icon: CreditCard },
  ];

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync ref value if amount was externally clamped or reset
  React.useEffect(() => {
    if (inputRef.current && typeof amount === 'number' && totalOutstanding > 0 && amount > totalOutstanding) {
      inputRef.current.value = String(totalOutstanding);
      onAmountChange(totalOutstanding);
    }
  }, [amount, totalOutstanding, onAmountChange]);

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      onAmountChange('');
      return;
    }
    let val = parseFloat(rawVal);
    if (isNaN(val)) return;
    if (val < 0) {
      val = 0;
      if (inputRef.current) inputRef.current.value = '0';
    }

    // Cap at totalOutstanding balance: if user tries to type more, set to totalOutstanding and stop
    if (totalOutstanding > 0 && val > totalOutstanding) {
      val = totalOutstanding;
      if (inputRef.current) {
        inputRef.current.value = String(totalOutstanding);
      }
      toast.info(`Collection amount capped at total outstanding balance (LKR ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
    }

    onAmountChange(val);
  };

  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs space-y-3', className)}>
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Payment Details & Method
        </h3>
        <span className="text-[10.5px] text-slate-400 font-medium">Field Collection</span>
      </div>

      {/* Prominent Payment Amount Input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-700">
            Collection Amount (LKR) <span className="text-rose-500">*</span>
          </label>
          {totalOutstanding > 0 && (
            <span className="text-[10px] font-semibold text-slate-400">
              Max: <strong className="text-slate-600 font-mono">LKR {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </span>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
            LKR
          </span>
          <input
            ref={inputRef}
            type="number"
            min="0"
            max={totalOutstanding > 0 ? totalOutstanding : undefined}
            step="any"
            value={amount === '' ? '' : amount}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) {
                e.preventDefault();
              }
            }}
            onChange={handleAmountInputChange}
            onPaste={(e) => {
              const pasteText = e.clipboardData.getData('text').replace(/,/g, '').trim();
              const parsed = parseFloat(pasteText);
              if (!isNaN(parsed) && totalOutstanding > 0 && parsed > totalOutstanding) {
                e.preventDefault();
                onAmountChange(totalOutstanding);
                if (inputRef.current) {
                  inputRef.current.value = String(totalOutstanding);
                }
                toast.info(`Collection amount capped at total outstanding balance (LKR ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
              }
            }}
            onBlur={() => {
              if (typeof amount === 'number' && totalOutstanding > 0 && amount > totalOutstanding) {
                onAmountChange(totalOutstanding);
                if (inputRef.current) {
                  inputRef.current.value = String(totalOutstanding);
                }
              }
            }}
            onFocus={(e) => {
              if (amount === 0) {
                e.target.select();
              }
            }}
            placeholder="0.00"
            className="w-full h-10 pl-11 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-lg font-extrabold text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all tabular-nums"
          />
        </div>
      </div>

      {/* Mode of Payment (Compact 2-column or 4-column touch grid) */}
      <div>
        <label className="text-[11px] font-bold text-slate-700 block mb-1">
          Payment Method <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {paymentMethods.map((m) => {
            const Icon = m.icon;
            const isSelected = paymentMethod === m.id;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onPaymentMethodChange(m.id)}
                className={cn(
                  'h-9 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95',
                  isSelected
                    ? 'border-primary bg-primary text-white shadow-2xs'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isSelected ? 'text-white' : 'text-slate-500')} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional Fields: Cheque Details */}
      {paymentMethod === 'CHEQUE' && (
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3 animate-in fade-in zoom-in-95">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-amber-600" /> Cheque Information
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Cheque Number <span className="text-rose-500">*</span>
              </label>
              <Input
                value={chequeNumber}
                onChange={(e) => onChequeNumberChange(e.target.value)}
                placeholder="e.g. CHQ-89472"
                className="h-9 text-xs bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Cheque Date (PDC / Realization) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={chequeDate}
                onChange={(e) => onChequeDateChange(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Drawn Bank Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={bankName}
                onChange={(e) => onBankNameChange(e.target.value)}
                placeholder="e.g. Commercial Bank"
                className="h-9 text-xs bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Conditional Fields: Bank Transfer Details */}
      {paymentMethod === 'BANK_TRANSFER' && (
        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3 animate-in fade-in zoom-in-95">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-600" /> Transfer Reference
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Deposit Slip / Transaction Ref <span className="text-rose-500">*</span>
              </label>
              <Input
                value={chequeNumber}
                onChange={(e) => onChequeNumberChange(e.target.value)}
                placeholder="e.g. REF-2025-998"
                className="h-9 text-xs bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Remitting Bank
              </label>
              <Input
                value={bankName}
                onChange={(e) => onBankNameChange(e.target.value)}
                placeholder="e.g. Sampath Bank Online"
                className="h-9 text-xs bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes / Field Remarks */}
      <div>
        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
          Collection Notes / Collector Remarks
        </label>
        <textarea
          rows={1}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. Received cash from shop manager..."
          className="w-full h-8 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white focus:h-16 transition-all resize-none"
        />
      </div>
    </div>
  );
}
