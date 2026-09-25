import { useState, useMemo } from 'react';
import { Account, AccountClass } from '../api/types';
import { Plus, Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface CoaTreeSelectProps {
  accounts: Account[];
  value?: string; // Account ID
  onChange: (account: Account) => void;
  onAddNew?: () => void;
  allowedClasses?: AccountClass[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CoaTreeSelect({
  accounts,
  value,
  onChange,
  onAddNew,
  allowedClasses,
  placeholder = 'Select General Ledger Account...',
  className,
  disabled = false,
}: CoaTreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === value);
  }, [accounts, value]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (allowedClasses && !allowedClasses.includes(a.accountClass)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.accountSubClass.toLowerCase().includes(q)
      );
    });
  }, [accounts, allowedClasses, search]);

  const groupedAccounts = useMemo(() => {
    const groups: { [subClass: string]: Account[] } = {};
    for (const acc of filteredAccounts) {
      if (!groups[acc.accountSubClass]) {
        groups[acc.accountSubClass] = [];
      }
      groups[acc.accountSubClass].push(acc);
    }
    return groups;
  }, [filteredAccounts]);

  const formatSubClass = (sub: string) => {
    return sub.replace(/_/g, ' ');
  };

  return (
    <div className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-left shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
          selectedAccount ? 'text-slate-900 font-medium' : 'text-slate-500'
        )}
      >
        <span className="truncate">
          {selectedAccount ? (
            <span>
              <span className="font-mono font-semibold text-primary mr-1.5">{selectedAccount.code}</span>
              {selectedAccount.name}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-full min-w-[280px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg animate-in fade-in-0 zoom-in-95">
            <div className="border-b border-slate-100 p-2">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code or account title..."
                  className="w-full rounded bg-slate-50 py-1 pl-8 pr-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto p-1 text-xs">
              {Object.keys(groupedAccounts).length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs">No accounts found</div>
              ) : (
                Object.entries(groupedAccounts).map(([subClass, accs]) => (
                  <div key={subClass} className="mb-1.5">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/70 rounded">
                      {formatSubClass(subClass)}
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {accs.map((acc) => {
                        const isSelected = acc.id === value;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              onChange(acc);
                              setIsOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-primary-light hover:text-primary-text',
                              isSelected ? 'bg-primary-light font-semibold text-primary-text' : 'text-slate-700'
                            )}
                          >
                            <span className="truncate">
                              <span className="font-mono text-slate-500 mr-2">{acc.code}</span>
                              {acc.name}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {onAddNew && (
              <div className="border-t border-slate-100 p-1.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNew();
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold text-primary hover:bg-primary-light/60 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Account</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
