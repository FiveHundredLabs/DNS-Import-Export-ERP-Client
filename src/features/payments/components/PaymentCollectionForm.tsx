import React from 'react';
import { PaymentMethod } from '../../../types/payment';
import { Input } from '../../../components/ui/input';
import { Banknote, CreditCard, Building2, Check, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

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

  const presets = [10000, 25000, 50000, 100000];

  return (
    <div className={cn('bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Payment Details & Method
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">Field Collection</span>
      </div>

      {/* Prominent Payment Amount Input */}
      <div>
        <label className="text-xs font-bold text-slate-700 block mb-1.5">
          Collection Amount (LKR) <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 select-none">
            LKR
          </span>
          <input
            type="number"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseFloat(e.target.value);
              onAmountChange(isNaN(val as number) ? '' : val);
            }}
            placeholder="0.00"
            className="w-full h-12 pl-14 pr-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-lg sm:text-xl font-extrabold text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all tabular-nums"
          />
        </div>

        {/* Quick Fill Buttons for Field Rep Speed */}
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {totalOutstanding > 0 && (
            <button
              type="button"
              onClick={() => onAmountChange(totalOutstanding)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-primary-light text-primary-text border border-primary-border hover:bg-primary-light/80 active:scale-95 transition-all shrink-0"
            >
              <Sparkles className="h-3 w-3" /> Full Balance ({formatCurrency(totalOutstanding)})
            </button>
          )}

          {totalOverdue > 0 && totalOverdue !== totalOutstanding && (
            <button
              type="button"
              onClick={() => onAmountChange(totalOverdue)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-95 transition-all shrink-0"
            >
              Overdue ({formatCurrency(totalOverdue)})
            </button>
          )}

          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onAmountChange(p)}
              className="px-2 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all shrink-0 tabular-nums"
            >
              {p >= 1000 ? `${p / 1000}k` : p}
            </button>
          ))}
        </div>
      </div>

      {/* Mode of Payment (Segmented touch pills) */}
      <div>
        <label className="text-xs font-bold text-slate-700 block mb-1.5">
          Payment Method <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {paymentMethods.map((m) => {
            const Icon = m.icon;
            const isSelected = paymentMethod === m.id;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onPaymentMethodChange(m.id)}
                className={cn(
                  'h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95',
                  isSelected
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                )}
              >
                <Icon className={cn('h-4 w-4', isSelected ? 'text-white' : 'text-slate-500')} />
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
        <label className="text-xs font-semibold text-slate-700 block mb-1">
          Collection Notes / Collector Remarks
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. Received cash from shop manager Sunil during routine Pettah territory route visit."
          className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all resize-none"
        />
      </div>
    </div>
  );
}
