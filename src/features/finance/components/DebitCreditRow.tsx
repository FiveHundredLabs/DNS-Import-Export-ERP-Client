import { Account } from '../api/types';
import { CoaTreeSelect } from './CoaTreeSelect';
import { Trash2 } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../utils/cn';

export interface JournalLineItemState {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

interface DebitCreditRowProps {
  index: number;
  line: JournalLineItemState;
  accounts: Account[];
  onChange: (index: number, updated: Partial<JournalLineItemState>) => void;
  onRemove: (index: number) => void;
  onAddNewAccount: () => void;
  canRemove: boolean;
  suggestedAmount?: number;
  suggestedType?: 'debit' | 'credit';
}

export function DebitCreditRow({
  index,
  line,
  accounts,
  onChange,
  onRemove,
  onAddNewAccount,
  canRemove,
  suggestedAmount: _suggestedAmount,
  suggestedType: _suggestedType,
}: DebitCreditRowProps) {
  const handleAccountChange = (acc: Account) => {
    onChange(index, {
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
    });
  };

  const handleDebitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const val = raw === '' ? 0 : parseFloat(raw) || 0;
    onChange(index, {
      debit: Math.max(0, val),
      credit: 0, // Double-entry invariant: a single line cannot have both Dr and Cr
    });
  };

  const handleCreditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const val = raw === '' ? 0 : parseFloat(raw) || 0;
    onChange(index, {
      credit: Math.max(0, val),
      debit: 0, // Double-entry invariant: a single line cannot have both Dr and Cr
    });
  };

  const isDebitActive = line.debit > 0;
  const isCreditActive = line.credit > 0;

  return (
    <div className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all">
      {/* 1. Account Selector with Line Number Badge (Col 4 of 12) */}
      <div className="col-span-12 md:col-span-4 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 font-mono">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <CoaTreeSelect
            accounts={accounts}
            value={line.accountId}
            onChange={handleAccountChange}
            onAddNew={onAddNewAccount}
            placeholder="Select GL Account..."
          />
        </div>
      </div>

      {/* 2. Line Item Memo / Description (Col 3 of 12) */}
      <div className="col-span-12 md:col-span-3">
        <Input
          type="text"
          value={line.description}
          onChange={(e) => onChange(index, { description: e.target.value })}
          placeholder="Line explanation / memo..."
          className="h-9 text-xs"
        />
      </div>

      {/* 3. Debit (Dr) Input (Col 2 of 12) */}
      <div className="col-span-6 md:col-span-2">
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-[10px] font-bold uppercase tracking-wider text-primary pointer-events-none">
            Dr
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={line.debit > 0 ? line.debit : ''}
            onChange={handleDebitChange}
            placeholder="0.00"
            disabled={isCreditActive}
            className={cn(
              'h-9 pl-8 pr-2 text-xs font-mono text-right font-semibold transition-colors',
              isDebitActive
                ? 'border-primary-border bg-primary-light/40 text-indigo-900 focus:border-primary focus:ring-1 focus:ring-primary'
                : 'text-slate-700 focus:border-primary',
              isCreditActive && 'bg-slate-50 opacity-40 cursor-not-allowed'
            )}
          />
        </div>
      </div>

      {/* 4. Credit (Cr) Input (Col 2 of 12) */}
      <div className="col-span-6 md:col-span-2">
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 pointer-events-none">
            Cr
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={line.credit > 0 ? line.credit : ''}
            onChange={handleCreditChange}
            placeholder="0.00"
            disabled={isDebitActive}
            className={cn(
              'h-9 pl-8 pr-2 text-xs font-mono text-right font-semibold transition-colors',
              isCreditActive
                ? 'border-emerald-400 bg-emerald-50/40 text-emerald-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                : 'text-slate-700 focus:border-primary',
              isDebitActive && 'bg-slate-50 opacity-40 cursor-not-allowed'
            )}
          />
        </div>
      </div>

      {/* 5. Line Remove Action (Col 1 of 12) */}
      <div className="col-span-12 md:col-span-1 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:cursor-not-allowed disabled:opacity-20"
          title="Remove line"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
